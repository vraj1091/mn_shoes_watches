/** YouTube and Vimeo watch links as privacy-friendly embed URLs; anything else is not embedded. */
export function videoEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const youtube = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = /vimeo\.com\/(?:video\/)?(\d{6,12})/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
