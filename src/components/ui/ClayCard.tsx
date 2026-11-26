import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type ClayCardVariant = 'default' | 'tinted' | 'dashed';

export interface ClayCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  variant?: ClayCardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4 sm:p-5',
  md: 'p-6',
  lg: 'p-6 sm:p-7',
};

const variantClasses: Record<ClayCardVariant, string> = {
  default: 'clay-card',
  tinted: 'clay-card-tinted',
  dashed: 'clay-card-dashed',
};

export function ClayCard({
  children,
  interactive = false,
  variant = 'default',
  padding = 'md',
  className,
  ...rest
}: ClayCardProps) {
  return (
    <div
      className={cn(
        variantClasses[variant],
        interactive && 'clay-card-interactive',
        paddingClasses[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
