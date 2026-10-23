---
name: add-release
description: Add a music release to the JeJune Moon catalog from a Spotify or other release link, find matching platform links, prepare supplied artwork and MP3 snippets, and upload the assets to the configured Google Cloud bucket.
---

# Add a JeJune Moon release

Update the requested release in `src/app/projects.json`, preserving the other entries and existing formatting. Read `src/lib/schemas.ts`, `src/components/CatalogRow.tsx`, `src/lib/assets.ts`, and `README.md` for the current schema, platform names, and asset configuration.

## Find release metadata and links

- Start from the supplied release URL. Obtain the exact title, credited artists, release date, format, genre, and track list from the services themselves. Prefer canonical album links; a track link is appropriate for a single when that is the available destination.
- Spotify's public oEmbed endpoint supplies the title and artwork. Its album page contains `music:release_date` and JSON-LD; the public embed page contains the track list. Extract only release data, not session tokens or unrelated page state.
- Use Songlink/Odesli to discover matching services, then fill gaps through platform searches. An `album.link/s/<spotify-album-id>` page may resolve a single to a track. Its `__NEXT_DATA__` contains link sections; entries without a `url` are unavailable, not usable links. If its API requires authentication, use the public page or direct services.
- Match artist, title, artwork, and identifiers. An ISRC lookup at `https://api.deezer.com/track/isrc:<ISRC>` can reveal the album; `https://api.deezer.com/album/<ID>` supplies the UPC, genre, and release date.
- For releases missing from Apple search, try `https://itunes.apple.com/lookup?upc=<UPC>&entity=song&limit=200`. Its collection URL identifies the album; `?app=itunes` selects the store destination. Apple web search can also find releases before iTunes text search does.
- Search YouTube/YouTube Music and SoundCloud directly when the aggregator has gaps. Include all positively matched release destinations, using the existing platform names where applicable. Do not substitute artist profiles, search pages, guessed IDs, or unrelated releases. Report any services not found without claiming the release is unavailable there.
- Prefer primary service metadata over aggregator metadata if they disagree. Ask about unresolved discrepancies that affect the catalog entry.

## Select artwork and audio

- Use supplied artwork, including attached local files. If none was supplied, ask which artwork to use and request a local path or attachment; local release folders are often under `../Releases/`. Do not silently replace a supplied cover with streaming-service artwork.
- Copy the selected cover to `public/albums/<spotify-album-id>.jpg`, retaining its actual file format if it is not JPEG. Preserve the original; image redesign is a separate request.
- Prefer a matching local audio master. Ask for the track and timestamp when the selection is unclear; if no excerpt is specified, propose a ten-second excerpt centered in the track, matching the site's current duration. For multi-track releases, establish which tracks need snippets.
- If no master is available, ask for a source or use an available service preview when that fallback is authorized. Do not attempt to extract protected full streams.
- Create `public/snippets/<ascii-release-slug>-1.mp3` with ffmpeg. Read source duration with ffprobe to calculate the midpoint. Use mono, 44.1 kHz, libmp3lame at 96 kbps, and the current snippet treatment: `loudnorm=I=-18:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.4,afade=t=out:st=9.4:d=0.6` for a ten-second clip. Honor requested timing and encoding changes.
- Use `~/tmp` for any scratch downloads. `public/` is for finished local assets and is ignored by Git.

## Upload assets and add the entry

- The configured asset location is currently `gs://typedef/jejunemoon/`, with public origin `https://storage.googleapis.com/typedef/jejunemoon`. Re-read `README.md` before uploading in case it has changed.
- When the user requests uploads as part of adding the release, that authorizes uploading its prepared artwork and snippets to the configured destination. Otherwise ask before the external upload. Use the active gcloud account; do not change bucket permissions or account configuration.
- Upload only the selected files, preserving the paths below `public/`, with `gcloud storage cp --no-clobber`. Set `image/jpeg` for JPEG covers and `audio/mpeg` for MP3s. Do not overwrite existing objects without authorization; use a new filename for a replacement if appropriate.
- Wait for each upload command to complete. If an upload is blocked or skipped because the object exists, resolve the cause or report it; do not claim the new asset was uploaded.
- Add the entry with `title`, `artist`, `year`, `releaseDate` (YYYY-MM-DD), `format`, `genre`, `thumb`, `links`, `snippet`, and `snippets`. Store asset paths as `/albums/...` and `/snippets/...`; the site prepends the configured CDN origin. Set `snippet` to the first item of `snippets`.
- Do not run the existing bulk helpers to add one release: `scripts/fetch-albums.ts` replaces the catalog and emits an older link shape, while `scripts/make-snippets.ts` regenerates every release as AAC and formats the catalog. Make a focused entry and asset addition instead.
- Follow the user's verification policy: no lint, build, tests, browser checks, or post-change verification unless explicitly requested for the current turn. Input metadata lookup and media generation are part of doing the task.
- Report the added release, links found and missing, selected snippet interval, local paths, and upload outcome. Deploying the website and committing changes require their own user instructions; uploading assets alone does not deploy the catalog.
