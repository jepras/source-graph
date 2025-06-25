import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      {/* Dark background circle */}
      <circle cx="50" cy="50" r="48" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="2"/>
      
      {/* Original item (bottom - like chin/base) */}
      <circle cx="50" cy="75" r="7" fill="#ef4444"/>
      
      {/* First generation influences (middle - like eyes, more spaced) */}
      <circle cx="32" cy="50" r="6" fill="#ef4444" opacity="0.8"/>
      <circle cx="68" cy="50" r="6" fill="#ef4444" opacity="0.8"/>
      
      {/* Second generation influences (top - like forehead/crown area) */}
      <circle cx="20" cy="28" r="4" fill="#ef4444" opacity="0.6"/>
      <circle cx="35" cy="25" r="4" fill="#ef4444" opacity="0.6"/>
      <circle cx="50" cy="22" r="4" fill="#ef4444" opacity="0.6"/>
      <circle cx="65" cy="25" r="4" fill="#ef4444" opacity="0.6"/>
      <circle cx="80" cy="28" r="4" fill="#ef4444" opacity="0.6"/>
      
      {/* Arrow marker definition */}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" 
                refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" opacity="0.7"/>
        </marker>
      </defs>
      
      {/* Arrows from original to first generation (chin to eyes) */}
      <line x1="45" y1="68" x2="36" y2="57" stroke="#ef4444" strokeWidth="2.5" 
            markerEnd="url(#arrowhead)" opacity="0.7"/>
      <line x1="55" y1="68" x2="64" y2="57" stroke="#ef4444" strokeWidth="2.5" 
            markerEnd="url(#arrowhead)" opacity="0.7"/>
      
      {/* Arrows from first to second generation (eyes to forehead) */}
      <line x1="30" y1="44" x2="23" y2="33" stroke="#ef4444" strokeWidth="2" 
            markerEnd="url(#arrowhead)" opacity="0.5"/>
      <line x1="35" y1="44" x2="37" y2="30" stroke="#ef4444" strokeWidth="2" 
            markerEnd="url(#arrowhead)" opacity="0.5"/>
      <line x1="50" y1="44" x2="50" y2="27" stroke="#ef4444" strokeWidth="2" 
            markerEnd="url(#arrowhead)" opacity="0.5"/>
      <line x1="65" y1="44" x2="63" y2="30" stroke="#ef4444" strokeWidth="2" 
            markerEnd="url(#arrowhead)" opacity="0.5"/>
      <line x1="70" y1="44" x2="77" y2="33" stroke="#ef4444" strokeWidth="2" 
            markerEnd="url(#arrowhead)" opacity="0.5"/>
      
      {/* Subtle mask outline for more definition */}
      <path d="M32,50 Q50,40 68,50" stroke="#ef4444" strokeWidth="1" fill="none" opacity="0.3"/>
    </svg>
  );
}; 