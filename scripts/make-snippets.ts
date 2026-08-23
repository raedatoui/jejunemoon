import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Placeholder hover snippets: ten seconds from the middle of a track's Apple
// preview. Up to four tracks per release, so an EP has something other than its
// opening bars to offer on a second pass; a single simply yields the one.
const SNIPPET_SECONDS = 10;
const MAX_TRACKS = 4;

interface Link {
    platform: string;
    url: string;
}

interface Project {
    title: string;
    links: Link[];
    snippet?: string;
    snippets?: string[];
    [key: string]: unknown;
}

interface Result {
    wrapperType: string;
    discNumber?: number;
    trackNumber?: number;
    previewUrl?: string;
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

// The first few tracks of the record, in running order. Apple hands back the
// album alongside its songs and not always in sequence, and Kenneth's long
// pieces run to more movements than we want, so sort and take from the top.
async function previewUrls(albumId: string): Promise<string[]> {
    const response = await fetch(`https://itunes.apple.com/lookup?id=${albumId}&entity=song&limit=200`);
    if (!response.ok) throw new Error(`iTunes lookup failed for ${albumId}: ${response.status}`);
    const data = (await response.json()) as { results: Result[] };
    return data.results
        .filter((result): result is Result & { previewUrl: string } => result.wrapperType === 'track' && Boolean(result.previewUrl))
        .sort((a, b) => (a.discNumber ?? 1) - (b.discNumber ?? 1) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
        .slice(0, MAX_TRACKS)
        .map((track) => track.previewUrl);
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
        console.log(`\n${project.title}`);

        const albumId = appleAlbumId(project.links);
        if (!albumId) {
            console.error('  no Apple link — skipped');
            continue;
        }

        const previews = await previewUrls(albumId);
        if (previews.length === 0) {
            console.error(`  no Apple previews for album ${albumId} — skipped`);
            continue;
        }
        console.log(`  apple album ${albumId}: ${previews.length} of ${MAX_TRACKS} tracks`);

        const snippets: string[] = [];
        for (const [index, preview] of previews.entries()) {
            const name = `${slug(project.title)}-${index + 1}.m4a`;
            const start = Math.max(0, duration(preview) / 2 - SNIPPET_SECONDS / 2);
            encode(preview, start, path.join(snippetsDir, name));
            snippets.push(`/snippets/${name}`);
            console.log(`  wrote ${name} from ${start.toFixed(1)}s`);
        }

        project.snippets = snippets;
        // The hover still reaches for one snippet per release; the rest are here
        // for whoever wants to make a second pass sound different.
        project.snippet = snippets[0];
    }

    fs.writeFileSync(projectsPath, `${JSON.stringify(data, null, 4)}\n`);
    console.log(`\nUpdated ${projectsPath}`);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
