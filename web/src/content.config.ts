import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog posts moved from the Expo-era content/blog/*.md. Frontmatter contract:
// title, description, date (YYYY-MM-DD), optional updated/author/image/draft/city.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().optional(),
    image: z.string().optional(),
    draft: z.boolean().default(false),
    city: z.string().optional(),
  }),
});

export const collections = { blog };
