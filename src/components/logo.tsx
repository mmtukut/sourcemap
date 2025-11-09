import { cn } from '@/lib/utils';
import Image from 'next/image';

const logoUrl =
  'https://firebasestorage.googleapis.com/v0/b/studio-4130837467-4b1cf.firebasestorage.app/o/sourcemap_logo-removebg-preview.png?alt=media&token=4d04baee-5a0c-4c02-b607-be5cd8830d2e';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-foreground font-semibold',
        className
      )}
    >
      <Image
        src={logoUrl}
        alt="SourceMap Logo"
        width={140}
        height={40}
        className="h-10 w-auto"
        priority
      />
    </div>
  );
}
