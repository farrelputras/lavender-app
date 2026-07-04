// app/services/photos/storage.ts
import { decode } from "base64-arraybuffer"
import * as FileSystem from "expo-file-system/legacy"

import { supabase } from "../supabase/client"

const BUCKET = "rental-photos"

export async function uploadPhoto(
  localUri: string,
  storagePath: string,
  contentType: string,
): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, decode(base64), { contentType, upsert: false })
  if (error) throw error
}

export async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (paths.length === 0) return map
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24)
  if (error) throw error
  for (const row of data ?? []) if (row.signedUrl && row.path) map.set(row.path, row.signedUrl)
  return map
}

export async function removePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
}
