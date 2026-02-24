import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string;
  showLink?: boolean;
}

export function Logo({
  className,
  size = 'md',
  href = '/',
  showLink = true,
}: LogoProps) {

  const sizeMap = {
    sm: 80,
    md: 120,
    lg: 160,
    xl: 200,
  };

  const logoContent = (
    <Image
      src="https://res.cloudinary.com/duswkmqbu/image/upload/v1771909519/logo_bxu00l.png"
      alt="karimeals logo"
      width={sizeMap[size]}
      height={sizeMap[size] * 0.4} 
      priority
      className={cn('object-contain', className)}
    />
  );

  if (!showLink) {
    return logoContent;
  }

  return (
    <Link
      href={href}
      className="flex items-center hover:opacity-80 transition-opacity duration-200"
      aria-label="karimeals - Home"
    >
      {logoContent}
    </Link>
  );
}