import * as fs from 'node:fs';
import * as path from 'node:path';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyImage {
    url: string;
    height: number;
    width: number;
}

interface SpotifyArtist {
    id: string;
    name: string;
    genres?: string[];
}

interface SpotifyAlbum {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    images: SpotifyImage[];
    release_date: string;
    genres: string[];
    external_urls: {
        spotify: string;
    };
}

interface Project {
    title: string;
    thumb: string;
    artist: string;
    year: string;
    genre: string;
    links: { type: string; url: string }[];
}

interface AlbumsInput {
    albumIds: string[];
}

async function getAccessToken(): Promise<string> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
}

async function fetchAlbum(albumId: string, accessToken: string): Promise<SpotifyAlbum> {
    const response = await fetch(`${SPOTIFY_API_BASE}/albums/${albumId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch album ${albumId}: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifyAlbum>;
}

async function fetchArtist(artistId: string, accessToken: string): Promise<SpotifyArtist> {
    const response = await fetch(`${SPOTIFY_API_BASE}/artists/${artistId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch artist ${artistId}: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifyArtist>;
}

async function downloadImage(url: string, filePath: string): Promise<void> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
}

async function main() {
    const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
    const projectRoot = path.resolve(scriptsDir, '..');
    const albumsInputPath = path.join(scriptsDir, 'albums.json');
    const outputPath = path.join(projectRoot, 'src/app/projects.json');
    const albumsDir = path.join(projectRoot, 'public/albums');

    // Read input file
    if (!fs.existsSync(albumsInputPath)) {
        console.error(`Input file not found: ${albumsInputPath}`);
        console.error('Create scripts/albums.json with format: { "albumIds": ["id1", "id2"] }');
        process.exit(1);
    }

    const inputData = JSON.parse(fs.readFileSync(albumsInputPath, 'utf-8')) as AlbumsInput;

    if (!inputData.albumIds || inputData.albumIds.length === 0) {
        console.error('No album IDs provided in albums.json');
        process.exit(1);
    }

    console.log(`Fetching ${inputData.albumIds.length} albums...`);

    // Get access token
    const accessToken = await getAccessToken();
    console.log('Authenticated with Spotify API');

    // Ensure albums directory exists
    if (!fs.existsSync(albumsDir)) {
        fs.mkdirSync(albumsDir, { recursive: true });
    }

    const projects: Project[] = [];

    for (const albumId of inputData.albumIds) {
        console.log(`\nFetching album: ${albumId}`);

        try {
            const album = await fetchAlbum(albumId, accessToken);
            console.log(`  Title: ${album.name}`);
            console.log(`  Artist: ${album.artists[0]?.name}`);

            // Get genre from artist if album doesn't have genres
            let genre = album.genres[0] || '';
            if (!genre && album.artists[0]) {
                const artist = await fetchArtist(album.artists[0].id, accessToken);
                genre = artist.genres?.[0] || 'Music';
            }

            // Download album artwork (use largest image)
            const imageUrl = album.images[0]?.url;
            let thumbPath = '';

            if (imageUrl) {
                const imageFileName = `${albumId}.jpg`;
                const imageFilePath = path.join(albumsDir, imageFileName);
                console.log('  Downloading artwork...');
                await downloadImage(imageUrl, imageFilePath);
                thumbPath = `/albums/${imageFileName}`;
            }

            // Extract year from release date
            const year = album.release_date.split('-')[0];

            const project: Project = {
                title: album.name,
                thumb: thumbPath,
                artist: album.artists.map((a) => a.name).join(', '),
                year,
                genre: genre.charAt(0).toUpperCase() + genre.slice(1),
                links: [{ type: 'spotify', url: album.external_urls.spotify }],
            };

            projects.push(project);
            console.log('  Done!');
        } catch (error) {
            console.error(`  Error fetching album ${albumId}:`, error);
        }
    }

    // Write output
    const output = { projects };
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nWrote ${projects.length} projects to ${outputPath}`);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
