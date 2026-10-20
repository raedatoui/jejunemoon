# JeJune Moon

Website: [jejunemoon.com](https://jejunemoon.com)

This is a [Next.js](https://nextjs.org/) project.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Set the asset origin in `.env.local`:

```dotenv
NEXT_PUBLIC_CDN_URL=https://storage.googleapis.com/typedef/jejunemoon
```

Album artwork, platform icons, logos, and audio snippets use this URL. Leave it unset or empty
to load the files from local `public/` paths.

Restart the development server after changing it. For production, set the variable before
`pnpm build`; Next.js includes its value in the exported site.
The source files are stored in `gs://typedef/jejunemoon/`.
