import "react-native-url-polyfill/auto"
import * as SecureStore from "expo-secure-store"
import { createClient } from "@supabase/supabase-js"

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""

// known-technical-debt.md #5: React Native's `fetch` never times out on its own — an
// unreachable request (offline, dead wifi) hangs forever instead of failing. That silently
// breaks PRD-1 BR-7 ("a failed save shows the real error and keeps Mom in edit mode to retry")
// for exactly the offline case, since a hang never reaches the failure branch at all.
//
// 30s, not tighter: this wrapper sits under EVERY Supabase call made through this client,
// including storage photo uploads (`services/photos/storage.ts`). A tighter timeout would
// abort a slow-but-succeeding multi-photo upload on mobile data — failing work that was
// actually going to complete, which for Mom is worse than the hang it replaces.
const FETCH_TIMEOUT_MS = 30_000

// Exported for direct unit testing; also wired in as the client's `global.fetch` below.
// Rejects with a real `Error` (never the raw abort/network error) carrying an Indonesian
// message a toast can show as-is — consistent with the "throw a real Error" connector rule.
export const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error("Tidak dapat terhubung ke server. Periksa koneksi Anda.")
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
})
