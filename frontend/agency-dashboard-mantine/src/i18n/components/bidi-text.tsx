import type { ReactNode } from 'react';

export interface BidiTextProps {
  children: ReactNode;
  className?: string;
}

export function BidiText({ children, className }: BidiTextProps) {
  return (
    <bdi dir="auto" className={className}>
      {children}
    </bdi>
  );
}
