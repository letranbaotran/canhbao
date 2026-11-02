import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hệ thống Cảnh báo sớm Cháy rừng & Giám sát Thủy văn Xã Ea Súp',
  description:
    'Trung tâm điều hành PCTT xã Ea Súp: Tích hợp ảnh vệ tinh NASA FIRMS/GIBS và cảm biến IoT theo dõi Tiểu khu 277, Hồ Ea Súp Thượng, Hồ Ea Súp Hạ, Sông Ea Súp và 20 thôn buôn.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0A0F1D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-[#0A0F1D] text-slate-100 antialiased overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
