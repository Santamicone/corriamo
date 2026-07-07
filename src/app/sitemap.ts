import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE = 'https://app.vieniacorrere.it'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [{ data: runs }, { data: series }, { data: gare }, { data: profiles }] = await Promise.all([
    supabase
      .from('runs')
      .select('id, created_at')
      .eq('status', 'aperta')
      .or('type.is.null,type.eq.allenamento'),
    supabase
      .from('series')
      .select('id, created_at'),
    supabase
      .from('runs')
      .select('id, created_at')
      .eq('status', 'aperta')
      .eq('type', 'gara'),
    supabase
      .from('profiles')
      .select('id, created_at'),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE}/come-funziona`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/gare`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${BASE}/bacheca`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE}/registrati`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE}/termini`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]

  const runPages: MetadataRoute.Sitemap = (runs ?? []).map(r => ({
    url: `${BASE}/corse/${r.id}`,
    lastModified: new Date(r.created_at ?? Date.now()),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const seriesPages: MetadataRoute.Sitemap = (series ?? []).map(s => ({
    url: `${BASE}/serie/${s.id}`,
    lastModified: new Date(s.created_at ?? Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const garePages: MetadataRoute.Sitemap = (gare ?? []).map(g => ({
    url: `${BASE}/gare/${g.id}`,
    lastModified: new Date(g.created_at ?? Date.now()),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const profilePages: MetadataRoute.Sitemap = (profiles ?? []).map(p => ({
    url: `${BASE}/profilo/${p.id}`,
    lastModified: new Date(p.created_at ?? Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...runPages, ...seriesPages, ...garePages, ...profilePages]
}
