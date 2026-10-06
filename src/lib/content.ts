import { getCollection, type CollectionEntry } from 'astro:content';

export async function getPublicEntries(): Promise<CollectionEntry<'public'>[]> {
  return getCollection('public', ({ data }) => data.visibility === 'public');
}

export async function getPrivateEntries(): Promise<CollectionEntry<'private'>[]> {
  return getCollection('private', ({ data }) => data.visibility === 'private');
}
