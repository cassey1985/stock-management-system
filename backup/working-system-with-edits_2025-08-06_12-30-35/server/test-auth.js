// Quick test to verify authentication is working
const { dataService } = require('./dist/dataService');

async function testAuth() {
  try {
    console.log('Initializing data service...');
    await dataService.initialize();
    
    console.log('Testing authentication with admin/admin123...');
    const result = await dataService.authenticateUser({
      username: 'admin',
      password: 'admin123'
    });
    
    if (result) {
      console.log('✅ Authentication successful!');
      console.log('User:', result);
    } else {
      console.log('❌ Authentication failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAuth();
