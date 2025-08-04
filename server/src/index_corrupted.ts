import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dataService } from './dataService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(c// FIFO calculation
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
    res.status(500).json({ error: 'Failed to create general debt' });
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});e(express.json());

// Routes

// Dashboard
app.get('/api/dashboard', (req, res) => {
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

// Products
app.get('/api/products', (req, res) => {
  try {
    const products = dataService.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', (req, res) => {
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

app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = dataService.updateProduct(id, req.body);
    if (updatedProduct) {
      res.json(updatedProduct);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already in use')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteProduct(id);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Stock In
app.get('/api/stock-in', (req, res) => {
  try {
    const stockEntries = dataService.getStockInEntries();
    res.json(stockEntries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock in entries' });
  }
});

app.post('/api/stock-in', (req, res) => {
  try {
    console.log('Received stock-in request:', req.body);
    const stockEntry = dataService.addStockIn(req.body);
    console.log('Stock entry created successfully:', stockEntry.id);
    res.status(201).json(stockEntry);
  } catch (error) {
    console.error('Error creating stock-in entry:', error);
    res.status(500).json({ 
      error: 'Failed to create stock in entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/stock-in/:id', (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteStockInEntry(id);
    res.status(200).json({ success: true, message: 'Stock in entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock in entry' });
  }
});

// Stock Out
app.get('/api/stock-out', (req, res) => {
  try {
    const stockEntries = dataService.getStockOutEntries();
    res.json(stockEntries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock out entries' });
  }
});

app.post('/api/stock-out', (req, res) => {
  try {
    console.log('Received stock-out request:', req.body);
    const stockEntry = dataService.addStockOut(req.body);
    console.log('Stock out entry created successfully:', stockEntry.id);
    res.status(201).json(stockEntry);
  } catch (error) {
    console.error('Error creating stock-out entry:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Failed to create stock out entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/stock-out/:id', (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteStockOutEntry(id);
    res.status(200).json({ success: true, message: 'Stock out entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock out entry' });
  }
});

// Customer Debts
app.get('/api/customer-debts', (req, res) => {
  try {
    const { customer } = req.query;
    let debts;
    if (customer) {
      debts = dataService.getDebtsByCustomer(customer as string);
    } else {
      debts = dataService.getCustomerDebts();
    }
    res.json(debts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer debts' });
  }
});

app.delete('/api/customer-debts/:id', (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteCustomerDebt(id);
    res.status(200).json({ success: true, message: 'Customer debt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer debt' });
  }
});

// Payments
app.get('/api/payments', (req, res) => {
  try {
    console.log('Fetching payments...');
    const payments = dataService.getPayments();
    console.log('Payments fetched successfully, count:', payments.length);
    res.json(payments);
  } catch (error) {
    console.error('Payments error:', error);
    console.error('Payments error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Failed to fetch payments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/payments', (req, res) => {
  try {
    const payment = dataService.addPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

app.delete('/api/payments/:id', (req, res) => {
  try {
    const { id } = req.params;
    dataService.deletePayment(id);
    res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// Transactions (Financial Ledger)
app.get('/api/transactions', (req, res) => {
  try {
    const { limit } = req.query;
    const transactions = dataService.getTransactions(limit ? parseInt(limit as string) : undefined);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    dataService.deleteTransaction(id);
    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Inventory Summary
app.get('/api/inventory', (req, res) => {
  try {
    const inventory = dataService.getInventorySummary();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// FIFO Calculation (for preview)
app.post('/api/fifo-preview', (req, res) => {
  try {
    const { productCode, quantity } = req.body;
    const result = dataService.calculateFIFOCost(productCode, quantity);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate FIFO cost' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
