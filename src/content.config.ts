import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    site: z.enum(['root', 'cn', 'en']),
    lang: z.enum(['zh-CN', 'en']),
    path: z.string(),
    originalUrl: z.string(),
    hidden: z.boolean(),
    giving: z.boolean(),
    isPost: z.boolean(),
    date: z.string(),
    hero: z.string().nullable(),
    gallery: z.boolean(),
    hasForm: z.boolean(),
    html: z.string(),
  }),
});

// One Markdown file per event: src/content/events/{site}/YYYY-MM-DD-slug.md. `slug` ("cn/<slug>") becomes the entry id.
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    site: z.enum(['cn', 'en']),
    title: z.string(),
    start: z.string(), // ISO 8601 with offset, e.g. 2026-02-01T13:00:00Z or 2026-02-01T08:00:00-05:00
    end: z.string(),
    allDay: z.boolean().default(false),
    category: z.enum(['clinic', 'run', 'youth', 'talk', 'senior', 'other']).default('other'),
    venue: z.string().optional(),
    address: z.string().optional(),
    image: z.string().optional(), // site-relative path, e.g. /cn/wp-content/uploads/...
    registerUrl: z.string().optional(),
    website: z.string().optional(),
    summary: z.string().optional(),
  }),
});

export const collections = { pages, events };
