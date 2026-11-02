import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'blue' | 'success' | 'warning' | 'danger';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  icon,
}) => {
  const variantStyles = {
    neutral: 'bg-white/[0.12] text-white border-white/25',
    blue: 'bg-accent-blue-subtle text-accent-blue border-accent-blue/30',
    success: 'bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30',
    warning: 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/30',
    danger: 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-lg border tracking-tight tabular-nums select-none ${variantStyles} ${className}`}
    >
      {icon && <span className="opacity-90 shrink-0">{icon}</span>}
      <span className="font-sans font-medium text-[#F5F5F7]">{children}</span>
    </span>
  );
};
