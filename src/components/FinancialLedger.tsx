import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import { Card, Button, Alert } from './ui';
import type { Transaction, StockOutEntry } from '../types';

const FinancialLedger: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockOutEntries, setStockOutEntries] = useState<StockOutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'manual',
    category: '',
    description: '',
    amount: '',
    transactionType: 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  // Filter and pagination state
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [transactionsData, stockOutData] = await Promise.all([
          apiService.getTransactions(),
          apiService.getStockOutEntries()
        ]);
        setTransactions(transactionsData);
        setStockOutEntries(stockOutData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const amount = parseFloat(newTransaction.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const transactionData = {
        type: newTransaction.transactionType === 'expense' ? 'expense' : 
              newTransaction.transactionType === 'income' ? 'payment_received' : 
              'opening_balance' as 'expense' | 'payment_received' | 'opening_balance',
        category: newTransaction.category,
        description: newTransaction.description,
        debitAmount: newTransaction.transactionType === 'expense' ? amount : 0,
        creditAmount: (newTransaction.transactionType === 'income' || newTransaction.transactionType === 'capital') ? amount : 0,
        date: newTransaction.date
      };

      const newTrans = await apiService.createTransaction(transactionData);
      setTransactions(prev => [newTrans, ...prev]);
      
      // Reset form
      setNewTransaction({
        type: 'manual',
        category: '',
        description: '',
        amount: '',
        transactionType: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddTransaction(false);
    } catch (err) {
      console.error('Error adding transaction:', err);
      alert('Failed to add transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await apiService.deleteTransaction(transactionId);
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction');
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateFinancialMetrics = () => {
    // Calculate actual sales revenue (income from sales only)
    const salesRevenue = transactions
      .filter(t => 
        (t.category === 'Sales Revenue' || t.category === 'Product Sales' || t.category === 'Sales') && 
        t.creditAmount > 0
      )
      .reduce((sum, t) => sum + t.creditAmount, 0);
    
    // Calculate Cost of Goods Sold (COGS) - ACTUAL cost of inventory that was sold using FIFO
    // This uses the accurate totalCost from StockOutEntries which includes FIFO calculation
    // This is much more accurate than estimating COGS from transaction data
    const costOfGoodsSold = stockOutEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
    
    // For debugging: log the COGS calculation
    if (stockOutEntries.length > 0) {
      console.log(`COGS Calculation: ${stockOutEntries.length} sales with total cost of ?${costOfGoodsSold.toFixed(2)}`);
    }
    
    // Calculate ALL revenue/income for Net Position (including sales and other income)
    const totalRevenue = transactions
      .filter(t => 
        t.creditAmount > 0 && 
        !t.category.includes('Capital') &&
        !t.category.includes('Opening Stock') &&
        !t.category.includes('Assets') &&
        t.type !== 'payment_made' &&
        t.type !== 'opening_stock'
      )
      .reduce((sum, t) => sum + t.creditAmount, 0);
    
    // Calculate operational expenses only (excluding asset purchases, capital transactions, and COGS)
    const operationalExpenses = transactions
      .filter(t => 
        t.debitAmount > 0 && 
        !t.category.includes('Opening Stock') &&
        !t.category.includes('Capital') &&
        !t.category.includes('Assets - Opening Stock') &&
        !t.category.includes('Accounts Receivable') &&
        t.type !== 'debt_created' &&
        t.type !== 'opening_stock' &&
        t.type !== 'stock_in' // Exclude inventory purchases from operational expenses (this is COGS)
      )
      .reduce((sum, t) => sum + t.debitAmount, 0);
    
    // Calculate Gross Profit (Sales Revenue - COGS)
    const grossProfit = salesRevenue - costOfGoodsSold;
    
    // Calculate Net Profit (Gross Profit - Operating Expenses)
    const netProfit = grossProfit - operationalExpenses;
    
    // Calculate Total Capital - all capital investments (including opening receivables)
    const capitalInvestments = transactions.filter(t => 
      (t.category.includes('Capital') || t.category.includes('Investment') || t.category.includes('Opening Stock')) && 
      t.creditAmount > 0
    );
    
    const totalCapitalInvested = capitalInvestments.reduce((sum, t) => sum + t.creditAmount, 0);
    
    // FIXED: Current Capital = Initial Capital + Net Profit + Other Income
    // Include ALL income sources (sales profit + other income like G-Cash, etc.)
    // Only include transactions explicitly marked as 'Other Income'
    const otherIncome = transactions
      .filter(t => t.creditAmount > 0 && t.category === 'Other Income')
      .reduce((sum, t) => sum + t.creditAmount, 0);
    
    const currentCapital = totalCapitalInvested + netProfit + otherIncome;
    
    // Net Position = All Revenue - All Expenses (total business performance)
    // This shows the net result of all business operations
    const netPosition = totalRevenue - costOfGoodsSold - operationalExpenses;

    // Calculate receivables 
    const receivableTransactions = transactions.filter(t => 
      (t.category.includes('Customer Debt') || t.category.includes('Unpaid Invoice') || 
       t.category.includes('Outstanding Balance') || t.category.includes('Accounts Receivable')) && 
      t.debitAmount > 0
    );
    
    const totalReceivables = receivableTransactions.reduce((sum, t) => sum + t.debitAmount, 0);

    return {
      totalIncome: salesRevenue, // Only actual sales revenue
      totalExpenses: operationalExpenses, // Only operational expenses (excluding COGS)
      costOfGoodsSold, // COGS for inventory sold
      grossProfit, // Sales Revenue - COGS
      netProfit, // Gross Profit - Operating Expenses
      netPosition, // All revenue minus all expenses (COGS + Operating)
      totalCapital: currentCapital, // Capital + Net Profit + Other Income (FIXED)
      totalCapitalInvested, // Original capital investments only
      totalReceivables,
      otherIncome, // Additional income sources (G-Cash, etc.)
      transactionCount: transactions.length
    };
  };

  // Enhanced Report Generation Functions
  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      
      const startDate = new Date(reportDate);
      const endDate = new Date(reportDate);
      
      // Set date ranges based on report type
      if (reportType === 'weekly') {
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        endDate.setDate(startDate.getDate() + 6);
      } else if (reportType === 'monthly') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
      } else if (reportType === 'yearly') {
        startDate.setMonth(0, 1);
        endDate.setMonth(11, 31);
      }

      const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      const metrics = calculateReportMetrics(filteredTransactions);
      
      const reportPeriod = formatReportPeriod(startDate, endDate, reportType);

      setReportData({
        period: reportPeriod,
        transactions: filteredTransactions,
        metrics: metrics
      });
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const calculateReportMetrics = (transactions: Transaction[]) => {
    const totalIncome = transactions
      .filter(t => t.creditAmount > 0)
      .reduce((sum, t) => sum + t.creditAmount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.debitAmount > 0)
      .reduce((sum, t) => sum + t.debitAmount, 0);
    
    const netPosition = totalIncome - totalExpenses;
    const transactionCount = transactions.length;

    // Category breakdown for enhanced reporting
    const categoryBreakdown: { [key: string]: { income: number; expenses: number } } = {};
    
    transactions.forEach(transaction => {
      if (!categoryBreakdown[transaction.category]) {
        categoryBreakdown[transaction.category] = { income: 0, expenses: 0 };
      }
      
      if (transaction.creditAmount > 0) {
        categoryBreakdown[transaction.category].income += transaction.creditAmount;
      }
      if (transaction.debitAmount > 0) {
        categoryBreakdown[transaction.category].expenses += transaction.debitAmount;
      }
    });

    return {
      totalIncome,
      totalExpenses,
      netPosition,
      transactionCount,
      categoryBreakdown
    };
  };

  const formatReportPeriod = (startDate: Date, endDate: Date, type: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    if (type === 'daily') {
      return startDate.toLocaleDateString('en-US', options);
    } else if (type === 'weekly') {
      return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    } else if (type === 'monthly') {
      return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } else if (type === 'yearly') {
      return startDate.getFullYear().toString();
    }
    return '';
  };

  const downloadReport = () => {
    if (!reportData) return;
    
    let csvContent = "Date,Description,Category,Debit,Credit\n";
    
    reportData.transactions.forEach((transaction: Transaction) => {
      const row = [
        new Date(transaction.date).toLocaleDateString(),
        `"${transaction.description}"`,
        `"${transaction.category}"`,
        transaction.debitAmount || '',
        transaction.creditAmount || ''
      ].join(',');
      csvContent += row + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${reportType}-${reportDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadReportAsPDF = () => {
    if (!reportData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Financial Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { margin-bottom: 20px; }
            .summary-item { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ccc; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .amount { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Financial Report</h1>
            <p>Period: ${reportData.period}</p>
          </div>
          <div class="summary">
            <div class="summary-item">
              <strong>Total Income:</strong> ${formatCurrency(reportData.metrics.totalIncome)}
            </div>
            <div class="summary-item">
              <strong>Total Expenses:</strong> ${formatCurrency(reportData.metrics.totalExpenses)}
            </div>
            <div class="summary-item">
              <strong>Net Position:</strong> ${formatCurrency(reportData.metrics.netPosition)}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th class="amount">Debit</th>
                <th class="amount">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.transactions.map((t: Transaction) => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString()}</td>
                  <td>${t.description}</td>
                  <td>${t.category}</td>
                  <td class="amount">${t.debitAmount > 0 ? formatCurrency(t.debitAmount) : '-'}</td>
                  <td class="amount">${t.creditAmount > 0 ? formatCurrency(t.creditAmount) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadReportAsWord = () => {
    if (!reportData) return;
    
    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head>
          <meta charset='utf-8'>
          <title>Financial Report</title>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 20px;">
            <h1>Financial Report</h1>
            <p>Period: ${reportData.period}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <p><strong>Total Income:</strong> ${formatCurrency(reportData.metrics.totalIncome)}</p>
            <p><strong>Total Expenses:</strong> ${formatCurrency(reportData.metrics.totalExpenses)}</p>
            <p><strong>Net Position:</strong> ${formatCurrency(reportData.metrics.netPosition)}</p>
          </div>
          <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px;">Date</th>
                <th style="padding: 8px;">Description</th>
                <th style="padding: 8px;">Category</th>
                <th style="padding: 8px; text-align: right;">Debit</th>
                <th style="padding: 8px; text-align: right;">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.transactions.map((t: Transaction) => `
                <tr>
                  <td style="padding: 8px;">${new Date(t.date).toLocaleDateString()}</td>
                  <td style="padding: 8px;">${t.description}</td>
                  <td style="padding: 8px;">${t.category}</td>
                  <td style="padding: 8px; text-align: right;">${t.debitAmount > 0 ? formatCurrency(t.debitAmount) : '-'}</td>
                  <td style="padding: 8px; text-align: right;">${t.creditAmount > 0 ? formatCurrency(t.creditAmount) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const blob = new Blob([wordContent], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${reportType}-${reportDate}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Filter transactions based on current filter settings
  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Filter by type
    if (filterType === 'income') {
      filtered = filtered.filter(t => t.creditAmount > 0);
    } else if (filterType === 'expense') {
      filtered = filtered.filter(t => t.debitAmount > 0);
    }

    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // Get unique categories for filter dropdown
  const getUniqueCategories = () => {
    const categories = transactions.map(t => t.category);
    return [...new Set(categories)].sort();
  };

  if (loading) return <Alert variant="info">Loading transactions...</Alert>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const metrics = calculateFinancialMetrics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Financial Ledger</h1>
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowReportModal(true)}
            variant="primary"
          >
            Generate Report
          </Button>
          <Button 
            onClick={() => setShowAddTransaction(true)}
            variant="primary"
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Enhanced Generate Report Modal */}
      {showReportModal && (
        <div 
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000'
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#1f2937',
                margin: '0'
              }}>
                📊 Generate Financial Report
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="daily">📅 Daily</option>
                  <option value="weekly">📄 Weekly</option>
                  <option value="monthly">📊 Monthly</option>
                  <option value="yearly">📈 Yearly</option>
                </select>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Reference Date
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  style={{
                    width: '100%',
                    backgroundColor: generatingReport ? '#9ca3af' : '#059669',
                    color: 'white',
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: generatingReport ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {generatingReport ? '⏳ Generating...' : '📋 Generate Report'}
                </button>
              </div>
            </div>

            {/* Report Preview */}
            {reportData && (
              <div style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                overflow: 'hidden',
                marginBottom: '20px'
              }}>
                <div style={{
                  background: 'linear-gradient(to right, #059669, #2563eb)',
                  color: 'white',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 'bold' }}>
                      📊 Financial Report
                    </h3>
                    <p style={{ margin: '0', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Period: {reportData.period}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={downloadReport}
                      style={{
                        backgroundColor: 'white',
                        color: '#059669',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      📄 CSV
                    </button>
                    <button
                      onClick={downloadReportAsPDF}
                      style={{
                        backgroundColor: 'white',
                        color: '#dc2626',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      📑 PDF
                    </button>
                    <button
                      onClick={downloadReportAsWord}
                      style={{
                        backgroundColor: 'white',
                        color: '#2563eb',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      📘 Word
                    </button>
                  </div>
                </div>
                
                {/* Summary Cards */}
                <div style={{ padding: '24px', backgroundColor: '#f9fafb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                    <div style={{
                      backgroundColor: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      borderLeft: '4px solid #10b981',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '24px', marginRight: '12px' }}>💰</div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                          Total Income
                        </p>
                        <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                          {formatCurrency(reportData.metrics.totalIncome)}
                        </p>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      borderLeft: '4px solid #ef4444',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '24px', marginRight: '12px' }}>💸</div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                          Total Expenses
                        </p>
                        <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                          {formatCurrency(reportData.metrics.totalExpenses)}
                        </p>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      borderLeft: '4px solid #3b82f6',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '24px', marginRight: '12px' }}>📊</div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                          Net Position
                        </p>
                        <p style={{ 
                          margin: '0', 
                          fontSize: '18px', 
                          fontWeight: 'bold',
                          color: reportData.metrics.netPosition >= 0 ? '#059669' : '#dc2626'
                        }}>
                          {formatCurrency(reportData.metrics.netPosition)}
                        </p>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      borderLeft: '4px solid #8b5cf6',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '24px', marginRight: '12px' }}>🔄</div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                          Transactions
                        </p>
                        <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#7c3aed' }}>
                          {reportData.metrics.transactionCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div style={{ padding: '24px' }}>
                  <h4 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    marginBottom: '16px',
                    color: '#1f2937'
                  }}>
                    📋 Transaction Details
                  </h4>
                  <div style={{ 
                    overflowX: 'auto', 
                    maxHeight: '320px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                      <thead style={{ backgroundColor: '#f3f4f6', position: 'sticky', top: '0' }}>
                        <tr>
                          <th style={{ 
                            textAlign: 'left', 
                            padding: '12px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            borderBottom: '1px solid #d1d5db'
                          }}>
                            Date
                          </th>
                          <th style={{ 
                            textAlign: 'left', 
                            padding: '12px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            borderBottom: '1px solid #d1d5db'
                          }}>
                            Description
                          </th>
                          <th style={{ 
                            textAlign: 'left', 
                            padding: '12px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            borderBottom: '1px solid #d1d5db'
                          }}>
                            Category
                          </th>
                          <th style={{ 
                            textAlign: 'right', 
                            padding: '12px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            borderBottom: '1px solid #d1d5db'
                          }}>
                            Debit
                          </th>
                          <th style={{ 
                            textAlign: 'right', 
                            padding: '12px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            borderBottom: '1px solid #d1d5db'
                          }}>
                            Credit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.transactions.map((transaction: Transaction) => (
                          <tr 
                            key={transaction.id} 
                            style={{ borderBottom: '1px solid #f3f4f6' }}
                          >
                            <td style={{ 
                              padding: '12px 16px', 
                              fontSize: '14px', 
                              color: '#1f2937'
                            }}>
                              {new Date(transaction.date).toLocaleDateString()}
                            </td>
                            <td style={{ 
                              padding: '12px 16px', 
                              fontSize: '14px', 
                              color: '#1f2937'
                            }}>
                              {transaction.description}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                              <span style={{
                                padding: '2px 8px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                borderRadius: '12px',
                                fontSize: '12px'
                              }}>
                                {transaction.category}
                              </span>
                            </td>
                            <td style={{ 
                              padding: '12px 16px', 
                              fontSize: '14px',
                              textAlign: 'right'
                            }}>
                              {transaction.debitAmount > 0 ? (
                                <span style={{ color: '#dc2626', fontWeight: '500' }}>
                                  {formatCurrency(transaction.debitAmount)}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={{ 
                              padding: '12px 16px', 
                              fontSize: '14px',
                              textAlign: 'right'
                            }}>
                              {transaction.creditAmount > 0 ? (
                                <span style={{ color: '#059669', fontWeight: '500' }}>
                                  {formatCurrency(transaction.creditAmount)}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {reportData.transactions.length === 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '32px', 
                        color: '#6b7280'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                        <p>No transactions found for the selected period.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <Card className="p-6 border-2 border-fern-green">
          <h3 className="text-lg font-semibold mb-4">Add New Transaction</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select
                value={newTransaction.transactionType}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, transactionType: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fern-green focus:border-transparent"
              >
                <option value="capital">Capital Investment</option>
                <option value="income">Income/Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newTransaction.category}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fern-green focus:border-transparent"
              >
                <option value="">Select Category</option>
                {newTransaction.transactionType === 'capital' && (
                  <>
                    <option value="Initial Capital">Initial Capital</option>
                    <option value="Additional Investment">Additional Investment</option>
                  </>
                )}
                {newTransaction.transactionType === 'income' && (
                  <>
                    <option value="Sales Revenue">Sales Revenue</option>
                    <option value="Other Income">Other Income</option>
                    <option value="Interest Income">Interest Income</option>
                  </>
                )}
                {newTransaction.transactionType === 'expense' && (
                  <>
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Other Expenses">Other Expenses</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={newTransaction.description}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fern-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PHP)</label>
              <input
                type="number"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fern-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fern-green focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleAddTransaction} variant="primary">
              Add Transaction
            </Button>
            <Button onClick={() => setShowAddTransaction(false)} variant="secondary">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Financial Summary Cards - HORIZONTAL Layout with Flexbox */}
      <div className="flex flex-wrap gap-4" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🏦</span>
            <div>
              <p className="text-sm text-gray-600">Current Capital</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(metrics.totalCapital)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">💰</span>
            <div>
              <p className="text-sm text-gray-600">Sales Revenue</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(metrics.totalIncome)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">📦</span>
            <div>
              <p className="text-sm text-gray-600">Cost of Goods Sold</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(metrics.costOfGoodsSold || 0)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">💎</span>
            <div>
              <p className="text-sm text-gray-600">Gross Profit</p>
              <p className={`text-xl font-bold ${(metrics.grossProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.grossProfit || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">💸</span>
            <div>
              <p className="text-sm text-gray-600">Operating Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎯</span>
            <div>
              <p className="text-sm text-gray-600">Net Profit</p>
              <p className={`text-xl font-bold ${(metrics.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.netProfit || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">📊</span>
            <div>
              <p className="text-sm text-gray-600">Net Position</p>
              <p className={`text-xl font-bold ${metrics.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.netPosition)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">💳</span>
            <div>
              <p className="text-sm text-gray-600">Receivables</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(metrics.totalReceivables)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex-1 min-w-60" style={{ flex: '1', minWidth: '240px' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎁</span>
            <div>
              <p className="text-sm text-gray-600">Other Income</p>
              <p className="text-xl font-bold text-teal-600">{formatCurrency(metrics.otherIncome || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <div className="text-sm text-gray-500">
            {getFilteredTransactions().length} of {transactions.length} transactions
          </div>
        </div>

        {/* Transaction Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Transactions</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {getUniqueCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description or category... (try 'receivable')"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setFilterType('all');
                setFilterCategory('');
                setSearchTerm('');
              }}
              variant="secondary"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredTransactions()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date, newest first
                .slice(0, 50) // Increase limit to 50 transactions
                .map((transaction) => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-sm">{transaction.description}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {transaction.debitAmount > 0 ? (
                      <span className="text-red-600 font-medium">
                        {formatCurrency(transaction.debitAmount)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {transaction.creditAmount > 0 ? (
                      <span className="text-green-600 font-medium">
                        {formatCurrency(transaction.creditAmount)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      variant="secondary"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      🗑️
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {getFilteredTransactions().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No transactions found matching your filters.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FinancialLedger;
