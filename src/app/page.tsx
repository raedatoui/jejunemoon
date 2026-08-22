import { LabelHome } from '@/components/LabelHome';

const NAV_LINK =
    'transition-colors hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]';

export default function Home() {
    return (
        <div className="jm jm-grain font-sleeve min-h-screen bg-[var(--paper)] text-[var(--ink)]">
            <LabelHome />

            <footer className="font-credit mx-auto flex max-w-5xl flex-col gap-3 border-t border-[var(--rule)] px-6 py-8 text-[11px] tracking-[0.28em] text-[var(--ink-soft)] uppercase sm:flex-row sm:items-center sm:justify-between md:px-10">
                <span>Jejune Moon</span>
                <div className="flex items-center gap-5">
                    <a href="mailto:jejunemoon@gmail.com" className={NAV_LINK}>
                        jejunemoon@gmail.com
                    </a>
                    <a
                        href="https://www.instagram.com/jejunemoonrecords/"
                        target="_blank"
                        rel="noreferrer"
                        className={NAV_LINK}
                    >
                        {/* Drawn as a hairline in currentColor, so it takes the
                            footer's ink and its hover along with the text. */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[15px]">
                            <title>Instagram</title>
                            <rect x="3" y="3" width="18" height="18" rx="5.4" />
                            <circle cx="12" cy="12" r="4.1" />
                            <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
                        </svg>
                    </a>
                </div>
            </footer>
        </div>
    );
}
