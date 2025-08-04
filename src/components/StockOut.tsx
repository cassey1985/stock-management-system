import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import { useAuth } from '../contexts/AuthContext';
import type { StockOutEntry, Product, FIFOResult } from '../types';

const StockOut: React.FC = () => {
  const { isAdmin } = useAuth();
  const [stockEntries, setStockEntries] = useState<StockOutEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [fifoPreview, setFifoPreview] = useState<FIFOResult | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productCode: '',
    productName: '',
    quantity: '',
    sellingPrice: '',
    customerName: '',
    customerContact: '',
    amountPaid: '',
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockData, productsData] = await Promise.all([
        apiService.getStockOutEntries(),
        apiService.getProducts()
      ]);
      setStockEntries(stockData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productCode: string) => {
    const product = products.find(p => p.code === productCode);
    setFormData({
      ...formData,
      productCode,
      productName: product ? product.name : ''
    });
    setFifoPreview(null);
  };

  const handleQuantityChange = async (quantity: string) => {
    setFormData({ ...formData, quantity });
    
    if (formData.productCode && quantity && parseInt(quantity) > 0) {
      try {
        const preview = await apiService.getFIFOPreview(formData.productCode, parseInt(quantity));
        setFifoPreview(preview);
      } catch (err) {
        console.error('Failed to get FIFO preview:', err);
        setFifoPreview(null);
      }
    } else {
      setFifoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const stockEntry = {
        date: formData.date,
        productId: products.find(p => p.code === formData.productCode)?.id || '',
        productCode: formData.productCode,
        productName: formData.productName,
        quantity: parseInt(formData.quantity),
        sellingPrice: parseFloat(formData.sellingPrice),
        customerName: formData.customerName,
        customerContact: formData.customerContact || undefined,
        amountPaid: parseFloat(formData.amountPaid) || 0,
        dueDate: formData.dueDate || undefined,
        notes: formData.notes || undefined
      };

      await apiService.createStockOutEntry(stockEntry);
      await fetchData();
      setShowForm(false);
      setFifoPreview(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        productCode: '',
        productName: '',
        quantity: '',
        sellingPrice: '',
        customerName: '',
        customerContact: '',
        amountPaid: '',
        dueDate: '',
        notes: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stock entry');
    }
  };

  const handleDeleteStockOut = async (id: string, productName: string, customerName: string) => {
    if (window.confirm(`Are you sure you want to delete this stock out entry for "${productName}" to ${customerName}? This action cannot be undone.`)) {
      try {
        await apiService.deleteStockOutEntry(id);
        await fetchData();
      } catch (err) {
        console.error('Delete error:', err);
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('fetch')) {
            setError('Backend server is not running. Please start the backend server first.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to delete stock out entry');
        }
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading stock entries...</div>
      </div>
    );
  }

  const totalSale = formData.quantity && formData.sellingPrice 
    ? parseInt(formData.quantity) * parseFloat(formData.sellingPrice) 
    : 0;
  
  const profit = fifoPreview ? totalSale - fifoPreview.totalCost : 0;
  const amountPaid = parseFloat(formData.amountPaid) || 0;
  const balance = totalSale - amountPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {isAdmin() ? 'Stock Out' : 'Record Sale'}
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'Record Sale'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      )}

      {/* Add Stock Out Form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Record New Sale</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Sale Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Product</label>
                <select
                  className="form-select"
                  value={formData.productCode}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.code}>
                      {product.code} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="form-label">Selling Price per Unit (PHP)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Customer Contact</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.customerContact}
                  onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Amount Paid (PHP)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                  min="0"
                  max={totalSale}
                />
              </div>

              <div>
                <label className="form-label">Due Date (if not fully paid)</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* FIFO Preview */}
            {fifoPreview && (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Sale Summary (FIFO Calculation)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Total Sale (PHP)</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(totalSale)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Cost (FIFO)</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(fifoPreview.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Profit (PHP)</p>
                    <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Balance Due</p>
                    <p className={`text-lg font-bold ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>
                
                {fifoPreview.usedBatches.length > 0 && (
                  <div className="mt-4">
                    <p className="text-blue-700 font-medium mb-2">Batches Used:</p>
                    <div className="space-y-1">
                      {fifoPreview.usedBatches.map((batch, index) => (
                        <div key={index} className="text-xs text-blue-800">
                          Qty: {batch.quantityUsed} @ {formatCurrency(batch.pricePerUnit)} = {formatCurrency(batch.cost)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Record Sale
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sales History / Stock Out Entries Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isAdmin() ? 'Stock Out Entries' : 'Sales History'}
          </h3>
          <div className="text-sm text-gray-500">
            {stockEntries.length} {isAdmin() ? 'entries' : 'sales'}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price (PHP)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sale (PHP)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit (PHP)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                {isAdmin() && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stockEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{entry.productCode}</div>
                      <div className="text-gray-500">{entry.productName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{entry.customerName}</div>
                      {entry.customerContact && (
                        <div className="text-gray-500 text-xs">{entry.customerContact}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {entry.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(entry.sellingPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(entry.totalSale)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span className={entry.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(entry.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(entry.paymentStatus)}`}>
                      {entry.paymentStatus}
                    </span>
                    {entry.paymentStatus !== 'paid' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Due: {formatCurrency(entry.totalSale - entry.amountPaid)}
                      </div>
                    )}
                  </td>
                  {isAdmin() && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDeleteStockOut(entry.id, entry.productName, entry.customerName)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                        title="Delete stock out entry"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stockEntries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No sales recorded yet. Record your first sale to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default StockOut;
