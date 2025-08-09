import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, logout, isAdmin } = useAuth();

  // Filter navigation based on user role
  const getFilteredNavigation = () => {
    const baseNavigation = [
      { id: 'dashboard', name: 'Dashboard', icon: '📊', roles: ['admin'] }, // Dashboard only for admin
    ];

    const adminNavigation = [
      { id: 'inventory', name: 'Inventory', icon: '📦', roles: ['admin'] },
      { id: 'stock-in', name: 'Stock In', icon: '📥', roles: ['admin'] },
      { id: 'user-management', name: 'User Management', icon: '👤', roles: ['admin'] },
    ];

    const salesNavigation = [
      { id: 'stock-out', name: 'Record Sale', icon: '📤', roles: ['admin', 'sales', 'cashier'] }, // Renamed to "Record Sale"
    ];

    const financialNavigation = [
      { id: 'customer-debts', name: 'Customer Debts', icon: '👥', roles: ['admin'] },
      { id: 'customer-profile', name: 'Customer Profiles', icon: '📋', roles: ['admin'] },
      { id: 'general-debts', name: 'General Debts', icon: '🏦', roles: ['admin'] },
      { id: 'payments', name: 'Payments', icon: '💰', roles: ['admin'] },
      { id: 'financial-ledger', name: 'Financial Ledger', icon: '📊', roles: ['admin'] },
    ];

    let navigation = [];

    if (isAdmin()) {
      navigation = [...baseNavigation, ...adminNavigation, ...salesNavigation, ...financialNavigation];
    } else {
      // Sales and cashier users only see "Record Sale"
      navigation = [...salesNavigation];
    }

    return navigation.filter(item => item.roles.includes(user?.role || ''));
  };

  const navigation = getFilteredNavigation();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header with Logo and Tagline */}
      <header className="bg-white shadow-md border-b-4 border-[#4F7942] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1"></div>
          
          {/* Center: Logo and Tagline */}
          <div className="flex flex-col items-center">
            <div className="mb-1">
              <Logo />
            </div>
            <p className="text-[#4F7942] text-lg font-medium italic mb-1">
              "Supplying Communities. Building a Child's Future"
            </p>
            <h1 className="text-2xl font-bold text-[#35582b]">Stock Management System</h1>
          </div>

          {/* Right: User Info and Logout */}
          <div className="flex-1 flex justify-end items-center">
            <div className="text-right mr-4">
              <div className="text-sm font-medium text-gray-900">{user?.fullName}</div>
              <div className="text-xs text-gray-500">
                {user?.role === 'admin' ? '👑 Administrator' : 
                 user?.role === 'sales' ? '💼 Sales' : 
                 user?.role === 'cashier' ? '💰 Cashier' : user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className={`bg-white shadow-lg ${isSidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300`}>
          <div className="p-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="mb-4 px-3 py-2 bg-[#4F7942] hover:bg-[#35582b] text-white rounded transition-colors duration-200"
            >
              {isSidebarCollapsed ? '→' : '←'}
            </button>
            
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center px-3 py-2 mb-2 rounded transition-colors duration-200 ${
                  currentPage === item.id 
                    ? 'bg-[#e6ffe6] text-[#35582b] border-l-4 border-[#4F7942]' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <main>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
