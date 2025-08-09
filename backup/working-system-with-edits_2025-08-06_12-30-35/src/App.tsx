import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import StockIn from './components/StockIn';
import StockOut from './components/StockOut';
import CustomerDebts from './components/CustomerDebts';
import GeneralDebts from './components/GeneralDebts';
import CustomerProfile from './components/CustomerProfile';
import Payments from './components/Payments';
import FinancialLedger from './components/FinancialLedger';
import UserManagement from './components/UserManagement';
import Login from './components/Login';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('currentPage');
    return saved || 'dashboard';
  });

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    localStorage.setItem('currentPage', page);
  };

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem('currentPage');
      
      if (user.role === 'sales' || user.role === 'cashier') {
        if (currentPage !== 'stock-out') {
          setCurrentPage('stock-out');
          localStorage.setItem('currentPage', 'stock-out');
        }
      } else if (!saved) {
        setCurrentPage('dashboard');
        localStorage.setItem('currentPage', 'dashboard');
      }
    }
  }, [user, currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    const isAdmin = user?.role === 'admin';

    switch (currentPage) {
      case 'dashboard':
        return isAdmin ? <Dashboard onNavigate={handlePageChange} /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'inventory':
        return isAdmin ? <Inventory /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'stock-in':
        return isAdmin ? <StockIn /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'stock-out':
        return <StockOut />;
      case 'customer-debts':
        return <CustomerDebts />;
      case 'general-debts':
        return isAdmin ? <GeneralDebts /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'customer-profile':
        return <CustomerProfile />;
      case 'payments':
        return <Payments />;
      case 'financial-ledger':
        return isAdmin ? <FinancialLedger /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'user-management':
        return isAdmin ? <UserManagement /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      default:
        return isAdmin ? <Dashboard onNavigate={handlePageChange} /> : <StockOut />;
    }
  };

  return (
    <Layout 
      currentPage={currentPage} 
      onNavigate={handlePageChange}
    >
      {renderPage()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
