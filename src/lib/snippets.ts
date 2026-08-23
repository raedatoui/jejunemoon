// Hover previews are shared between the ray burst and the catalog covers, and
// the emblem is on screen long before the rows it points at exist, so the
// elements live outside React: one <audio> per release, made the first time a
// snippet is wanted and kept for the life of the page. A second hover then
// replays from cache instead of going back to the network.
const players = new Map<string, HTMLAudioElement>();
// A snippet pulled down ahead of time is kept as a blob rather than trusted to
// still be in the HTTP cache when someone finally hovers the record.
const preloaded = new Map<string, string>();
// How much of each snippet has arrived, and who wants telling as more does. The
// emblem draws its bars from this, so a second caller picks up at whatever the
// first had got to instead of asking the network for the file again.
const progress = new Map<string, number>();
const watchers = new Set<(src: string, fraction: number) => void>();
let playing: HTMLAudioElement | null = null;
let playingSrc: string | null = null;

function player(src: string) {
    let audio = players.get(src);
    if (!audio) {
        audio = new Audio(preloaded.get(src) ?? src);
        audio.preload = 'auto';
        players.set(src, audio);
    }
    return audio;
}

function advance(src: string, fraction: number) {
    progress.set(src, fraction);
    for (const watcher of watchers) watcher(src, fraction);
}

// Pulled down by hand rather than left to the audio element, because the emblem
// draws what it is holding and an element will not say how far along it is. A
// file the server gives no length for, or refuses outright, reports as finished:
// a bar that never grows reads as broken, and the snippet is no worse off than
// it was before — the element still has the network to fall back on.
async function preload(src: string) {
    try {
        const response = await fetch(src);
        if (!response.ok || !response.body) throw new Error(`${src}: ${response.status}`);
        const total = Number(response.headers.get('content-length'));
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
            chunks.push(chunk.value);
            loaded += chunk.value.length;
            if (total > 0) advance(src, Math.min(loaded / total, 1));
        }
        preloaded.set(src, URL.createObjectURL(new Blob(chunks, { type: 'audio/mp4' })));
    } catch {
        // Nothing held onto — playing it will go back to the network.
    }
    advance(src, 1);
}

// Called once the emblem is on the page. Returns its own undoing, so a caller
// that goes away stops being told; the download itself carries on, since the
// bytes are wanted whoever is watching them arrive.
export function preloadSnippets(srcs: string[], onProgress: (src: string, fraction: number) => void) {
    watchers.add(onProgress);
    for (const src of srcs) {
        const seen = progress.get(src);
        if (seen !== undefined) {
            onProgress(src, seen);
            continue;
        }
        progress.set(src, 0);
        preload(src);
    }
    return () => {
        watchers.delete(onProgress);
    };
}

// Picks up where the last hover left off rather than restarting: a snippet is
// ten seconds of a record, and hearing the same first second on every pass gets
// old fast. Once those ten seconds have run out play() rewinds on its own, so a
// finished snippet still starts over.
export function playSnippet(src: string) {
    const audio = player(src);
    if (playing && playing !== audio) pauseSnippet();
    playing = audio;
    playingSrc = src;
    // A hover isn't a user gesture, so a browser that hasn't seen a click on
    // the page yet refuses to start. Nothing to do but stay quiet.
    audio.play().catch(() => {});
}

export function pauseSnippet() {
    if (!playing) return;
    playing.pause();
    playing = null;
    playingSrc = null;
}

// What is audible right now, if anything. The playhead uses it to tell a hover
// that has taken over from a silence it should fill.
export function currentSnippet() {
    return playingSrc;
}
