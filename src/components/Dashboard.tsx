import React, { useState, useEffect } from 'react';
import { Card, Button, Alert } from './ui';
import { apiService } from '../apiService';
import type { DashboardStats, OpeningCapital } from '../types';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [openingCapital, setOpeningCapital] = useState<OpeningCapital | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [dashboardData, openingCapitalData] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.getOpeningCapital()
        ]);
        setStats(dashboardData);
        setOpeningCapital(openingCapitalData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="danger">
          <div className="mb-2 font-semibold">Error Loading Dashboard</div>
          {error}
          <div className="mt-4">
            <Button 
              variant="primary" 
              onClick={() => window.location.reload()}
              size="sm"
            >
              Refresh Page
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">📊 Dashboard</h1>
        <div className="text-sm text-gray-600">
          Welcome to your Stock Management Dashboard
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📦</span>
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalProducts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📈</span>
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSales)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">💰</span>
            <div>
              <p className="text-sm text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalProfit)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">�</span>
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Capital Information */}
      {openingCapital && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">💼 Opening Capital</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Opening Stock Value:</span>
                <span className="font-semibold">{formatCurrency(openingCapital.totalOpeningStock)}</span>
              </div>
              <div className="flex justify-between">
                <span>Opening Receivables:</span>
                <span className="font-semibold">{formatCurrency(openingCapital.totalOpeningReceivables)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Opening Capital:</span>
                <span className="text-blue-600">{formatCurrency(openingCapital.totalOpeningCapital)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">🎯 Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                variant="primary" 
                onClick={() => onNavigate?.('inventory')}
                className="w-full text-left"
              >
                📦 Manage Inventory
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onNavigate?.('stock-in')}
                className="w-full text-left"
              >
                📥 Record Stock In
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onNavigate?.('stock-out')}
                className="w-full text-left"
              >
                📤 Record Sale
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onNavigate?.('financial-ledger')}
                className="w-full text-left"
              >
                📊 Financial Ledger
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Activity Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">📋 System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded">
            <div className="text-2xl mb-2">✅</div>
            <div className="font-semibold">System Online</div>
            <div className="text-sm text-gray-600">All services running</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold">Data Synced</div>
            <div className="text-sm text-gray-600">Last update: Now</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded">
            <div className="text-2xl mb-2">🔒</div>
            <div className="font-semibold">Secure Access</div>
            <div className="text-sm text-gray-600">Authentication active</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
