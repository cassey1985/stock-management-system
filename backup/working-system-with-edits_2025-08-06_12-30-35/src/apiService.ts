import type {
  Product,
  StockInEntry,
  StockOutEntry,
  CustomerDebt,
  Payment,
  GeneralDebt,
  GeneralDebtPayment,
  Transaction,
  DashboardStats,
  InventoryItem,
  FIFOResult,
  User,
  LoginRequest,
  LoginResponse,
  Customer,
  CustomerSearchResult,
  CustomerProfile
} from './types';

// API Configuration - works for both development and production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: this.getAuthHeaders(),
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear auth data and reload
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.reload();
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    // Handle empty responses (like 204 No Content)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Even if logout fails on server, we'll clear local data
      console.warn('Logout request failed:', error);
    }
  }

  // User Management
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request<void>(`/users/${id}`, { method: 'DELETE' });
  }

  async changePassword(id: string, newPassword: string): Promise<void> {
    await this.request<void>(`/users/${id}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard');
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Stock In
  async getStockInEntries(): Promise<StockInEntry[]> {
    return this.request<StockInEntry[]>('/stock-in');
  }

  async createStockInEntry(entry: Omit<StockInEntry, 'id' | 'remainingQuantity' | 'createdAt' | 'updatedAt'>): Promise<StockInEntry> {
    return this.request<StockInEntry>('/stock-in', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async updateStockInEntry(id: string, entry: Partial<Omit<StockInEntry, 'id' | 'createdAt'>>): Promise<StockInEntry> {
    return this.request<StockInEntry>(`/stock-in/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  }

  async deleteStockInEntry(id: string): Promise<void> {
    await this.request<void>(`/stock-in/${id}`, {
      method: 'DELETE',
    });
  }

  // Stock Out
  async getStockOutEntries(): Promise<StockOutEntry[]> {
    return this.request<StockOutEntry[]>('/stock-out');
  }

  async createStockOutEntry(entry: Omit<StockOutEntry, 'id' | 'totalCost' | 'totalSale' | 'profit' | 'paymentStatus' | 'createdAt' | 'updatedAt'>): Promise<StockOutEntry> {
    return this.request<StockOutEntry>('/stock-out', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async updateStockOutEntry(id: string, entry: Partial<Omit<StockOutEntry, 'id' | 'createdAt'>>): Promise<StockOutEntry> {
    return this.request<StockOutEntry>(`/stock-out/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  }

  async deleteStockOutEntry(id: string): Promise<void> {
    await this.request<void>(`/stock-out/${id}`, {
      method: 'DELETE',
    });
  }

  // Customer Debts
  async getCustomerDebts(customerName?: string): Promise<CustomerDebt[]> {
    const queryParams = customerName ? `?customer=${encodeURIComponent(customerName)}` : '';
    return this.request<CustomerDebt[]>(`/customer-debts${queryParams}`);
  }

  async deleteCustomerDebt(id: string): Promise<void> {
    await this.request<void>(`/customer-debts/${id}`, {
      method: 'DELETE',
    });
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return this.request<Payment[]>('/payments');
  }

  async createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    return this.request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async deletePayment(id: string): Promise<void> {
    await this.request<void>(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Transactions
  async getTransactions(limit?: number): Promise<Transaction[]> {
    const queryParams = limit ? `?limit=${limit}` : '';
    return this.request<Transaction[]>(`/transactions${queryParams}`);
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'balance' | 'createdAt'>): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.request<void>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('/inventory');
  }

  // FIFO Preview
  async getFIFOPreview(productCode: string, quantity: number): Promise<FIFOResult> {
    return this.request<FIFOResult>('/fifo-preview', {
      method: 'POST',
      body: JSON.stringify({ productCode, quantity }),
    });
  }

  // General Debts
  async getGeneralDebts(type?: 'payable' | 'receivable'): Promise<GeneralDebt[]> {
    const queryParams = type ? `?type=${type}` : '';
    const endpoint = `/general-debts${queryParams}`;
    console.log('API call to:', `${API_BASE_URL}${endpoint}`);
    try {
      const result = await this.request<GeneralDebt[]>(endpoint);
      console.log('API response received:', result);
      return result;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  async createGeneralDebt(debt: Omit<GeneralDebt, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneralDebt> {
    return this.request<GeneralDebt>('/general-debts', {
      method: 'POST',
      body: JSON.stringify(debt),
    });
  }

  async updateGeneralDebt(id: string, debt: Partial<Omit<GeneralDebt, 'id' | 'createdAt'>>): Promise<GeneralDebt> {
    return this.request<GeneralDebt>(`/general-debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(debt),
    });
  }

  async deleteGeneralDebt(id: string): Promise<void> {
    await this.request<void>(`/general-debts/${id}`, {
      method: 'DELETE',
    });
  }

  // General Debt Payments
  async getGeneralDebtPayments(debtId?: string): Promise<GeneralDebtPayment[]> {
    const queryParams = debtId ? `?debtId=${debtId}` : '';
    return this.request<GeneralDebtPayment[]>(`/general-debt-payments${queryParams}`);
  }

  async createGeneralDebtPayment(payment: Omit<GeneralDebtPayment, 'id' | 'createdAt'>): Promise<GeneralDebtPayment> {
    return this.request<GeneralDebtPayment>('/general-debt-payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async deleteGeneralDebtPayment(id: string): Promise<void> {
    await this.request<void>(`/general-debt-payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Customer Management
  async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>('/customers');
  }

  async searchCustomers(term: string): Promise<CustomerSearchResult[]> {
    return this.request<CustomerSearchResult[]>(`/customers/search?term=${encodeURIComponent(term)}`);
  }

  async getCustomerProfile(customerName: string): Promise<CustomerProfile> {
    return this.request<CustomerProfile>(`/customers/${encodeURIComponent(customerName)}/profile`);
  }

  // Enhanced General Debts
  async getGeneralDebtById(id: string): Promise<GeneralDebt> {
    return this.request<GeneralDebt>(`/general-debts/${id}`);
  }
}

export const apiService = new ApiService();
