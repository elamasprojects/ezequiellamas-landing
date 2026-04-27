/**
 * Per-platform constraints and validations for publishing.
 * MVP focuses on the 3 supported platforms (Instagram / YouTube / TikTok).
 * "other" is excluded from publish targets.
 */

export type PublishPlatform = "instagram" | "youtube" | "tiktok";

export const PUBLISH_PLATFORMS: ReadonlyArray<PublishPlatform> = [
  "instagram",
  "youtube",
  "tiktok",
] as const;

export const PLATFORM_LABEL: Record<PublishPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export interface PlatformLimits {
  /** Max caption length in characters */
  maxCaptionLength: number;
  /** Max number of hashtags allowed */
  maxHashtags: number;
  /** Whether the platform supports video posts */
  supportsVideo: boolean;
  /** Whether the platform supports carousel (multi-image) posts */
  supportsCarousel: boolean;
  /** Min/max number of carousel slides */
  carouselSlideRange?: [number, number];
  /** Allowed video MIME types */
  videoMimeTypes: string[];
  /** Min/max video duration in seconds */
  videoDurationRange: [number, number];
  /** Allowed image MIME types for carousel */
  imageMimeTypes: string[];
  /** Notes shown to the user about quirks */
  notes: string[];
}

export const PLATFORM_LIMITS: Record<PublishPlatform, PlatformLimits> = {
  instagram: {
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportsVideo: true, // Reels
    supportsCarousel: true,
    carouselSlideRange: [1, 10],
    videoMimeTypes: ["video/mp4", "video/quicktime"],
    videoDurationRange: [3, 90 * 60], // up to 90min for Reels (longform)
    imageMimeTypes: ["image/jpeg", "image/png"],
    notes: [
      "Reels: 3-90s ideal, vertical 9:16",
      "Carrousel: 1-10 imágenes (mismo orden que en la galería)",
    ],
  },
  youtube: {
    maxCaptionLength: 5000,
    maxHashtags: 15,
    supportsVideo: true,
    supportsCarousel: false,
    videoMimeTypes: ["video/mp4", "video/quicktime", "video/webm"],
    videoDurationRange: [1, 12 * 60 * 60], // up to 12h
    imageMimeTypes: [],
    notes: [
      "Shorts: video vertical < 60s. Se agrega #Shorts al título automáticamente",
      "Cuota de API: 10.000 unidades/día (~6 uploads/día)",
    ],
  },
  tiktok: {
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportsVideo: true,
    supportsCarousel: false,
    videoMimeTypes: ["video/mp4", "video/quicktime"],
    videoDurationRange: [3, 10 * 60], // up to 10min
    imageMimeTypes: [],
    notes: [
      "Upload Mode: el video llega como borrador a la app de TikTok",
      "Tenés que abrir la app y completar la publicación con un tap final",
    ],
  },
};

export function isPublishPlatform(p: string | null | undefined): p is PublishPlatform {
  return p != null && (PUBLISH_PLATFORMS as ReadonlyArray<string>).includes(p);
}

export interface ValidationError {
  platform: PublishPlatform;
  field: "caption" | "hashtags" | "video" | "carousel" | "asset";
  message: string;
}

export interface ValidatePostInput {
  platforms: PublishPlatform[];
  asset_kind: "video" | "carousel";
  caption: string;
  hashtags: string[];
  video_duration_seconds?: number;
  video_mime_type?: string;
  carousel_slide_count?: number;
}

export function validatePost(input: ValidatePostInput): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const platform of input.platforms) {
    const limits = PLATFORM_LIMITS[platform];

    // Asset compatibility
    if (input.asset_kind === "carousel" && !limits.supportsCarousel) {
      errors.push({
        platform,
        field: "asset",
        message: `${PLATFORM_LABEL[platform]} no soporta carrouseles`,
      });
      continue;
    }
    if (input.asset_kind === "video" && !limits.supportsVideo) {
      errors.push({
        platform,
        field: "asset",
        message: `${PLATFORM_LABEL[platform]} no soporta videos`,
      });
      continue;
    }

    // Caption
    if (input.caption.length > limits.maxCaptionLength) {
      errors.push({
        platform,
        field: "caption",
        message: `Caption excede ${limits.maxCaptionLength} caracteres (tiene ${input.caption.length})`,
      });
    }

    // Hashtags
    if (input.hashtags.length > limits.maxHashtags) {
      errors.push({
        platform,
        field: "hashtags",
        message: `Máximo ${limits.maxHashtags} hashtags (tiene ${input.hashtags.length})`,
      });
    }

    // Video specifics
    if (input.asset_kind === "video") {
      if (input.video_mime_type && !limits.videoMimeTypes.includes(input.video_mime_type)) {
        errors.push({
          platform,
          field: "video",
          message: `Formato ${input.video_mime_type} no permitido. Usar: ${limits.videoMimeTypes.join(", ")}`,
        });
      }
      if (input.video_duration_seconds != null) {
        const [minDur, maxDur] = limits.videoDurationRange;
        if (input.video_duration_seconds < minDur) {
          errors.push({
            platform,
            field: "video",
            message: `Video muy corto (${input.video_duration_seconds.toFixed(1)}s). Mínimo ${minDur}s`,
          });
        }
        if (input.video_duration_seconds > maxDur) {
          errors.push({
            platform,
            field: "video",
            message: `Video muy largo (${(input.video_duration_seconds / 60).toFixed(1)}min). Máximo ${(maxDur / 60).toFixed(0)}min`,
          });
        }
      }
    }

    // Carousel specifics
    if (input.asset_kind === "carousel" && input.carousel_slide_count != null && limits.carouselSlideRange) {
      const [minSlides, maxSlides] = limits.carouselSlideRange;
      if (input.carousel_slide_count < minSlides) {
        errors.push({
          platform,
          field: "carousel",
          message: `Carrousel necesita al menos ${minSlides} slide(s)`,
        });
      }
      if (input.carousel_slide_count > maxSlides) {
        errors.push({
          platform,
          field: "carousel",
          message: `Carrousel excede ${maxSlides} slides (tiene ${input.carousel_slide_count})`,
        });
      }
    }
  }

  return errors;
}

/** Returns the platforms that DON'T have any error in the validation. */
export function eligiblePlatforms(input: ValidatePostInput): PublishPlatform[] {
  const errors = validatePost(input);
  const failing = new Set(errors.map((e) => e.platform));
  return input.platforms.filter((p) => !failing.has(p));
}
