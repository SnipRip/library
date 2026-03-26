import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'IndevDigital Dashboard',
  description: 'Managed Library & Coaching Class System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="strip-bis-skin-checked" strategy="beforeInteractive">
          {`(function(){try{var els=document.querySelectorAll('[bis_skin_checked]');for(var i=0;i<els.length;i++){els[i].removeAttribute('bis_skin_checked');}}catch(e){}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}

