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
      className={`relative overflow-hidden ${rounded} ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(30, 30, 34, 0.82) 0%, rgba(18, 18, 20, 0.88) 100%)',
        backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 10px 36px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.16)',
      }}
    >
      {/* Subtle physical optical light sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.06] to-transparent"
      />

      {/* Crisp vector content layer with sharp Apple typography */}
      <div className="relative z-10 text-[#F5F5F7]">{children}</div>
    </div>
  );
};
