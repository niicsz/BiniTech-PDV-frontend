export function imageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith('/')) return url;
  const base = (window.__env?.apiBase ?? '').replace(/\/$/, '');
  return base + url;
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_BYTES = 7 * 1024 * 1024;

export function imageFileError(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Escolha uma imagem JPG, PNG ou WebP.';
  if (file.size > IMAGE_MAX_BYTES) return 'A imagem passa de 7 MB. Escolha um arquivo menor.';
  return null;
}
