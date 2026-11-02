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
    rounded-[14px]
    transition-all duration-150 ease-out
    active:scale-[0.965]
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
        className={`${baseClasses} bg-accent-blue text-white font-bold hover:bg-accent-blue-hover shadow-[0_4px_24px_-4px_rgba(0,199,190,0.45)]`}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="text-white font-bold">{children}</span>
      </button>
    );
  }

  if (variant === 'glass') {
    return (
      <button
        disabled={disabled}
        className={`${baseClasses} text-white`}
        style={{
          background: 'linear-gradient(180deg, rgba(32, 32, 36, 0.82) 0%, rgba(18, 18, 22, 0.88) 100%)',
          backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: '1px solid rgba(255, 255, 255, 0.22)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.16)',
        }}
        {...props}
      >
        {icon && <span className="shrink-0 text-accent-blue">{icon}</span>}
        <span className="font-semibold">{children}</span>
      </button>
    );
  }

  // ghost
  return (
    <button
      disabled={disabled}
      className={`${baseClasses} bg-white/[0.07] text-white border border-white/10 hover:bg-white/[0.14] hover:border-white/20`}
      {...props}
    >
      {icon && <span className="shrink-0 text-accent-blue">{icon}</span>}
      <span className="font-semibold">{children}</span>
    </button>
  );
};
