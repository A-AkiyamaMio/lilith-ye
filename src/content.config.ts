import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const baseSchema = z.object({
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  visibility: z.enum(['public', 'private']),
  order: z.number().int().nonnegative().default(0),
  cover: z.string().optional(),
  tags: z.array(z.string()).default([]),
  updated: z.coerce.date()
});

const publicCollection = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './content/public',
    generateId: ({ entry }) => `public/${entry}`
  }),
  schema: baseSchema.extend({ visibility: z.literal('public') })
});

const privateCollection = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './content/private',
    generateId: ({ entry }) => `private/${entry}`
  }),
  schema: baseSchema.extend({ visibility: z.literal('private') })
});

export const collections = {
  public: publicCollection,
  private: privateCollection
};
