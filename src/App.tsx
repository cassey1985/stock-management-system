import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import StockIn from './components/StockIn';
import StockOut from './components/StockOut';
import CustomerDebts from './components/CustomerDebts';
import GeneralDebts from './components/GeneralDebts';
import Payments from './components/Payments';
import FinancialLedger from './components/FinancialLedger';
import UserManagement from './components/UserManagement';
import Login from './components/Login';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => {
    // Start with saved page or default to dashboard
    const saved = localStorage.getItem('currentPage');
    return saved || 'dashboard';
  });

  // Update localStorage whenever page changes
  const handlePageChange = (page: string) => {
    console.log('🔄 Page change requested:', currentPage, '→', page);
    setCurrentPage(page);
    localStorage.setItem('currentPage', page);
  };

  // Set default page based on user role when user changes
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem('currentPage');
      
      // Force sales/cashier users to stock-out page
      if (user.role === 'sales' || user.role === 'cashier') {
        if (currentPage !== 'stock-out') {
          setCurrentPage('stock-out');
          localStorage.setItem('currentPage', 'stock-out');
        }
      } else if (!saved) {
        // Admin users default to dashboard if no saved page
        setCurrentPage('dashboard');
        localStorage.setItem('currentPage', 'dashboard');
      }
    }
  }, [user, currentPage]);

  // Debug: Log page changes to help identify the issue
  useEffect(() => {
    console.log('🔄 Page changed to:', currentPage);
  }, [currentPage]);

  // Add global error handling to catch any unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      // Don't prevent the default behavior, just log it
    };

    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Global error:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4F7942] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    console.log('📄 Rendering page:', currentPage, 'User role:', user?.role);
    
    // Role-based page access control
    const isAdmin = user?.role === 'admin';
    const isSalesOrCashier = user?.role === 'sales' || user?.role === 'cashier';

    switch (currentPage) {
      case 'dashboard':
        return isAdmin ? <Dashboard onNavigate={handlePageChange} /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'inventory':
        return isAdmin ? <Inventory /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'stock-in':
        return isAdmin ? <StockIn /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'stock-out':
        return (isAdmin || isSalesOrCashier) ? <StockOut /> : <div className="p-6 text-center text-red-600">Access Denied</div>;
      case 'customers':
        return isAdmin ? <CustomerDebts /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'general-debts':
        return isAdmin ? <GeneralDebts /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'payments':
        return isAdmin ? <Payments /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'users':
        return isAdmin ? <UserManagement /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      case 'ledger':
        return isAdmin ? <FinancialLedger /> : <div className="p-6 text-center text-red-600">Access Denied: Admin Only</div>;
      default:
        console.warn('⚠️ Unknown page:', currentPage);
        // Redirect based on user role
        if (user?.role === 'sales' || user?.role === 'cashier') {
          console.log('🔄 Redirecting sales/cashier to stock-out');
          handlePageChange('stock-out');
          return <StockOut />;
        } else {
          console.log('🔄 Redirecting admin to dashboard');
          handlePageChange('dashboard');
          return <Dashboard onNavigate={handlePageChange} />;
        }
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={handlePageChange}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
