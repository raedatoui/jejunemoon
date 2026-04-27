import { z } from 'zod';

export const LinkSchema = z.object({
    type: z.string(),
    url: z.string(),
});

export const ProjectSchema = z.object({
    title: z.string(),
    thumb: z.string(),
    artist: z.string(),
    year: z.string(),
    genre: z.string(),
    links: z.array(LinkSchema),
});

export const ProjectsListSchema = z.object({
    projects: z.array(ProjectSchema),
});

export type Project = z.infer<typeof ProjectSchema>;
