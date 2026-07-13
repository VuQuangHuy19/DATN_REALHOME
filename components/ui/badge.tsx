import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-accent',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-accent-soft text-accent hover:bg-accent-soft/80',
        secondary:
          'border-transparent bg-bg-subtle text-ink-muted hover:bg-bg-subtle/80',
        destructive:
          'border-transparent bg-danger/10 text-danger hover:bg-danger/20',
        outline: 'border-border-subtle text-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
