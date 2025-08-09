// Frontend types that match the backend types

// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'sales' | 'cashier';
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

// Product Types
export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockInEntry {
  id: string;
  date: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  supplierName?: string;
  batchNumber?: string;
  expiryDate?: string;
  remainingQuantity: number;
  entryType: 'purchase' | 'opening_stock'; // New field to distinguish entry types
  notes?: string; // Additional notes field
  createdAt: string;
  updatedAt: string;
}

export interface StockOutEntry {
  id: string;
  date: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  customerName: string;
  customerContact?: string;
  totalCost: number;
  totalSale: number;
  profit: number;
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDebt {
  id: string;
  saleId: string;
  saleDate: string;
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
  dueDate?: string;
  status: 'paid' | 'unpaid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  debtId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'stock_in' | 'stock_out' | 'opening_stock' | 'opening_balance' | 'payment_received' | 'payment_made' | 'debt_created' | 'expense' | 'adjustment';
  category: string;
  description: string;
  reference?: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  createdAt: string;
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
  dueDate?: string;
  issueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralDebtPayment {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  reference?: string;
  notes?: string;
  createdAt: string;
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

export interface InventoryItem {
  productCode: string;
  productName: string;
  totalQuantity: number;
  totalValue: number;
  averagePrice: number;
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

// Customer Management Types
export interface Customer {
  name: string;
  totalSales: number;
  totalDebt: number;
  lastTransaction: string | null;
  status: 'active' | 'inactive';
}

export interface CustomerSearchResult {
  name: string;
  type: 'sales_customer' | 'general_debtor' | 'both';
  totalDebt: number;
  lastActivity: string;
}

export interface CustomerProfile {
  customerName: string;
  totalPurchases: number;
  totalSales: number;
  totalPaid: number;
  totalDebt: number;
  customerDebts: CustomerDebt[];
  generalDebts: GeneralDebt[];
  salesHistory: StockOutEntry[];
  paymentHistory: (Payment | GeneralDebtPayment)[];
  allTransactions: any[];
}

export interface OpeningCapital {
  totalOpeningStock: number;
  openingStockEntries: {
    id: string;
    date: string;
    productName: string;
    quantity: number;
    purchasePrice: number;
    totalValue: number;
    notes?: string;
  }[];
  totalOpeningReceivables: number;
  openingReceivables: {
    id: string;
    issueDate: string;
    creditorName: string;
    description: string;
    category: string;
    originalAmount: number;
    paidAmount: number;
    remainingBalance: number;
    notes?: string;
    reference?: string;
  }[];
  totalOpeningCapital: number;
}
