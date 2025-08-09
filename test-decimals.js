// Quick test to verify decimal precision fixes
const fs = require('fs');
const path = require('path');

console.log('🧮 Testing decimal precision fix...');

try {
  // Read the business data file
  const dataPath = path.join(__dirname, 'server', 'data', 'business-data.json');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(rawData);
  
  console.log(`📊 Found ${data.transactions.length} transactions`);
  
  // Calculate totals like the Financial Ledger does
  const totalCredits = data.transactions.reduce((sum, t) => sum + (t.creditAmount || 0), 0);
  const totalDebits = data.transactions.reduce((sum, t) => sum + (t.debitAmount || 0), 0);
  
  // Calculate expenses (same logic as FinancialLedger)
  const totalExpenses = data.transactions
    .filter(t => 
      (t.debitAmount || 0) > 0 && 
      t.type === 'expense' && 
      !t.category.toLowerCase().includes('assets') &&
      !t.category.toLowerCase().includes('capital') &&
      !t.category.toLowerCase().includes('accounts receivable')
    )
    .reduce((sum, t) => sum + (t.debitAmount || 0), 0);
  
  const capital = totalCredits - totalExpenses;
  
  console.log('\n💰 Financial Summary:');
  console.log(`Total Credits: ₱${totalCredits.toFixed(2)}`);
  console.log(`Total Debits: ₱${totalDebits.toFixed(2)}`);
  console.log(`Total Expenses: ₱${totalExpenses.toFixed(2)}`);
  console.log(`Total Capital: ₱${capital.toFixed(2)}`);
  
  // Check for decimal precision issues
  const hasDecimalIssues = data.transactions.some(t => {
    return (t.debitAmount && t.debitAmount % 1 !== 0 && (t.debitAmount * 100) % 1 !== 0) ||
           (t.creditAmount && t.creditAmount % 1 !== 0 && (t.creditAmount * 100) % 1 !== 0) ||
           (t.balance && t.balance % 1 !== 0 && (t.balance * 100) % 1 !== 0);
  });
  
  if (hasDecimalIssues) {
    console.log('\n⚠️  Still has decimal precision issues');
  } else {
    console.log('\n✅ No decimal precision issues found');
  }
  
  // Expected calculation based on user's math: ₱526,004.00 - ₱20,700.00 = ₱505,304.00
  const expectedCapital = 505304;
  const difference = Math.abs(capital - expectedCapital);
  
  console.log(`\n🎯 Expected Capital: ₱${expectedCapital.toFixed(2)}`);
  console.log(`📊 Actual Capital: ₱${capital.toFixed(2)}`);
  console.log(`🔄 Difference: ₱${difference.toFixed(2)}`);
  
  if (difference < 1) {
    console.log('🎉 Capital calculation is now correct!');
  } else {
    console.log('❌ Capital calculation still needs adjustment');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}
