import React from 'react';

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  rounded?: string;
  onClick?: () => void;
}

/**
 * Clean floating bar container adhering to taste-skill tone steps:
 * Solid ground/surface tone, no fake gradients, no heavy glow shadows.
 */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  className = '',
  rounded = 'rounded-2xl',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden ${rounded} bg-[#141416] border border-white/10 ${className}`}
    >
      <div className="relative z-10 text-[#F5F5F7]">{children}</div>
    </div>
  );
};
