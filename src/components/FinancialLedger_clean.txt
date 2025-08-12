import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import { Card, Button, Alert, Input } from './ui';
import type { Transaction } from '../types';

const FinancialLedger: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [newTransaction, setNewTransaction] = useState({
    type: 'manual',
    category: '',
    description: '',
    amount: '',
    transactionType: 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await apiService.getTransactions();
        setTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const handleAddTransaction = async () => {
    try {
      if (!newTransaction.description || !newTransaction.amount || !newTransaction.category) {
        setError('Please fill in all required fields');
        return;
      }

      const amount = parseFloat(newTransaction.amount);
      let transactionType: 'expense' | 'adjustment' = 'expense';
      
      if (newTransaction.transactionType === 'capital') {
        transactionType = 'adjustment';
      } else if (newTransaction.transactionType === 'income') {
        transactionType = 'adjustment'; // Income is also an adjustment
      } else {
        transactionType = 'expense';
      }

      const transactionData = {
        type: transactionType,
        category: newTransaction.category,
        description: newTransaction.description,
        reference: 'Manual Entry',
        debitAmount: newTransaction.transactionType === 'expense' ? amount : 0,
        creditAmount: newTransaction.transactionType === 'income' || newTransaction.transactionType === 'capital' ? amount : 0,
        date: newTransaction.date
      };

      await apiService.createTransaction(transactionData);
      
      // Fetch fresh data
      const updatedTransactions = await apiService.getTransactions();
      setTransactions(updatedTransactions);
      
      setNewTransaction({
        type: 'manual',
        category: '',
        description: '',
        amount: '',
        transactionType: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddTransaction(false);
      setError(null);
    } catch (err) {
      setError('Failed to add transaction');
      console.error('Error adding transaction:', err);
    }
  };

  const handleDeleteTransaction = async (id: string, description: string) => {
    if (window.confirm(`Are you sure you want to delete this transaction: "${description}"? This action cannot be undone.`)) {
      try {
        await apiService.deleteTransaction(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error('Delete error:', err);
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('fetch')) {
            setError('Backend server is not running. Please start the backend server first.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to delete transaction');
        }
      }
    }
  };

  const generateReport = () => {
    setGeneratingReport(true);
    
    const selectedDate = new Date(reportDate);
    let startDate: Date;
    let endDate: Date;
    
    switch (reportType) {
      case 'daily':
        startDate = new Date(selectedDate);
        endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        startDate = new Date(selectedDate);
        startDate.setDate(selectedDate.getDate() - selectedDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(selectedDate.getFullYear(), 0, 1);
        endDate = new Date(selectedDate.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = endDate = selectedDate;
    }

    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    const reportMetrics = calculateReportMetrics(filteredTransactions);
    
    setReportData({
      period: formatReportPeriod(startDate, endDate, reportType),
      transactions: filteredTransactions,
      metrics: reportMetrics,
      startDate,
      endDate
    });
    
    setGeneratingReport(false);
  };

  const calculateReportMetrics = (reportTransactions: Transaction[]) => {
    const totalIncome = reportTransactions
      .filter(t => 
        t.category.toLowerCase().includes('sales') || 
        t.category.toLowerCase().includes('income') || 
        t.category.toLowerCase().includes('revenue')
      )
      .reduce((sum, t) => sum + t.creditAmount, 0);

    const totalExpenses = reportTransactions
      .filter(t => 
        t.debitAmount > 0 && 
        !t.category.toLowerCase().includes('assets') &&
        !t.category.toLowerCase().includes('capital')
      )
      .reduce((sum, t) => sum + t.debitAmount, 0);

    const totalCredits = reportTransactions.reduce((sum, t) => sum + t.creditAmount, 0);
    const totalDebits = reportTransactions.reduce((sum, t) => sum + t.debitAmount, 0);
    const netPosition = totalCredits - totalDebits;
    const profitLoss = totalIncome - totalExpenses;

    // Category breakdown
    const categoryBreakdown = reportTransactions.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { debit: 0, credit: 0, count: 0 };
      }
      acc[t.category].debit += t.debitAmount;
      acc[t.category].credit += t.creditAmount;
      acc[t.category].count += 1;
      return acc;
    }, {} as Record<string, { debit: number; credit: number; count: number }>);

    return {
      totalIncome,
      totalExpenses,
      totalCredits,
      totalDebits,
      netPosition,
      profitLoss,
      categoryBreakdown,
      transactionCount: reportTransactions.length
    };
  };

  const formatReportPeriod = (startDate: Date, endDate: Date, type: string) => {
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

    const reportContent = `
FINANCIAL REPORT - ${reportData.period.toUpperCase()}
Generated on: ${new Date().toLocaleString()}
${'-'.repeat(50)}

SUMMARY
${'-'.repeat(20)}
Total Income: ${formatCurrency(reportData.metrics.totalIncome)}
Total Expenses: ${formatCurrency(reportData.metrics.totalExpenses)}
Net Profit/Loss: ${formatCurrency(reportData.metrics.profitLoss)}
Total Credits: ${formatCurrency(reportData.metrics.totalCredits)}
Total Debits: ${formatCurrency(reportData.metrics.totalDebits)}
Net Position: ${formatCurrency(reportData.metrics.netPosition)}
Transaction Count: ${reportData.metrics.transactionCount}

CATEGORY BREAKDOWN
${'-'.repeat(30)}
${Object.entries(reportData.metrics.categoryBreakdown)
  .map(([category, data]) => {
    const categoryData = data as { debit: number; credit: number; count: number };
    return `${category}: Debit ${formatCurrency(categoryData.debit)}, Credit ${formatCurrency(categoryData.credit)} (${categoryData.count} transactions)`;
  }).join('\n')}

DETAILED TRANSACTIONS
${'-'.repeat(30)}
${reportData.transactions.map((t: Transaction) => 
  `${new Date(t.date).toLocaleDateString()} | ${t.category} | ${t.description} | Debit: ${formatCurrency(t.debitAmount)} | Credit: ${formatCurrency(t.creditAmount)}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Financial_Report_${reportType}_${reportDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadReportAsPDF = () => {
    if (!reportData) return;

    // Create HTML content for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Financial Report - ${reportData.period}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .summary { margin-bottom: 30px; }
            .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
            .metric-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .metric-title { font-weight: bold; color: #666; font-size: 14px; }
            .metric-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
            .positive { color: #10b981; }
            .negative { color: #ef4444; }
            .category-breakdown { margin-bottom: 30px; }
            .category-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .transactions-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .transactions-table th, .transactions-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .transactions-table th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>FINANCIAL REPORT</h1>
            <h2>${reportData.period.toUpperCase()}</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="metrics">
            <div class="metric-box">
                <div class="metric-title">Total Income</div>
                <div class="metric-value positive">${formatCurrency(reportData.metrics.totalIncome)}</div>
            </div>
            <div class="metric-box">
                <div class="metric-title">Total Expenses</div>
                <div class="metric-value negative">${formatCurrency(reportData.metrics.totalExpenses)}</div>
            </div>
            <div class="metric-box">
                <div class="metric-title">Net Profit/Loss</div>
                <div class="metric-value ${reportData.metrics.profitLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(reportData.metrics.profitLoss)}</div>
            </div>
            <div class="metric-box">
                <div class="metric-title">Transaction Count</div>
                <div class="metric-value">${reportData.metrics.transactionCount}</div>
            </div>
        </div>

        <div class="category-breakdown">
            <h3>Category Breakdown</h3>
            ${Object.entries(reportData.metrics.categoryBreakdown).map(([category, data]: [string, any]) => `
                <div class="category-item">
                    <span><strong>${category}</strong></span>
                    <span>
                        ${data.debit > 0 ? `<span class="negative">-${formatCurrency(data.debit)}</span> ` : ''}
                        ${data.credit > 0 ? `<span class="positive">+${formatCurrency(data.credit)}</span> ` : ''}
                        <span style="color: #666;">(${data.count} transactions)</span>
                    </span>
                </div>
            `).join('')}
        </div>

        <div class="transactions">
            <h3>Detailed Transactions</h3>
            <table class="transactions-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th class="text-right">Debit</th>
                        <th class="text-right">Credit</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.transactions.map((t: Transaction) => `
                        <tr>
                            <td>${new Date(t.date).toLocaleDateString()}</td>
                            <td>${t.category}</td>
                            <td>${t.description}</td>
                            <td class="text-right negative">${t.debitAmount > 0 ? formatCurrency(t.debitAmount) : '-'}</td>
                            <td class="text-right positive">${t.creditAmount > 0 ? formatCurrency(t.creditAmount) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    `;

    // Create and download PDF using window.print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Add print styles
      const style = printWindow.document.createElement('style');
      style.textContent = `
        @media print {
          body { margin: 0; }
          .header { page-break-after: avoid; }
          .metric-box { page-break-inside: avoid; }
          .transactions-table { page-break-inside: auto; }
          .transactions-table tr { page-break-inside: avoid; }
        }
      `;
      printWindow.document.head.appendChild(style);
      
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const downloadReportAsWord = () => {
    if (!reportData) return;

    // Create HTML content for Word document
    const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <title>Financial Report - ${reportData.period}</title>
        <style>
            body { font-family: 'Times New Roman', serif; margin: 1in; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>FINANCIAL REPORT</h1>
            <h2>${reportData.period.toUpperCase()}</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <h3>Financial Summary</h3>
        <p>Total Income: <strong style="color: green;">${formatCurrency(reportData.metrics.totalIncome)}</strong></p>
        <p>Total Expenses: <strong style="color: red;">${formatCurrency(reportData.metrics.totalExpenses)}</strong></p>
        <p>Net Profit/Loss: <strong style="color: ${reportData.metrics.profitLoss >= 0 ? 'green' : 'red'};">${formatCurrency(reportData.metrics.profitLoss)}</strong></p>
        <p>Transaction Count: <strong>${reportData.metrics.transactionCount}</strong></p>

        <h3>Category Breakdown</h3>
        ${Object.entries(reportData.metrics.categoryBreakdown).map(([category, data]: [string, any]) => `
            <p><strong>${category}:</strong>
            ${data.debit > 0 ? `Debit ${formatCurrency(data.debit)} ` : ''}
            ${data.credit > 0 ? `Credit ${formatCurrency(data.credit)} ` : ''}
            (${data.count} transactions)</p>
        `).join('')}

        <h3>Detailed Transactions</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th class="text-right">Debit</th>
                    <th class="text-right">Credit</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.transactions.map((t: Transaction) => `
                    <tr>
                        <td>${new Date(t.date).toLocaleDateString()}</td>
                        <td>${t.category}</td>
                        <td>${t.description}</td>
                        <td class="text-right">${t.debitAmount > 0 ? formatCurrency(t.debitAmount) : '-'}</td>
                        <td class="text-right">${t.creditAmount > 0 ? formatCurrency(t.creditAmount) : '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    // Create and download as .doc file
    const blob = new Blob([htmlContent], { 
      type: 'application/msword' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Financial_Report_${reportType}_${reportDate}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    // Fix floating point precision issues by rounding to 2 decimal places
    const roundedAmount = Math.round(amount * 100) / 100;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(roundedAmount);
  };

  // Calculate comprehensive financial metrics
  const calculateFinancialMetrics = () => {
    // Fix floating point precision by rounding all calculations
    const roundToTwo = (num: number) => Math.round(num * 100) / 100;
    
    // Calculate total capital as: Sum of ONLY the 5 initial assets (no earnings yet)
    const totalCredits = roundToTwo(transactions.reduce((sum, t) => sum + t.creditAmount, 0));
    const totalDebits = roundToTwo(transactions.reduce((sum, t) => sum + t.debitAmount, 0));
    
    // PROPER ACCOUNTING: Calculate each component separately
    
    // 1. Total Opening Stock Inventory - All stock capital investments
    const totalOpeningStock = roundToTwo(transactions
      .filter(t => 
        t.creditAmount > 0 && 
        (t.category.toLowerCase().includes('owner capital - opening stock') ||
         t.description.toLowerCase().includes('capital investment: opening stock'))
      )
      .reduce((sum, t) => sum + t.creditAmount, 0));
    
    // 2. Total Opening Receivables - Only count the actual receivable amounts (not double-count paired transactions)
    const totalOpeningReceivables = roundToTwo(transactions
      .filter(t => 
        (t.creditAmount > 0 && t.category.toLowerCase().includes('owner capital - opening receivables')) ||
        (t.creditAmount > 0 && t.description.toLowerCase().includes('capital investment: opening receivable'))
      )
      .reduce((sum, t) => sum + t.creditAmount, 0));
    
    // 3. Cash on Hand - Initial capital cash investment
    const cashOnHand = roundToTwo(transactions
      .filter(t => 
        t.creditAmount > 0 && 
        (t.category.toLowerCase().includes('initial capital') &&
         t.description.toLowerCase().includes('cash on hand'))
      )
      .reduce((sum, t) => sum + t.creditAmount, 0));
    
    // Total Capital = Sum of the three capital components (proper accounting)
    const totalCapital = roundToTwo(totalOpeningStock + totalOpeningReceivables + cashOnHand);
    
    // Total Income = ONLY actual sales revenue (not opening balances or assets)
    const totalIncome = roundToTwo(transactions
      .filter(t => 
        t.creditAmount > 0 && 
        (t.category.toLowerCase().includes('sales') || 
         t.category.toLowerCase().includes('revenue')) &&
        !t.category.toLowerCase().includes('opening') &&
        !t.category.toLowerCase().includes('capital') &&
        !t.description.toLowerCase().includes('opening') &&
        !t.description.toLowerCase().includes('cash on hand')
      )
      .reduce((sum, t) => sum + t.creditAmount, 0));
    
    // Total expenses (all actual expenses)
    const totalExpenses = roundToTwo(transactions
      .filter(t => 
        t.debitAmount > 0 && 
        t.type === 'expense'
      )
      .reduce((sum, t) => sum + t.debitAmount, 0));

    const payableExpenses = roundToTwo(transactions
      .filter(t => t.category.toLowerCase().includes('accounts payable'))
      .reduce((sum, t) => sum + t.debitAmount, 0));

    const receivableIncome = roundToTwo(transactions
      .filter(t => t.category.toLowerCase().includes('accounts receivable'))
      .reduce((sum, t) => sum + t.creditAmount, 0));

    const rentExpenses = roundToTwo(transactions
      .filter(t => 
        t.category.toLowerCase().includes('rent') && 
        t.type === 'expense'
      )
      .reduce((sum, t) => sum + t.debitAmount, 0));

    // Only count actual operational expenses, NOT opening stock or receivables
    const operationalExpenses = roundToTwo(transactions
      .filter(t => 
        t.debitAmount > 0 && 
        t.type === 'expense' && // Only expense type transactions
        !t.category.toLowerCase().includes('rent') &&
        !t.category.toLowerCase().includes('accounts payable') &&
        !t.category.toLowerCase().includes('assets') &&
        !t.category.toLowerCase().includes('accounts receivable') &&
        !t.category.toLowerCase().includes('capital')
      )
      .reduce((sum, t) => sum + t.debitAmount, 0));

    const netPosition = roundToTwo(totalCredits - totalDebits);
    const profitLoss = roundToTwo(totalIncome - totalExpenses);

    return {
      capital: totalCapital,
      totalIncome,
      totalExpenses,
      payableExpenses,
      receivableIncome,
      rentExpenses,
      operationalExpenses,
      totalCredits,
      totalDebits,
      netPosition,
      profitLoss,
      // Individual capital components for detailed display
      totalOpeningStock,
      totalOpeningReceivables,
      cashOnHand
    };
  };

  const metrics = calculateFinancialMetrics();

  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = !filters.type || transaction.type === filters.type;
    const matchesCategory = !filters.category || transaction.category.toLowerCase().includes(filters.category.toLowerCase());
    const matchesSearch = !filters.search || 
      transaction.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      transaction.category.toLowerCase().includes(filters.search.toLowerCase());
    
    let matchesDateRange = true;
    if (filters.dateFrom) {
      matchesDateRange = matchesDateRange && new Date(transaction.date) >= new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      matchesDateRange = matchesDateRange && new Date(transaction.date) <= new Date(filters.dateTo);
    }

    return matchesType && matchesCategory && matchesSearch && matchesDateRange;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Financial Ledger</h1>
        <div className="flex gap-3">
          <Button onClick={() => setShowReportModal(true)} variant="secondary">
            Generate Report
          </Button>
          <Button onClick={() => setShowAddTransaction(true)} variant="primary">
            Add Transaction
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      {/* Working Report Generation Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>
              Generate Financial Report
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Report Type:
              </label>
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              >
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="yearly">Yearly Report</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Date:
              </label>
              <input 
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={generateReport}
                disabled={generatingReport}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  cursor: 'pointer',
                  opacity: generatingReport ? 0.7 : 1
                }}
              >
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
            
            {reportData && (
              <div style={{ 
                padding: '16px', 
                backgroundColor: '#f9fafb', 
                borderRadius: '6px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                    Report Preview - {reportData.period}
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={downloadReport}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      📄 Text
                    </button>
                    <button
                      onClick={downloadReportAsPDF}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      🖨️ PDF
                    </button>
                    <button
                      onClick={downloadReportAsWord}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      📝 Word
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Total Income</p>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#10b981' }}>
                      {formatCurrency(reportData.metrics.totalIncome)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Total Expenses</p>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#ef4444' }}>
                      {formatCurrency(reportData.metrics.totalExpenses)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Net Profit/Loss</p>
                    <p style={{ 
                      margin: '4px 0 0 0', 
                      fontWeight: 'bold', 
                      color: reportData.metrics.profitLoss >= 0 ? '#10b981' : '#ef4444' 
                    }}>
                      {formatCurrency(reportData.metrics.profitLoss)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Transactions</p>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#333' }}>
                      {reportData.metrics.transactionCount}
                    </p>
                  </div>
                </div>

                <div>
                  <h5 style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Category Breakdown</h5>
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {Object.entries(reportData.metrics.categoryBreakdown).map(([category, data]: [string, any]) => (
                      <div key={category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                        <span style={{ color: '#333' }}>{category}</span>
                        <span style={{ fontWeight: '500' }}>
                          {data.debit > 0 && (
                            <span style={{ color: '#ef4444' }}>-{formatCurrency(data.debit)} </span>
                          )}
                          {data.credit > 0 && (
                            <span style={{ color: '#10b981' }}>+{formatCurrency(data.credit)} </span>
                          )}
                          <span style={{ color: '#666' }}>({data.count})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comprehensive Financial Summary */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '16px', 
        flexWrap: 'nowrap'
      }}>
        <Card className="p-4" style={{ flex: '1', minWidth: '200px' }}>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Capital</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(metrics.capital)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ flex: '1', minWidth: '200px' }}>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(metrics.totalIncome)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ flex: '1', minWidth: '200px' }}>
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">📉</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ flex: '1', minWidth: '200px' }}>
          <div className="flex items-center">
            <div className={`p-2 ${metrics.profitLoss >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg`}>
              <span className="text-2xl">{metrics.profitLoss >= 0 ? '📊' : '📉'}</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Profit/Loss</p>
              <p className={`text-xl font-bold ${metrics.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.profitLoss)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Capital Breakdown - Detailed View */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Capital Components Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="text-2xl text-green-600 mr-3">📦</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Opening Stock</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.totalOpeningStock)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="text-2xl text-blue-600 mr-3">📋</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Opening Receivables</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(metrics.totalOpeningReceivables)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="text-2xl text-purple-600 mr-3">💵</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cash on Hand</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(metrics.cashOnHand)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="text-2xl text-yellow-600 mr-3">🏆</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Capital</p>
                <p className="text-lg font-bold text-yellow-600">{formatCurrency(metrics.capital)}</p>
                <p className="text-xs text-gray-500 mt-1">Sum of above 3 components</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Financial Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Rent Expenses</h4>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.rentExpenses)}</p>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Other Expenses</h4>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.operationalExpenses)}</p>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Net Position</h4>
          <p className={`text-2xl font-bold ${metrics.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(metrics.netPosition)}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default FinancialLedger;
