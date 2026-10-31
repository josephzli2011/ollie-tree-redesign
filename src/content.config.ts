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

export const collections = { pages };
