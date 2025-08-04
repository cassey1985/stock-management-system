import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbAdapter } from './database';
import { 
  authenticateToken, 
  requireAdmin, 
  requireSalesOrAdmin, 
  generateToken,
  AuthRequest 
} from './auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Get dataService reference from database adapter
const dataService = dbAdapter.getDataService();

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await dataService.authenticateUser({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    
    res.json({
      user,
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // In a real app, you might want to blacklist the token
  res.json({ message: 'Logout successful' });
});

// User Management Routes (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = dataService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await dataService.createUser(req.body);
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await dataService.updateUser(id, req.body);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await dataService.deleteUser(id);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('last admin')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
});

app.post('/api/users/:id/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    // Users can only change their own password unless they're admin
    if (req.user?.role !== 'admin' && req.user?.id !== id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const success = await dataService.changePassword(id, newPassword);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Dashboard (Admin only)
app.get('/api/dashboard', authenticateToken, requireAdmin, (req, res) => {
  try {
    const stats = dataService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Dashboard error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Products (Admin only for add/edit/delete, Sales can view)
app.get('/api/products', authenticateToken, (req, res) => {
  try {
    const products = dataService.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  try {
    const product = dataService.addProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already in use')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const product = dataService.updateProduct(id, req.body);
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error instanceof Error && error.message.includes('already in use')) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteProduct(id);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Stock In (Admin only)
app.get('/api/stock-in', authenticateToken, requireAdmin, (req, res) => {
  try {
    const entries = dataService.getStockInEntries();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock in entries' });
  }
});

app.post('/api/stock-in', authenticateToken, requireAdmin, (req, res) => {
  try {
    const entry = dataService.addStockIn(req.body);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating stock-in entry:', error);
    res.status(500).json({ error: 'Failed to create stock in entry' });
  }
});

app.delete('/api/stock-in/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteStockInEntry(id);
    res.status(200).json({ success: true, message: 'Stock in entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock in entry' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Stock Out (Sales/Cashier can add, Admin can view all and delete)
app.get('/api/stock-out', authenticateToken, (req, res) => {
  try {
    const entries = dataService.getStockOutEntries();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock out entries' });
  }
});

app.post('/api/stock-out', authenticateToken, requireSalesOrAdmin, (req, res) => {
  try {
    const entry = dataService.addStockOut(req.body);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock out entry' });
  }
});

app.delete('/api/stock-out/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteStockOutEntry(id);
    res.status(200).json({ success: true, message: 'Stock out entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock out entry' });
  }
});

// Customer Debts (Admin only)
app.get('/api/customer-debts', authenticateToken, requireAdmin, (req, res) => {
  try {
    console.log('Customer debts endpoint called');
    const { customer } = req.query;
    let debts;
    if (customer) {
      console.log('Getting debts by customer:', customer);
      debts = dataService.getDebtsByCustomer(customer as string);
    } else {
      console.log('Getting all customer debts');
      debts = dataService.getCustomerDebts();
    }
    console.log('Returning debts:', debts.length);
    res.json(debts);
  } catch (error) {
    console.error('Error fetching customer debts:', error);
    res.status(500).json({ error: 'Failed to fetch customer debts', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/customer-debts/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteCustomerDebt(id);
    res.status(200).json({ success: true, message: 'Customer debt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer debt' });
  }
});

// Payments (Admin only)
app.get('/api/payments', authenticateToken, requireAdmin, (req, res) => {
  try {
    const payments = dataService.getPayments();
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/payments', authenticateToken, requireAdmin, (req, res) => {
  try {
    const payment = dataService.addPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

app.delete('/api/payments/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    dataService.deletePayment(id);
    res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// Transactions (Admin only)
app.get('/api/transactions', authenticateToken, requireAdmin, (req, res) => {
  try {
    const transactions = dataService.getTransactions();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', authenticateToken, requireAdmin, (req, res) => {
  try {
    const transaction = dataService.addTransaction(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      error: 'Failed to create transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Opening Capital
app.get('/api/opening-capital', (req, res) => {
  try {
    const openingCapital = dataService.getOpeningCapital();
    res.json(openingCapital);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch opening capital data' });
  }
});

app.delete('/api/transactions/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteTransaction(id);
    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Inventory
app.get('/api/inventory', (req, res) => {
  try {
    const inventory = dataService.getInventorySummary();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// FIFO calculation
app.post('/api/fifo-calculate', (req, res) => {
  try {
    const { productCode, quantity } = req.body;
    const result = dataService.calculateFIFOCost(productCode, quantity);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate FIFO cost' });
  }
});

// General Debts
app.get('/api/general-debts', (req, res) => {
  try {
    const { type } = req.query;
    let debts;
    if (type) {
      debts = dataService.getGeneralDebtsByType(type as 'payable' | 'receivable');
    } else {
      debts = dataService.getGeneralDebts();
    }
    res.json(debts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch general debts' });
  }
});

app.post('/api/general-debts', (req, res) => {
  try {
    const debt = dataService.addGeneralDebt(req.body);
    res.status(201).json(debt);
  } catch (error) {
    console.error('Error creating general debt:', error);
    res.status(500).json({ 
      error: 'Failed to create general debt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.put('/api/general-debts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const debt = dataService.updateGeneralDebt(id, req.body);
    res.json(debt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update general debt' });
  }
});

app.delete('/api/general-debts/:id', (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteGeneralDebt(id);
    res.status(200).json({ success: true, message: 'General debt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete general debt' });
  }
});

// General Debt Payments
app.get('/api/general-debt-payments', (req, res) => {
  try {
    const { debtId } = req.query;
    let payments;
    if (debtId) {
      payments = dataService.getPaymentsByDebtId(debtId as string);
    } else {
      payments = dataService.getGeneralDebtPayments();
    }
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch general debt payments' });
  }
});

app.post('/api/general-debt-payments', (req, res) => {
  try {
    const payment = dataService.addGeneralDebtPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create general debt payment' });
  }
});

app.delete('/api/general-debt-payments/:id', (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteGeneralDebtPayment(id);
    res.status(200).json({ success: true, message: 'General debt payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete general debt payment' });
  }
});

// Data Management Routes (Admin only)
app.post('/api/admin/backup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backupFile = await dataService.createBackup();
    res.json({ success: true, message: 'Backup created successfully', backupFile });
  } catch (error) {
    console.error('Backup creation failed:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

app.get('/api/admin/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = await dataService.exportData();
    res.json(data);
  } catch (error) {
    console.error('Data export failed:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Initialize data service and start server
async function startServer() {
  try {
    console.log('Initializing database adapter...');
    await dbAdapter.initialize();
    console.log('Database adapter initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database adapter:', error);
    process.exit(1);
  }
}

startServer();
