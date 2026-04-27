import './globals.css';
import type { Metadata } from 'next';
import { MuseoModerno, Lato } from 'next/font/google';

const museoModerno = MuseoModerno({
    subsets: ['latin'],
    variable: '--font-museo-moderno',
    display: 'swap',
});

const lato = Lato({
    weight: ['100', '300', '400', '700', '900'],
    subsets: ['latin'],
    variable: '--font-lato',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Jejune Moon',
    description: 'Jejune Moon',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${museoModerno.variable} ${lato.variable}`}>
            <body className="font-lato">{children}</body>
        </html>
    );
}
