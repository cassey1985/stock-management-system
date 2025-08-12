// Test script to verify the Financial Ledger is working correctly
const testData = {
  // Test with simple transactions
  transactions: [
    {
      id: 'test-1',
      type: 'capital',
      category: 'Initial Capital',
      description: 'Opening Capital Investment',
      debitAmount: 0,
      creditAmount: 100000,
      date: '2025-08-10',
      createdAt: new Date().toISOString()
    },
    {
      id: 'test-2', 
      type: 'expense',
      category: 'Rent',
      description: 'Monthly Rent Payment',
      debitAmount: 5000,
      creditAmount: 0,
      date: '2025-08-10',
      createdAt: new Date().toISOString()
    },
    {
      id: 'test-3',
      type: 'income',
      category: 'Sales Revenue',
      description: 'Product Sale',
      debitAmount: 0,
      creditAmount: 15000,
      date: '2025-08-10',
      createdAt: new Date().toISOString()
    }
  ]
};

// Expected Results:
// Total Capital: ₱100,000.00 (from Initial Capital)
// Sales Revenue: ₱15,000.00 (from Sales Revenue)  
// Total Expenses: ₱5,000.00 (from Rent)
// Net Position: ₱10,000.00 (Sales Revenue - Expenses)

console.log('Test data ready for Financial Ledger validation');
