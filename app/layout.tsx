import type {Metadata} from 'next';
import { Inter, Caveat, Aref_Ruqaa } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-handwriting-latin',
});

const arefRuqaa = Aref_Ruqaa({
  weight: ['400', '700'],
  subsets: ['arabic'],
  variable: '--font-handwriting-arabic',
});

export const metadata: Metadata = {
  title: 'Cahier de Charge Automator',
  description: 'AI-powered tool to automate filling out specification documents.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable} ${arefRuqaa.variable}`}>
      <body className="font-sans antialiased bg-stone-50 text-stone-900" suppressHydrationWarning>{children}</body>
    </html>
  );
}
