'use client';

import { useEffect, useState } from 'react';
import projectsData from '@/app/projects.json';
import { rotationAt, setTurnSeconds } from '@/lib/playhead';
import { ProjectsListSchema } from '@/lib/schemas';
import { currentSnippet, pauseSnippet, playSnippet } from '@/lib/snippets';
import { beaconAt, RayBurst } from './RayBurst';
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

// The least a record gets at the speaker before the next one takes over. Under
// a hand the catalog can go past quicker than a snippet can start speaking, and
// a record handed over every poll is a record nobody hears at all.
const SPEAK_MS = 250;
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
    // A record turned by hand plays like one the transport is on, for exactly as
    // long as the hand is on it.
    const [scrubbing, setScrubbing] = useState(false);

    useEffect(() => {
        setTurnSeconds(dwell * RELEASES.length, performance.now());
    }, [dwell]);

    // The beacon's own angle decides what plays, down to the bar: whichever arc
    // it is crossing is the record you hear, and the bars of that arc are dealt
    // out among the record's tracks, so a four-track release is heard through as
    // the beacon goes across it rather than repeating its opening. Crossing out
    // of the arc hands over to the next record. Polled against the rotation clock
    // rather than driven by the draw loop, so the catalog keeps playing while the
    // emblem is scrolled out of view.
    useEffect(() => {
        if (!playhead && !scrubbing) return;
        let sector = -1;
        let spoke: string | undefined;
        let spokeAt = 0;
        const tick = () => {
            const now = performance.now();
            const { sector: next, snippet } = beaconAt(RELEASES, rotationAt(now));
            // Re-asserted whenever nothing is audible, so a hover that takes the
            // playhead over gets it handed back the moment the pointer leaves.
            if (next === sector && snippet === spoke && currentSnippet() !== null) return;
            // However fast the moon is being turned, what is playing gets its
            // moment before the next record takes it — a spin should be heard
            // going past, not swallowed.
            if (now - spokeAt < SPEAK_MS) return;
            spokeAt = now;
            sector = next;
            spoke = snippet;
            setActive(next);
            if (snippet) playSnippet(snippet);
        };
        tick();
        const id = window.setInterval(tick, 100);
        // Only the poll is torn down here. Silencing the transport belongs to
        // stopping it, so that a hover taking the record over from the moon is
        // not left holding a snippet the teardown has just paused.
        return () => window.clearInterval(id);
    }, [playhead, scrubbing]);

    // The players live outside React, so nothing should outlive the page.
    useEffect(() => () => pauseSnippet(), []);

    // Stopping hands back the spin the page opened with, whatever the slider had
    // been set to for listening.
    function stopPlayhead() {
        setDwell(IDLE_DWELL);
        setPlayhead(false);
        setScrubbing(false);
    }

    // A hover down in the catalog is a reader taking a record over from the
    // transport: the moon lets go of it, stops, and winds back to its opening
    // spin, leaving the snippet and the highlight to the cover that started
    // them. The emblem's own arcs are a different matter — a hover there is a
    // moment's aside, and the beacon takes the catalog back on the way out.
    function catalogActive(index: number | null) {
        if (index !== null && (playhead || scrubbing)) {
            stopPlayhead();
            pauseSnippet();
        }
        setActive(index);
    }

    // The moon under a hand plays the catalog whether the transport is on or
    // not; letting go hands it straight back to its own spin, and to silence
    // unless the transport was already running.
    function scrub(spinning: boolean) {
        setScrubbing(spinning);
        if (!spinning && !playhead) {
            pauseSnippet();
            setActive(null);
        }
    }

    function togglePlayhead() {
        if (playhead) {
            stopPlayhead();
            pauseSnippet();
            setActive(null);
            return;
        }
        // Six-tenths of a second per record is a spin, not a listen, so starting
        // the transport slows the moon to something you can hear.
        if (dwell < LISTEN_DWELL) setDwell(LISTEN_DWELL);
        setPlayhead(true);
    }

    return (
        <>
            <section className="relative overflow-x-clip px-6 pt-14 pb-24 text-center md:px-10 md:pt-20 md:pb-32">
                <div className="relative mt-2 md:mt-6">
                    <RayBurst
                        items={RELEASES}
                        active={active}
                        onActive={setActive}
                        playhead={playhead}
                        onTogglePlayhead={togglePlayhead}
                        onSpin={scrub}
                    />

                    {/* One knob, in seconds per record: how long the beacon
                        dwells is the same thing as how fast the moon turns. It
                        belongs to the transport, so it is only out while the
                        transport is running — sitting under the wordmark that
                        started it. */}
                    {playhead && (
                        <div className="absolute top-[62%] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
                            <span className="font-credit text-[10px] tracking-[0.28em] text-[var(--ink-soft)] uppercase">Speed</span>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.001}
                                value={positionOf(dwell)}
                                onChange={(event) => setDwell(dwellAt(Number(event.target.value)))}
                                aria-label="Rotation speed"
                                title={`${dwell < 1 ? dwell.toFixed(2) : dwell.toFixed(1)}s per record`}
                                className="w-16 cursor-pointer accent-[var(--ochre)]"
                            />
                        </div>
                    )}
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
                                    onActive={catalogActive}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
