import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const SIZE: Record<Size, string> = {
  sm: 'py-1.5 px-3 text-meta',
  md: '',
};

/**
 * Thin wrapper over the .x-btn design-system classes so call sites stop
 * re-implementing buttons with raw inline classes. type defaults to "button"
 * to avoid accidental form submits.
 */
export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', children, ...rest }: Props) {
  return (
    <button type={type} className={`x-btn x-btn-${variant} ${SIZE[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
