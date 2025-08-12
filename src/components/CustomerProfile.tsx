import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';

interface CustomerProfile {
  customerName: string;
  totalPurchases: number;
  totalSales: number;
  totalPaid: number;
  totalDebt: number;
  customerDebts: any[];
  generalDebts: any[];
  salesHistory: any[];
  paymentHistory: any[];
  allTransactions: any[];
}

interface Customer {
  name: string;
  totalSales: number;
  totalDebt: number;
  lastTransaction: string | null;
  status: 'active' | 'inactive';
}

const CustomerProfile: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'profile'>('list');

  // Load all customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCustomers();
      setCustomers(response);
    } catch (err) {
      setError('Failed to load customers');
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerProfile = async (customerName: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCustomerProfile(customerName);
      setCustomerProfile(response);
    } catch (err) {
      setError('Failed to load customer profile');
      console.error('Error loading customer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customerName: string) => {
    loadCustomerProfile(customerName);
    setViewMode('profile');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setCustomerProfile(null);
  };

  const handleDeleteCustomer = async (customerName: string) => {
    if (!confirm(`⚠️ WARNING: This will permanently delete "${customerName}" and ALL their data including:\n\n• All sales records\n• All debt records\n• All payment history\n• All transaction history\n• All general debts\n\nThis action cannot be undone!\n\nAre you sure you want to proceed?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteCustomer(customerName);
      
      // Show success message
      alert(`✅ Customer "${customerName}" and all related data have been successfully deleted.`);
      
      // Go back to customer list and reload customers
      setViewMode('list');
      setCustomerProfile(null);
      await loadCustomers(); // Refresh the customer list
      
    } catch (err) {
      setError(`Failed to delete customer: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error deleting customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async () => {
    if (!searchTerm.trim()) {
      loadCustomers();
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.searchCustomers(searchTerm);
      // Convert search results to customer format
      const searchResults = response.map((result: any) => ({
        name: result.name,
        totalSales: 0, // Search results don't include sales data
        totalDebt: result.totalDebt,
        lastTransaction: result.lastActivity,
        status: 'active' as const
      }));
      setCustomers(searchResults);
    } catch (err) {
      setError('Failed to search customers');
      console.error('Error searching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'text-green-600';
      case 'customer_payment': return 'text-blue-600';
      case 'general_receivable': return 'text-orange-600';
      case 'general_payable': return 'text-red-600';
      case 'general_payment': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        {viewMode === 'profile' && (
          <button
            onClick={handleBackToList}
            className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            ← Back to Customers
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Customer List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow">
          {/* Search Header */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold mb-4">Select Customer</h2>
            <div className="flex">
              <input
                type="text"
                placeholder="Search customers..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
              />
              <button
                onClick={searchCustomers}
                className="px-6 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Customer Grid */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <div className="text-gray-500">Loading customers...</div>
                </div>
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mb-4">👥</div>
                <div className="text-gray-500 text-lg">No customers found</div>
                <div className="text-gray-400 text-sm mt-2">Try adjusting your search criteria</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customers.map((customer) => (
                  <div
                    key={customer.name}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 group"
                  >
                    <div 
                      onClick={() => handleCustomerSelect(customer.name)}
                      className="cursor-pointer hover:bg-blue-50 rounded-md p-2 -m-2 mb-2"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 truncate flex-1">{customer.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                          customer.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Sales:</span>
                          <span className="font-medium text-green-600">{formatCurrency(customer.totalSales)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Outstanding:</span>
                          <span className={`font-medium ${customer.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(customer.totalDebt)}
                          </span>
                        </div>
                        {customer.lastTransaction && (
                          <div className="text-xs text-gray-500 mt-2">
                            Last: {formatDate(customer.lastTransaction)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(customer.name);
                        }}
                        className="w-full flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        title={`Delete ${customer.name} and all related data`}
                      >
                        🗑️ Delete Customer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Profile View */}
      {viewMode === 'profile' && customerProfile && (
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">{customerProfile.customerName}</h2>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">Customer Profile</div>
                <button
                  onClick={() => handleDeleteCustomer(customerProfile.customerName)}
                  className="flex items-center px-3 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  title="Delete customer and all related data"
                >
                  🗑️ Delete Customer
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {customerProfile.totalPurchases}
                </div>
                <div className="text-sm text-gray-600">Total Purchases</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(customerProfile.totalSales)}
                </div>
                <div className="text-sm text-gray-600">Total Sales</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(customerProfile.totalPaid)}
                </div>
                <div className="text-sm text-gray-600">Total Paid</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className={`text-2xl font-bold ${
                  customerProfile.totalDebt > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(customerProfile.totalDebt)}
                </div>
                <div className="text-sm text-gray-600">Outstanding Balance</div>
              </div>
            </div>
          </div>

          {/* Debt Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Debts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                🛒 Sales Debts
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {customerProfile.customerDebts.length}
                </span>
              </h3>
              {customerProfile.customerDebts.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-3xl mb-2">✅</div>
                  <div>No outstanding sales debts</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {customerProfile.customerDebts.map((debt) => (
                    <div key={debt.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="font-medium text-gray-900">{debt.productName}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-1">
                        <div>Qty: {debt.quantity}</div>
                        <div>Sale: {formatCurrency(debt.totalSale)}</div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-medium text-red-600">
                          Balance: {formatCurrency(debt.remainingBalance)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(debt.saleDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Debts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                📋 General Debts
                <span className="ml-2 text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  {customerProfile.generalDebts.length}
                </span>
              </h3>
              {customerProfile.generalDebts.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-3xl mb-2">📋</div>
                  <div>No general debts</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {customerProfile.generalDebts.map((debt) => (
                    <div key={debt.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="font-medium text-gray-900">{debt.description}</div>
                      <div className={`text-sm font-medium ${
                        debt.type === 'receivable' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {debt.type === 'receivable' ? '💰 They owe us' : '💸 We owe them'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-1">
                        <div>Original: {formatCurrency(debt.originalAmount)}</div>
                        <div>Balance: {formatCurrency(debt.remainingBalance)}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(debt.issueDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              📊 Transaction History
              <span className="ml-2 text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                {customerProfile.allTransactions.length} transactions
              </span>
            </h3>
            {customerProfile.allTransactions.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <div className="text-3xl mb-2">📊</div>
                <div>No transaction history</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customerProfile.allTransactions.map((transaction, index) => (
                      <tr key={`${transaction.id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(transaction.date)}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                          {transaction.type.replace('_', ' ').toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.status === 'completed' || transaction.status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'active' || transaction.status === 'unpaid'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading state for profile view */}
      {viewMode === 'profile' && !customerProfile && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-gray-500 text-lg">Loading customer profile...</div>
              <div className="text-gray-400 text-sm mt-2">Please wait while we gather the information</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
