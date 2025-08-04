import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import { Card, Button, Alert } from './ui';
import type { InventoryItem, Product } from '../types';

// Predefined categories and units
const PRODUCT_CATEGORIES = [
  'Rice',
  'Softdrink',
  'Egg',
  'Oil',
  'Soy Sauce',
  'Sugar',
  'Salt',
  'Noodles',
  'Canned Goods',
  'Dairy',
  'Meat',
  'Vegetables',
  'Fruits',
  'Snacks',
  'Beverages',
  'Condiments',
  'Spices',
  'Bakery',
  'Frozen',
  'Other'
];

const PRODUCT_UNITS = [
  'Sack',
  'Kg',
  'Piece',
  'Pack',
  'Box',
  'Bottle',
  'Can',
  'Liter',
  'Gram',
  'Dozen',
  'Bundle',
  'Bag',
  'Carton',
  'Roll',
  'Other'
];

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    unit: ''
  });

  // Dynamic lists for categories and units
  const [availableCategories, setAvailableCategories] = useState(PRODUCT_CATEGORIES);
  const [availableUnits, setAvailableUnits] = useState(PRODUCT_UNITS);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [customUnit, setCustomUnit] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('📊 Inventory: Starting fetchData...');
      setLoading(true);
      const [inventoryData, productsData] = await Promise.all([
        apiService.getInventory(),
        apiService.getProducts()
      ]);
      console.log('📊 Inventory: Data fetched successfully', {
        inventoryItems: inventoryData.length,
        products: productsData.length
      });
      setInventory(inventoryData);
      setProducts(productsData);
      
      // Extract existing custom categories and units from products
      const existingCategories = new Set(PRODUCT_CATEGORIES);
      const existingUnits = new Set(PRODUCT_UNITS);
      
      productsData.forEach(product => {
        if (product.category && !existingCategories.has(product.category)) {
          existingCategories.add(product.category);
        }
        if (product.unit && !existingUnits.has(product.unit)) {
          existingUnits.add(product.unit);
        }
      });
      
      // Update available lists (keep "Other" at the end)
      const categoriesArray = Array.from(existingCategories);
      const unitsArray = Array.from(existingUnits);
      
      setAvailableCategories([
        ...categoriesArray.filter(cat => cat !== 'Other'),
        'Other'
      ]);
      setAvailableUnits([
        ...unitsArray.filter(unit => unit !== 'Other'),
        'Other'
      ]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createProduct(productForm);
      await fetchData();
      setShowAddProduct(false);
      setProductForm({
        code: '',
        name: '',
        description: '',
        category: '',
        unit: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    
    // Check if product has custom category/unit and add them to lists
    if (product.category && !availableCategories.includes(product.category)) {
      setAvailableCategories([...availableCategories.slice(0, -1), product.category, 'Other']);
    }
    if (product.unit && !availableUnits.includes(product.unit)) {
      setAvailableUnits([...availableUnits.slice(0, -1), product.unit, 'Other']);
    }
    
    setProductForm({
      code: product.code,
      name: product.name,
      description: product.description || '',
      category: product.category,
      unit: product.unit
    });
    setShowAddProduct(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    try {
      await apiService.updateProduct(editingProduct.id, productForm);
      await fetchData();
      setShowAddProduct(false);
      setEditingProduct(null);
      setProductForm({
        code: '',
        name: '',
        description: '',
        category: '',
        unit: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setShowAddProduct(false);
    setShowCustomCategory(false);
    setShowCustomUnit(false);
    setCustomCategory('');
    setCustomUnit('');
    setProductForm({
      code: '',
      name: '',
      description: '',
      category: '',
      unit: ''
    });
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'Other') {
      setShowCustomCategory(true);
      setProductForm({ ...productForm, category: '' });
    } else {
      setShowCustomCategory(false);
      setCustomCategory('');
      setProductForm({ ...productForm, category: value });
    }
  };

  const handleUnitChange = (value: string) => {
    if (value === 'Other') {
      setShowCustomUnit(true);
      setProductForm({ ...productForm, unit: '' });
    } else {
      setShowCustomUnit(false);
      setCustomUnit('');
      setProductForm({ ...productForm, unit: value });
    }
  };

  const handleCustomCategorySubmit = () => {
    if (customCategory.trim()) {
      const newCategory = customCategory.trim();
      // Add to available categories if not already exists
      if (!availableCategories.includes(newCategory)) {
        setAvailableCategories([...availableCategories.slice(0, -1), newCategory, 'Other']);
      }
      setProductForm({ ...productForm, category: newCategory });
      setShowCustomCategory(false);
      setCustomCategory('');
    }
  };

  const handleCustomUnitSubmit = () => {
    if (customUnit.trim()) {
      const newUnit = customUnit.trim();
      // Add to available units if not already exists
      if (!availableUnits.includes(newUnit)) {
        setAvailableUnits([...availableUnits.slice(0, -1), newUnit, 'Other']);
      }
      setProductForm({ ...productForm, unit: newUnit });
      setShowCustomUnit(false);
      setCustomUnit('');
    }
  };

  const handleDeleteProduct = async (id: string, productName: string) => {
    console.log('🗑️ Starting delete for product:', productName, 'ID:', id);
    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      try {
        console.log('📤 Calling delete API...');
        await apiService.deleteProduct(id);
        console.log('✅ Delete API successful, refreshing data...');
        await fetchData();
        console.log('✅ Data refresh complete');
      } catch (err) {
        console.error('❌ Delete error:', err);
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('fetch')) {
            setError('Backend server is not running. Please start the backend server first.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to delete product');
        }
      }
    } else {
      console.log('❌ Delete cancelled by user');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const lowStockItems = inventory.filter(item => item.totalQuantity < 10);
  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <Button
          onClick={() => setShowAddProduct(!showAddProduct)}
          variant="primary"
        >
          {showAddProduct ? 'Cancel' : 'Add Product'}
        </Button>
      </div>

      {error && (
        <Alert variant="danger">
          Error: {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-600">{products.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add/Edit Product Form */}
      {showAddProduct && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Product Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={showCustomCategory ? 'Other' : productForm.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required={!showCustomCategory}
                >
                  <option value="">Select Category</option>
                  {availableCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                
                {showCustomCategory && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      className="form-input flex-1"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCustomCategorySubmit()}
                      placeholder="Enter new category"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleCustomCategorySubmit}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomCategory(false);
                        setCustomCategory('');
                        setProductForm({ ...productForm, category: '' });
                      }}
                      className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Unit</label>
                <select
                  className="form-input"
                  value={showCustomUnit ? 'Other' : productForm.unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  required={!showCustomUnit}
                >
                  <option value="">Select Unit</option>
                  {availableUnits.map(unit => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                
                {showCustomUnit && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      className="form-input flex-1"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCustomUnitSubmit()}
                      placeholder="Enter new unit"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleCustomUnitSubmit}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomUnit(false);
                        setCustomUnit('');
                        setProductForm({ ...productForm, unit: '' });
                      }}
                      className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button 
                type="button" 
                onClick={cancelEdit}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Stock */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Stock Levels</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Price (PHP)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value (PHP)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.productCode} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.productCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.totalQuantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(item.averagePrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(item.totalValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {item.totalQuantity === 0 ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Out of Stock
                      </span>
                    ) : item.totalQuantity < 10 ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No inventory found. Add products and stock entries to see inventory levels.
          </div>
        )}
      </div>

      {/* All Products */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Products</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.code}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-gray-500 text-xs">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => handleEditProduct(product)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
