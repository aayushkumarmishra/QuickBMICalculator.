import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'primary' | 'ink' | 'canvas';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = "w-8 h-8", 
  variant = 'primary' 
}) => {
  const colorMap = {
    primary: 'bg-primary text-canvas',
    ink: 'bg-ink text-canvas',
    canvas: 'bg-canvas text-ink border border-hairline'
  };

  return (
    <div className={`${className} ${colorMap[variant]} rounded-xl flex items-center justify-center overflow-hidden shadow-premium-sm relative group`}>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-1/2 h-1/2 relative z-10 transition-transform duration-500 group-hover:scale-110"
      >
        <path 
          d="M7 4V20M7 12H13C15.2091 12 17 10.2091 17 8C17 5.79086 15.2091 4 13 4H7ZM7 12H15C17.2091 12 19 13.7909 19 16C19 18.2091 17.2091 20 15 20H7" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      {/* Subtle geometric overlay for premium feel */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.8),transparent)] pointer-events-none"></div>
    </div>
  );
};
