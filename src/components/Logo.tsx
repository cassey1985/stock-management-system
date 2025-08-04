import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizes = {
    sm: 'w-1 h-1',
    md: 'w-3 h-3', 
    lg: 'w-5 h-5'
  };

  // Replace this section with your actual logo image
  const useCustomLogo = true; // Set to true when you have your logo image
  const logoImagePath = '/logo.png'; // Update this path

  if (useCustomLogo) {
    return (
      <img 
        src={logoImagePath}
        alt="Company Logo" 
        className={`${sizes[size]} object-contain max-w-full max-h-full ${className}`}
        style={{ maxWidth: '80px', maxHeight: '80px' }}
      />
    );
  }

  // Default placeholder logo
  return (
    <div className={`${sizes[size]} bg-gradient-to-br from-[#4F7942] to-[#35582b] rounded-full flex items-center justify-center ${className}`}>
      <span className="text-white text-2xl font-bold">📦</span>
    </div>
  );
};

export default Logo;
