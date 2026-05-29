'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { SignInButton, useAuth, UserButton } from '@clerk/nextjs';

const links = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Compress' },
  { href: '/batch', label: 'Batch' },
  { href: '/files', label: 'Files' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/settings', label: 'Settings' },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const{isSignedIn} = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span>UltraCompress AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                'btn-ghost text-sm',
                pathname === l.href && 'text-white bg-white/10'
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/dashboard" className="btn-primary text-sm ml-2">
            Start Compressing
          </Link>
          {isSignedIn ? (
          <div className="ml-4 mt-1 flex items-center">
            <UserButton />
          </div>
        ) : (
          <SignInButton>
            <button className="btn-primary text-sm ml-2 bg-indigo-600 px-3 py-1.5 rounded-lg">
              Sign In
            </button>
          </SignInButton>
        )}
        </div>

        <button className="md:hidden btn-ghost" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 p-4 flex flex-col gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="btn-ghost" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
