// Types for the stock management system

// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // Will be hashed
  role: 'admin' | 'sales' | 'cashier';
  fullName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface AuthenticatedRequest {
  user: Omit<User, 'password'>;
}

// Product Types
export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockInEntry {
  id: string;
  date: Date;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  supplierName?: string;
  batchNumber?: string;
  expiryDate?: Date;
  remainingQuantity: number; // For FIFO tracking
  entryType: 'purchase' | 'opening_stock'; // New field to distinguish entry types
  notes?: string; // Additional notes field
  createdAt: Date;
  updatedAt: Date;
}

export interface StockOutEntry {
  id: string;
  date: Date;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  customerName: string;
  customerContact?: string;
  totalCost: number; // Calculated using FIFO
  totalSale: number;
  profit: number;
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  dueDate?: Date;
  notes?: string;
  // New fields for multi-product sales
  saleGroupId?: string; // Groups related sale items together
  isMultiProductSale?: boolean; // Indicates if this is part of a multi-product sale
  allocatedPayment?: number; // Payment amount allocated to this specific product
  createdAt: Date;
  updatedAt: Date;
}

// New interfaces for multi-product sales
export interface MultiProductSaleItem {
  productCode: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  totalSale: number;
  allocatedPayment: number;
}

export interface MultiProductSale {
  date: Date;
  customerName: string;
  customerContact?: string;
  items: MultiProductSaleItem[];
  totalSaleAmount: number;
  totalAmountPaid: number;
  paymentAllocation: 'proportional' | 'manual';
  dueDate?: Date;
  notes?: string;
}

export interface CustomerDebt {
  id: string;
  saleId: string; // References StockOutEntry
  saleDate: Date;
  customerName: string;
  customerContact?: string;
  productCode: string;
  productName: string;
  quantity: number;
  totalSale: number;
  amountPaid: number;
  balance: number;
  paymentReceived: number;
  remainingBalance: number;
  dueDate?: Date;
  status: 'paid' | 'unpaid' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  debtId: string; // References CustomerDebt
  customerName: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  reference?: string;
  notes?: string;
  createdAt: Date;
}

// Multi-Payment Types
export interface MultiPaymentDebtItem {
  debtId: string;
  customerName: string;
  productName: string;
  totalDebt: number;
  remainingBalance: number;
  allocatedPayment: number;
}

export interface MultiPayment {
  customerName: string;
  debts: MultiPaymentDebtItem[];
  totalAmountPaid: number;
  paymentAllocation: 'proportional' | 'manual';
  paymentDate: Date;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  reference?: string;
  notes?: string;
}

export interface GeneralDebt {
  id: string;
  type: 'payable' | 'receivable'; // payable = we owe, receivable = they owe us
  category: string; // e.g., 'Supplier', 'Loan', 'Utility', 'Personal Loan', 'Advance', etc.
  description: string;
  creditorName: string; // Who we owe or who owes us
  creditorContact?: string;
  originalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  dueDate?: Date;
  issueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  reference?: string;
  isOpeningBalance?: boolean; // Flag for opening balance receivables
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneralDebtPayment {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  reference?: string;
  notes?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  date: Date;
  type: 'stock_in' | 'stock_out' | 'opening_stock' | 'opening_balance' | 'payment_received' | 'payment_made' | 'debt_created' | 'expense' | 'adjustment';
  category: string;
  description: string;
  reference?: string; // References to original entry (stock in/out, payment, etc.)
  debitAmount: number;
  creditAmount: number;
  balance: number;
  createdAt: Date;
}

export interface InventoryBatch {
  stockInId: string;
  productCode: string;
  quantity: number;
  purchasePrice: number;
  remainingQuantity: number;
  date: Date;
}

export interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  totalSales: number;
  totalProfit: number;
  totalDebts: number;
  totalPayables: number;
  totalReceivables: number;
  lowStockItems: number;
  recentTransactions: Transaction[];
  salesByCategory: Array<{ category: string; value: number }>;
  profitByMonth: Array<{ month: string; profit: number }>;
}

export interface FIFOResult {
  totalCost: number;
  usedBatches: Array<{
    stockInId: string;
    quantityUsed: number;
    pricePerUnit: number;
    cost: number;
  }>;
}
