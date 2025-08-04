import React, { useState, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 bg-black transition-opacity duration-200
          ${isOpen ? 'opacity-50' : 'opacity-0'}
        `}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div 
          className={`
            bg-white rounded-xl shadow-strong max-h-full overflow-y-auto
            transition-all duration-200 transform
            ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
            ${sizeClasses[size]}
            w-full
            ${className}
          `}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              {title && (
                <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TableProps {
  headers: string[];
  data: Array<Record<string, any>>;
  keyField?: string;
  actions?: (row: any, index: number) => React.ReactNode;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

export const Table: React.FC<TableProps> = ({
  headers,
  data,
  keyField = 'id',
  actions,
  className = '',
  striped = true,
  hoverable = true
}) => {
  return (
    <div className={`overflow-hidden rounded-xl border border-secondary-200 ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className={`bg-white divide-y divide-secondary-200 ${striped ? 'divide-y' : ''}`}>
            {data.map((row, index) => (
              <tr
                key={row[keyField] || index}
                className={`
                  ${striped && index % 2 === 1 ? 'bg-secondary-25' : 'bg-white'}
                  ${hoverable ? 'hover:bg-secondary-50 transition-colors duration-150' : ''}
                `}
              >
                {headers.map((header, headerIndex) => (
                  <td
                    key={headerIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900"
                  >
                    {row[header.toLowerCase().replace(/\s+/g, '')] || 
                     row[header.toLowerCase().replace(/\s+/g, '_')] || 
                     row[header] || '-'}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {actions(row, index)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="text-center py-12">
          <div className="text-secondary-400 text-lg mb-2">📋</div>
          <p className="text-secondary-500">No data available</p>
        </div>
      )}
    </div>
  );
};

interface TabsProps {
  tabs: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
    badge?: string | number;
  }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  className = ''
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || '');
  const activeTab = controlledActiveTab || internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={className}>
      {/* Tab Headers */}
      <div className="border-b border-secondary-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }
              `}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`
                  ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${activeTab === tab.id
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-secondary-100 text-secondary-800'
                  }
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTabContent}
      </div>
    </div>
  );
};

interface ProgressBarProps {
  progress: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  color = 'primary',
  showLabel = false,
  label,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    primary: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    danger: 'bg-danger-600'
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-secondary-700">
            {label || 'Progress'}
          </span>
          {showLabel && (
            <span className="text-sm text-secondary-500">
              {clampedProgress.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={`
        w-full bg-secondary-200 rounded-full overflow-hidden
        ${sizeClasses[size]}
      `}>
        <div
          className={`
            ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out
            ${colorClasses[color]}
          `}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`
          absolute z-50 px-2 py-1 text-sm text-white bg-secondary-900 rounded
          whitespace-nowrap animate-fade-in
          ${positionClasses[position]}
        `}>
          {content}
        </div>
      )}
    </div>
  );
};
