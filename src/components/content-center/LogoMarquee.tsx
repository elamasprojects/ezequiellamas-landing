import { BRANDS, IntegrationGlyph, type BrandKey } from "./IntegrationLogos";

const MARQUEE: BrandKey[] = [
  "instagram",
  "youtube",
  "tiktok",
  "claude",
  "openai",
  "gemini",
  "heygen",
  "elevenlabs",
  "kling",
  "zernio",
  "bunny",
  "apify",
  "supabase",
];

export default function LogoMarquee() {
  // Render the list twice so the -50% translate loops seamlessly.
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <section className="cc-marquee" aria-label="Herramientas integradas">
      <p className="cc-marquee-label">Conectado con las herramientas que ya usás</p>
      <div className="cc-marquee-viewport">
        <div className="cc-marquee-track">
          {items.map((brand, i) => (
            <span className="cc-marquee-item" key={`${brand}-${i}`} aria-hidden={i >= MARQUEE.length}>
              <IntegrationGlyph brand={brand} />
              {BRANDS[brand].label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
