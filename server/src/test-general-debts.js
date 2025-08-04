// Quick test to verify general debts functionality
const { dataService } = require('./dataService');

console.log('Testing general debts functionality...');

try {
  // Test getting general debts
  const debts = dataService.getGeneralDebts();
  console.log('✅ getGeneralDebts() works:', debts.length, 'debts found');
  
  // Test getting by type
  const payables = dataService.getGeneralDebtsByType('payable');
  console.log('✅ getGeneralDebtsByType("payable") works:', payables.length, 'payables found');
  
  const receivables = dataService.getGeneralDebtsByType('receivable');
  console.log('✅ getGeneralDebtsByType("receivable") works:', receivables.length, 'receivables found');
  
  console.log('✅ All general debt methods working correctly!');
  
} catch (error) {
  console.error('❌ Error testing general debts:', error);
}
