// Utilitaires pour détecter et générer des URLs d'embed YouTube/Vimeo

export type VideoProvider = "youtube" | "vimeo" | "file";

export interface VideoEmbed {
  provider: VideoProvider;
  embedUrl: string;   // URL à utiliser dans <iframe> (ou <video> pour "file")
  thumbnailUrl?: string;
}

export function detectVideo(url: string): VideoEmbed {
  if (!url) return { provider: "file", embedUrl: url };

  // YouTube : youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, shorts/ID
  const ytPatterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const p of ytPatterns) {
    const m = url.match(p);
    if (m) {
      const id = m[1];
      return {
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
  }

  // Vimeo : vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      provider: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Fichier direct (.mp4, .webm, etc.)
  return { provider: "file", embedUrl: url };
}

export function isEmbedVideo(url: string): boolean {
  const { provider } = detectVideo(url);
  return provider === "youtube" || provider === "vimeo";
}
