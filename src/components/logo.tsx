import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string;
  showLink?: boolean;
  variant?: 'default' | 'white';
}

export function Logo({ 
  className, 
  size = 'md',
  href = '/',
  showLink = true,
  variant = 'default'
}: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl md:text-5xl',
  };

  const isWhite = variant === 'white';

  const logoContent = (
    <span 
      className={cn(
        'font-bold tracking-tight transition-all duration-300 inline-flex items-baseline',
        sizeClasses[size],
        className
      )}
      style={{
        fontFamily: 'var(--font-headline), system-ui, sans-serif',
      }}
    >
      <span className={cn(
        'italic font-extrabold',
        isWhite ? 'text-white' : 'text-foreground'
      )}>resturant</span>
      <span className={cn(
        'italic font-black ml-0.5',
        isWhite ? 'text-white drop-shadow-md' : 'text-primary drop-shadow-sm'
      )}>me</span>
    </span>
  );

  if (!showLink) {
    return logoContent;
  }

  return (
    <Link 
      href={href} 
      className="flex items-center hover:opacity-80 transition-opacity duration-200"
      aria-label="resturantme - Home"
    >
      {logoContent}
    </Link>
  );
}

