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
    
    // Calculate total capital as: Total Credits - Total Expenses (proper accounting)
    const totalCredits = roundToTwo(transactions.reduce((sum, t) => sum + t.creditAmount, 0));
    const totalDebits = roundToTwo(transactions.reduce((sum, t) => sum + t.debitAmount, 0));
    
    // Total expenses should only be actual operating expenses
    const totalExpenses = roundToTwo(transactions
      .filter(t => 
        t.debitAmount > 0 && 
        t.type === 'expense' && // Only expense type transactions
        !t.category.toLowerCase().includes('assets') &&
        !t.category.toLowerCase().includes('capital') &&
        !t.category.toLowerCase().includes('accounts receivable')
      )
      .reduce((sum, t) => sum + t.debitAmount, 0));
    
    // Capital = Total Credits - Operating Expenses (Net Worth)
    const capital = roundToTwo(totalCredits - totalExpenses);

    // Only count actual sales/revenue as income, NOT receivables
    const totalIncome = roundToTwo(transactions
      .filter(t => 
        (t.category.toLowerCase().includes('sales') || 
         t.category.toLowerCase().includes('income') || 
         t.category.toLowerCase().includes('revenue')) &&
        !t.category.toLowerCase().includes('accounts receivable')
      )
      .reduce((sum, t) => sum + t.creditAmount, 0));

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
      capital,
      totalIncome,
      totalExpenses,
      payableExpenses,
      receivableIncome,
      rentExpenses,
      operationalExpenses,
      totalCredits,
      totalDebits,
      netPosition,
      profitLoss
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
              <Input
                value={newTransaction.description}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
                className="w-full"
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

      {/* Filters */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search transactions..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Input
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              placeholder="Filter by category..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fern-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fern-green focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => setFilters({
                type: '',
                category: '',
                dateFrom: '',
                dateTo: '',
                search: ''
              })}
              variant="secondary"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          <div className="text-sm text-gray-500">
            {filteredTransactions.length} of {transactions.length} transactions
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Category</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Description</th>
                <th className="text-right py-3 px-2 font-medium text-gray-700">Debit (PHP)</th>
                <th className="text-right py-3 px-2 font-medium text-gray-700">Credit (PHP)</th>
                <th className="text-right py-3 px-2 font-medium text-gray-700">Balance (PHP)</th>
                <th className="text-center py-3 px-2 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'stock_in' ? 'bg-blue-100 text-blue-800' :
                      transaction.type === 'stock_out' ? 'bg-green-100 text-green-800' :
                      transaction.type === 'payment_received' ? 'bg-purple-100 text-purple-800' :
                      transaction.type === 'payment_made' ? 'bg-orange-100 text-orange-800' :
                      transaction.type === 'opening_stock' ? 'bg-indigo-100 text-indigo-800' :
                      transaction.type === 'opening_balance' ? 'bg-yellow-100 text-yellow-800' :
                      transaction.type === 'debt_created' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-900">{transaction.description}</td>
                  <td className="py-3 px-2 text-sm text-right text-red-600">
                    {transaction.debitAmount > 0 ? formatCurrency(transaction.debitAmount) : '-'}
                  </td>
                  <td className="py-3 px-2 text-sm text-right text-green-600">
                    {transaction.creditAmount > 0 ? formatCurrency(transaction.creditAmount) : '-'}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(transaction.balance)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Button
                      onClick={() => handleDeleteTransaction(transaction.id, transaction.description)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                    >
                      🗑️ Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No transactions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default FinancialLedger;
