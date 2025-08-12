import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import { useAuth } from '../contexts/AuthContext';
import type { StockOutEntry, Product, FIFOResult, MultiProductSale, MultiProductSaleItem } from '../types';

const StockOut: React.FC = () => {
  const { isAdmin } = useAuth();
  const [stockEntries, setStockEntries] = useState<StockOutEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saleMode, setSaleMode] = useState<'single' | 'multi'>('single');
  const [editingEntry, setEditingEntry] = useState<StockOutEntry | null>(null);
  const [fifoPreview, setFifoPreview] = useState<FIFOResult | null>(null);
  
  // Single product form data
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

  // Multi-product form data
  const [multiProductFormData, setMultiProductFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerContact: '',
    items: [] as MultiProductSaleItem[],
    totalAmountPaid: '',
    paymentAllocation: 'proportional' as 'proportional' | 'manual',
    dueDate: '',
    notes: ''
  });

  const [newItem, setNewItem] = useState({
    productCode: '',
    productName: '',
    quantity: '',
    sellingPrice: '',
    allocatedPayment: ''
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
    if (saleMode === 'single') {
      setFormData({
        ...formData,
        productCode,
        productName: product ? product.name : ''
      });
      setFifoPreview(null);
    } else {
      setNewItem({
        ...newItem,
        productCode,
        productName: product ? product.name : ''
      });
    }
  };

  const handleQuantityChange = async (quantity: string) => {
    if (saleMode === 'single') {
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
    } else {
      setNewItem({ ...newItem, quantity });
    }
  };

  const addItemToMultiProductSale = () => {
    if (!newItem.productCode || !newItem.quantity || !newItem.sellingPrice) {
      setError('Please fill in all item fields');
      return;
    }

    const quantity = parseInt(newItem.quantity);
    const sellingPrice = parseFloat(newItem.sellingPrice);
    const totalSale = quantity * sellingPrice;
    
    const item: MultiProductSaleItem = {
      productCode: newItem.productCode,
      productName: newItem.productName,
      quantity,
      sellingPrice,
      totalSale,
      allocatedPayment: parseFloat(newItem.allocatedPayment) || 0
    };

    setMultiProductFormData({
      ...multiProductFormData,
      items: [...multiProductFormData.items, item]
    });

    // Reset new item form
    setNewItem({
      productCode: '',
      productName: '',
      quantity: '',
      sellingPrice: '',
      allocatedPayment: ''
    });
    setError(null);
  };

  const removeItemFromMultiProductSale = (index: number) => {
    const updatedItems = multiProductFormData.items.filter((_, i) => i !== index);
    setMultiProductFormData({
      ...multiProductFormData,
      items: updatedItems
    });
  };

  const calculateProportionalPayments = () => {
    const totalSaleAmount = multiProductFormData.items.reduce((sum, item) => sum + item.totalSale, 0);
    const totalAmountPaid = parseFloat(multiProductFormData.totalAmountPaid) || 0;
    
    const updatedItems = multiProductFormData.items.map(item => ({
      ...item,
      allocatedPayment: Math.round((item.totalSale / totalSaleAmount) * totalAmountPaid * 100) / 100
    }));

    setMultiProductFormData({
      ...multiProductFormData,
      items: updatedItems
    });
  };

  const updateItemPayment = (index: number, allocatedPayment: number) => {
    const updatedItems = [...multiProductFormData.items];
    updatedItems[index].allocatedPayment = allocatedPayment;
    setMultiProductFormData({
      ...multiProductFormData,
      items: updatedItems
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (saleMode === 'single') {
        // Single product sale
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

        if (editingEntry) {
          await apiService.updateStockOutEntry(editingEntry.id, stockEntry);
        } else {
          await apiService.createStockOutEntry(stockEntry);
        }
      } else {
        // Multi-product sale
        if (multiProductFormData.items.length === 0) {
          setError('Please add at least one product to the sale');
          return;
        }

        const multiProductSale: MultiProductSale = {
          date: multiProductFormData.date,
          customerName: multiProductFormData.customerName,
          customerContact: multiProductFormData.customerContact || undefined,
          items: multiProductFormData.items,
          totalSaleAmount: multiProductFormData.items.reduce((sum, item) => sum + item.totalSale, 0),
          totalAmountPaid: parseFloat(multiProductFormData.totalAmountPaid) || 0,
          paymentAllocation: multiProductFormData.paymentAllocation,
          dueDate: multiProductFormData.dueDate || undefined,
          notes: multiProductFormData.notes || undefined
        };

        await apiService.createMultiProductSale(multiProductSale);
      }
      
      await fetchData();
      handleCancelForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingEntry ? 'update' : 'create'} stock entry`);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEntry(null);
    setFifoPreview(null);
    setSaleMode('single');
    
    // Reset single product form
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
    
    // Reset multi-product form
    setMultiProductFormData({
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerContact: '',
      items: [],
      totalAmountPaid: '',
      paymentAllocation: 'proportional',
      dueDate: '',
      notes: ''
    });
    
    // Reset new item form
    setNewItem({
      productCode: '',
      productName: '',
      quantity: '',
      sellingPrice: '',
      allocatedPayment: ''
    });
    
    setError(null);
  };

  const handleEditEntry = (entry: StockOutEntry) => {
    setEditingEntry(entry);
    setSaleMode('single'); // Switch to single mode for editing
    setFormData({
      date: typeof entry.date === 'string' ? entry.date.split('T')[0] : new Date(entry.date).toISOString().split('T')[0],
      productCode: entry.productCode,
      productName: entry.productName,
      quantity: entry.quantity.toString(),
      sellingPrice: entry.sellingPrice.toString(),
      customerName: entry.customerName,
      customerContact: entry.customerContact || '',
      amountPaid: entry.amountPaid.toString(),
      dueDate: entry.dueDate ? (typeof entry.dueDate === 'string' ? entry.dueDate.split('T')[0] : new Date(entry.dueDate).toISOString().split('T')[0]) : '',
      notes: entry.notes || ''
    });
    setShowForm(true);
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
        <div className="text-lg text-gray-600">Loading sales data...</div>
      </div>
    );
  }

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
          {/* Sale Mode Toggle */}
          {!editingEntry && (
            <div className="mb-6">
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold text-gray-900">Sale Type:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setSaleMode('single')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      saleMode === 'single' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    🛍️ Single Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleMode('multi')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      saleMode === 'multi' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    🛒 Multi-Product
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {saleMode === 'single' 
                  ? 'Record a sale for a single product'
                  : 'Record a sale with multiple products and allocate payments'
                }
              </p>
            </div>
          )}

          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingEntry ? 'Edit Sale Record' : 
             saleMode === 'single' ? 'Record New Sale' : 'Record Multi-Product Sale'}
          </h3>

          {saleMode === 'single' ? (
            /* Single Product Form */
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
                    max={formData.quantity && formData.sellingPrice ? parseInt(formData.quantity) * parseFloat(formData.sellingPrice) : undefined}
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

              {/* Sale Summary */}
              {formData.quantity && formData.sellingPrice && (
                <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Sale Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Sale Value</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(parseInt(formData.quantity) * parseFloat(formData.sellingPrice))}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Amount Paid</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(parseFloat(formData.amountPaid) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Balance Due</p>
                      <p className={`text-lg font-bold ${
                        (parseInt(formData.quantity) * parseFloat(formData.sellingPrice) - (parseFloat(formData.amountPaid) || 0)) <= 0 
                          ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {formatCurrency(Math.max(0, parseInt(formData.quantity) * parseFloat(formData.sellingPrice) - (parseFloat(formData.amountPaid) || 0)))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* FIFO Preview */}
              {fifoPreview && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Sale Summary (FIFO Calculation)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700 font-medium">Total Sale (PHP)</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(formData.quantity && formData.sellingPrice ? parseInt(formData.quantity) * parseFloat(formData.sellingPrice) : 0)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">Cost (FIFO)</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(fifoPreview.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">Profit (PHP)</p>
                      <p className={`text-lg font-bold ${(formData.quantity && formData.sellingPrice ? parseInt(formData.quantity) * parseFloat(formData.sellingPrice) - fifoPreview.totalCost : 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(formData.quantity && formData.sellingPrice ? parseInt(formData.quantity) * parseFloat(formData.sellingPrice) - fifoPreview.totalCost : 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">Balance Due</p>
                      <p className={`text-lg font-bold ${(formData.quantity && formData.sellingPrice ? parseInt(formData.quantity) * parseFloat(formData.sellingPrice) : 0) - (parseFloat(formData.amountPaid) || 0) <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {formatCurrency(Math.max(0, (formData.quantity && formData.sellingPrice ? parseInt(formData.quantity) * parseFloat(formData.sellingPrice) : 0) - (parseFloat(formData.amountPaid) || 0)))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className="btn-primary">
                  {editingEntry ? 'Update Sale' : 'Record Sale'}
                </button>
                <button 
                  type="button" 
                  onClick={handleCancelForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Multi-Product Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="form-label">Sale Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={multiProductFormData.date}
                    onChange={(e) => setMultiProductFormData({ ...multiProductFormData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={multiProductFormData.customerName}
                    onChange={(e) => setMultiProductFormData({ ...multiProductFormData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Customer Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    value={multiProductFormData.customerContact}
                    onChange={(e) => setMultiProductFormData({ ...multiProductFormData, customerContact: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Due Date (if applicable)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={multiProductFormData.dueDate}
                    onChange={(e) => setMultiProductFormData({ ...multiProductFormData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Add Product Section */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Add Product to Sale</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label">Product</label>
                    <select
                      className="form-select"
                      value={newItem.productCode}
                      onChange={(e) => handleProductChange(e.target.value)}
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
                      value={newItem.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="form-label">Price per Unit (PHP)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={newItem.sellingPrice}
                      onChange={(e) => setNewItem({ ...newItem, sellingPrice: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addItemToMultiProductSale}
                      className="btn-primary w-full"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
                {newItem.productCode && newItem.quantity && newItem.sellingPrice && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <strong>Item Total:</strong> {formatCurrency(parseInt(newItem.quantity || '0') * parseFloat(newItem.sellingPrice || '0'))}
                  </div>
                )}
              </div>

              {/* Products List */}
              {multiProductFormData.items.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Products in Sale</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Product</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Unit Price</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Allocated Payment</th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {multiProductFormData.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">
                              <div>
                                <div className="font-medium">{item.productCode}</div>
                                <div className="text-gray-500">{item.productName}</div>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.sellingPrice)}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.totalSale)}</td>
                            <td className="px-4 py-2 text-sm text-right">
                              {multiProductFormData.paymentAllocation === 'manual' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-input w-24"
                                  value={item.allocatedPayment}
                                  onChange={(e) => updateItemPayment(index, parseFloat(e.target.value) || 0)}
                                  min="0"
                                  max={item.totalSale}
                                />
                              ) : (
                                <span className="font-medium">{formatCurrency(item.allocatedPayment)}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemFromMultiProductSale(index)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-right">Total Sale:</td>
                          <td className="px-4 py-2 text-sm font-bold text-right">
                            {formatCurrency(multiProductFormData.items.reduce((sum, item) => sum + item.totalSale, 0))}
                          </td>
                          <td className="px-4 py-2 text-sm font-bold text-right">
                            {formatCurrency(multiProductFormData.items.reduce((sum, item) => sum + item.allocatedPayment, 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Section */}
              {multiProductFormData.items.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg space-y-4">
                  <h4 className="font-semibold text-gray-900">Payment & Allocation</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Total Amount Paid (PHP)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={multiProductFormData.totalAmountPaid}
                        onChange={(e) => setMultiProductFormData({ ...multiProductFormData, totalAmountPaid: e.target.value })}
                        min="0"
                        max={multiProductFormData.items.reduce((sum, item) => sum + item.totalSale, 0)}
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Payment Allocation</label>
                      <select
                        className="form-select"
                        value={multiProductFormData.paymentAllocation}
                        onChange={(e) => setMultiProductFormData({ ...multiProductFormData, paymentAllocation: e.target.value as 'proportional' | 'manual' })}
                      >
                        <option value="proportional">📊 Proportional (Auto)</option>
                        <option value="manual">✏️ Manual Allocation</option>
                      </select>
                    </div>
                  </div>

                  {multiProductFormData.paymentAllocation === 'proportional' && (
                    <button
                      type="button"
                      onClick={calculateProportionalPayments}
                      className="btn-secondary"
                      disabled={!multiProductFormData.totalAmountPaid}
                    >
                      🔄 Calculate Proportional Payments
                    </button>
                  )}

                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Sale Value</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(multiProductFormData.items.reduce((sum, item) => sum + item.totalSale, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Payment</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(parseFloat(multiProductFormData.totalAmountPaid) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Balance Due</p>
                      <p className={`text-lg font-bold ${
                        (multiProductFormData.items.reduce((sum, item) => sum + item.totalSale, 0) - (parseFloat(multiProductFormData.totalAmountPaid) || 0)) <= 0 
                          ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {formatCurrency(Math.max(0, multiProductFormData.items.reduce((sum, item) => sum + item.totalSale, 0) - (parseFloat(multiProductFormData.totalAmountPaid) || 0)))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="form-label">Sale Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={multiProductFormData.notes}
                  onChange={(e) => setMultiProductFormData({ ...multiProductFormData, notes: e.target.value })}
                  placeholder="Add notes about this multi-product sale..."
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={multiProductFormData.items.length === 0}
                >
                  Record Multi-Product Sale
                </button>
                <button 
                  type="button" 
                  onClick={handleCancelForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Sales History Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sales History</h3>
          <div className="text-sm text-gray-500">
            {stockEntries.length} sales recorded
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
                  Quantity
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale Type
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
                    {entry.allocatedPayment !== undefined && (
                      <div className="text-xs text-blue-600 mt-1">
                        Allocated: {formatCurrency(entry.allocatedPayment)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      entry.isMultiProductSale 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {entry.isMultiProductSale ? '🛒 Multi' : '🛍️ Single'}
                    </span>
                    {entry.saleGroupId && (
                      <div className="text-xs text-gray-500 mt-1">
                        Group: {entry.saleGroupId.slice(-8)}
                      </div>
                    )}
                  </td>
                  {isAdmin() && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          title="Edit sale entry"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStockOut(entry.id, entry.productName, entry.customerName)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                          title="Delete stock out entry"
                        >
                          Delete
                        </button>
                      </div>
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
