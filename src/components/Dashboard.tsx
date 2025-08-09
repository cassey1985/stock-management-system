import React, { useState, useEffect } from 'react';
import { Card, StatCard, Badge, Button, LoadingSpinner, Alert } from './ui';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" title="Error Loading Dashboard">
        {error}
      </Alert>
    );
  }

  if (!stats) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <Card variant="primary" className="text-white" style={{ backgroundColor: '#4F7942' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">🌿 STOCK MANAGEMENT SYSTEM 🌿</h3>
            <p className="text-green-100 text-base mb-1">
              Inventory Management Tracking
            </p>
            <p className="text-sm text-green-200">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="text-5xl opacity-30">📊</div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon="📦"
          color="primary"
          subtitle="Active inventory items"
        />
        
        <StatCard
          title="Stock Value"
          value={formatCurrency(stats.totalStockValue)}
          icon="💰"
          color="success"
          subtitle="Current inventory worth"
        />
        
        <StatCard
          title="Total Sales"
          value={formatCurrency(stats.totalSales)}
          icon="💸"
          color="accent"
          subtitle="Revenue generated"
        />
        
        <StatCard
          title="Total Profit"
          value={formatCurrency(stats.totalProfit)}
          icon="📈"
          color="warning"
          subtitle="Net profit margin"
        />

        <StatCard
          title="Payables"
          value={formatCurrency(stats.totalPayables)}
          icon="💸"
          color="warning"
          subtitle="Money we owe"
        />

        <StatCard
          title="Receivables"
          value={formatCurrency(stats.totalReceivables)}
          icon="💰"
          color="success"
          subtitle="Money owed to us"
        />
      </div>

      {/* Opening Capital Section */}
      {openingCapital && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold mb-1 text-green-800">🏛️ Opening Capital & Assets</h3>
              <p className="text-gray-600 text-sm">Your initial business investment and assets</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(openingCapital.totalOpeningCapital)}
              </div>
              <p className="text-xs text-gray-500">Total Opening Capital</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opening Stock */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-700">📦 Opening Stock Inventory</h4>
                <span className="text-lg font-bold text-green-800">
                  {formatCurrency(openingCapital.totalOpeningStock)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Initial inventory value at business start</p>
              
              {openingCapital.openingStockEntries.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {openingCapital.openingStockEntries.map((entry) => (
                    <div key={entry.id} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                      <span className="font-medium">{entry.productName}</span>
                      <span>{entry.quantity} × {formatCurrency(entry.purchasePrice)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opening Receivables */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-blue-700">💰 Opening Receivables</h4>
                <span className="text-lg font-bold text-blue-800">
                  {formatCurrency(openingCapital.totalOpeningReceivables)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Money others owed you before business start</p>
              
              {openingCapital.openingReceivables.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {openingCapital.openingReceivables.map((receivable) => (
                    <div key={receivable.id} className="bg-gray-50 p-2 rounded">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{receivable.creditorName}</span>
                        <span className="font-bold">{formatCurrency(receivable.originalAmount)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{receivable.description}</div>
                      {receivable.paidAmount > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          Paid: {formatCurrency(receivable.paidAmount)} | 
                          Remaining: {formatCurrency(receivable.remainingBalance)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  <p className="text-sm">No opening receivables found</p>
                  <p className="text-xs">All receivables were created after business start</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card variant="accent">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#35582b' }}>🌿 Recent Transactions</h3>
            <p className="text-gray-600 text-sm">Latest financial activities in your system</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="info" size="sm" dot>Last 10 transactions</Badge>
            <Button variant="outline" size="sm" rightIcon={<span>→</span>}>
              View All
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-2 px-2 text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-2">
                    <Badge
                      variant={
                        transaction.type === 'stock_in' ? 'primary' :
                        transaction.type === 'stock_out' ? 'success' :
                        transaction.type === 'payment_received' ? 'info' : 'primary'
                      }
                      size="sm"
                    >
                      {transaction.type.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="py-2 px-2 text-sm text-right font-medium">
                    {transaction.debitAmount > 0 && (
                      <span className="text-red-600">-{formatCurrency(transaction.debitAmount)}</span>
                    )}
                    {transaction.creditAmount > 0 && (
                      <span className="text-green-600">+{formatCurrency(transaction.creditAmount)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card variant="default">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#35582b' }}>🌿 Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Button 
            variant="secondary" 
            size="lg"
            className="flex-col h-16 space-y-1"
            onClick={() => onNavigate?.('stock-in')}
          >
            <span className="text-xl">📦</span>
            <span className="text-xs font-medium">Add Stock</span>
          </Button>
          
          <Button 
            variant="accent" 
            size="lg"
            className="flex-col h-16 space-y-1"
            onClick={() => onNavigate?.('stock-out')}
          >
            <span className="text-xl">🚚</span>
            <span className="text-xs font-medium">Record Sale</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            className="flex-col h-16 space-y-1"
            onClick={() => onNavigate?.('customers')}
          >
            <span className="text-xl">👥</span>
            <span className="text-xs font-medium">Manage Customers</span>
          </Button>

          <Button 
            variant="secondary" 
            size="lg"
            className="flex-col h-16 space-y-1"
            onClick={() => onNavigate?.('general-debts')}
          >
            <span className="text-xl">🏦</span>
            <span className="text-xs font-medium">General Debts</span>
          </Button>
          
          <Button 
            variant="primary" 
            size="lg"
            className="flex-col h-16 space-y-1"
            onClick={() => onNavigate?.('ledger')}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-medium">View Reports</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
