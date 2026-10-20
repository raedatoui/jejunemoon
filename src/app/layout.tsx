import './globals.css';
import type { Metadata } from 'next';
import { MuseoModerno, Lato, Instrument_Sans, Space_Mono } from 'next/font/google';
import { assetUrl } from '@/lib/assets';

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

const instrumentSans = Instrument_Sans({
    subsets: ['latin'],
    variable: '--font-instrument-sans',
    display: 'swap',
});

const spaceMono = Space_Mono({
    weight: ['400', '700'],
    subsets: ['latin'],
    variable: '--font-space-mono',
    display: 'swap',
});

const TITLE = 'Jejune Moon';
const DESCRIPTION = 'A small record label in Brooklyn, New York.';

export const metadata: Metadata = {
    // Share cards need absolute URLs.
    metadataBase: new URL('https://jejunemoon.com'),
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
        type: 'website',
        url: '/',
        siteName: TITLE,
        title: TITLE,
        description: DESCRIPTION,
        // The printed logo, not the shader — the emblem on the homepage is a
        // live canvas and cannot be captured for a share card.
        images: [{ url: assetUrl('/logo.png'), width: 800, height: 800, alt: 'JeJune Moon' }],
    },
    twitter: {
        // 'summary' keeps the square logo whole; summary_large_image would
        // crop it to 2:1.
        card: 'summary',
        title: TITLE,
        description: DESCRIPTION,
        images: [assetUrl('/logo.png')],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            className={`${museoModerno.variable} ${lato.variable} ${instrumentSans.variable} ${spaceMono.variable}`}
        >
            <body className="font-lato">{children}</body>
        </html>
    );
}
