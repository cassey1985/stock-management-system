import React, { useState, useEffect } from 'react';
import { Button } from './ui';
import { apiService } from '../apiService';
import type { GeneralDebt, GeneralDebtPayment } from '../types';

const GeneralDebts: React.FC = () => {
  const [debts, setDebts] = useState<GeneralDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<GeneralDebt | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<GeneralDebt | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'payable' | 'receivable'>('all');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    category: 'all'
  });

  const [newDebt, setNewDebt] = useState({
    type: 'payable' as 'payable' | 'receivable',
    category: '',
    description: '',
    creditorName: '',
    creditorContact: '',
    originalAmount: '',
    dueDate: '',
    issueDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: '',
    reference: '',
    isOpeningBalance: false
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as GeneralDebtPayment['paymentMethod'],
    reference: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Predefined categories
  const payableCategories = ['Supplier', 'Utility', 'Loan', 'Rent', 'Equipment', 'Service', 'Tax', 'Other'];
  const receivableCategories = ['Personal Loan', 'Advance', 'Deposit', 'Investment', 'Service', 'Rental Income', 'Other'];

  useEffect(() => {
    // First check if server is running
    const checkServerHealth = async () => {
      try {
        console.log('Checking server health...');
        const response = await fetch('http://localhost:3001/api/health');
        if (response.ok) {
          console.log('✅ Server is running');
          fetchDebts();
        } else {
          console.log('❌ Server responded with error:', response.status);
          setError('Backend server is not responding properly. Please check the server.');
          setLoading(false);
        }
      } catch (error) {
        console.log('❌ Server health check failed:', error);
        setError('Backend server is not running. Please start the backend server first.');
        setLoading(false);
      }
    };
    
    checkServerHealth();
  }, [activeTab]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching general debts, activeTab:', activeTab);
      const type = activeTab === 'all' ? undefined : activeTab;
      console.log('API call type parameter:', type);
      console.log('Making API call to:', type ? `/general-debts?type=${type}` : '/general-debts');
      const data = await apiService.getGeneralDebts(type);
      console.log('General debts fetched successfully:', data);
      setDebts(data);
    } catch (err) {
      console.error('Error fetching general debts:', err);
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('fetch')) {
          setError('Backend server is not running. Please start the backend server first.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load general debts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    const errors: {[key: string]: string} = {};
    if (!newDebt.category) errors.category = 'Category is required';
    if (!newDebt.description) errors.description = 'Description is required';
    if (!newDebt.creditorName) errors.creditorName = 'Creditor name is required';
    if (!newDebt.originalAmount || parseFloat(newDebt.originalAmount) <= 0) {
      errors.originalAmount = 'Amount must be greater than 0';
    }
    if (!newDebt.issueDate) errors.issueDate = 'Issue date is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const amount = parseFloat(newDebt.originalAmount);
      
      if (editingDebt) {
        // Update existing debt
        const updates = {
          ...newDebt,
          originalAmount: amount,
          // Keep existing paidAmount and remainingBalance, just update other fields
        };
        await apiService.updateGeneralDebt(editingDebt.id, updates);
      } else {
        // Create new debt
        let issueDate = newDebt.issueDate;
        
        // Note: Opening balance validation can be added here if needed
        // For now, we trust the user to enter appropriate dates for opening balance items
        
        const debt = {
          ...newDebt,
          issueDate,
          originalAmount: amount,
          paidAmount: 0,
          remainingBalance: amount,
          status: 'active' as const
        };
        await apiService.createGeneralDebt(debt);
      }

      await fetchDebts();
      setShowAddForm(false);
      setEditingDebt(null);
      setNewDebt({
        type: 'payable',
        category: '',
        description: '',
        creditorName: '',
        creditorContact: '',
        originalAmount: '',
        dueDate: '',
        issueDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        notes: '',
        reference: '',
        isOpeningBalance: false
      });
      setSuccessMessage(`${editingDebt ? 'Updated' : 'Created'} ${newDebt.type === 'payable' ? 'payable' : 'receivable'} debt successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingDebt ? 'update' : 'create'} debt`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDebt = (debt: GeneralDebt) => {
    setEditingDebt(debt);
    setNewDebt({
      type: debt.type,
      category: debt.category,
      description: debt.description,
      creditorName: debt.creditorName,
      creditorContact: debt.creditorContact || '',
      originalAmount: debt.originalAmount.toString(),
      dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString().split('T')[0] : '',
      issueDate: new Date(debt.issueDate).toISOString().split('T')[0],
      priority: debt.priority,
      notes: debt.notes || '',
      reference: debt.reference || '',
      isOpeningBalance: false
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingDebt(null);
    setShowAddForm(false);
    setNewDebt({
      type: 'payable',
      category: '',
      description: '',
      creditorName: '',
      creditorContact: '',
      originalAmount: '',
      dueDate: '',
      issueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
      notes: '',
      reference: '',
      isOpeningBalance: false
    });
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    setFormErrors({});
    const errors: {[key: string]: string} = {};
    const amount = parseFloat(paymentForm.amount);

    if (!paymentForm.amount || amount <= 0) {
      errors.amount = 'Payment amount must be greater than 0';
    } else if (amount > selectedDebt.remainingBalance) {
      errors.amount = 'Payment amount cannot exceed remaining balance';
    }

    if (!paymentForm.paymentDate) errors.paymentDate = 'Payment date is required';
    if (!paymentForm.paymentMethod) errors.paymentMethod = 'Payment method is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const payment = {
        debtId: selectedDebt.id,
        amount: amount,
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined
      };

      await apiService.createGeneralDebtPayment(payment);
      await fetchDebts();
      setShowPaymentForm(false);
      setSelectedDebt(null);
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        reference: '',
        notes: ''
      });
      setSuccessMessage(`Payment of ${formatCurrency(amount)} recorded successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDebt = async (id: string, description: string, creditorName: string) => {
    if (window.confirm(`Are you sure you want to delete "${description}" (${creditorName})? This action cannot be undone.`)) {
      try {
        await apiService.deleteGeneralDebt(id);
        await fetchDebts();
        setSuccessMessage('Debt deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete debt');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (debt: GeneralDebt) => {
    if (!debt.dueDate) return false;
    return new Date(debt.dueDate) < new Date() && debt.remainingBalance > 0;
  };

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = !filters.search || 
      debt.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      debt.creditorName.toLowerCase().includes(filters.search.toLowerCase()) ||
      debt.category.toLowerCase().includes(filters.search.toLowerCase());
    
    let matchesStatus = true;
    if (filters.status === 'paid') {
      matchesStatus = debt.status === 'paid';
    } else if (filters.status === 'active') {
      matchesStatus = debt.status === 'active' && !isOverdue(debt);
    } else if (filters.status === 'overdue') {
      matchesStatus = isOverdue(debt);
    }

    const matchesPriority = filters.priority === 'all' || debt.priority === filters.priority;
    const matchesCategory = filters.category === 'all' || debt.category === filters.category;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const totalPayables = debts.filter(d => d.type === 'payable' && d.status !== 'paid').reduce((sum, d) => sum + d.remainingBalance, 0);
  const totalReceivables = debts.filter(d => d.type === 'receivable' && d.status !== 'paid').reduce((sum, d) => sum + d.remainingBalance, 0);
  const overdueCount = debts.filter(d => isOverdue(d)).length;
  const categories = [...new Set(debts.map(d => d.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading general debts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">General Debts Management</h1>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              setNewDebt({
                type: 'receivable',
                category: '',
                description: '',
                creditorName: '',
                creditorContact: '',
                originalAmount: '',
                dueDate: '',
                issueDate: '', // User will set appropriate opening balance date
                priority: 'medium',
                notes: '',
                reference: '',
                isOpeningBalance: true
              });
              setShowAddForm(true);
            }}
            variant="accent"
            className="flex items-center gap-2"
          >
            🏛️ Add Opening Receivable
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            ➕ Add Debt
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-700">✅ {successMessage}</div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">💸</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payables</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPayables)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Receivables</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceivables)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-yellow-600">{overdueCount}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Debts</p>
              <p className="text-2xl font-bold text-blue-600">{debts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {['all', 'payable', 'receivable'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'all' ? '📋 All Debts' : 
             tab === 'payable' ? '💸 Money We Owe' : '💰 Money Owed to Us'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search description, creditor, category..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add Debt Modal */}
      {showAddForm && (
        <div style={{ 
          position: 'fixed',
          top: '0',
          left: '0', 
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '800px',
            margin: '20px auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              borderRadius: '12px 12px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: '0', fontSize: '20px', fontWeight: 'bold' }}>
                💰 {editingDebt ? 'Edit Debt' : 'Add New Debt'}
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                type="button"
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Instructions for Opening Receivables */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-bold text-blue-800 mb-2">💡 Adding Your Old Receivables (Opening Balance)</h4>
                <p className="text-sm text-blue-700 mb-2">
                  To record money that people owed you before your business started:
                </p>
                <ol className="text-xs text-blue-600 ml-4 space-y-1">
                  <li>1. Select <strong>"Receivable (They owe us)"</strong></li>
                  <li>2. Choose appropriate category (Personal Loan, Advance, etc.)</li>
                  <li>3. Enter creditor details and amount</li>
                  <li>4. ✅ <strong>Check "Opening Balance Item"</strong> - This is important!</li>
                  <li>5. Save - it will appear in your Opening Capital section</li>
                </ol>
              </div>

              <form onSubmit={handleAddDebt} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Debt Type *</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-gray-900"
                    value={newDebt.type}
                    onChange={(e) => {
                      setNewDebt({ ...newDebt, type: e.target.value as 'payable' | 'receivable', category: '' });
                      if (formErrors.type) setFormErrors({ ...formErrors, type: '' });
                    }}
                    required
                  >
                    <option value="payable">💸 Payable (We owe money)</option>
                    <option value="receivable">💰 Receivable (They owe us)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Category *</label>
                  <select
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-gray-900 ${formErrors.category ? 'border-red-500' : 'border-gray-300'}`}
                    value={newDebt.category}
                    onChange={(e) => {
                      setNewDebt({ ...newDebt, category: e.target.value });
                      if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                    }}
                    required
                  >
                    <option value="">Select category...</option>
                    {(newDebt.type === 'payable' ? payableCategories : receivableCategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {formErrors.category && <p className="text-red-600 text-sm mt-1">{formErrors.category}</p>}
                </div>
              </div>

              {/* Opening Balance Checkbox */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isOpeningBalance"
                    checked={newDebt.isOpeningBalance}
                    onChange={(e) => {
                      const isOpeningBalance = e.target.checked;
                      
                      setNewDebt({ 
                        ...newDebt, 
                        isOpeningBalance
                      });
                    }}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isOpeningBalance" className="flex-1">
                    <div className="text-sm font-semibold text-yellow-800">
                      🏛️ This is an Opening Balance Item
                    </div>
                    <div className="text-xs text-yellow-700 mt-1">
                      Check this box if this {newDebt.type === 'receivable' ? 'receivable' : 'debt'} existed before your business started. 
                      This will be treated as part of your initial capital.
                    </div>
                    {newDebt.isOpeningBalance && (
                      <div className="text-xs text-green-700 mt-2 font-medium">
                        ✅ Will be recorded as opening capital - ensure the issue date is before your business start date.
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="form-label">Description *</label>
                <input
                  type="text"
                  className={`form-input ${formErrors.description ? 'border-red-500' : ''}`}
                  value={newDebt.description}
                  onChange={(e) => {
                    setNewDebt({ ...newDebt, description: e.target.value });
                    if (formErrors.description) setFormErrors({ ...formErrors, description: '' });
                  }}
                  placeholder="Brief description of the debt..."
                  required
                />
                {formErrors.description && <p className="text-red-600 text-sm mt-1">{formErrors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    {newDebt.type === 'payable' ? 'Creditor Name *' : 'Debtor Name *'}
                  </label>
                  <input
                    type="text"
                    className={`form-input ${formErrors.creditorName ? 'border-red-500' : ''}`}
                    value={newDebt.creditorName}
                    onChange={(e) => {
                      setNewDebt({ ...newDebt, creditorName: e.target.value });
                      if (formErrors.creditorName) setFormErrors({ ...formErrors, creditorName: '' });
                    }}
                    placeholder="Name of the person/company..."
                    required
                  />
                  {formErrors.creditorName && <p className="text-red-600 text-sm mt-1">{formErrors.creditorName}</p>}
                </div>

                <div>
                  <label className="form-label">Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newDebt.creditorContact}
                    onChange={(e) => setNewDebt({ ...newDebt, creditorContact: e.target.value })}
                    placeholder="Phone, email, etc..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Amount (PHP) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`form-input ${formErrors.originalAmount ? 'border-red-500' : ''}`}
                    value={newDebt.originalAmount}
                    onChange={(e) => {
                      setNewDebt({ ...newDebt, originalAmount: e.target.value });
                      if (formErrors.originalAmount) setFormErrors({ ...formErrors, originalAmount: '' });
                    }}
                    placeholder="0.00"
                    required
                  />
                  {formErrors.originalAmount && <p className="text-red-600 text-sm mt-1">{formErrors.originalAmount}</p>}
                </div>

                <div>
                  <label className="form-label">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    className={`form-input ${formErrors.issueDate ? 'border-red-500' : ''}`}
                    value={newDebt.issueDate}
                    onChange={(e) => {
                      setNewDebt({ ...newDebt, issueDate: e.target.value });
                      if (formErrors.issueDate) setFormErrors({ ...formErrors, issueDate: '' });
                    }}
                    required
                  />
                  {formErrors.issueDate && <p className="text-red-600 text-sm mt-1">{formErrors.issueDate}</p>}
                </div>

                <div>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newDebt.dueDate}
                    onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={newDebt.priority}
                    onChange={(e) => setNewDebt({ ...newDebt, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Reference</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newDebt.reference}
                    onChange={(e) => setNewDebt({ ...newDebt, reference: e.target.value })}
                    placeholder="Invoice #, Contract #, etc..."
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={newDebt.notes}
                  onChange={(e) => setNewDebt({ ...newDebt, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 
                    (editingDebt ? '⏳ Updating...' : '⏳ Creating...') : 
                    (editingDebt ? '✅ Update Debt' : '✅ Create Debt')
                  }
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={editingDebt ? cancelEdit : () => {
                    setShowAddForm(false);
                    setFormErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  ❌ Cancel
                </Button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentForm && selectedDebt && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentForm(false);
              setSelectedDebt(null);
              setFormErrors({});
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              transform: 'scale(1)',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Modal Header */}
            <div 
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                padding: '24px 32px',
                borderRadius: '20px 20px 0 0',
                borderBottom: '2px solid #e5e7eb'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-5">
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#22c55e',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <span style={{ color: 'white', fontSize: '24px' }}>💰</span>
                  </div>
                  <div>
                    <h3 style={{ 
                      color: 'white', 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      margin: '0 0 4px 0' 
                    }}>
                      Record Payment
                    </h3>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '14px', 
                      margin: '0',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {selectedDebt.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedDebt(null);
                    setFormErrors({});
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Outstanding Balance Card */}
              <div 
                style={{
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '2px solid #fecaca',
                  borderRadius: '16px',
                  padding: '24px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div 
                      style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #dc2626'
                      }}
                    >
                      <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>₱</span>
                    </div>
                    <span style={{ color: '#b91c1c', fontWeight: '600', fontSize: '18px' }}>Outstanding Balance</span>
                  </div>
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626' }}>
                    {formatCurrency(selectedDebt.remainingBalance)}
                  </span>
                </div>
              </div>

              {/* Payment Amount */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#374151',
                  display: 'block'
                }}>
                  Payment Amount (PHP) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div 
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '0',
                      bottom: '0',
                      paddingLeft: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    <span style={{ color: '#6b7280', fontSize: '24px', fontWeight: 'bold' }}>₱</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    style={{
                      width: '100%',
                      paddingLeft: '60px',
                      paddingRight: '20px',
                      paddingTop: '20px',
                      paddingBottom: '20px',
                      border: formErrors.amount ? '3px solid #f87171' : '2px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '24px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                    value={paymentForm.amount}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, amount: e.target.value });
                      if (formErrors.amount) setFormErrors({ ...formErrors, amount: '' });
                    }}
                    onFocus={(e) => {
                      if (!formErrors.amount) {
                        e.target.style.borderColor = '#22c55e';
                        e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      if (!formErrors.amount) {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                    max={selectedDebt.remainingBalance}
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>
                {formErrors.amount && (
                  <p style={{ 
                    color: '#ef4444', 
                    fontSize: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    margin: '0'
                  }}>
                    <span>⚠️</span>
                    <span>{formErrors.amount}</span>
                  </p>
                )}
              </div>

              {/* Payment Date and Method */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#374151',
                    display: 'block'
                  }}>
                    Payment Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    style={{
                      width: '100%',
                      padding: '16px',
                      border: formErrors.paymentDate ? '3px solid #f87171' : '2px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '16px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                    value={paymentForm.paymentDate}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, paymentDate: e.target.value });
                      if (formErrors.paymentDate) setFormErrors({ ...formErrors, paymentDate: '' });
                    }}
                    onFocus={(e) => {
                      if (!formErrors.paymentDate) {
                        e.target.style.borderColor = '#22c55e';
                        e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      if (!formErrors.paymentDate) {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                    required
                  />
                  {formErrors.paymentDate && (
                    <p style={{ color: '#ef4444', fontSize: '12px', margin: '0' }}>⚠️ {formErrors.paymentDate}</p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#374151',
                    display: 'block'
                  }}>
                    Payment Method <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '16px',
                      border: formErrors.paymentMethod ? '3px solid #f87171' : '2px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '16px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                    value={paymentForm.paymentMethod}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as GeneralDebtPayment['paymentMethod'] });
                      if (formErrors.paymentMethod) setFormErrors({ ...formErrors, paymentMethod: '' });
                    }}
                    onFocus={(e) => {
                      if (!formErrors.paymentMethod) {
                        e.target.style.borderColor = '#22c55e';
                        e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      if (!formErrors.paymentMethod) {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                    <option value="check">📝 Check</option>
                    <option value="other">🔄 Other</option>
                  </select>
                  {formErrors.paymentMethod && (
                    <p style={{ color: '#ef4444', fontSize: '12px', margin: '0' }}>⚠️ {formErrors.paymentMethod}</p>
                  )}
                </div>
              </div>

              {/* Reference */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#374151',
                  display: 'block'
                }}>
                  Reference
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '2px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#22c55e';
                    e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Receipt #, Transaction ID, etc..."
                />
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#374151',
                  display: 'block'
                }}>
                  Notes
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '2px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    backgroundColor: 'white',
                    resize: 'none',
                    minHeight: '120px'
                  }}
                  rows={5}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#22c55e';
                    e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Additional notes or comments..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div 
              style={{
                padding: '24px 32px',
                backgroundColor: '#f9fafb',
                borderRadius: '0 0 20px 20px',
                borderTop: '2px solid #e5e7eb'
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                    handlePayment(fakeEvent);
                  }}
                  style={{
                    flex: '1',
                    background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '16px',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div 
                        style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid white',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}
                      ></div>
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <span>💰</span>
                      <span>Record Payment</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedDebt(null);
                    setFormErrors({});
                  }}
                  disabled={isSubmitting}
                  style={{
                    flex: '1',
                    background: 'white',
                    color: '#374151',
                    fontWeight: '600',
                    fontSize: '16px',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    border: '2px solid #d1d5db',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                >
                  <span>❌</span>
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debts Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === 'all' ? 'All Debts' : 
             activeTab === 'payable' ? 'Money We Owe' : 'Money Owed to Us'}
          </h3>
          <div className="text-sm text-gray-500">
            {filteredDebts.length} of {debts.length} debts
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creditor/Debtor
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDebts.map((debt) => (
                <tr key={debt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      debt.type === 'payable' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {debt.type === 'payable' ? '💸 Payable' : '💰 Receivable'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{debt.description}</div>
                      <div className="text-gray-500 text-xs">{debt.category}</div>
                      {debt.reference && (
                        <div className="text-gray-400 text-xs">Ref: {debt.reference}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{debt.creditorName}</div>
                      {debt.creditorContact && (
                        <div className="text-gray-500 text-xs">{debt.creditorContact}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(debt.originalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span className={debt.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(debt.remainingBalance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {debt.dueDate ? (
                      <div className={isOverdue(debt) ? 'text-red-600 font-medium' : ''}>
                        {new Date(debt.dueDate).toLocaleDateString()}
                        {isOverdue(debt) && <div className="text-xs">OVERDUE</div>}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(debt.priority)}`}>
                      {debt.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      isOverdue(debt) ? 'bg-red-100 text-red-800' : getStatusColor(debt.status)
                    }`}>
                      {isOverdue(debt) ? 'overdue' : debt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {debt.remainingBalance > 0 && (
                        <Button
                          onClick={() => {
                            setSelectedDebt(debt);
                            setPaymentForm({
                              ...paymentForm,
                              amount: debt.remainingBalance.toString()
                            });
                            setShowPaymentForm(true);
                          }}
                          variant="primary"
                          size="sm"
                          className="text-xs px-2 py-1"
                        >
                          💰 Pay
                        </Button>
                      )}
                      <Button
                        onClick={() => handleEditDebt(debt)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300 text-xs px-2 py-1"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteDebt(debt.id, debt.description, debt.creditorName)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 text-xs px-2 py-1"
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

        {filteredDebts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No debts found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralDebts;
