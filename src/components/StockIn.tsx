import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import type { StockInEntry, Product } from '../types';

const StockIn: React.FC = () => {
  const [stockEntries, setStockEntries] = useState<StockInEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<StockInEntry | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productCode: '',
    productName: '',
    quantity: '',
    purchasePrice: '',
    supplierName: '',
    batchNumber: '',
    expiryDate: '',
    entryType: 'purchase' as 'purchase' | 'opening_stock',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockData, productsData] = await Promise.all([
        apiService.getStockInEntries(),
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

  const generateBatchNumber = (productCode: string, targetDate?: string) => {
    if (!productCode) return '';
    
    // Use the target date if provided, otherwise use today
    const dateToUse = targetDate ? new Date(targetDate) : new Date();
    const dateStr = dateToUse.getFullYear().toString().slice(-2) + 
                   (dateToUse.getMonth() + 1).toString().padStart(2, '0') + 
                   dateToUse.getDate().toString().padStart(2, '0');
    
    // Get all existing batch numbers for this product and date combination
    const matchingBatches = stockEntries.filter(entry => {
      // Check if the batch number matches the expected format exactly
      const expectedPrefix = `${productCode}-${dateStr}-`;
      return entry.productCode === productCode && 
             entry.batchNumber?.startsWith(expectedPrefix);
    });
    
    // Extract sequence numbers from existing batches and find the highest
    const existingSequenceNumbers = matchingBatches
      .map(entry => {
        const parts = entry.batchNumber?.split('-');
        if (parts && parts.length >= 3) {
          const sequencePart = parts[2];
          const num = parseInt(sequencePart, 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter(num => num > 0); // Only include valid positive numbers
    
    // Find the next available sequence number
    const maxSequence = existingSequenceNumbers.length > 0 ? Math.max(...existingSequenceNumbers) : 0;
    const nextSequence = maxSequence + 1;
    const sequenceNumber = nextSequence.toString().padStart(3, '0');
    
    console.log(`Generating batch for ${productCode} on ${dateStr}: found ${matchingBatches.length} existing batches, max sequence: ${maxSequence}, next: ${nextSequence}`);
    
    return `${productCode}-${dateStr}-${sequenceNumber}`;
  };

  const handleDateChange = (date: string) => {
    const newFormData = { ...formData, date };
    // If a product is already selected, regenerate the batch number for the new date
    if (formData.productCode) {
      newFormData.batchNumber = generateBatchNumber(formData.productCode, date);
    }
    setFormData(newFormData);
  };

  const handleProductChange = (productCode: string) => {
    const product = products.find(p => p.code === productCode);
    const autoBatchNumber = generateBatchNumber(productCode, formData.date);
    
    setFormData({
      ...formData,
      productCode,
      productName: product ? product.name : '',
      batchNumber: autoBatchNumber
    });
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
        purchasePrice: parseFloat(formData.purchasePrice),
        supplierName: formData.supplierName || undefined,
        batchNumber: formData.batchNumber || undefined,
        expiryDate: formData.expiryDate || undefined,
        entryType: formData.entryType,
        notes: formData.notes || undefined
      };

      if (editingEntry) {
        await apiService.updateStockInEntry(editingEntry.id, stockEntry);
      } else {
        await apiService.createStockInEntry(stockEntry);
      }
      
      await fetchData();
      setShowForm(false);
      setEditingEntry(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        productCode: '',
        productName: '',
        quantity: '',
        purchasePrice: '',
        supplierName: '',
        batchNumber: '',
        expiryDate: '',
        entryType: 'purchase',
        notes: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingEntry ? 'update' : 'create'} stock entry`);
    }
  };

  const handleEditEntry = (entry: StockInEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: typeof entry.date === 'string' ? entry.date.split('T')[0] : new Date(entry.date).toISOString().split('T')[0],
      productCode: entry.productCode,
      productName: entry.productName,
      quantity: entry.quantity.toString(),
      purchasePrice: entry.purchasePrice.toString(),
      supplierName: entry.supplierName || '',
      batchNumber: entry.batchNumber || '',
      expiryDate: entry.expiryDate ? (typeof entry.expiryDate === 'string' ? entry.expiryDate.split('T')[0] : new Date(entry.expiryDate).toISOString().split('T')[0]) : '',
      entryType: entry.entryType,
      notes: entry.notes || ''
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setShowForm(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      productCode: '',
      productName: '',
      quantity: '',
      purchasePrice: '',
      supplierName: '',
      batchNumber: '',
      expiryDate: '',
      entryType: 'purchase',
      notes: ''
    });
  };

  const handleDeleteStockIn = async (id: string, productName: string) => {
    if (window.confirm(`Are you sure you want to delete this stock in entry for "${productName}"? This action cannot be undone.`)) {
      try {
        await apiService.deleteStockInEntry(id);
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
          setError('Failed to delete stock in entry');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading stock entries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Stock In</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'Add Stock In'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      )}

      {/* Add Stock Form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingEntry ? 'Edit Stock Entry' : 'Add New Stock Entry'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => handleDateChange(e.target.value)}
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
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="form-label">Purchase Price per Unit (PHP)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="form-label">Entry Type</label>
                <select
                  className="form-select"
                  value={formData.entryType}
                  onChange={(e) => setFormData({ ...formData, entryType: e.target.value as 'purchase' | 'opening_stock' })}
                  required
                >
                  <option value="purchase">📦 Regular Purchase</option>
                  <option value="opening_stock">🏢 Opening Stock (Initial Inventory)</option>
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.entryType === 'opening_stock' 
                    ? 'Use this for recording existing inventory when starting the system' 
                    : 'Use this for new purchases from suppliers'
                  }
                </p>
              </div>

              <div>
                <label className="form-label">
                  {formData.entryType === 'opening_stock' ? 'Source/Previous Supplier' : 'Supplier Name'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder={formData.entryType === 'opening_stock' ? 'Original supplier or source (optional)' : 'Supplier name'}
                />
              </div>

              <div>
                <label className="form-label">
                  Batch Number 
                  <span className="text-sm text-gray-500 font-normal"> (Auto-generated)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="form-input flex-1"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="Auto-generated when product is selected"
                  />
                  {formData.productCode && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, batchNumber: generateBatchNumber(formData.productCode, formData.date) })}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm whitespace-nowrap"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Format: ProductCode-YYMMDD-001 (e.g., IL-250803-001)
                </p>
              </div>

              <div>
                <label className="form-label">Expiry Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={formData.entryType === 'opening_stock' 
                    ? 'Add notes about this opening stock (e.g., valuation method, source, condition)' 
                    : 'Add any additional notes about this purchase'
                  }
                  rows={2}
                />
              </div>

              <div className="flex items-end">
                <div className="w-full">
                  <p className="form-label">Total Value (PHP)</p>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium">
                    {formData.quantity && formData.purchasePrice 
                      ? formatCurrency(parseInt(formData.quantity) * parseFloat(formData.purchasePrice))
                      : formatCurrency(0)
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingEntry ? 'Update Stock Entry' : 'Add Stock Entry'}
              </button>
              <button 
                type="button" 
                onClick={editingEntry ? cancelEdit : () => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock Entries Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Stock In History</h3>
          <div className="text-sm text-gray-500">
            {stockEntries.length} entries
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
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price (PHP)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value (PHP)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch/Expiry
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
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
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.entryType === 'opening_stock' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {entry.entryType === 'opening_stock' ? '🏢 Opening Stock' : '📦 Purchase'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {entry.supplierName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {entry.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(entry.purchasePrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(entry.quantity * entry.purchasePrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-medium ${
                      entry.remainingQuantity > 0 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {entry.remainingQuantity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      {entry.batchNumber && (
                        <div className="text-xs">Batch: {entry.batchNumber}</div>
                      )}
                      {entry.expiryDate && (
                        <div className="text-xs text-gray-500">
                          Exp: {new Date(entry.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        title="Edit stock in entry"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStockIn(entry.id, entry.productName)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                        title="Delete stock in entry"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stockEntries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No stock entries found. Add your first stock entry to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default StockIn;
