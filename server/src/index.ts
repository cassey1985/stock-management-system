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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/stock-in', authenticateToken, requireAdmin, (req, res) => {
  try {
    const entry = dataService.addStockIn(req.body);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock in entry' });
  }
});

app.put('/api/stock-in/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updatedEntry = dataService.updateStockInEntry(id, req.body);
    res.json(updatedEntry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock in entry' });
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

// Serve a simple frontend at root
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stock Management System</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { 
                background: white; 
                padding: 2rem; 
                border-radius: 15px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 90%;
                text-align: center;
            }
            h1 { 
                color: #333; 
                margin-bottom: 1rem; 
                font-size: 2rem;
            }
            .subtitle {
                color: #666;
                margin-bottom: 2rem;
                font-size: 1.1rem;
            }
            .login-form {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            input {
                padding: 0.75rem;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 1rem;
                transition: border-color 0.3s;
            }
            input:focus {
                outline: none;
                border-color: #667eea;
            }
            button {
                background: #667eea;
                color: white;
                border: none;
                padding: 0.75rem;
                border-radius: 8px;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.3s;
            }
            button:hover {
                background: #5a6fd8;
            }
            .credentials {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                text-align: left;
            }
            .credentials h3 {
                color: #333;
                margin-bottom: 0.5rem;
            }
            .credential-item {
                margin: 0.25rem 0;
                font-family: monospace;
                font-size: 0.9rem;
            }
            .api-links {
                margin-top: 2rem;
                padding-top: 2rem;
                border-top: 1px solid #eee;
            }
            .api-links h3 {
                color: #333;
                margin-bottom: 1rem;
            }
            .api-link {
                display: inline-block;
                background: #28a745;
                color: white;
                text-decoration: none;
                padding: 0.5rem 1rem;
                border-radius: 5px;
                margin: 0.25rem;
                font-size: 0.9rem;
                transition: background 0.3s;
            }
            .api-link:hover {
                background: #218838;
            }
            .status {
                margin: 1rem 0;
                padding: 0.5rem;
                border-radius: 5px;
                font-weight: bold;
            }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div style="margin-bottom: 20px;">
                <img src="https://img.icons8.com/color/96/000000/inventory-management.png" alt="Stock Management Logo" style="width: 80px; height: 80px;">
            </div>
            <h1>Stock Management System</h1>
            <p class="subtitle">Professional FIFO Inventory Management</p>
            
            <div class="login-form">
                <input type="text" id="username" placeholder="Username" value="admin" />
                <input type="password" id="password" placeholder="Password" value="admin123" />
                <button onclick="login()">Login</button>
            </div>
            
            <div id="status"></div>
            
            <div class="credentials" style="display: none;">
                <h3>📝 Default Login Credentials:</h3>
                <div class="credential-item"><strong>Admin:</strong> admin / admin123</div>
                <div class="credential-item"><strong>Sales:</strong> sales01 / sales123</div>
                <div class="credential-item"><strong>Cashier:</strong> cashier01 / cashier123</div>
            </div>
            
            <div class="api-links">
                <h3>🔗 API Endpoints:</h3>
                <a href="/api/dashboard" class="api-link" target="_blank">Dashboard Data</a>
                <a href="/api/products" class="api-link" target="_blank">Products</a>
                <a href="/api/inventory" class="api-link" target="_blank">Inventory</a>
                <a href="/api/transactions" class="api-link" target="_blank">Transactions</a>
            </div>
            
            <div style="margin-top: 2rem; color: #666; font-size: 0.9rem;">
                <p>✅ System Status: <strong style="color: #28a745;">Online</strong></p>
                <p>🚀 Deployed on Railway</p>
                <p>💾 Data persisted with file-based storage</p>
            </div>
        </div>
        
        <script>
            async function login() {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const status = document.getElementById('status');
                
                if (!username || !password) {
                    status.innerHTML = '<div class="error">Please enter username and password</div>';
                    return;
                }
                
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        status.innerHTML = \`<div class="success">✅ Login successful! Welcome, \${data.user.fullName}</div>\`;
                        localStorage.setItem('authToken', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        
                        // Create a dashboard page
                        document.body.innerHTML = \`
                        <div style="background: white; max-width: 1200px; margin: 0 auto; min-height: 100vh; padding: 20px;">
                            <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                                <div style="display: flex; align-items: center;">
                                    <img src="https://img.icons8.com/color/96/000000/inventory-management.png" alt="Logo" style="width: 40px; margin-right: 10px;">
                                    <h1 style="margin: 0; font-size: 20px;">Stock Management System</h1>
                                </div>
                                <div>
                                    <span style="margin-right: 20px;">Welcome, \${data.user.fullName}</span>
                                    <button onclick="logout()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Logout</button>
                                </div>
                            </header>
                            
                            <div id="dashboard" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
                                <div class="loading">Loading dashboard data...</div>
                            </div>
                            
                            <script>
                                async function loadDashboard() {
                                    try {
                                        const response = await fetch('/api/dashboard', {
                                            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
                                        });
                                        const data = await response.json();
                                        displayDashboard(data);
                                    } catch (error) {
                                        console.error('Error loading dashboard:', error);
                                        document.getElementById('dashboard').innerHTML = '<div class="error">Error loading dashboard data</div>';
                                    }
                                }
                                
                                function displayDashboard(data) {
                                    const dashboard = document.getElementById('dashboard');
                                    dashboard.innerHTML = '';
                                    
                                    // Add metric cards
                                    addMetricCard('Products', data.totalProducts, '#28a745');
                                    addMetricCard('Stock Value', '$' + data.totalStockValue.toFixed(2), '#007bff');
                                    addMetricCard('Total Sales', '$' + data.totalSales.toFixed(2), '#17a2b8');
                                    addMetricCard('Profit', '$' + data.totalProfit.toFixed(2), '#ffc107');
                                    
                                    // Add navigation links
                                    addNavCard('Products', 'Manage your product catalog', '/api/products');
                                    addNavCard('Inventory', 'Check stock levels and history', '/api/inventory');
                                    addNavCard('Sales', 'View sales records and trends', '/api/transactions');
                                    addNavCard('Reports', 'Generate business reports', '#');
                                }
                                
                                function addMetricCard(title, value, color) {
                                    const dashboard = document.getElementById('dashboard');
                                    const card = document.createElement('div');
                                    card.style = \`background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-top: 3px solid \${color};\`;
                                    card.innerHTML = \`
                                        <h3 style="margin: 0; color: #333;">\${title}</h3>
                                        <p style="font-size: 24px; font-weight: bold; margin: 10px 0 0; color: \${color}">\${value}</p>
                                    \`;
                                    dashboard.appendChild(card);
                                }
                                
                                function addNavCard(title, description, link) {
                                    const dashboard = document.getElementById('dashboard');
                                    const card = document.createElement('div');
                                    card.style = \`background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); cursor: pointer;\`;
                                    card.innerHTML = \`
                                        <h3 style="margin: 0; color: #333;">\${title}</h3>
                                        <p style="color: #666; margin: 5px 0 10px;">\${description}</p>
                                        <a href="\${link}" target="_blank" style="color: #007bff; text-decoration: none;">View &rarr;</a>
                                    \`;
                                    dashboard.appendChild(card);
                                }
                                
                                function logout() {
                                    localStorage.removeItem('authToken');
                                    localStorage.removeItem('user');
                                    window.location.href = '/';
                                }
                                
                                // Load dashboard on page load
                                loadDashboard();
                                
                                // Add auto-refresh for dashboard data
                                setInterval(loadDashboard, 60000); // Refresh every minute
                            </script>
                        </div>
                        \`;
                    } else {
                        console.error('Login failed:', data);
                        status.innerHTML = \`<div class="error">❌ \${data.error || 'Login failed'}</div>\`;
                        
                        // Add a retry button
                        status.innerHTML += '<button onclick="login()" style="margin-top: 10px; background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Retry Login</button>';
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    status.innerHTML = '<div class="error">❌ Connection error. Please check your network and try again.</div>';
                    
                    // Add a retry button
                    status.innerHTML += '<button onclick="login()" style="margin-top: 10px; background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Retry Login</button>';
                }
                
                // Auto-login on page load (for demo purposes)
                document.addEventListener('DOMContentLoaded', function() {
                    // Slight delay to ensure elements are loaded
                    setTimeout(login, 500);
                });
            }
            
            // Allow Enter key to submit
            document.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    login();
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Routes

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt received:', req.body.username);
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Login failed: Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await dataService.authenticateUser({ username, password });
    if (!user) {
      console.log('Login failed: Invalid credentials for', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log('Login successful for user:', username);
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

// Dashboard (All authenticated users)
app.get('/api/dashboard', authenticateToken, (req, res) => {
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

// Opening Capital Information (Admin only)
app.get('/api/opening-capital', authenticateToken, requireAdmin, (req, res) => {
  try {
    const openingCapital = dataService.getOpeningCapital();
    res.json(openingCapital);
  } catch (error) {
    console.error('Opening capital error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch opening capital data',
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

// Multi-Product Sales
app.post('/api/stock-out/multi-product', authenticateToken, requireSalesOrAdmin, (req, res) => {
  try {
    const entries = dataService.addMultiProductSale(req.body);
    res.status(201).json(entries);
  } catch (error) {
    console.error('Multi-product sale error:', error);
    res.status(500).json({ error: 'Failed to create multi-product sale' });
  }
});

app.put('/api/stock-out/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updatedEntry = dataService.updateStockOutEntry(id, req.body);
    res.json(updatedEntry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock out entry' });
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

app.post('/api/payments/multi-payment', authenticateToken, requireAdmin, (req, res) => {
  try {
    const payments = dataService.addMultiPayment(req.body);
    res.status(201).json(payments);
  } catch (error) {
    console.error('Multi-payment error:', error);
    res.status(500).json({ error: 'Failed to create multi-payment' });
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

// Customer Management Routes
app.get('/api/customers', (req, res) => {
  try {
    const customers = dataService.getAllCustomers();
    res.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/customers/search', (req, res) => {
  try {
    const { term } = req.query;
    if (!term) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    const results = dataService.searchCustomers(term as string);
    res.json(results);
  } catch (error) {
    console.error('Customer search failed:', error);
    res.status(500).json({ error: 'Customer search failed' });
  }
});

app.get('/api/customers/:customerName/profile', (req, res) => {
  try {
    const { customerName } = req.params;
    const profile = dataService.getCustomerProfile(decodeURIComponent(customerName));
    res.json(profile);
  } catch (error) {
    console.error('Failed to fetch customer profile:', error);
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

app.delete('/api/customers/:customerName', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { customerName } = req.params;
    const decodedCustomerName = decodeURIComponent(customerName);
    dataService.deleteCustomer(decodedCustomerName);
    res.json({ success: true, message: `Customer "${decodedCustomerName}" and all related data deleted successfully` });
  } catch (error) {
    console.error('Failed to delete customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Enhanced General Debts Routes
app.get('/api/general-debts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const debt = dataService.getGeneralDebtById(id);
    if (!debt) {
      return res.status(404).json({ error: 'General debt not found' });
    }
    res.json(debt);
  } catch (error) {
    console.error('Failed to fetch general debt:', error);
    res.status(500).json({ error: 'Failed to fetch general debt' });
  }
});

app.put('/api/general-debts/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log('🎯 PUT request received for debt:', { id, updates });
    const updatedDebt = dataService.updateGeneralDebt(id, updates);
    console.log('✅ Successfully updated debt:', updatedDebt.id);
    res.json(updatedDebt);
  } catch (error) {
    console.error('❌ Failed to update general debt:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update general debt' });
  }
});

// Emergency fix endpoint for date mismatches
app.post('/api/fix-dates', authenticateToken, (req, res) => {
  try {
    console.log('🔧 Manual date fix triggered by admin');
    let fixCount = 0;

    dataService.getGeneralDebts().forEach(debt => {
      const relatedTransactions = dataService.getTransactions().filter(t => t.reference === debt.id);
      relatedTransactions.forEach(transaction => {
        if (transaction.date.getTime() !== debt.issueDate.getTime()) {
          console.log(`📅 Fixing date mismatch for debt ${debt.id}: ${transaction.date.toISOString().split('T')[0]} -> ${debt.issueDate.toISOString().split('T')[0]}`);
          // Update transaction date directly
          const allTransactions = dataService.getTransactions();
          const txnIndex = allTransactions.findIndex(t => t.id === transaction.id);
          if (txnIndex !== -1) {
            allTransactions[txnIndex].date = debt.issueDate;
            fixCount++;
          }
        }
      });
    });

    if (fixCount > 0) {
      console.log(`✅ Fixed ${fixCount} date mismatches`);
      res.json({ success: true, fixedCount: fixCount, message: `Fixed ${fixCount} date mismatches` });
    } else {
      console.log('✅ No date mismatches found');
      res.json({ success: true, fixedCount: 0, message: 'No date mismatches found' });
    }
  } catch (error) {
    console.error('❌ Error fixing dates:', error);
    res.status(500).json({ error: 'Failed to fix date mismatches' });
  }
});

// Fix debt_created transactions to opening_balance
app.post('/api/fix-debt-types', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Converting debt_created transactions to opening_balance...');
    const result = await dataService.fixDebtCreatedToOpeningBalance();
    res.json({ 
      success: true, 
      fixedCount: result.fixed, 
      message: result.message 
    });
  } catch (error) {
    console.error('❌ Error fixing debt types:', error);
    res.status(500).json({ error: 'Failed to fix debt transaction types' });
  }
});

// Fix decimal precision issues in transactions
app.post('/api/fix-decimal-precision', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Fixing decimal precision issues in transactions...');
    const result = await dataService.fixDecimalPrecision();
    res.json({ 
      success: true, 
      fixedCount: result.fixed, 
      message: result.message 
    });
  } catch (error) {
    console.error('❌ Error fixing decimal precision:', error);
    res.status(500).json({ error: 'Failed to fix decimal precision issues' });
  }
});

// Initialize data service and start server
async function startServer() {
  try {
    console.log('🔧 Initializing data service...');
    await dataService.initialize();
    console.log('✅ Data service initialized successfully');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Local access: http://localhost:${PORT}`);
      console.log(`🌐 Railway URL: https://stock-management-system-production-0142.up.railway.app`);
      console.log(`✅ Stock Management System is ready!`);
    });
    
    // Bind to all interfaces (0.0.0.0)
    server.on('listening', () => {
      console.log(`💻 Server bound to all interfaces (0.0.0.0:${PORT})`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    // Try to start anyway with sample data
    console.log('🔄 Starting with sample data...');
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (with fallback data)`);
    });
    
    // Bind to all interfaces (0.0.0.0)
    server.on('listening', () => {
      console.log(`💻 Server bound to all interfaces (0.0.0.0:${PORT}) - with fallback data`);
    });
  }
}

startServer();
