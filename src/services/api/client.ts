import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config remota: el APK lee la URL del backend desde este archivo en GitHub.
// Así se puede cambiar el servidor sin reconstruir el APK.
const REMOTE_CONFIG_URL =
  'https://raw.githubusercontent.com/Tenazoa/tireinspect-backend/main/api-config.json';

// Fallback si no hay internet al primer arranque (se usa el último conocido o el baked)
const FALLBACK_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').trim().replace(/\/$/, '');

let resolvedBase: string | null = null;

// Despierta el backend (Render free se duerme) para que la 1ra foto/IA no demore.
let warmedUp = false;
function warmup(base: string) {
  if (warmedUp) return;
  warmedUp = true;
  fetch(`${base}/docs`, { method: 'GET' }).catch(() => {});
}

async function resolveBaseUrl(): Promise<string> {
  if (resolvedBase) return resolvedBase;

  // 1. Intentar config remota
  try {
    const res = await fetch(REMOTE_CONFIG_URL, { cache: 'no-store' as any });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.apiUrl) {
        resolvedBase = String(cfg.apiUrl).trim().replace(/\/$/, '');
        await AsyncStorage.setItem('ti_api_base', resolvedBase);
        warmup(resolvedBase);
        return resolvedBase;
      }
    }
  } catch {
    // sin internet o config no disponible
  }

  // 2. Último valor conocido (guardado)
  const cached = await AsyncStorage.getItem('ti_api_base');
  if (cached) { resolvedBase = cached; warmup(cached); return cached; }

  // 3. Fallback compilado
  resolvedBase = FALLBACK_URL;
  warmup(FALLBACK_URL);
  return FALLBACK_URL;
}

export const apiClient = axios.create({
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const base = await resolveBaseUrl();
  config.baseURL = `${base}/api/v1`;
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.detail ?? err.message ?? 'Error de conexión';
    return Promise.reject(new Error(msg));
  }
);

// Permite refrescar la config (p.ej. desde Perfil)
export async function refreshApiConfig(): Promise<string> {
  resolvedBase = null;
  return resolveBaseUrl();
}
