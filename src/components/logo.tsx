import { cn } from '@/lib/utils';
import Image from 'next/image';

const logoUrl =
  'https://firebasestorage.googleapis.com/v0/b/studio-4130837467-4b1cf.firebasestorage.app/o/sourcemap_logo.jpg?alt=media&token=6056fbb8-e232-45b6-ad52-c476a165b7d4';

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
        height={32}
        className="h-8 w-auto"
        priority
      />
    </div>
  );
}
