import type { DieSides } from '../types/rpg';

interface DieIconProps {
  sides: DieSides;
  className?: string;
}

export function DieIcon({ sides, className = 'w-5 h-5' }: DieIconProps) {
  switch (sides) {
    case 4:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className} aria-hidden="true">
          <polygon points="12,3 21,19 3,19" />
          <line x1="12" y1="3" x2="12" y2="19" opacity="0.45" />
        </svg>
      );
    case 6:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 8:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className} aria-hidden="true">
          <polygon points="12,2 21,12 12,22 3,12" />
          <line x1="3" y1="12" x2="21" y2="12" opacity="0.45" />
        </svg>
      );
    case 10:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className} aria-hidden="true">
          <polygon points="12,2 20,10 12,22 4,10" />
          <polyline points="4,10 12,14 20,10" opacity="0.45" />
        </svg>
      );
    case 12:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className} aria-hidden="true">
          <polygon points="12,2 20.5,8.2 17.2,19 6.8,19 3.5,8.2" />
          <polygon points="12,7 16,10.5 14.5,15.5 9.5,15.5 8,10.5" opacity="0.45" />
        </svg>
      );
    case 20:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className} aria-hidden="true">
          <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />
          <polygon points="12,6.5 17.5,15.5 6.5,15.5" opacity="0.55" />
        </svg>
      );
    case 100:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" opacity="0.45" />
          <line x1="3" y1="12" x2="21" y2="12" opacity="0.45" />
        </svg>
      );
  }
}
