// Parser de URLs de videos individuales (reels IG, shorts/videos YT, posts TT).
// Espejo idéntico vive en supabase/functions/scrape-idea-reference/parseVideoUrl.ts
// (Deno no puede importar de `src/`, así que mantenemos las dos copias en sync).

export type VideoPlatform = "instagram" | "youtube" | "tiktok";

export interface ParsedVideoUrl {
  platform: VideoPlatform;
  short_code: string | null;
  normalized_url: string;
}

export function parseVideoUrl(input: string): ParsedVideoUrl | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const kind = m[1] === "reels" ? "reel" : m[1];
    return {
      platform: "instagram",
      short_code: m[2],
      normalized_url: `https://www.instagram.com/${kind}/${m[2]}/`,
    };
  }

  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    if (!id) return null;
    return {
      platform: "youtube",
      short_code: id,
      normalized_url: `https://www.youtube.com/watch?v=${id}`,
    };
  }
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const shorts = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/);
    if (shorts) {
      return {
        platform: "youtube",
        short_code: shorts[1],
        normalized_url: `https://www.youtube.com/watch?v=${shorts[1]}`,
      };
    }
    const embed = u.pathname.match(/^\/(embed|v)\/([A-Za-z0-9_-]+)/);
    if (embed) {
      return {
        platform: "youtube",
        short_code: embed[2],
        normalized_url: `https://www.youtube.com/watch?v=${embed[2]}`,
      };
    }
    if (u.pathname === "/watch" && u.searchParams.get("v")) {
      const id = u.searchParams.get("v")!;
      return {
        platform: "youtube",
        short_code: id,
        normalized_url: `https://www.youtube.com/watch?v=${id}`,
      };
    }
    return null;
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    // Soporta tanto /video/ID (reels) como /photo/ID (slideshows TT).
    const full = u.pathname.match(/^\/@[^/]+\/(video|photo)\/(\d+)/);
    if (full) {
      return {
        platform: "tiktok",
        short_code: full[2],
        normalized_url: `https://www.tiktok.com${u.pathname.replace(/\/$/, "")}`,
      };
    }
    if (host === "vm.tiktok.com" || host === "vt.tiktok.com") {
      // Short link sin id resolvible sync. Apify resuelve la redirección;
      // la canónica final se persiste en source_url después del scrape.
      return {
        platform: "tiktok",
        short_code: null,
        normalized_url: `https://${host}${u.pathname.replace(/\/$/, "")}`,
      };
    }
    return null;
  }

  return null;
}
