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
    font-sans font-semibold tracking-tight select-none
    rounded-[14px]
    transition-all duration-150 ease-out
    active:scale-[0.97]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-black
    disabled:opacity-40 disabled:pointer-events-none
    ${fullWidth ? 'w-full' : ''}
    ${sizeClasses}
    ${className}
  `;

  if (variant === 'primary') {
    return (
      <button
        disabled={disabled}
        className={`${baseClasses} bg-accent-blue text-white font-bold hover:bg-accent-blue-hover shadow-[0_0_20px_-4px_var(--apple-accent-blue)]`}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="text-white">{children}</span>
      </button>
    );
  }

  if (variant === 'glass') {
    return (
      <button
        disabled={disabled}
        className={`${baseClasses} text-[#F5F5F7]`}
        style={{
          background: 'linear-gradient(180deg, rgba(30, 30, 34, 0.82) 0%, rgba(18, 18, 20, 0.88) 100%)',
          backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 10px 36px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.16)',
        }}
        {...props}
      >
        {icon && <span className="shrink-0 text-accent-blue">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }

  // ghost
  return (
    <button
      disabled={disabled}
      className={`${baseClasses} bg-[#1C1C1E] text-[#F5F5F7] border border-white/[0.08] hover:bg-[#2C2C2E] hover:border-white/[0.16]`}
      {...props}
    >
      {icon && <span className="shrink-0 text-accent-blue">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
