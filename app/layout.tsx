import type {Metadata} from 'next';
import { Inter, Caveat, Aref_Ruqaa, Dancing_Script, Indie_Flower, Roboto_Mono } from 'next/font/google';
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

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-dancing-script',
});

const indieFlower = Indie_Flower({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-indie-flower',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
});

export const metadata: Metadata = {
  title: 'Cahier de Charge Automator',
  description: 'AI-powered tool to automate filling out specification documents.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable} ${arefRuqaa.variable} ${dancingScript.variable} ${indieFlower.variable} ${robotoMono.variable}`}>
      <body className="font-sans antialiased bg-stone-50 text-stone-900" suppressHydrationWarning>{children}</body>
    </html>
  );
}
