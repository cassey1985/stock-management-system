const fs = require('fs');
const path = require('path');

console.log('Testing data loading...');

try {
  const dataPath = path.join(__dirname, 'data', 'business-data.json');
  console.log('Loading data from:', dataPath);
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log('Data loaded successfully');
  console.log('Customer debts count:', data.customerDebts?.length || 0);
  
  if (data.customerDebts && data.customerDebts.length > 0) {
    console.log('First customer debt:', JSON.stringify(data.customerDebts[0], null, 2));
    
    // Test date parsing
    const debt = data.customerDebts[0];
    console.log('Testing date parsing:');
    console.log('saleDate:', debt.saleDate, '-> Date:', new Date(debt.saleDate));
    console.log('dueDate:', debt.dueDate, '-> Date:', new Date(debt.dueDate));
    console.log('createdAt:', debt.createdAt, '-> Date:', new Date(debt.createdAt));
    console.log('updatedAt:', debt.updatedAt, '-> Date:', new Date(debt.updatedAt));
    
    // Test sorting
    const mappedDebts = data.customerDebts.map((debt) => ({
      ...debt,
      saleDate: debt.saleDate ? new Date(debt.saleDate) : new Date(),
      dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
      createdAt: debt.createdAt ? new Date(debt.createdAt) : new Date(),
      updatedAt: debt.updatedAt ? new Date(debt.updatedAt) : new Date()
    }));
    
    console.log('Date mapping successful');
    
    const sorted = mappedDebts.sort((a, b) => {
      const dateA = a.saleDate instanceof Date ? a.saleDate.getTime() : 0;
      const dateB = b.saleDate instanceof Date ? b.saleDate.getTime() : 0;
      return dateB - dateA;
    });
    
    console.log('Sorting successful');
    console.log('Sorted debts count:', sorted.length);
  }
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
