import { z } from 'zod';

export const LinkSchema = z.object({
    platform: z.string(),
    url: z.string().url(),
});

export const ProjectSchema = z.object({
    title: z.string(),
    thumb: z.string(),
    artist: z.string(),
    year: z.string(),
    releaseDate: z.string().optional(),
    format: z.string().optional(),
    genre: z.string(),
    snippet: z.string().optional(),
    snippets: z.array(z.string()).optional(),
    links: z.array(LinkSchema),
});

export const ProjectsListSchema = z.object({
    projects: z.array(ProjectSchema),
});

export type Project = z.infer<typeof ProjectSchema>;
