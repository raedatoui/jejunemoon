'use client';

import { type FormEvent, useEffect, useState } from 'react';

const PASSWORD = 'BakX@f+xujAfxC7bEJ_%';
const STORAGE_KEY = 'label-auth';

export default function Label() {
    const [authed, setAuthed] = useState(false);
    const [ready, setReady] = useState(false);
    const [pw, setPw] = useState('');
    const [err, setErr] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem(STORAGE_KEY) === '1') setAuthed(true);
        setReady(true);
    }, []);

    function submit(e: FormEvent) {
        e.preventDefault();
        if (pw === PASSWORD) {
            sessionStorage.setItem(STORAGE_KEY, '1');
            setAuthed(true);
            setErr(false);
        } else {
            setErr(true);
        }
    }

    if (!ready) return null;

    if (!authed) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center px-4 text-stone-900 font-body">
                <form onSubmit={submit} className="w-full max-w-sm bg-white border border-stone-300 shadow-xl p-8">
                    <h1 className="font-header uppercase tracking-[0.2em] text-2xl mb-6 text-center">Jejune Moon</h1>
                    <label htmlFor="pw" className="block text-xs uppercase tracking-[0.2em] text-stone-600 mb-2">
                        Password
                    </label>
                    <input
                        id="pw"
                        type="password"
                        // biome-ignore lint/a11y/noAutofocus: gate page, focus is desired
                        autoFocus
                        value={pw}
                        onChange={(e) => {
                            setPw(e.target.value);
                            setErr(false);
                        }}
                        className="w-full border border-stone-400 px-3 py-2 mb-4 font-body focus:outline-none focus:border-black"
                    />
                    {err && <p className="text-sm text-red-700 mb-4">Incorrect password.</p>}
                    <button
                        type="submit"
                        className="w-full bg-black text-white uppercase tracking-[0.2em] text-sm py-3 font-header hover:opacity-80 transition-opacity"
                    >
                        Enter
                    </button>
                </form>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @media print {
                    @page { size: letter; margin: 1in; }
                    @page :first { margin-top: 0.4in; }
                    html, body { background: white !important; }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
            <div className="min-h-screen w-full text-stone-900 font-body pt-4 pb-12 px-4 flex justify-center print:p-0 print:min-h-0">
                <article className="bg-white shadow-xl w-[8.5in] min-h-[11in] pt-[0.2in] px-[1in] pb-[1in] print:shadow-none print:w-full print:min-h-0 print:p-0">
                    <header className="flex items-center gap-6 pb-6 mb-10 border-b border-stone-300">
                        <img src="/logo.png" alt="JeJune Moon" className="h-44 w-44 object-contain shrink-0" />
                        <p className="italic text-stone-600 text-lg m-0">
                            A small record label - <br />
                            based in Brooklyn, NY.
                        </p>
                    </header>

                    <section className="mb-10">
                        <h2 className="text-xl font-header uppercase tracking-[0.15em] mb-4">Who we are</h2>
                        <div className="text-base leading-relaxed space-y-4">
                            <p>
                                Jejune Moon is a record label run by Raed Atoui and Mina Pajevic. Raed leads on the operational side; for years
                                he&rsquo;s worked at Sony Music - the team that used to be the tech group inside The Orchard - building the products
                                and systems that distribute and service artists. Mina is an artist herself, and after a long pause she came back to
                                making music. When she started releasing again, it felt strange to hand that over to DistroKid when Raed had spent his
                                career helping build the alternative.
                            </p>
                            <p>
                                Sony employees can distribute through The Orchard on a basic exclusive deal as a benefit of working there. We started
                                using it for Mina, then asked the obvious next question: why not extend this to friends, family, and a small handful
                                of artists we believe in? People who don&rsquo;t want to figure distribution out alone, who don&rsquo;t want to pay a
                                flat fee to a D2C service, and who might benefit from being inside the walled garden instead of outside it.
                            </p>
                        </div>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-header uppercase tracking-[0.15em] mb-4">What releasing through Jejune Moon gets you</h2>
                        <ul className="text-base leading-relaxed space-y-2 list-none pl-0">
                            <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[0.65em] before:w-1.5 before:h-1.5 before:bg-black before:rounded-full">
                                Distribution through The Orchard, with no per-release or annual fee on your end.
                            </li>
                            <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[0.65em] before:w-1.5 before:h-1.5 before:bg-black before:rounded-full">
                                Hands-on release management - Raed has direct, internal access to the tools and to Orchard customer support that
                                external clients don&rsquo;t.
                            </li>
                            <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[0.65em] before:w-1.5 before:h-1.5 before:bg-black before:rounded-full">
                                Real analytics and content management through Orchard&rsquo;s tooling, which is meaningfully better than what
                                you&rsquo;d get from a typical D2C distributor.
                            </li>
                            <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[0.65em] before:w-1.5 before:h-1.5 before:bg-black before:rounded-full">
                                A small advertising budget per release we can put behind your music.
                            </li>
                            <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[0.65em] before:w-1.5 before:h-1.5 before:bg-black before:rounded-full">
                                If you turn the release in on time, it gets pitched to streaming platforms through The Orchard&rsquo;s pitching
                                pipeline. We make sure you hit the schedule.
                            </li>
                            <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[0.65em] before:w-1.5 before:h-1.5 before:bg-black before:rounded-full">
                                Practical help we&rsquo;ve learned the hard way: release timelines, microsites, social posting cadence, Spotify and
                                social ads, playlist and press pitching.
                            </li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-header uppercase tracking-[0.15em] mb-4">What we&rsquo;ve shipped so far</h2>
                        <p className="text-base leading-relaxed">
                            We&rsquo;re early. Current roster: a contemporary classical LP from Kenneth Kirschner, a couple of singles from Mina and a
                            collaborator, and an upcoming EP from Mina. Streaming numbers are still small and we haven&rsquo;t spent meaningfully on
                            ads yet - but one of Mina&rsquo;s songs was picked up by an Apple curatorial playlist. We can&rsquo;t prove The Orchard
                            pitched it directly, but we believe being on the inside helped.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-header uppercase tracking-[0.15em] mb-4">
                            What we&rsquo;re still figuring out - and what we don&rsquo;t pretend to be
                        </h2>
                        <p className="text-base leading-relaxed">
                            We&rsquo;re a basic-tier label without the streaming volume that earns hands-on servicing from The Orchard. Marketing,
                            sync, and pitching ultimately come down to relationships inside the building; Raed has some, but not direct access to
                            every team. As we grow, those relationships and the intangible perks of being inside should become more concrete.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-header uppercase tracking-[0.15em] mb-4">What you bring</h2>
                        <p className="text-base leading-relaxed">
                            You still have to do the work: play shows, build an audience, talk to publications and curators, show up on social media.
                            We don&rsquo;t replace any of that. What we do is take the distribution and release-ops headache off your plate, get your
                            music into the right pipelines on time, and grow alongside you.
                        </p>
                    </section>

                    <section className="mt-10 p-6 border-l-4 border-black bg-stone-50">
                        <h2 className="text-xl font-header uppercase tracking-[0.15em] mb-4 mt-0">The offer</h2>
                        <p className="text-base leading-relaxed m-0">
                            Try it for one release and see how it feels. Low stakes, no fees, real tooling, and someone who actually cares about your
                            music handling the back end.
                        </p>
                    </section>
                </article>
            </div>
        </>
    );
}
