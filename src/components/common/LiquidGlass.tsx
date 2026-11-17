import React from 'react';

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  rounded?: string;
  onClick?: () => void;
}

/**
 * Apple HIG Liquid Glass Container
 * Pure crystal-clear dark frosted glass with native GPU hardware blur,
 * delicate specular highlight rim, and zero noisy artifacts.
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
      className={`liquid-glass-container relative overflow-hidden ${rounded} ${className}`}
    >
      {/* Subtle physical optical light sheen */}
      <div
        aria-hidden="true"
        className="liquid-glass-sheen pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.08] to-transparent"
      />

      {/* Vector content layer */}
      <div className="relative z-10 liquid-glass-content">{children}</div>
    </div>
  );
};
