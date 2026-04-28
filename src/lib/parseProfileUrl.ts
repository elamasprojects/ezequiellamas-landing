export type Platform = "instagram" | "youtube" | "tiktok";

export interface ParsedProfile {
  platform: Platform;
  handle: string;
  normalized_url: string;
}

const TRIM_TRAIL = (s: string) => s.replace(/\/+$/, "");

function parseInstagram(url: URL): ParsedProfile | null {
  const segs = url.pathname.split("/").filter(Boolean);
  if (segs.length === 0) return null;
  const handle = segs[0].replace(/^@/, "");
  if (!handle) return null;
  return {
    platform: "instagram",
    handle,
    normalized_url: `https://www.instagram.com/${handle}/`,
  };
}

function parseYouTube(url: URL): ParsedProfile | null {
  const segs = url.pathname.split("/").filter(Boolean);
  if (segs.length === 0) return null;
  const first = segs[0];
  if (first.startsWith("@")) {
    const handle = first.slice(1);
    if (!handle) return null;
    return { platform: "youtube", handle, normalized_url: `https://www.youtube.com/@${handle}` };
  }
  if ((first === "c" || first === "user" || first === "channel") && segs[1]) {
    return {
      platform: "youtube",
      handle: segs[1],
      normalized_url: `https://www.youtube.com/${first}/${segs[1]}`,
    };
  }
  if (segs.length === 1) {
    return {
      platform: "youtube",
      handle: first,
      normalized_url: `https://www.youtube.com/@${first}`,
    };
  }
  return null;
}

function parseTikTok(url: URL): ParsedProfile | null {
  const segs = url.pathname.split("/").filter(Boolean);
  if (segs.length === 0) return null;
  const first = segs[0].replace(/^@/, "");
  if (!first) return null;
  return {
    platform: "tiktok",
    handle: first,
    normalized_url: `https://www.tiktok.com/@${first}`,
  };
}

export function parseProfileUrl(input: string): ParsedProfile | null {
  if (!input) return null;
  const trimmed = TRIM_TRAIL(input.trim());
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return parseInstagram(url);
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return parseYouTube(url);
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return parseTikTok(url);

  return null;
}

export function deriveHandlesFromUrls(input: {
  instagram_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
}): {
  instagram_handle: string | null;
  youtube_handle: string | null;
  tiktok_handle: string | null;
} {
  const ig = input.instagram_url ? parseProfileUrl(input.instagram_url) : null;
  const yt = input.youtube_url ? parseProfileUrl(input.youtube_url) : null;
  const tt = input.tiktok_url ? parseProfileUrl(input.tiktok_url) : null;
  return {
    instagram_handle: ig?.platform === "instagram" ? ig.handle : null,
    youtube_handle: yt?.platform === "youtube" ? yt.handle : null,
    tiktok_handle: tt?.platform === "tiktok" ? tt.handle : null,
  };
}
