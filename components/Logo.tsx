import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({ size = 36, className = '', priority = false }: LogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-black shrink-0 shadow-2xs ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.jpeg"
        alt="VeoChat Logo"
        width={size * 2}
        height={size * 2}
        priority={priority}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
