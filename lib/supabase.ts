// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Manifest } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getServerSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function saveManifest(manifest: Manifest): Promise<string> {
  const filename = `${manifest.jobId}/manifest.json`;
  const data = JSON.stringify(manifest, null, 2);

  const { data: uploadData, error } = await supabase.storage
    .from('manifests')
    .upload(filename, new Blob([data], { type: 'application/json' }), {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to save manifest: ${error.message}`);
  }

  return uploadData.path;
}

export async function getManifest(jobId: string): Promise<Manifest> {
  const filename = `${jobId}/manifest.json`;

  const { data, error } = await supabase.storage
    .from('manifests')
    .download(filename);

  if (error) {
    throw new Error(`Failed to get manifest: ${error.message}`);
  }

  const text = await data.text();
  return JSON.parse(text);
}

export async function listManifests(limit = 50): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('manifests')
    .list('', { limit, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) {
    throw new Error(`Failed to list manifests: ${error.message}`);
  }

  return data.map(file => file.name);
}
