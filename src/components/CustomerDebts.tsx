import React, { useState, useEffect } from 'react';
import { Button } from './ui';
import { apiService } from '../apiService';
import type { CustomerDebt, Payment, MultiPayment, MultiPaymentDebtItem } from '../types';

const CustomerDebts: React.FC = () => {
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showMultiPaymentForm, setShowMultiPaymentForm] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<CustomerDebt | null>(null);
  const [selectedDebts, setSelectedDebts] = useState<string[]>([]);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as Payment['paymentMethod'],
    reference: '',
    notes: ''
  });
  const [multiPaymentForm, setMultiPaymentForm] = useState({
    customerName: '',
    totalAmountPaid: '',
    paymentAllocation: 'proportional' as 'proportional' | 'manual',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as Payment['paymentMethod'],
    reference: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchDebts();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setModalPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCustomerDebts();
      setDebts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer debts');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    // Reset previous errors
    setFormErrors({});
    
    // Validate form
    const errors: {[key: string]: string} = {};
    const amount = parseFloat(paymentForm.amount);
    
    if (!paymentForm.amount || amount <= 0) {
      errors.amount = 'Payment amount must be greater than 0';
    } else if (amount > selectedDebt.remainingBalance) {
      errors.amount = 'Payment amount cannot exceed remaining balance';
    }
    
    if (!paymentForm.paymentDate) {
      errors.paymentDate = 'Payment date is required';
    }
    
    if (!paymentForm.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const payment = {
        debtId: selectedDebt.id,
        customerName: selectedDebt.customerName,
        amount: amount,
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined
      };

      await apiService.createPayment(payment);
      await fetchDebts();
      
      // Show success message
      setSuccessMessage(`Payment of ${formatCurrency(amount)} recorded successfully!`);
      
      // Close modal after short delay
      setTimeout(() => {
        setShowPaymentForm(false);
        setSelectedDebt(null);
        setSuccessMessage(null);
        setFormErrors({});
        setPaymentForm({
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          reference: '',
          notes: ''
        });
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMultiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous errors
    setFormErrors({});
    
    // Get selected debt objects
    const selectedDebtObjects = debts.filter(debt => selectedDebts.includes(debt.id) && debt.status === 'unpaid');
    
    if (selectedDebtObjects.length === 0) {
      setFormErrors({ general: 'Please select at least one unpaid debt' });
      return;
    }
    
    // Check if all selected debts belong to the same customer
    const customerNames = [...new Set(selectedDebtObjects.map(debt => debt.customerName))];
    if (customerNames.length > 1) {
      setFormErrors({ general: 'All selected debts must belong to the same customer' });
      return;
    }
    
    // Validate form
    const errors: {[key: string]: string} = {};
    const totalAmountPaid = parseFloat(multiPaymentForm.totalAmountPaid);
    const totalDebtAmount = selectedDebtObjects.reduce((sum, debt) => sum + debt.remainingBalance, 0);
    
    if (!multiPaymentForm.totalAmountPaid || totalAmountPaid <= 0) {
      errors.totalAmountPaid = 'Payment amount must be greater than 0';
    } else if (totalAmountPaid > totalDebtAmount) {
      errors.totalAmountPaid = 'Payment amount cannot exceed total debt amount';
    }
    
    if (!multiPaymentForm.paymentDate) {
      errors.paymentDate = 'Payment date is required';
    }
    
    if (!multiPaymentForm.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create multi-payment debt items with allocation
      const debtItems: MultiPaymentDebtItem[] = selectedDebtObjects.map(debt => {
        let allocatedPayment = 0;
        
        if (multiPaymentForm.paymentAllocation === 'proportional') {
          // Calculate proportional payment
          const proportion = debt.remainingBalance / totalDebtAmount;
          allocatedPayment = totalAmountPaid * proportion;
        } else {
          // For manual, we'll need to get the allocated amounts from the form
          // For now, distribute equally as fallback
          allocatedPayment = totalAmountPaid / selectedDebtObjects.length;
        }
        
        return {
          debtId: debt.id,
          customerName: debt.customerName,
          productName: debt.productName,
          totalDebt: debt.totalSale,
          remainingBalance: debt.remainingBalance,
          allocatedPayment: Math.min(allocatedPayment, debt.remainingBalance)
        };
      });

      const multiPayment: MultiPayment = {
        customerName: customerNames[0],
        debts: debtItems,
        totalAmountPaid: totalAmountPaid,
        paymentAllocation: multiPaymentForm.paymentAllocation,
        paymentDate: multiPaymentForm.paymentDate,
        paymentMethod: multiPaymentForm.paymentMethod,
        reference: multiPaymentForm.reference || undefined,
        notes: multiPaymentForm.notes || undefined
      };

      await apiService.createMultiPayment(multiPayment);
      await fetchDebts();
      
      // Show success message
      setSuccessMessage(`Multi-payment of ${formatCurrency(totalAmountPaid)} recorded successfully for ${debtItems.length} debts!`);
      
      // Close modal after short delay
      setTimeout(() => {
        setShowMultiPaymentForm(false);
        setSelectedDebts([]);
        setSuccessMessage(null);
        setFormErrors({});
        setMultiPaymentForm({
          customerName: '',
          totalAmountPaid: '',
          paymentAllocation: 'proportional',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          reference: '',
          notes: ''
        });
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record multi-payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDebtSelection = (debtId: string) => {
    setSelectedDebts(prev => 
      prev.includes(debtId) 
        ? prev.filter(id => id !== debtId)
        : [...prev, debtId]
    );
  };

  const startMultiPayment = () => {
    // Filter to only unpaid debts from same customer
    const unpaidDebts = debts.filter(debt => debt.status === 'unpaid');
    if (unpaidDebts.length === 0) {
      setError('No unpaid debts available for multi-payment');
      return;
    }
    
    setSelectedDebts([]);
    setShowMultiPaymentForm(true);
  };

  const calculateProportionalPayments = () => {
    const selectedDebtObjects = debts.filter(debt => selectedDebts.includes(debt.id));
    const totalAmountPaid = parseFloat(multiPaymentForm.totalAmountPaid) || 0;
    const totalDebtAmount = selectedDebtObjects.reduce((sum, debt) => sum + debt.remainingBalance, 0);
    
    if (totalAmountPaid > 0 && totalDebtAmount > 0) {
      // This would update individual allocations in a more complex implementation
      // For now, we'll handle this in the submission logic
    }
  };

  const handleDeleteDebt = async (id: string, customerName: string, productName: string) => {
    if (window.confirm(`Are you sure you want to delete the debt for "${customerName}" - "${productName}"? This action cannot be undone.`)) {
      try {
        await apiService.deleteCustomerDebt(id);
        await fetchDebts();
      } catch (err) {
        console.error('Delete error:', err);
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('fetch')) {
            setError('Backend server is not running. Please start the backend server first.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to delete customer debt');
        }
      }
    }
  };

  const openPaymentForm = (debt: CustomerDebt) => {
    setSelectedDebt(debt);
    setPaymentForm({
      ...paymentForm,
      amount: debt.remainingBalance.toString()
    });
    setShowPaymentForm(true);
    // Reset modal position to center
    setModalPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging if clicking on close button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (debt: CustomerDebt) => {
    if (!debt.dueDate) return false;
    return new Date(debt.dueDate) < new Date() && debt.remainingBalance > 0;
  };

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = !searchCustomer || 
      debt.customerName.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      debt.productName.toLowerCase().includes(searchCustomer.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'paid') {
      matchesStatus = debt.status === 'paid';
    } else if (statusFilter === 'unpaid') {
      matchesStatus = debt.status === 'unpaid' && !isOverdue(debt);
    } else if (statusFilter === 'overdue') {
      matchesStatus = isOverdue(debt);
    }

    return matchesSearch && matchesStatus;
  });

  const totalDebts = filteredDebts.reduce((sum, debt) => sum + debt.remainingBalance, 0);
  const paidDebts = debts.filter(debt => debt.status === 'paid').length;
  const overdueDebts = debts.filter(debt => isOverdue(debt)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading customer debts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Customer Debts</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={startMultiPayment}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            💰 Multi-Payment
          </button>
          <div className="text-sm text-gray-500">
            {filteredDebts.length} of {debts.length} debts
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">💳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebts)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid Debts</p>
              <p className="text-2xl font-bold text-green-600">{paidDebts}</p>
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
              <p className="text-2xl font-bold text-yellow-600">{overdueDebts}</p>
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

      {/* Filters */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Search Customer/Product</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by customer name or product..."
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Draggable Payment Form Modal */}
      {showPaymentForm && selectedDebt && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-[9999] p-4"
        >
          <div 
            className="absolute bg-white rounded-xl shadow-2xl border-4 cursor-move"
            style={{ 
              width: '700px',
              maxHeight: '85vh', 
              overflowY: 'auto',
              borderColor: '#4F7942',
              backgroundColor: '#ffffff',
              left: `calc(50% + ${modalPosition.x}px)`,
              top: `calc(50% + ${modalPosition.y}px)`,
              transform: 'translate(-50%, -50%)',
              userSelect: isDragging ? 'none' : 'auto'
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            {/* Draggable Header */}
            <div 
              className="px-4 py-3 border-b-2 border-green-200 bg-gradient-to-r from-green-100 to-green-50 rounded-t-xl cursor-move"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 id="payment-modal-title" className="text-lg font-bold flex items-center gap-2" style={{ color: '#35582b' }}>
                    💰 Record Payment
                  </h3>
                  <p className="text-xs text-gray-700">Drag to move • Process customer payment</p>
                </div>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md transition-all"
                  aria-label="Close payment modal"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Compact Debt Summary */}
            <div className="px-4 py-3 border-b border-gray-200 bg-green-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-600 font-bold mb-2">Customer</p>
                  <p className="text-gray-900 font-bold text-sm break-words">{selectedDebt.customerName}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-600 font-bold mb-2">Product</p>
                  <p className="text-gray-900 font-bold text-sm break-words">{selectedDebt.productName}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-600 font-bold mb-2">Total</p>
                  <p className="text-gray-900 font-bold text-sm">{formatCurrency(selectedDebt.totalSale)}</p>
                </div>
                <div className="bg-red-50 p-3 rounded border-2 border-red-200">
                  <p className="text-red-700 font-bold mb-2">Outstanding</p>
                  <p className="text-red-800 font-bold text-sm">{formatCurrency(selectedDebt.remainingBalance)}</p>
                </div>
              </div>
            </div>
            
            {/* Compact Form */}
            <div className="px-4 py-4 bg-white">
              {/* Success Message */}
              {successMessage && (
                <div className="mb-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <p className="text-green-800 font-bold text-sm">{successMessage}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handlePayment} className="space-y-4">
                {/* Payment Amount */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2" style={{ color: '#35582b' }}>
                    💵 Payment Amount <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-300 text-lg font-bold bg-white ${
                        formErrors.amount ? 'border-red-500' : 'border-green-400'
                      }`}
                      value={paymentForm.amount}
                      onChange={(e) => {
                        setPaymentForm({ ...paymentForm, amount: e.target.value });
                        if (formErrors.amount) {
                          setFormErrors({ ...formErrors, amount: '' });
                        }
                      }}
                      max={selectedDebt.remainingBalance}
                      min="0.01"
                      placeholder="Enter amount..."
                      required
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                  {formErrors.amount && (
                    <p className="text-red-600 text-sm font-bold mt-1">⚠️ {formErrors.amount}</p>
                  )}
                  <div className="mt-3 bg-white p-3 rounded border">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 text-sm">Maximum amount:</span>
                        <span className="text-green-700 font-bold text-sm">{formatCurrency(selectedDebt.remainingBalance)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, amount: selectedDebt.remainingBalance.toString() })}
                        className="w-full text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        disabled={isSubmitting}
                      >
                        💰 Pay Full Amount
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment Details Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <label className="block text-xs font-bold text-gray-800 mb-1" style={{ color: '#35582b' }}>
                      📅 Date <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      className={`w-full px-2 py-2 border rounded focus:outline-none focus:ring-1 bg-white text-sm ${
                        formErrors.paymentDate ? 'border-red-500' : 'border-blue-400'
                      }`}
                      value={paymentForm.paymentDate}
                      onChange={(e) => {
                        setPaymentForm({ ...paymentForm, paymentDate: e.target.value });
                        if (formErrors.paymentDate) {
                          setFormErrors({ ...formErrors, paymentDate: '' });
                        }
                      }}
                      required
                      disabled={isSubmitting}
                    />
                    {formErrors.paymentDate && (
                      <p className="text-red-600 text-xs font-bold mt-1">⚠️ {formErrors.paymentDate}</p>
                    )}
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <label className="block text-xs font-bold text-gray-800 mb-1" style={{ color: '#35582b' }}>
                      💳 Method <span className="text-red-600">*</span>
                    </label>
                    <select
                      className={`w-full px-2 py-2 border rounded focus:outline-none focus:ring-1 bg-white text-sm ${
                        formErrors.paymentMethod ? 'border-red-500' : 'border-purple-400'
                      }`}
                      value={paymentForm.paymentMethod}
                      onChange={(e) => {
                        setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as Payment['paymentMethod'] });
                        if (formErrors.paymentMethod) {
                          setFormErrors({ ...formErrors, paymentMethod: '' });
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="card">💳 Card</option>
                      <option value="bank_transfer">🏦 Transfer</option>
                      <option value="check">📝 Check</option>
                      <option value="other">🔄 Other</option>
                    </select>
                    {formErrors.paymentMethod && (
                      <p className="text-red-600 text-xs font-bold mt-1">⚠️ {formErrors.paymentMethod}</p>
                    )}
                  </div>
                </div>

                {/* Optional Fields Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">🔢 Reference</label>
                    <input
                      type="text"
                      className="w-full px-2 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:border-green-500 bg-white text-sm"
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      placeholder="Receipt #..."
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">📝 Notes</label>
                    <input
                      type="text"
                      className="w-full px-2 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:border-green-500 bg-white text-sm"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      placeholder="Notes..."
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3 border-t border-gray-200">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="flex-1 py-3 text-sm font-bold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-spin">⏳</span>
                        Processing...
                      </span>
                    ) : (
                      '💰 Record Payment'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      setShowPaymentForm(false);
                      setFormErrors({});
                      setSuccessMessage(null);
                    }}
                    variant="outline"
                    className="flex-1 py-3 text-sm font-bold"
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

      {/* Multi-Payment Modal */}
      {showMultiPaymentForm && (
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
              padding: '0',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '4px solid #4F7942'
            }}
          >
            
            {/* Header */}
            <div className="px-6 py-4 border-b-2 border-green-200 bg-gradient-to-r from-green-100 to-green-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#35582b' }}>
                    💰 Multi-Product Payment
                  </h3>
                  <p className="text-sm text-gray-700">Pay multiple debts in one transaction</p>
                </div>
                <button
                  onClick={() => {
                    setShowMultiPaymentForm(false);
                    setSelectedDebts([]);
                    setFormErrors({});
                    setSuccessMessage(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-green-700 font-medium text-center">{successMessage}</div>
              </div>
            )}

            {/* Form Errors */}
            {Object.keys(formErrors).length > 0 && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                {Object.entries(formErrors).map(([field, error]) => (
                  <div key={field} className="text-red-700 text-sm">{error}</div>
                ))}
              </div>
            )}

            {/* Debt Selection Section */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Select Debts to Pay</h4>
              <div className="max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {debts.filter(debt => debt.status === 'unpaid').map((debt) => (
                    <label key={debt.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDebts.includes(debt.id)}
                        onChange={() => handleDebtSelection(debt.id)}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{debt.customerName}</div>
                        <div className="text-gray-600">{debt.productName} - {formatCurrency(debt.remainingBalance)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleMultiPayment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={multiPaymentForm.paymentDate}
                    onChange={(e) => setMultiPaymentForm({ ...multiPaymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={multiPaymentForm.paymentMethod}
                    onChange={(e) => setMultiPaymentForm({ ...multiPaymentForm, paymentMethod: e.target.value as Payment['paymentMethod'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                    <option value="check">📄 Check</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    value={multiPaymentForm.totalAmountPaid}
                    onChange={(e) => setMultiPaymentForm({ ...multiPaymentForm, totalAmountPaid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Allocation</label>
                  <select
                    value={multiPaymentForm.paymentAllocation}
                    onChange={(e) => setMultiPaymentForm({ ...multiPaymentForm, paymentAllocation: e.target.value as 'proportional' | 'manual' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="proportional">🔄 Proportional (Auto)</option>
                    <option value="manual">✋ Manual (Future Feature)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
                  <input
                    type="text"
                    value={multiPaymentForm.reference}
                    onChange={(e) => setMultiPaymentForm({ ...multiPaymentForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Receipt #, Check #, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={multiPaymentForm.notes}
                  onChange={(e) => setMultiPaymentForm({ ...multiPaymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Additional payment notes..."
                />
              </div>

              {/* Summary */}
              {selectedDebts.length > 0 && multiPaymentForm.totalAmountPaid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Payment Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-green-700">Selected Debts</p>
                      <p className="text-lg font-bold text-green-900">{selectedDebts.length}</p>
                    </div>
                    <div>
                      <p className="text-green-700">Total Debt Amount</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatCurrency(debts.filter(debt => selectedDebts.includes(debt.id)).reduce((sum, debt) => sum + debt.remainingBalance, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700">Payment Amount</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(parseFloat(multiPaymentForm.totalAmountPaid) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isSubmitting || selectedDebts.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Processing...
                    </span>
                  ) : (
                    `💰 Record Multi-Payment (${selectedDebts.length} debts)`
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMultiPaymentForm(false);
                    setSelectedDebts([]);
                    setFormErrors({});
                    setSuccessMessage(null);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debts Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Customer Debts</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sale (PHP)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid (PHP)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance (PHP)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
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
                  <td className="px-3 py-4 text-center">
                    {debt.status === 'unpaid' && (
                      <input
                        type="checkbox"
                        checked={selectedDebts.includes(debt.id)}
                        onChange={() => handleDebtSelection(debt.id)}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(debt.saleDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{debt.customerName}</div>
                      {debt.customerContact && (
                        <div className="text-gray-500 text-xs">{debt.customerContact}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{debt.productCode}</div>
                      <div className="text-gray-500">{debt.productName}</div>
                      <div className="text-gray-500 text-xs">Qty: {debt.quantity}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(debt.totalSale)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(debt.amountPaid + debt.paymentReceived)}
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
                          onClick={() => openPaymentForm(debt)}
                          variant="primary"
                          size="sm"
                          className="text-xs px-2 py-1"
                        >
                          💰 Pay
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteDebt(debt.id, debt.customerName, debt.productName)}
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
            No customer debts found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDebts;
