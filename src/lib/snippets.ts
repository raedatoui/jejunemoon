// Hover previews are shared between the ray burst and the catalog covers, and
// the emblem is on screen long before the rows it points at exist, so the
// elements live outside React: one <audio> per release, made the first time a
// snippet is wanted and kept for the life of the page. A second hover then
// replays from cache instead of going back to the network.
const players = new Map<string, HTMLAudioElement>();
let playing: HTMLAudioElement | null = null;
let playingSrc: string | null = null;

function player(src: string) {
    let audio = players.get(src);
    if (!audio) {
        audio = new Audio(src);
        audio.preload = 'auto';
        players.set(src, audio);
    }
    return audio;
}

// Called once the page has painted. The snippets are small next to the artwork
// they sit under, and having them in cache is what makes a hover feel instant.
export function prefetchSnippet(src: string) {
    player(src).load();
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
