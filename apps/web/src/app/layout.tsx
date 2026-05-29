import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UltraCompress AI — Professional Video & File Compression',
  description:
    'Compress 10GB+ videos, images, and archives locally with AI-powered presets. Full quality control, GPU acceleration, offline processing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>
          <Navbar />
          <main className="pt-16 min-h-screen">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}