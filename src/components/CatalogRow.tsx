'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/schemas';
import { playSnippet, pauseSnippet } from '@/lib/snippets';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Formatted by hand rather than via Date, so a UTC-parsed ISO string can't slip
// a day backwards in a western timezone.
function releaseLine(release: { releaseDate?: string; year: string }) {
    if (!release.releaseDate) return release.year;
    const [year, month, day] = release.releaseDate.split('-').map(Number);
    return `${day} ${MONTHS[month - 1]} ${year}`;
}

const PLATFORM_ICONS: Record<string, string> = {
    Spotify: '/icons/spotify_without_text.png',
    'Apple Music': '/icons/applemusic_without_text.png',
    iTunes: '/icons/itunes_without_text.png',
    Deezer: '/icons/deezer_without_text.png',
    'Amazon Music': '/icons/amazon_without_text_new_branding.png',
    YouTube: '/icons/youtube_without_text.png',
    SoundCloud: '/icons/soundcloud_without_text.png',
    Tidal: '/icons/tidal_without_text.png',
};

export function CatalogRow({
    release,
    index,
    isActive,
    onActive,
}: {
    release: Project & { id: string };
    index: number;
    isActive: boolean;
    onActive: (index: number | null) => void;
}) {
    const [flipped, setFlipped] = useState(false);
    const reduceMotion = useReducedMotion();
    const coverOnLeft = index % 2 === 0;

    return (
        <motion.article
            id={release.id}
            onMouseEnter={() => onActive(index)}
            onMouseLeave={() => onActive(null)}
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="grid scroll-mt-24 items-center gap-7 md:grid-cols-2 md:gap-0"
        >
            <div className={cn('flex justify-center', coverOnLeft ? 'md:order-1 md:justify-end md:pr-12' : 'md:order-2 md:justify-start md:pl-12')}>
                <div className="group perspective-1000 w-full max-w-[340px]">
                    <motion.div
                        className="preserve-3d relative aspect-square w-full"
                        animate={{ rotateY: flipped ? 180 : 0, y: isActive && !flipped ? -6 : 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    >
                        {/* Front: the sleeve */}
                        <div
                            className={cn(
                                'backface-hidden absolute inset-0 shadow-[0_18px_40px_-24px_rgba(16,15,13,0.55)]',
                                flipped && 'pointer-events-none'
                            )}
                            aria-hidden={flipped}
                            onMouseEnter={() => release.snippet && !flipped && playSnippet(release.snippet)}
                            onMouseLeave={pauseSnippet}
                        >
                            {release.thumb.startsWith('/') ? (
                                <img src={release.thumb} alt={`${release.title} cover art`} className="h-full w-full object-cover" />
                            ) : (
                                <div className={cn('h-full w-full', release.thumb)} />
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    pauseSnippet();
                                    setFlipped(true);
                                }}
                                tabIndex={flipped ? -1 : 0}
                                className="absolute inset-0 flex cursor-pointer items-end justify-end p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
                            >
                                <span className="font-credit bg-[var(--lift)] px-2 py-1 text-[10px] tracking-[0.18em] text-[var(--ink)] uppercase opacity-70 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                                    Listen
                                </span>
                            </button>
                        </div>

                        {/* Back: where to hear it */}
                        <div
                            className={cn(
                                'backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center gap-5 border border-[var(--ink)] bg-[var(--lift)] p-6 shadow-[0_18px_40px_-24px_rgba(16,15,13,0.55)]',
                                !flipped && 'pointer-events-none'
                            )}
                            aria-hidden={!flipped}
                        >
                            <p className="font-credit pointer-events-none relative z-10 text-[10px] tracking-[0.28em] text-[var(--ink-soft)] uppercase">
                                Listen on
                            </p>
                            <ul className="pointer-events-none relative z-10 flex max-w-[12rem] flex-wrap items-center justify-center gap-4">
                                {release.links.map((link) => {
                                    const icon = PLATFORM_ICONS[link.platform];
                                    return (
                                        <li key={link.url}>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                tabIndex={flipped ? 0 : -1}
                                                title={link.platform}
                                                aria-label={`${link.platform} — ${release.title}`}
                                                className="pointer-events-auto block h-8 w-8 opacity-80 transition hover:scale-110 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]"
                                            >
                                                {icon ? (
                                                    <img src={icon} alt="" className="h-full w-full object-contain" />
                                                ) : (
                                                    <span className="font-credit text-[10px] uppercase">{link.platform}</span>
                                                )}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                            <button
                                type="button"
                                onClick={() => setFlipped(false)}
                                tabIndex={flipped ? 0 : -1}
                                aria-label={`Back to the ${release.title} cover`}
                                className="absolute inset-0 z-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[var(--ink)]"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className={cn('px-1', coverOnLeft ? 'md:order-2 md:pl-12 md:text-left' : 'md:order-1 md:pr-12 md:text-right')}>
                <p
                    className={cn(
                        'font-credit text-xs tracking-[0.28em] transition-colors duration-300',
                        isActive ? 'text-[var(--ochre)]' : 'text-[var(--ink-soft)]'
                    )}
                >
                    {releaseLine(release)}
                </p>
                <h3 className="font-header mt-2 text-[clamp(1.75rem,3.4vw,2.9rem)] leading-[1.02] tracking-[-0.015em]">{release.title}</h3>
                {/* Artist and credits share a line on mobile, stack from md up. */}
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 md:block">
                    <p className="font-sleeve text-lg text-[var(--ink)]">{release.artist}</p>
                    <p className="font-credit text-[11px] tracking-[0.2em] text-[var(--ink-soft)] uppercase md:mt-4">
                        {release.format ? `${release.format} · ${release.genre}` : release.genre}
                    </p>
                </div>
            </div>
        </motion.article>
    );
}
