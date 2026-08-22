'use client';

import { useState } from 'react';
import projectsData from '@/app/projects.json';
import { ProjectsListSchema } from '@/lib/schemas';
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

export function LabelHome() {
    const [active, setActive] = useState<number | null>(null);

    return (
        <>
            <section className="relative overflow-x-clip px-6 pt-14 pb-24 text-center md:px-10 md:pt-20 md:pb-32">
                <div className="mt-2 md:mt-6">
                    <RayBurst items={RELEASES} active={active} onActive={setActive} />
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
