import React from 'react';

// ============================================================================
// UIKIT INSPIRED DESIGN - FERN GREEN THEME
// ============================================================================

// Color theme based on your UIKit system
const theme = {
  fernGreen: '#4F7942',
  fernGreenDark: '#35582b',
  black: '#111',
  white: '#fff',
  accent: '#e6ffe6',
  navbarLinkBg: '#e6ffe6',
  navbarLinkHover: '#35582b'
};

// Card Component - UIKit style
interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'accent';
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default', style }) => {
  const variants = {
    default: 'bg-white border-2 border-gray-100',
    primary: `bg-white border-2 border-[${theme.fernGreen}]`,
    accent: `bg-[${theme.accent}] border-2 border-[${theme.fernGreen}]`
  };

  return (
    <div className={`${variants[variant]} rounded-xl p-6 shadow-lg ${className}`} 
         style={{ 
           boxShadow: '0 4px 24px rgba(79,121,66,0.06)',
           borderColor: variant === 'primary' ? theme.fernGreen : variant === 'accent' ? theme.fernGreen : '#f3f4f6',
           ...style
         }}>
      {children}
    </div>
  );
};

// Button Component - UIKit style
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'accent';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  size = 'md',
  rightIcon
}) => {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-2';
  
  const variants = {
    primary: `bg-[${theme.fernGreen}] hover:bg-[${theme.fernGreenDark}] text-white border-[${theme.fernGreenDark}] focus:ring-[${theme.fernGreen}]`,
    secondary: `bg-[${theme.navbarLinkBg}] hover:bg-[${theme.navbarLinkHover}] hover:text-white text-[${theme.black}] border-[${theme.fernGreen}] focus:ring-[${theme.fernGreen}]`,
    outline: `bg-transparent border-[${theme.fernGreen}] text-[${theme.fernGreen}] hover:bg-[${theme.fernGreen}] hover:text-white focus:ring-[${theme.fernGreen}]`,
    accent: `bg-[${theme.accent}] hover:bg-[${theme.fernGreen}] hover:text-white text-[${theme.black}] border-[${theme.fernGreen}] focus:ring-[${theme.fernGreen}]`
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizes[size]} ${className}`}
      style={{
        backgroundColor: variant === 'primary' ? theme.fernGreen : 
                        variant === 'secondary' ? theme.navbarLinkBg :
                        variant === 'accent' ? theme.accent : 'transparent',
        borderColor: theme.fernGreen,
        color: variant === 'primary' ? theme.white : 
               variant === 'outline' ? theme.fernGreen : theme.black
      }}
      onMouseEnter={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.backgroundColor = theme.fernGreenDark;
        } else if (variant === 'secondary' || variant === 'accent' || variant === 'outline') {
          e.currentTarget.style.backgroundColor = theme.navbarLinkHover;
          e.currentTarget.style.color = theme.white;
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.backgroundColor = theme.fernGreen;
        } else if (variant === 'secondary') {
          e.currentTarget.style.backgroundColor = theme.navbarLinkBg;
          e.currentTarget.style.color = theme.black;
        } else if (variant === 'accent') {
          e.currentTarget.style.backgroundColor = theme.accent;
          e.currentTarget.style.color = theme.black;
        } else if (variant === 'outline') {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = theme.fernGreen;
        }
      }}
    >
      <span className="flex items-center gap-2">
        {children}
        {rightIcon && rightIcon}
      </span>
    </button>
  );
};

// Badge Component - UIKit style
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
  size = 'md',
  dot = false
}) => {
  const variants = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    primary: `text-[${theme.fernGreenDark}] border-[${theme.fernGreen}]`
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span 
      className={`inline-flex items-center ${sizes[size]} rounded-full font-semibold border-2 ${className}`}
      style={{
        backgroundColor: variant === 'primary' ? theme.accent : undefined,
        color: variant === 'primary' ? theme.fernGreenDark : undefined,
        borderColor: variant === 'primary' ? theme.fernGreen : undefined
      }}
    >
      {dot && <span className="w-2 h-2 bg-current rounded-full mr-2"></span>}
      {children}
    </span>
  );
};

// StatCard Component - UIKit style
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
  subtitle?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = 'primary',
  subtitle,
  className = ''
}) => {
  const getColors = () => {
    switch (color) {
      case 'primary':
        return { bg: theme.fernGreen, text: theme.white };
      case 'secondary':
        return { bg: theme.fernGreenDark, text: theme.white };
      case 'accent':
        return { bg: theme.accent, text: theme.fernGreenDark };
      case 'success':
        return { bg: '#059669', text: theme.white };
      case 'warning':
        return { bg: '#d97706', text: theme.white };
      default:
        return { bg: theme.fernGreen, text: theme.white };
    }
  };

  const colors = getColors();

  return (
    <div 
      className={`rounded-xl p-6 shadow-lg border-2 ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: theme.fernGreenDark,
        boxShadow: '0 4px 24px rgba(79,121,66,0.12)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider opacity-90 mb-2">{title}</p>
          <p className="text-3xl font-bold mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm opacity-80">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-4xl opacity-80 ml-4">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// Alert Component - UIKit style
interface AlertProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary';
  title?: string;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  className = ''
}) => {
  const variants = {
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    danger: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    primary: { bg: theme.accent, border: theme.fernGreen, text: theme.fernGreenDark }
  };

  const style = variants[variant];

  return (
    <div 
      className={`border-2 rounded-xl p-4 ${className}`}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.text
      }}
    >
      {title && <h4 className="font-bold mb-2 text-lg">{title}</h4>}
      <div className="font-medium">{children}</div>
    </div>
  );
};

// LoadingSpinner Component - UIKit style
interface LoadingSpinnerProps {
  className?: string;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className = '',
  text,
  size = 'md'
}) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg 
        className={`animate-spin ${sizes[size]}`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
        style={{ color: theme.fernGreen }}
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {text && <p className="text-sm font-semibold" style={{ color: theme.fernGreenDark }}>{text}</p>}
    </div>
  );
};

// Table Component - UIKit style
interface TableProps {
  headers: string[];
  data: Record<string, any>[];
  className?: string;
}

export const Table: React.FC<TableProps> = ({
  headers,
  data,
  className = ''
}) => {
  return (
    <div className={`overflow-hidden rounded-xl border-2 shadow-lg ${className}`} 
         style={{ borderColor: theme.fernGreen }}>
      <table className="min-w-full">
        <thead style={{ backgroundColor: theme.fernGreen }}>
          <tr>
            {headers.map((header, index) => (
              <th 
                key={index} 
                className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider"
                style={{ color: theme.white }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y-2" style={{ borderColor: theme.accent }}>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className="transition-colors duration-150"
              style={{
                backgroundColor: rowIndex % 2 === 0 ? theme.white : theme.accent
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.navbarLinkBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? theme.white : theme.accent;
              }}
            >
              {headers.map((header, colIndex) => (
                <td 
                  key={colIndex} 
                  className="px-6 py-4 text-sm font-medium"
                  style={{ color: theme.black }}
                >
                  {row[header.toLowerCase()]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Input Component - UIKit style
interface InputProps {
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-bold" style={{ color: theme.fernGreenDark }}>
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          block w-full px-4 py-3 rounded-lg border-2 font-medium
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
        `}
        style={{
          borderColor: error ? '#ef4444' : theme.fernGreen,
          backgroundColor: disabled ? '#f9fafb' : theme.white,
          color: theme.black
        }}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = theme.fernGreenDark;
            e.currentTarget.style.boxShadow = `0 0 0 3px rgba(79,121,66,0.1)`;
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = theme.fernGreen;
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      />
      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
};
