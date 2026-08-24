import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
      <body className={"\ bg-[#080A0F] text-white min-h-screen"}>
        {children}
      </body>
    </html>
  );
}