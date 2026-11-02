import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hệ thống Cảnh báo sớm Cháy rừng & Giám sát Thủy văn Xã Ea Súp',
  description:
    'Trung tâm điều hành PCTT xã Ea Súp: Tích hợp ảnh vệ tinh NASA FIRMS/GIBS và cảm biến IoT theo dõi Tiểu khu 293, Hồ Ea Súp Thượng, Hồ Ea Súp Hạ, Sông Ea Súp và 20 thôn buôn.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: 'images/logo_easup.png', type: 'image/png' },
      { url: '/images/logo_easup.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: 'images/logo_easup.png',
    apple: 'images/logo_easup.png',
  },
  openGraph: {
    title: 'Hệ thống Cảnh báo sớm Cháy rừng & Giám sát Thủy văn Xã Ea Súp',
    description: 'Trung tâm điều hành PCTT xã Ea Súp: Tích hợp ảnh vệ tinh NASA và cảm biến IoT',
    images: [{ url: 'images/logo_easup.png', width: 512, height: 512, alt: 'Logo Xã Ea Súp' }],
  },
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
        <link rel="icon" type="image/png" href="images/logo_easup.png" />
        <link rel="shortcut icon" type="image/png" href="images/logo_easup.png" />
        <link rel="apple-touch-icon" href="images/logo_easup.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0A0F1D] text-slate-100 antialiased overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
