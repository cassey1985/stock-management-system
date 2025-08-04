import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs-extra';
import * as path from 'path';
import { hashPassword, verifyPassword } from './auth';
import {
  Product,
  StockInEntry,
  StockOutEntry,
  CustomerDebt,
  Payment,
  GeneralDebt,
  GeneralDebtPayment,
  Transaction,
  FIFOResult,
  DashboardStats,
  InventoryBatch,
  User,
  LoginRequest
} from './types';

// Data persistence configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'business-data.json');

interface PersistedData {
  products: Product[];
  stockInEntries: StockInEntry[];
  stockOutEntries: StockOutEntry[];
  customerDebts: CustomerDebt[];
  payments: Payment[];
  generalDebts: GeneralDebt[];
  generalDebtPayments: GeneralDebtPayment[];
  transactions: Transaction[];
  users: User[];
  lastUpdated: string;
}

class DataService {
  private products: Product[] = [];
  private stockInEntries: StockInEntry[] = [];
  private stockOutEntries: StockOutEntry[] = [];
  private customerDebts: CustomerDebt[] = [];
  private payments: Payment[] = [];
  private generalDebts: GeneralDebt[] = [];
  private generalDebtPayments: GeneralDebtPayment[] = [];
  private transactions: Transaction[] = [];
  private users: User[] = [];

  constructor() {
    // Initialize with empty arrays first
    // Data loading will be done explicitly via initialize() method
  }

  // Initialize the data service
  async initialize(): Promise<void> {
    await this.loadData();
  }

  // FIFO Implementation - Core logic from VBA
  calculateFIFOCost(productCode: string, quantity: number): FIFOResult {
    const availableBatches = this.stockInEntries
      .filter(entry => entry.productCode === productCode && entry.remainingQuantity > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime()); // FIFO order

    let remainingQty = quantity;
    let totalCost = 0;
    const usedBatches: Array<{
      stockInId: string;
      quantityUsed: number;
      pricePerUnit: number;
      cost: number;
    }> = [];

    for (const batch of availableBatches) {
      if (remainingQty <= 0) break;

      const qtyToUse = Math.min(remainingQty, batch.remainingQuantity);
      const cost = qtyToUse * batch.purchasePrice;

      usedBatches.push({
        stockInId: batch.id,
        quantityUsed: qtyToUse,
        pricePerUnit: batch.purchasePrice,
        cost: cost
      });

      totalCost += cost;
      remainingQty -= qtyToUse;
    }

    return { totalCost, usedBatches };
  }

  // Update stock quantities after sale
  updateStockQuantities(usedBatches: FIFOResult['usedBatches']): void {
    for (const batch of usedBatches) {
      const stockEntry = this.stockInEntries.find(entry => entry.id === batch.stockInId);
      if (stockEntry) {
        stockEntry.remainingQuantity -= batch.quantityUsed;
        stockEntry.updatedAt = new Date();
      }
    }
  }

  // Products
  addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    // Check for duplicate product code
    const existingProduct = this.products.find(p => p.code === productData.code);
    if (existingProduct) {
      throw new Error(`Product code "${productData.code}" is already in use by "${existingProduct.name}"`);
    }

    const product: Product = {
      ...productData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.products.push(product);
    this.persistData(); // Save after adding product
    return product;
  }

  getProducts(): Product[] {
    return this.products;
  }

  updateProduct(id: string, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product | null {
    // Check for duplicate product code (excluding the current product)
    const existingProduct = this.products.find(p => p.code === productData.code && p.id !== id);
    if (existingProduct) {
      throw new Error(`Product code "${productData.code}" is already in use by "${existingProduct.name}"`);
    }

    const index = this.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.products[index] = {
        ...this.products[index],
        ...productData,
        updatedAt: new Date()
      };
      this.persistData(); // Save after updating product
      return this.products[index];
    }
    return null;
  }

  deleteProduct(id: string): void {
    const index = this.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.products.splice(index, 1);
      this.persistData(); // Save after deleting product
    }
  }

  getProductByCode(code: string): Product | undefined {
    return this.products.find(p => p.code === code);
  }

  // Stock In
  addStockIn(stockData: any): StockInEntry {
    const stockEntry: StockInEntry = {
      ...stockData,
      id: uuidv4(),
      date: typeof stockData.date === 'string' ? new Date(stockData.date) : stockData.date,
      expiryDate: stockData.expiryDate ? (typeof stockData.expiryDate === 'string' ? new Date(stockData.expiryDate) : stockData.expiryDate) : undefined,
      remainingQuantity: stockData.quantity,
      entryType: stockData.entryType || 'purchase', // Default to 'purchase' for backward compatibility
      notes: stockData.notes || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.stockInEntries.push(stockEntry);

    // Add transaction record with different description based on entry type
    const transactionDescription = stockEntry.entryType === 'opening_stock' 
      ? `Opening Stock: ${stockEntry.productName} (${stockEntry.quantity} units)`
      : `Stock In: ${stockEntry.productName} (${stockEntry.quantity} units)`;

    // For opening stock, we need to record it as assets, not expenses
    // This represents initial capital invested in inventory
    if (stockEntry.entryType === 'opening_stock') {
      // Record as Inventory Asset (debit) and Owner's Capital (credit)
      this.addTransaction({
        type: 'opening_stock' as const,
        category: 'Assets - Opening Stock Inventory',
        description: transactionDescription,
        reference: stockEntry.id,
        debitAmount: stockEntry.quantity * stockEntry.purchasePrice, // Asset increase
        creditAmount: 0,
        date: stockEntry.date
      });

      // Record the corresponding capital/equity entry
      this.addTransaction({
        type: 'opening_stock' as const,
        category: 'Owner Capital - Opening Stock',
        description: `Capital Investment: ${transactionDescription}`,
        reference: stockEntry.id,
        debitAmount: 0,
        creditAmount: stockEntry.quantity * stockEntry.purchasePrice, // Capital increase
        date: stockEntry.date
      });
    } else {
      // Regular stock purchase - expense transaction
      this.addTransaction({
        type: 'stock_in' as const,
        category: 'Inventory',
        description: transactionDescription,
        reference: stockEntry.id,
        debitAmount: stockEntry.quantity * stockEntry.purchasePrice,
        creditAmount: 0,
        date: stockEntry.date
      });
    }

    this.persistData(); // Save after adding stock entry
    return stockEntry;
  }

  getStockInEntries(): StockInEntry[] {
    return this.stockInEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  deleteStockInEntry(id: string): void {
    const index = this.stockInEntries.findIndex(entry => entry.id === id);
    if (index !== -1) {
      this.stockInEntries.splice(index, 1);
      this.persistData(); // Save after deleting stock entry
    }
  }

  // Stock Out with FIFO processing
  addStockOut(stockData: any): StockOutEntry {
    const fifoResult = this.calculateFIFOCost(stockData.productCode, stockData.quantity);
    const totalSale = stockData.quantity * stockData.sellingPrice;
    const profit = totalSale - fifoResult.totalCost;

    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
    if (stockData.amountPaid < totalSale) {
      paymentStatus = stockData.amountPaid > 0 ? 'partial' : 'unpaid';
    }

    const stockOutEntry: StockOutEntry = {
      ...stockData,
      id: uuidv4(),
      date: typeof stockData.date === 'string' ? new Date(stockData.date) : stockData.date,
      totalCost: fifoResult.totalCost,
      totalSale: totalSale,
      profit: profit,
      paymentStatus: paymentStatus,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.stockOutEntries.push(stockOutEntry);
    this.updateStockQuantities(fifoResult.usedBatches);

    // Add transaction record
    this.addTransaction({
      type: 'stock_out',
      category: 'Sales',
      description: `Sale: ${stockOutEntry.productName} to ${stockOutEntry.customerName}`,
      reference: stockOutEntry.id,
      debitAmount: 0,
      creditAmount: totalSale,
      date: stockOutEntry.date
    });

    // Create customer debt if underpaid
    if (stockData.amountPaid < totalSale) {
      this.createCustomerDebt(stockOutEntry);
    }

    this.persistData(); // Save after adding stock out entry
    return stockOutEntry;
  }

  getStockOutEntries(): StockOutEntry[] {
    return this.stockOutEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  deleteStockOutEntry(id: string): void {
    const index = this.stockOutEntries.findIndex(entry => entry.id === id);
    if (index !== -1) {
      this.stockOutEntries.splice(index, 1);
      this.persistData(); // Save after deleting stock out entry
    }
  }

  // Customer Debts
  createCustomerDebt(stockOutEntry: StockOutEntry): CustomerDebt {
    const debt: CustomerDebt = {
      id: uuidv4(),
      saleId: stockOutEntry.id,
      saleDate: stockOutEntry.date,
      customerName: stockOutEntry.customerName,
      customerContact: stockOutEntry.customerContact,
      productCode: stockOutEntry.productCode,
      productName: stockOutEntry.productName,
      quantity: stockOutEntry.quantity,
      totalSale: stockOutEntry.totalSale,
      amountPaid: stockOutEntry.amountPaid,
      balance: stockOutEntry.totalSale - stockOutEntry.amountPaid,
      paymentReceived: 0,
      remainingBalance: stockOutEntry.totalSale - stockOutEntry.amountPaid,
      dueDate: stockOutEntry.dueDate,
      status: 'unpaid',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customerDebts.push(debt);
    return debt;
  }

  getCustomerDebts(): CustomerDebt[] {
    try {
      return this.customerDebts.sort((a, b) => {
        // Ensure both dates exist and are valid
        const dateA = a.saleDate instanceof Date ? a.saleDate.getTime() : 0;
        const dateB = b.saleDate instanceof Date ? b.saleDate.getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error getting customer debts:', error);
      return [];
    }
  }

  deleteCustomerDebt(id: string): void {
    const index = this.customerDebts.findIndex(d => d.id === id);
    if (index !== -1) {
      this.customerDebts.splice(index, 1);
      this.persistData(); // Save after deleting customer debt
    }
  }

  getDebtsByCustomer(customerName: string): CustomerDebt[] {
    try {
      return this.customerDebts.filter(debt => 
        debt.customerName && debt.customerName.toLowerCase().includes(customerName.toLowerCase())
      );
    } catch (error) {
      console.error('Error getting debts by customer:', error);
      return [];
    }
  }

  // Payments
  addPayment(paymentData: Omit<Payment, 'id' | 'createdAt'>): Payment {
    const payment: Payment = {
      ...paymentData,
      id: uuidv4(),
      createdAt: new Date()
    };
    this.payments.push(payment);

    // Update customer debt
    const debt = this.customerDebts.find(d => d.id === payment.debtId);
    if (debt) {
      debt.paymentReceived += payment.amount;
      debt.remainingBalance = debt.totalSale - (debt.amountPaid + debt.paymentReceived);
      debt.status = debt.remainingBalance <= 0 ? 'paid' : 'unpaid';
      debt.updatedAt = new Date();
    }

    // Add transaction record
    this.addTransaction({
      type: 'payment_received',
      category: 'Payments',
      description: `Payment from ${payment.customerName}`,
      reference: payment.id,
      debitAmount: 0,
      creditAmount: payment.amount,
      date: payment.paymentDate
    });

    this.persistData(); // Save after adding payment
    return payment;
  }

  getPayments(): Payment[] {
    try {
      return this.payments.sort((a, b) => {
        const dateA = a.paymentDate instanceof Date ? a.paymentDate.getTime() : new Date(a.paymentDate).getTime();
        const dateB = b.paymentDate instanceof Date ? b.paymentDate.getTime() : new Date(b.paymentDate).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error sorting payments:', error);
      return this.payments;
    }
  }

  deletePayment(id: string): void {
    const index = this.payments.findIndex(payment => payment.id === id);
    if (index !== -1) {
      this.payments.splice(index, 1);
      this.persistData(); // Save after deleting payment
    }
  }

  // Transactions
  addTransaction(transactionData: Omit<Transaction, 'id' | 'balance' | 'createdAt'>): Transaction {
    const lastBalance = this.transactions.length > 0 ? 
      this.transactions[this.transactions.length - 1].balance : 0;
    
    const newBalance = lastBalance + transactionData.creditAmount - transactionData.debitAmount;

    const transaction: Transaction = {
      ...transactionData,
      id: uuidv4(),
      date: transactionData.date instanceof Date ? transactionData.date : new Date(transactionData.date),
      balance: newBalance,
      createdAt: new Date()
    };
    this.transactions.push(transaction);
    this.persistData(); // Save after adding transaction
    return transaction;
  }

  getTransactions(limit?: number): Transaction[] {
    try {
      const sorted = this.transactions.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      });
      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      console.error('Error sorting transactions:', error);
      return this.transactions.slice(0, limit || this.transactions.length);
    }
  }

  deleteTransaction(id: string): void {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transactions.splice(index, 1);
      this.persistData(); // Save after deleting transaction
    }
  }

  // Dashboard Stats
  getDashboardStats(): DashboardStats {
    try {
      const totalProducts = this.products.length;
      const totalStockValue = this.stockInEntries.reduce((sum, entry) => 
        sum + (entry.remainingQuantity * entry.purchasePrice), 0);
      const totalSales = this.stockOutEntries.reduce((sum, entry) => sum + entry.totalSale, 0);
      const totalProfit = this.stockOutEntries.reduce((sum, entry) => sum + entry.profit, 0);
      const totalDebts = this.customerDebts.reduce((sum, debt) => sum + debt.remainingBalance, 0);
      const totalPayables = this.generalDebts
        .filter(debt => debt.type === 'payable' && debt.status !== 'paid')
        .reduce((sum, debt) => sum + debt.remainingBalance, 0);
      const totalReceivables = this.generalDebts
        .filter(debt => debt.type === 'receivable' && debt.status !== 'paid')
        .reduce((sum, debt) => sum + debt.remainingBalance, 0);
      
      const lowStockItems = this.getInventorySummary().filter(item => item.totalQuantity < 10).length;
      const recentTransactions = this.getTransactions(10);

      // Sales by category
      const salesByCategory = this.products.map(product => {
        const sales = this.stockOutEntries
          .filter(entry => entry.productCode === product.code)
          .reduce((sum, entry) => sum + entry.totalSale, 0);
        return { category: product.category, value: sales };
      });

      // Profit by month (last 6 months)
      const profitByMonth: Array<{ month: string; profit: number }> = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const monthProfit = this.stockOutEntries
          .filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() === date.getMonth() && entryDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, entry) => sum + entry.profit, 0);
        profitByMonth.push({ month: monthName, profit: monthProfit });
      }

      return {
        totalProducts,
        totalStockValue,
        totalSales,
        totalProfit,
        totalDebts,
        totalPayables,
        totalReceivables,
        lowStockItems,
        recentTransactions,
        salesByCategory,
        profitByMonth
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      throw error;
    }
  }

  // Inventory Summary
  getInventorySummary(): Array<{
    productCode: string;
    productName: string;
    totalQuantity: number;
    totalValue: number;
    averagePrice: number;
  }> {
    const inventory = new Map();
    
    this.stockInEntries.forEach(entry => {
      if (entry.remainingQuantity > 0) {
        const key = entry.productCode;
        if (!inventory.has(key)) {
          inventory.set(key, {
            productCode: entry.productCode,
            productName: entry.productName,
            totalQuantity: 0,
            totalValue: 0
          });
        }
        const item = inventory.get(key);
        item.totalQuantity += entry.remainingQuantity;
        item.totalValue += entry.remainingQuantity * entry.purchasePrice;
      }
    });

    return Array.from(inventory.values()).map(item => ({
      ...item,
      averagePrice: item.totalQuantity > 0 ? item.totalValue / item.totalQuantity : 0
    }));
  }

  // General Debts Management
  addGeneralDebt(debtData: Omit<GeneralDebt, 'id' | 'createdAt' | 'updatedAt'>): GeneralDebt {
    const debt: GeneralDebt = {
      ...debtData,
      id: uuidv4(),
      issueDate: debtData.issueDate instanceof Date ? debtData.issueDate : new Date(debtData.issueDate),
      dueDate: debtData.dueDate ? (debtData.dueDate instanceof Date ? debtData.dueDate : new Date(debtData.dueDate)) : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.generalDebts.push(debt);

    // Add transaction record based on debt type
    if (debt.type === 'payable') {
      // We owe money - this is a liability (credit)
      this.addTransaction({
        type: 'debt_created',
        category: `Accounts Payable - ${debt.category}`,
        description: `Debt created: ${debt.description} (${debt.creditorName})`,
        reference: debt.id,
        debitAmount: debt.originalAmount, // Expense or asset
        creditAmount: 0,
        date: debt.issueDate
      });
    } else {
      // Someone owes us - this is an asset (debit)
      this.addTransaction({
        type: 'debt_created',
        category: `Accounts Receivable - ${debt.category}`,
        description: `Receivable created: ${debt.description} (${debt.creditorName})`,
        reference: debt.id,
        debitAmount: 0,
        creditAmount: debt.originalAmount, // Income or receivable
        date: debt.issueDate
      });
    }

    this.persistData(); // Save after adding general debt
    return debt;
  }

  getGeneralDebts(): GeneralDebt[] {
    return this.generalDebts.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());
  }

  getGeneralDebtsByType(type: 'payable' | 'receivable'): GeneralDebt[] {
    return this.generalDebts
      .filter(debt => debt.type === type)
      .sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());
  }

  updateGeneralDebt(id: string, updates: Partial<Omit<GeneralDebt, 'id' | 'createdAt'>>): GeneralDebt {
    const debt = this.generalDebts.find(d => d.id === id);
    if (!debt) {
      throw new Error('General debt not found');
    }

    Object.assign(debt, updates, { updatedAt: new Date() });
    return debt;
  }

  deleteGeneralDebt(id: string): void {
    const index = this.generalDebts.findIndex(d => d.id === id);
    if (index !== -1) {
      this.generalDebts.splice(index, 1);
    }
  }

  // General Debt Payments
  addGeneralDebtPayment(paymentData: Omit<GeneralDebtPayment, 'id' | 'createdAt'>): GeneralDebtPayment {
    const payment: GeneralDebtPayment = {
      ...paymentData,
      id: uuidv4(),
      createdAt: new Date()
    };
    this.generalDebtPayments.push(payment);

    // Update debt balance
    const debt = this.generalDebts.find(d => d.id === payment.debtId);
    if (debt) {
      debt.paidAmount += payment.amount;
      debt.remainingBalance = debt.originalAmount - debt.paidAmount;
      debt.status = debt.remainingBalance <= 0 ? 'paid' : 'active';
      debt.updatedAt = new Date();

      // Add transaction record
      if (debt.type === 'payable') {
        // We paid someone - reduce our liability
        this.addTransaction({
          type: 'payment_made',
          category: `Accounts Payable - ${debt.category}`,
          description: `Payment to ${debt.creditorName} for ${debt.description}`,
          reference: payment.id,
          debitAmount: 0,
          creditAmount: payment.amount,
          date: payment.paymentDate
        });
      } else {
        // Someone paid us - reduce our receivable
        this.addTransaction({
          type: 'payment_received',
          category: `Accounts Receivable - ${debt.category}`,
          description: `Payment from ${debt.creditorName} for ${debt.description}`,
          reference: payment.id,
          debitAmount: payment.amount,
          creditAmount: 0,
          date: payment.paymentDate
        });
      }
    }

    return payment;
  }

  getGeneralDebtPayments(): GeneralDebtPayment[] {
    return this.generalDebtPayments.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
  }

  getPaymentsByDebtId(debtId: string): GeneralDebtPayment[] {
    return this.generalDebtPayments
      .filter(payment => payment.debtId === debtId)
      .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
  }

  deleteGeneralDebtPayment(id: string): void {
    const payment = this.generalDebtPayments.find(p => p.id === id);
    if (payment) {
      // Update debt balance
      const debt = this.generalDebts.find(d => d.id === payment.debtId);
      if (debt) {
        debt.paidAmount -= payment.amount;
        debt.remainingBalance = debt.originalAmount - debt.paidAmount;
        debt.status = debt.remainingBalance <= 0 ? 'paid' : 'active';
        debt.updatedAt = new Date();
      }

      // Remove payment
      const index = this.generalDebtPayments.findIndex(p => p.id === id);
      if (index !== -1) {
        this.generalDebtPayments.splice(index, 1);
      }
    }
  }

  // Initialize with sample data
  private async initializeSampleData(): Promise<void> {
    // Add sample products
    const products = [
      { code: 'RICE001', name: 'Basmati Rice 5kg', category: 'Grains', unit: 'kg' },
      { code: 'OIL001', name: 'Cooking Oil 1L', category: 'Oils', unit: 'L' },
      { code: 'SUGAR001', name: 'White Sugar 2kg', category: 'Sweeteners', unit: 'kg' },
      { code: 'FLOUR001', name: 'Wheat Flour 10kg', category: 'Grains', unit: 'kg' },
      { code: 'TEA001', name: 'Black Tea 500g', category: 'Beverages', unit: 'g' }
    ];

    products.forEach(product => this.addProduct(product));

    // Add opening stock entries (existing inventory at business start)
    const openingStockData = [
      { 
        date: new Date('2024-06-01'), 
        productCode: 'RICE001', 
        productName: 'Basmati Rice 5kg', 
        quantity: 50, 
        purchasePrice: 8.00, 
        supplierName: 'Previous Supplier', 
        entryType: 'opening_stock',
        notes: 'Opening inventory - valued at cost'
      },
      { 
        date: new Date('2024-06-01'), 
        productCode: 'OIL001', 
        productName: 'Cooking Oil 1L', 
        quantity: 25, 
        purchasePrice: 3.50, 
        supplierName: 'Original Stock', 
        entryType: 'opening_stock',
        notes: 'Initial stock from previous business'
      },
      { 
        date: new Date('2024-06-01'), 
        productCode: 'SUGAR001', 
        productName: 'White Sugar 2kg', 
        quantity: 30, 
        purchasePrice: 2.00, 
        supplierName: 'Opening Balance', 
        entryType: 'opening_stock',
        notes: 'Starting inventory valuation'
      }
    ];

    openingStockData.forEach(data => {
      const stockEntry = { ...data, productId: this.getProductByCode(data.productCode)?.id || '' };
      this.addStockIn(stockEntry);
    });

    // Add sample stock in entries (regular purchases)
    const stockInData = [
      { date: new Date('2024-07-01'), productCode: 'RICE001', productName: 'Basmati Rice 5kg', quantity: 100, purchasePrice: 8.50, supplierName: 'ABC Suppliers', entryType: 'purchase' },
      { date: new Date('2024-07-05'), productCode: 'OIL001', productName: 'Cooking Oil 1L', quantity: 50, purchasePrice: 3.75, supplierName: 'XYZ Trading', entryType: 'purchase' },
      { date: new Date('2024-07-10'), productCode: 'SUGAR001', productName: 'White Sugar 2kg', quantity: 75, purchasePrice: 2.20, supplierName: 'Sugar Mills Ltd', entryType: 'purchase' },
      { date: new Date('2024-07-15'), productCode: 'FLOUR001', productName: 'Wheat Flour 10kg', quantity: 60, purchasePrice: 12.00, supplierName: 'Flour Factory', entryType: 'purchase' },
      { date: new Date('2024-07-20'), productCode: 'TEA001', productName: 'Black Tea 500g', quantity: 80, purchasePrice: 4.50, supplierName: 'Tea Gardens', entryType: 'purchase' }
    ];

    stockInData.forEach(data => {
      const stockEntry = { ...data, productId: this.getProductByCode(data.productCode)?.id || '', entryType: data.entryType || 'purchase' };
      this.addStockIn(stockEntry);
    });

    // Add sample stock out entries
    const stockOutData = [
      { date: new Date('2024-07-02'), productCode: 'RICE001', productName: 'Basmati Rice 5kg', quantity: 10, sellingPrice: 12.00, customerName: 'John Doe', amountPaid: 120.00 },
      { date: new Date('2024-07-06'), productCode: 'OIL001', productName: 'Cooking Oil 1L', quantity: 5, sellingPrice: 5.50, customerName: 'Jane Smith', amountPaid: 20.00 }, // Partial payment
      { date: new Date('2024-07-12'), productCode: 'SUGAR001', productName: 'White Sugar 2kg', quantity: 8, sellingPrice: 3.20, customerName: 'Bob Johnson', amountPaid: 25.60 },
      { date: new Date('2024-07-18'), productCode: 'FLOUR001', productName: 'Wheat Flour 10kg', quantity: 3, sellingPrice: 18.00, customerName: 'Alice Brown', amountPaid: 0 }, // No payment
      { date: new Date('2024-07-22'), productCode: 'TEA001', productName: 'Black Tea 500g', quantity: 12, sellingPrice: 6.80, customerName: 'Charlie Wilson', amountPaid: 81.60 }
    ];

    stockOutData.forEach(data => {
      const stockOutEntry = {
        ...data,
        productId: this.getProductByCode(data.productCode)?.id || '',
        customerContact: '',
        dueDate: new Date(data.date.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from sale date
        notes: ''
      };
      this.addStockOut(stockOutEntry);
    });

    // Add sample payments for partial payments
    const payments = [
      { debtId: '', customerName: 'Jane Smith', amount: 7.50, paymentDate: new Date('2024-07-08'), paymentMethod: 'cash' as const, notes: 'Partial payment for oil purchase' },
      { debtId: '', customerName: 'Alice Brown', amount: 30.00, paymentDate: new Date('2024-07-25'), paymentMethod: 'bank_transfer' as const, notes: 'Partial payment for flour' }
    ];

    // Update debt IDs and add payments
    payments.forEach((payment, index) => {
      const debt = this.customerDebts[index];
      if (debt) {
        payment.debtId = debt.id;
        this.addPayment(payment);
      }
    });

    // Add sample general debts
    const generalDebts = [
      // Payables (Money we owe)
      {
        type: 'payable' as const,
        category: 'Supplier',
        description: 'Bulk rice purchase from Main Supplier',
        creditorName: 'Main Rice Supplier Ltd',
        creditorContact: '(02) 123-4567',
        originalAmount: 15000.00,
        paidAmount: 5000.00,
        remainingBalance: 10000.00,
        dueDate: new Date('2025-09-15'),
        issueDate: new Date('2025-07-15'),
        priority: 'high' as const,
        status: 'active' as const,
        notes: 'Monthly bulk purchase agreement',
        reference: 'INV-2025-001'
      },
      {
        type: 'payable' as const,
        category: 'Utility',
        description: 'Electricity bill for July 2025',
        creditorName: 'City Electric Company',
        originalAmount: 2500.00,
        paidAmount: 0,
        remainingBalance: 2500.00,
        dueDate: new Date('2025-08-20'),
        issueDate: new Date('2025-07-20'),
        priority: 'medium' as const,
        status: 'active' as const,
        reference: 'ELEC-2025-07'
      },
      {
        type: 'payable' as const,
        category: 'Loan',
        description: 'Business loan monthly payment',
        creditorName: 'First National Bank',
        creditorContact: '1-800-BANK-123',
        originalAmount: 8000.00,
        paidAmount: 0,
        remainingBalance: 8000.00,
        dueDate: new Date('2025-08-10'),
        issueDate: new Date('2025-07-10'),
        priority: 'high' as const,
        status: 'active' as const,
        notes: 'Monthly installment for equipment loan',
        reference: 'LOAN-2025-08'
      },
      // Receivables (Money others owe us)
      {
        type: 'receivable' as const,
        category: 'Personal Loan',
        description: 'Personal loan to employee John',
        creditorName: 'John Martinez',
        creditorContact: '(02) 987-6543',
        originalAmount: 5000.00,
        paidAmount: 1000.00,
        remainingBalance: 4000.00,
        dueDate: new Date('2025-12-31'),
        issueDate: new Date('2025-06-01'),
        priority: 'low' as const,
        status: 'active' as const,
        notes: 'Emergency personal loan, payable in installments',
        reference: 'PLOAN-001'
      },
      {
        type: 'receivable' as const,
        category: 'Advance',
        description: 'Cash advance to supplier for bulk order',
        creditorName: 'Premium Oils Trading',
        creditorContact: '(02) 555-0123',
        originalAmount: 3000.00,
        paidAmount: 0,
        remainingBalance: 3000.00,
        dueDate: new Date('2025-09-01'),
        issueDate: new Date('2025-07-01'),
        priority: 'medium' as const,
        status: 'active' as const,
        notes: 'Advance payment for premium oil delivery',
        reference: 'ADV-2025-001'
      }
    ];

    generalDebts.forEach(debt => this.addGeneralDebt(debt));

    // Add sample payments for general debts
    const generalPayments = [
      {
        debtId: this.generalDebts[0]?.id || '', // Rice supplier payment
        amount: 5000.00,
        paymentDate: new Date('2025-07-25'),
        paymentMethod: 'bank_transfer' as const,
        reference: 'TXN-2025-001',
        notes: 'First installment payment'
      },
      {
        debtId: this.generalDebts[3]?.id || '', // John's loan payment
        amount: 1000.00,
        paymentDate: new Date('2025-07-01'),
        paymentMethod: 'cash' as const,
        notes: 'First payment on personal loan'
      }
    ];

    generalPayments.forEach(payment => {
      if (payment.debtId) {
        this.addGeneralDebtPayment(payment);
      }
    });

    // Create default users
    await this.initializeDefaultUsers();
  }

  private async initializeDefaultUsers(): Promise<void> {
    console.log('🔧 Creating default users...');
    try {
      // Create default admin user
      await this.createUser({
        username: 'admin',
        email: 'admin@stockmanagement.com',
        password: 'admin123',
        role: 'admin',
        fullName: 'System Administrator',
        isActive: true
      });
      console.log('✅ Admin user created');

      // Create sample sales user
      await this.createUser({
        username: 'sales01',
        email: 'sales@stockmanagement.com',
        password: 'sales123',
        role: 'sales',
        fullName: 'Sales Representative',
        isActive: true
      });
      console.log('✅ Sales user created');

      // Create sample cashier user
      await this.createUser({
        username: 'cashier01',
        email: 'cashier@stockmanagement.com',
        password: 'cashier123',
        role: 'cashier',
        fullName: 'Cashier',
        isActive: true
      });
      console.log('✅ Cashier user created');

      console.log('✅ All default users created successfully');
    } catch (error) {
      console.error('❌ Error creating default users:', error);
    }
  }

  // Get opening capital information
  getOpeningCapital(): { totalOpeningStock: number; openingStockEntries: any[] } {
    const openingStockEntries = this.stockInEntries.filter(entry => entry.entryType === 'opening_stock');
    const totalOpeningStock = openingStockEntries.reduce((total, entry) => {
      return total + (entry.quantity * entry.purchasePrice);
    }, 0);

    return {
      totalOpeningStock,
      openingStockEntries: openingStockEntries.map(entry => ({
        id: entry.id,
        date: entry.date,
        productName: entry.productName,
        quantity: entry.quantity,
        purchasePrice: entry.purchasePrice,
        totalValue: entry.quantity * entry.purchasePrice,
        notes: entry.notes
      }))
    };
  }

  // User Management Methods
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>): Promise<User> {
    // Check if username already exists
    const existingUser = this.users.find(u => u.username === userData.username || u.email === userData.email);
    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    // Hash the password
    const hashedPassword = await hashPassword(userData.password);

    const user: User = {
      ...userData,
      id: uuidv4(),
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.push(user);
    await this.persistData();
    return user;
  }

  async authenticateUser(credentials: LoginRequest): Promise<Omit<User, 'password'> | null> {
    console.log(`🔍 Authentication attempt for username: ${credentials.username}`);
    console.log(`🔍 Total users in system: ${this.users.length}`);
    console.log(`🔍 Available usernames: ${this.users.map(u => u.username).join(', ')}`);
    
    const user = this.users.find(u => u.username === credentials.username && u.isActive);
    if (!user) {
      console.log(`❌ User not found or inactive: ${credentials.username}`);
      return null;
    }

    console.log(`✅ User found: ${user.username}, checking password...`);
    const isPasswordValid = await verifyPassword(credentials.password, user.password);
    if (!isPasswordValid) {
      console.log(`❌ Invalid password for user: ${credentials.username}`);
      return null;
    }

    console.log(`✅ Authentication successful for user: ${credentials.username}`);
    // Update last login
    user.lastLogin = new Date();
    await this.persistData();

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  getUsers(): Omit<User, 'password'>[] {
    return this.users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  getUserById(id: string): Omit<User, 'password'> | null {
    const user = this.users.find(u => u.id === id);
    if (!user) return null;
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'password'>>): Promise<Omit<User, 'password'> | null> {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      updatedAt: new Date()
    };

    await this.persistData();
    const { password, ...userWithoutPassword } = this.users[userIndex];
    return userWithoutPassword;
  }

  async deleteUser(id: string): Promise<boolean> {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) return false;

    // Don't allow deleting the last admin user
    const user = this.users[userIndex];
    if (user.role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin' && u.isActive).length;
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    this.users.splice(userIndex, 1);
    await this.persistData();
    return true;
  }

  async changePassword(id: string, newPassword: string): Promise<boolean> {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) return false;

    const hashedPassword = await hashPassword(newPassword);
    this.users[userIndex].password = hashedPassword;
    this.users[userIndex].updatedAt = new Date();

    await this.persistData();
    return true;
  }

  // Data Persistence Methods
  private async loadData(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.ensureDir(DATA_DIR);
      
      // Check if data file exists
      if (await fs.pathExists(DATA_FILE)) {
        console.log('Loading existing business data...');
        const data = await fs.readJson(DATA_FILE);
        
        // Restore data with date conversion
        this.products = data.products || [];
        this.stockInEntries = (data.stockInEntries || []).map((entry: any) => ({
          ...entry,
          date: new Date(entry.date)
        }));
        this.stockOutEntries = (data.stockOutEntries || []).map((entry: any) => ({
          ...entry,
          date: new Date(entry.date)
        }));
        this.customerDebts = (data.customerDebts || []).map((debt: any) => ({
          id: debt.id,
          saleId: debt.saleId,
          saleDate: debt.saleDate ? new Date(debt.saleDate) : new Date(),
          customerName: debt.customerName || '',
          customerContact: debt.customerContact || '',
          productCode: debt.productCode || '',
          productName: debt.productName || '',
          quantity: debt.quantity || 0,
          totalSale: debt.totalSale || 0,
          amountPaid: debt.amountPaid || 0,
          balance: debt.balance || 0,
          paymentReceived: debt.paymentReceived || 0,
          remainingBalance: debt.remainingBalance || 0,
          dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
          status: debt.status || 'unpaid',
          createdAt: debt.createdAt ? new Date(debt.createdAt) : new Date(),
          updatedAt: debt.updatedAt ? new Date(debt.updatedAt) : new Date()
        }));
        this.payments = (data.payments || []).map((payment: any) => ({
          ...payment,
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
          createdAt: payment.createdAt ? new Date(payment.createdAt) : new Date()
        }));
        this.generalDebts = (data.generalDebts || []).map((debt: any) => ({
          ...debt,
          issueDate: debt.issueDate ? new Date(debt.issueDate) : new Date(),
          dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
          createdAt: debt.createdAt ? new Date(debt.createdAt) : new Date(),
          updatedAt: debt.updatedAt ? new Date(debt.updatedAt) : new Date()
        }));
        this.generalDebtPayments = (data.generalDebtPayments || []).map((payment: any) => ({
          ...payment,
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
          createdAt: payment.createdAt ? new Date(payment.createdAt) : new Date()
        }));
        this.transactions = (data.transactions || []).map((transaction: any) => ({
          ...transaction,
          date: new Date(transaction.date)
        }));
        this.users = (data.users || []).map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
        }));
        
        console.log(`Loaded ${this.products.length} products, ${this.stockInEntries.length} stock entries, ${this.transactions.length} transactions, ${this.users.length} users`);
        
        // Check if we need to create default users (even if other data exists)
        if (this.users.length === 0) {
          console.log('No users found in existing data. Creating default users...');
          await this.initializeDefaultUsers();
          await this.saveData();
        }
      } else {
        console.log('No existing data found. Initializing with sample data...');
        await this.initializeSampleData();
        await this.saveData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      console.log('Falling back to sample data...');
      await this.initializeSampleData();
    }
  }

  private async saveData(): Promise<void> {
    try {
      await fs.ensureDir(DATA_DIR);
      
      const dataToSave: PersistedData = {
        products: this.products,
        stockInEntries: this.stockInEntries,
        stockOutEntries: this.stockOutEntries,
        customerDebts: this.customerDebts,
        payments: this.payments,
        generalDebts: this.generalDebts,
        generalDebtPayments: this.generalDebtPayments,
        transactions: this.transactions,
        users: this.users,
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeJson(DATA_FILE, dataToSave, { spaces: 2 });
      console.log('Business data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // Call this method after any data modification
  private async persistData(): Promise<void> {
    await this.saveData();
  }

  // Backup and restore methods for safe updates
  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(DATA_DIR, `backup-${timestamp}.json`);
      
      const dataToBackup: PersistedData = {
        products: this.products,
        stockInEntries: this.stockInEntries,
        stockOutEntries: this.stockOutEntries,
        customerDebts: this.customerDebts,
        payments: this.payments,
        generalDebts: this.generalDebts,
        generalDebtPayments: this.generalDebtPayments,
        transactions: this.transactions,
        users: this.users,
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeJson(backupFile, dataToBackup, { spaces: 2 });
      console.log(`✅ Backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      console.error('❌ Error creating backup:', error);
      throw error;
    }
  }

  async exportData(): Promise<PersistedData> {
    return {
      products: this.products,
      stockInEntries: this.stockInEntries,
      stockOutEntries: this.stockOutEntries,
      customerDebts: this.customerDebts,
      payments: this.payments,
      generalDebts: this.generalDebts,
      generalDebtPayments: this.generalDebtPayments,
      transactions: this.transactions,
      users: this.users.map(user => ({ ...user, password: '[REDACTED]' })) as any,
      lastUpdated: new Date().toISOString()
    };
  }
}

export { DataService };
export const dataService = new DataService();
