import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import type { Payment } from '../types';

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    customer: '',
    method: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPayments();
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, customerName: string, amount: number) => {
    if (window.confirm(`Are you sure you want to delete the payment of ${formatCurrency(amount)} from ${customerName}? This action cannot be undone.`)) {
      try {
        await apiService.deletePayment(paymentId);
        await fetchPayments(); // Refresh the payments list
        console.log('Payment deleted successfully');
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Failed to delete payment. Please try again.');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesCustomer = !filters.customer || 
      payment.customerName.toLowerCase().includes(filters.customer.toLowerCase());
    const matchesMethod = !filters.method || payment.paymentMethod === filters.method;
    
    let matchesDateRange = true;
    if (filters.dateFrom) {
      matchesDateRange = matchesDateRange && new Date(payment.paymentDate) >= new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      matchesDateRange = matchesDateRange && new Date(payment.paymentDate) <= new Date(filters.dateTo);
    }

    return matchesCustomer && matchesMethod && matchesDateRange;
  });

  const totalPayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const paymentMethods = Array.from(new Set(payments.map(p => p.paymentMethod)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
        <div className="text-sm text-gray-500">
          {filteredPayments.length} of {payments.length} payments
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPayments)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Payment Count</p>
              <p className="text-2xl font-bold text-blue-600">{filteredPayments.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Payment</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredPayments.length > 0 ? formatCurrency(totalPayments / filteredPayments.length) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Customer Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search customer..."
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Payment Method</label>
            <select
              className="form-select"
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
            >
              <option value="">All Methods</option>
              {paymentMethods.map(method => (
                <option key={method} value={method}>
                  {method.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            className="btn-secondary"
            onClick={() => setFilters({ customer: '', method: '', dateFrom: '', dateTo: '' })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment Records</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount (PHP)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {payment.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold text-green-600">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {payment.reference || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {payment.notes || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeletePayment(payment.id, payment.customerName, payment.amount)}
                      className="text-red-600 hover:text-red-900 px-3 py-1 text-sm border border-red-200 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No payments found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
