import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Workigom Super Admin',
  description: 'Workigom system-wide administration panel',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className={"\ bg-[#080A0F] text-white flex min-h-screen overflow-hidden"}>
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto bg-gradient-to-br from-[#080A0F] to-[#0E1117]">
          {children}
        </main>
      </body>
    </html>
  );
}