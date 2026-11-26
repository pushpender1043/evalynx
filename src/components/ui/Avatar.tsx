import { useState } from 'react';
import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-base',
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(
          'rounded-[16px] object-cover shadow-[var(--shadow-clay-sm)] shrink-0',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={cn(
        'flex items-center justify-center rounded-[16px] bg-[var(--accent-soft)] font-bold text-[var(--accent-soft-text)] shadow-[var(--shadow-clay-sm)] shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
