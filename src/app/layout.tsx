import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'KOLPumpFun',
  description: 'KOLPumpFun',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <Providers>
          <div id="app" className="max-w-[500px] mx-auto h-screen relative text-center text-[#2c3e50]">
            <main className="h-[calc(100vh-50px-max(env(safe-area-inset-bottom),10px))] overflow-y-auto">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
