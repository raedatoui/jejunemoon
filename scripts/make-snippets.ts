import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Placeholder hover snippets: ten seconds from the middle of the first track.
// Masters we hold locally are used where we have them, keyed by release title;
// anything missing falls back to that release's 30-second Apple preview, which
// is close enough until the label picks its own moments.
const MASTERS: Record<string, string> = {
    'July 19, 2024': '/Users/raed/play/jejunemoon/Releases/kirschner071924/kirschner071924_i.aif',
    'May 26, 2025':
        '/Users/raed/play/jejunemoon/Releases/Kenneth Kirschner - May 26- 2025/Kenneth Kirschner - May 26, 2025 - 01 May 26, 2025 – i..wav',
    'It Stays': '/Users/raed/Downloads/Audio/It Stays Mix Master 12.9.25.wav',
};

const SNIPPET_SECONDS = 10;

interface Link {
    platform: string;
    url: string;
}

interface Project {
    title: string;
    links: Link[];
    snippet?: string;
    [key: string]: unknown;
}

// Same slug as the catalog anchors, so a snippet file is named after the record
// it belongs to rather than its position in the list.
const slug = (title: string) =>
    title
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

// Every Apple link we carry ends in the album id, whether it is a geo.music,
// music.apple, or older itunes.apple URL.
function appleAlbumId(links: Link[]): string | null {
    for (const link of links) {
        if (!/apple\.com|itunes\.com/.test(link.url)) continue;
        const id = link.url.split('?')[0].match(/(\d{6,})$/);
        if (id) return id[1];
    }
    return null;
}

async function previewUrl(albumId: string): Promise<string | null> {
    const response = await fetch(`https://itunes.apple.com/lookup?id=${albumId}&entity=song&limit=1`);
    if (!response.ok) throw new Error(`iTunes lookup failed for ${albumId}: ${response.status}`);
    const data = (await response.json()) as { results: { wrapperType: string; previewUrl?: string }[] };
    return data.results.find((result) => result.wrapperType === 'track')?.previewUrl ?? null;
}

function duration(source: string): number {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', source]);
    return Number.parseFloat(out.toString().trim());
}

// Mono AAC at 64k lands around 80KB for ten seconds — small enough to prefetch
// a whole catalog's worth. loudnorm keeps an ambient piece and a rock mix from
// arriving at wildly different volumes on hover; the fades keep the cut clean.
function encode(source: string, start: number, destination: string) {
    execFileSync('ffmpeg', [
        '-y',
        '-ss', String(start),
        '-t', String(SNIPPET_SECONDS),
        '-i', source,
        '-vn',
        '-ac', '1',
        '-ar', '44100',
        '-af', `loudnorm=I=-18:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.4,afade=t=out:st=${SNIPPET_SECONDS - 0.6}:d=0.6`,
        '-c:a', 'aac',
        '-b:a', '64k',
        '-movflags', '+faststart',
        destination,
    ]);
}

async function main() {
    const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
    const projectRoot = path.resolve(scriptsDir, '..');
    const projectsPath = path.join(projectRoot, 'src/app/projects.json');
    const snippetsDir = path.join(projectRoot, 'public/snippets');

    const data = JSON.parse(fs.readFileSync(projectsPath, 'utf-8')) as { projects: Project[] };
    fs.mkdirSync(snippetsDir, { recursive: true });

    for (const project of data.projects) {
        const name = `${slug(project.title)}.m4a`;
        console.log(`\n${project.title}`);

        let source = MASTERS[project.title];
        if (source && fs.existsSync(source)) {
            console.log(`  master: ${path.basename(source)}`);
        } else {
            const albumId = appleAlbumId(project.links);
            if (!albumId) {
                console.error('  no master and no Apple link — skipped');
                continue;
            }
            const preview = await previewUrl(albumId);
            if (!preview) {
                console.error(`  no Apple preview for album ${albumId} — skipped`);
                continue;
            }
            console.log(`  apple preview: album ${albumId}`);
            source = preview;
        }

        const start = Math.max(0, duration(source) / 2 - SNIPPET_SECONDS / 2);
        encode(source, start, path.join(snippetsDir, name));
        project.snippet = `/snippets/${name}`;
        console.log(`  wrote ${name} from ${start.toFixed(1)}s`);
    }

    fs.writeFileSync(projectsPath, `${JSON.stringify(data, null, 4)}\n`);
    console.log(`\nUpdated ${projectsPath}`);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
