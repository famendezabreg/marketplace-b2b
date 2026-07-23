import { api, API_URL } from './api';

/** Sube un archivo (ej. foto de evidencia) y devuelve la ruta que lo identifica. */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<{ url: string }>('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}

/**
 * El backend devuelve rutas relativas (ej. "/uploads/evidence/x.jpg") para archivos
 * propios, o URLs externas completas si en algun caso se guarda una directamente.
 * El navegador necesita la URL absoluta al backend para las relativas.
 */
export function resolveUploadUrl(url: string): string {
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}
