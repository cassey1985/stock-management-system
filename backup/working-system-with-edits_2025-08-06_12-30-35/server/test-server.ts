import express from 'express';
import cors from 'cors';
import { dataService } from './src/dataService';

const app = express();
app.use(cors());
app.use(express.json());

async function testServer() {
  try {
    console.log('Testing server startup...');
    
    // Initialize data service
    await dataService.initialize();
    console.log('Data service initialized');
    
    // Test customer debts
    const debts = dataService.getCustomerDebts();
    console.log('Customer debts loaded:', debts.length);
    
    if (debts.length > 0) {
      console.log('First debt:', {
        id: debts[0].id,
        customerName: debts[0].customerName,
        saleDate: debts[0].saleDate,
        totalSale: debts[0].totalSale
      });
    }
    
    console.log('Test completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testServer();
