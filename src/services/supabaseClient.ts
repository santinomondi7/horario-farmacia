import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://szqotqtwzdtlrulaoexp.supabase.co';
const DEFAULT_KEY = 'sb_publishable_xVIH1OhHAiFkKVVic7gcsA_RiYHHkS6';

const getEnvUrl = (): string => {
  const envVal = import.meta.env.VITE_SUPABASE_URL || (import.meta.env as any).SUPABASE_URL;
  if (envVal && envVal !== 'https://your-project.supabase.co') return envVal;
  if (typeof window !== 'undefined') {
    const localVal = localStorage.getItem('mondino_supabase_url');
    if (localVal) return localVal;
  }
  return DEFAULT_URL;
};

const getEnvAnonKey = (): string => {
  const envVal =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (import.meta.env as any).SUPABASE_PUBLISHABLE_KEY;
  if (envVal && envVal !== 'your-anon-key') return envVal;
  if (typeof window !== 'undefined') {
    const localVal = localStorage.getItem('mondino_supabase_anon_key');
    if (localVal) return localVal;
  }
  return DEFAULT_KEY;
};

export const isSupabaseConfigured = (): boolean => {
  const url = getEnvUrl();
  const key = getEnvAnonKey();
  return Boolean(
    url &&
    key &&
    url !== 'https://your-project.supabase.co' &&
    key !== 'your-anon-key' &&
    url.startsWith('https://')
  );
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (clientInstance) return clientInstance;
  if (isSupabaseConfigured()) {
    const url = getEnvUrl();
    const key = getEnvAnonKey();
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return clientInstance;
  }
  return null;
};

export const setCustomSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    if (url && key) {
      localStorage.setItem('mondino_supabase_url', url.trim());
      localStorage.setItem('mondino_supabase_anon_key', key.trim());
    } else {
      localStorage.removeItem('mondino_supabase_url');
      localStorage.removeItem('mondino_supabase_anon_key');
    }
    clientInstance = null; // Recreate next time
  }
};

/**
 * Dynamic proxy export so importing `supabase` always resolves to the active client
 */
export const supabase: SupabaseClient | any = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      return undefined;
    }
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});
