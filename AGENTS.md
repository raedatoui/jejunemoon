# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production (static export to /out)
pnpm lint         # Run Biome linter
pnpm format       # Format code with Biome
pnpm check        # Lint and format with auto-fix
```

## Architecture

This is a Next.js 16 static site for JeJune Moon (a music/art project showcase). It exports as a static site (`output: 'export'`).

### Key Patterns

- **Path alias**: `@/*` maps to `./src/*`
- **Fonts**: MuseoModerno (headings via `font-header`) and Lato (body via `font-body`) loaded via `next/font/google`
- **Styling**: Tailwind CSS v4 with custom utilities defined in `globals.css` (perspective-1000, preserve-3d, backface-hidden, rotate-y-180)
- **Utility function**: `cn()` in `src/lib/utils.ts` merges Tailwind classes using clsx + tailwind-merge
- **Data validation**: Zod schemas in `src/lib/schemas.ts` validate project data from JSON

### Component Structure

- `src/app/` - Next.js App Router pages and layout
- `src/components/` - React components (Header, Menu, Slider use framer-motion for animations)
- `src/lib/` - Utilities and schemas
- `src/app/projects.json` - Project data (validated by ProjectsListSchema)

### Styling Conventions

Biome enforces:
- 4-space indentation
- Single quotes, semicolons, ES5 trailing commas
- 150 character line width
