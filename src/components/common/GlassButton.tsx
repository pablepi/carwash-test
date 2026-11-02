import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-2 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
  }[size];

  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold tracking-[-0.01em] select-none
    rounded-2xl
    transition-transform duration-100 ease-out
    active:scale-[0.965]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue
    disabled:opacity-40 disabled:pointer-events-none
    ${fullWidth ? 'w-full' : ''}
    ${sizeClasses}
    ${className}
  `;

  if (variant === 'primary') {
    return (
      <button
        disabled={disabled}
        className={`${baseClasses} bg-accent-blue text-black font-bold hover:bg-accent-blue-hover`}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="text-black font-bold">{children}</span>
      </button>
    );
  }

  if (variant === 'glass') {
    return (
      <button
        disabled={disabled}
        className={`${baseClasses} bg-[#1C1C20] text-white border border-white/10 hover:bg-[#26262B] hover:border-white/20`}
        {...props}
      >
        {icon && <span className="shrink-0 text-accent-blue">{icon}</span>}
        <span className="font-semibold text-white">{children}</span>
      </button>
    );
  }

  // ghost
  return (
    <button
      disabled={disabled}
      className={`${baseClasses} bg-transparent text-white border border-white/10 hover:bg-white/[0.08] hover:border-white/20`}
      {...props}
    >
      {icon && <span className="shrink-0 text-accent-blue">{icon}</span>}
      <span className="font-semibold text-white">{children}</span>
    </button>
  );
};
