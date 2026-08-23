'use client';

import { useEffect, useRef, useState } from 'react';
import projectsData from '@/app/projects.json';
import { rotationAt, setTurnSeconds } from '@/lib/playhead';
import { ProjectsListSchema } from '@/lib/schemas';
import { currentSnippet, pauseSnippet, playSnippet, prefetchSnippet } from '@/lib/snippets';
import { RayBurst } from './RayBurst';
import { CatalogRow } from './CatalogRow';

// Newest first, by release date. Releases still missing a date fall back to
// their year, which lands them alongside the rest of that year.
const sortKey = (release: { releaseDate?: string; year: string }) => release.releaseDate ?? `${release.year}-01-01`;

// Accents are folded rather than dropped, so "Rêve" anchors at #reve instead of
// losing the letter entirely.
const slug = (title: string) =>
    title
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

// Anchors are named for the release rather than its position, so a shared link
// survives the catalog being reordered. Two records can share a title, though,
// and two of the same DOM id would send every link to the first — so repeats
// are numbered. Titles are walked in file order to keep the numbering stable.
function withAnchorIds<T extends { title: string }>(projects: T[]) {
    const seen = new Map<string, number>();
    return projects.map((project) => {
        const base = slug(project.title) || 'release';
        const count = (seen.get(base) ?? 0) + 1;
        seen.set(base, count);
        return { ...project, id: count === 1 ? base : `${base}-${count}` };
    });
}

const RELEASES = withAnchorIds(ProjectsListSchema.parse(projectsData).projects).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

// How long the beacon dwells on one record, in seconds. The idle figure is the
// 3.6-second revolution the emblem shipped with, split across the catalog; the
// listening figure is close to a snippet's own length.
const IDLE_DWELL = 0.6;
const LISTEN_DWELL = 8;
const MIN_DWELL = 0.02;
const MAX_DWELL = 60;

// The slider runs on a log scale: the span is wide enough that a linear track
// would spend its first few pixels on everything worth hearing. Right is fast,
// so the position is measured down from the slowest dwell rather than up.
const dwellAt = (position: number) => MAX_DWELL * (MIN_DWELL / MAX_DWELL) ** position;
const positionOf = (dwell: number) => Math.log(MAX_DWELL / dwell) / Math.log(MAX_DWELL / MIN_DWELL);

export function LabelHome() {
    const [active, setActive] = useState<number | null>(null);
    const [playhead, setPlayhead] = useState(false);
    const [dwell, setDwell] = useState(IDLE_DWELL);
    // Set when the transport slowed the moon down of its own accord, so that
    // stopping can hand back the spin the page opened with — unless the slider
    // has been touched since, in which case that speed is the one that's wanted.
    const slowed = useRef(false);

    useEffect(() => {
        setTurnSeconds(dwell * RELEASES.length, performance.now());
    }, [dwell]);

    // The beacon's own angle decides what plays: whichever arc it is crossing is
    // the record you hear, and crossing out of it hands over to the next. Polled
    // against the rotation clock rather than driven by the draw loop, so the
    // catalog keeps playing while the emblem is scrolled out of view.
    useEffect(() => {
        if (!playhead) return;
        let sector = -1;
        const tick = () => {
            const turns = rotationAt(performance.now());
            const next = Math.min(Math.floor((turns - Math.floor(turns)) * RELEASES.length), RELEASES.length - 1);
            // Re-asserted whenever nothing is audible, so a hover that takes the
            // playhead over gets it handed back the moment the pointer leaves.
            if (next === sector && currentSnippet() !== null) return;
            sector = next;
            setActive(next);
            const snippet = RELEASES[next].snippet;
            if (snippet) playSnippet(snippet);
        };
        tick();
        const id = window.setInterval(tick, 100);
        return () => {
            window.clearInterval(id);
            pauseSnippet();
            setActive(null);
        };
    }, [playhead]);

    function togglePlayhead() {
        if (playhead) {
            if (slowed.current) {
                slowed.current = false;
                setDwell(IDLE_DWELL);
            }
            setPlayhead(false);
            return;
        }
        // Six-tenths of a second per record is a spin, not a listen, so starting
        // the transport slows the moon to something you can hear.
        if (dwell < LISTEN_DWELL) {
            slowed.current = true;
            setDwell(LISTEN_DWELL);
        }
        setPlayhead(true);
    }

    // The emblem is the first thing anyone reaches, and its rays point at rows
    // that are still far below the fold. Pulling the snippets in once the page
    // has painted is what makes that first hover instant; before then they are
    // just competing with the artwork.
    useEffect(() => {
        const id = window.setTimeout(() => {
            for (const release of RELEASES) {
                if (release.snippet) prefetchSnippet(release.snippet);
            }
        }, 1500);
        return () => window.clearTimeout(id);
    }, []);

    return (
        <>
            {/* One knob, in seconds per record: how long the beacon dwells is
                the same thing as how fast the moon turns. */}
            <div className="fixed top-5 right-6 z-30 flex items-center gap-2 md:right-10">
                <span className="font-credit text-[10px] tracking-[0.28em] text-[var(--ink-soft)] uppercase">Speed</span>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={positionOf(dwell)}
                    onChange={(event) => {
                        slowed.current = false;
                        setDwell(dwellAt(Number(event.target.value)));
                    }}
                    aria-label="Rotation speed"
                    title={`${dwell < 1 ? dwell.toFixed(2) : dwell.toFixed(1)}s per record`}
                    className="w-16 cursor-pointer accent-[var(--ochre)]"
                />
            </div>

            <section className="relative overflow-x-clip px-6 pt-14 pb-24 text-center md:px-10 md:pt-20 md:pb-32">
                <div className="mt-2 md:mt-6">
                    <RayBurst items={RELEASES} active={active} onActive={setActive} playhead={playhead} onTogglePlayhead={togglePlayhead} />
                </div>

                <h1 className="font-header mx-auto mt-10 max-w-[20ch] text-[clamp(2rem,5.5vw,4rem)] leading-[1.02] font-light tracking-[-0.025em] md:mt-12">
                    Record label based in Brooklyn, New York
                </h1>
                {/*<p className="font-sleeve mx-auto mt-5 max-w-md text-lg text-[var(--ink-soft)]">*/}
                {/*    <span className="font-credit text-[var(--ink)]">{RELEASES.length}</span> records so far — one ray for each.*/}
                {/*</p>*/}
            </section>

            <section className="px-6 pb-24 md:px-10 md:pb-32">
                <div className="mx-auto max-w-5xl">
                    <div className="font-credit border-b border-[var(--rule)] pb-3 text-[11px] tracking-[0.28em] text-[var(--ink-soft)] uppercase">
                        Catalog
                    </div>

                    <div className="relative mt-14 md:mt-20">
                        {/* The mirror axis, borrowed from the wordmark. Records fall either side of it. */}
                        <div className="absolute inset-y-0 left-1/2 hidden w-px bg-[var(--rule)] md:block" aria-hidden="true" />
                        <div className="flex flex-col gap-20 md:gap-24">
                            {RELEASES.map((release, index) => (
                                <CatalogRow
                                    key={release.id}
                                    release={release}
                                    index={index}
                                    isActive={active === index}
                                    onActive={setActive}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
