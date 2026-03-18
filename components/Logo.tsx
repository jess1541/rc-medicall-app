import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  colorMode?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = "h-12", variant = 'full', colorMode = 'light' }) => {
  const blueColor = "#0097ce";
  const greyColor = colorMode === 'light' ? "#4d4d4d" : "#e2e8f0";

  if (variant === 'icon') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="60" fontWeight="900" fill={blueColor} style={{ fontFamily: 'Arial, sans-serif' }}>RC</text>
      </svg>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg viewBox="0 0 480 120" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Definitions for clipping and gradients if needed */}
        <defs>
          <clipPath id="topHalf">
            <rect x="0" y="0" width="480" height="55" />
          </clipPath>
          <clipPath id="bottomHalf">
            <rect x="0" y="55" width="480" height="65" />
          </clipPath>
        </defs>

        {/* Main Text - Top Half (Blue) */}
        <g clipPath="url(#topHalf)">
          <text x="240" y="75" textAnchor="middle" fontSize="72" fontWeight="900" fill={blueColor} style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-2px' }}>
            RC MediCall
          </text>
        </g>

        {/* Main Text - Bottom Half (Grey) */}
        <g clipPath="url(#bottomHalf)">
          <text x="240" y="75" textAnchor="middle" fontSize="72" fontWeight="900" fill={greyColor} style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-2px' }}>
            RC MediCall
          </text>
        </g>

        {/* Endoscope Graphic */}
        <g transform="translate(20, 48) scale(0.85)">
          {/* Eyepiece */}
          <rect x="0" y="5" width="10" height="30" fill="#333" rx="1" />
          <rect x="10" y="10" width="15" height="20" fill="white" stroke="#333" strokeWidth="2" />
          
          {/* Body */}
          <rect x="25" y="12" width="40" height="16" fill="white" stroke="#333" strokeWidth="2" rx="2" />
          <rect x="35" y="8" width="15" height="4" fill="#333" />
          
          {/* Long Tube */}
          <path d="M65 20 L480 20 L490 12 L490 28 L480 20" fill="white" stroke="#333" strokeWidth="2" />
        </g>

        {/* Registered Symbol */}
        <text x="430" y="35" fontSize="12" fontWeight="bold" fill={blueColor}>®</text>

        {/* Subtitle */}
        <text x="440" y="110" textAnchor="end" fontSize="24" fontWeight="bold" fill={greyColor} style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '2px' }}>
          ENDOSCOPY SERVICES
        </text>
      </svg>
    </div>
  );
};

export default Logo;
