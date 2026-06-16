import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "@/styles/content-center.css";
import Footer from "@/components/content-center/Footer";
import { reveal } from "@/components/content-center/motion";

type Variant = {
  id: string;
  badge: string;
  titleLead: string;
  titleEm: string;
  desc: string;
  stack: string[];
  autoPlay?: boolean;
};

const VARIANTS: Variant[] = [
  {
    id: "cursor",
    badge: "01 · Cursor-flow",
    titleLead: "Versión ",
    titleEm: "Cursor-flow",
    desc: "Elementos grandes y pantallas de la app en movimiento: un cursor hace clic en botones reales —con sonido de clic, reacción del botón y transición— recorriendo el flujo de la herramienta.",
    stack: ["HyperFrames", "GSAP", "Click SFX", "1080p"],
    autoPlay: true,
  },
  {
    id: "captions",
    badge: "02 · Captions",
    titleLead: "Versión ",
    titleEm: "Captions",
    desc: "Subtítulos kinéticos sincronizados a la voz: palabra por palabra estilo karaoke y frases completas con la keyword resaltada, con tipografía geométrica más una cursiva manuscrita animada.",
    stack: ["HyperFrames", "GSAP", "Karaoke", "Captions"],
  },
  {
    id: "kinetic",
    badge: "03 · Kinética",
    titleLead: "Versión ",
    titleEm: "Kinética",
    desc: "Energía alta: escenas que se empujan (sin pisarse), tipografía grande, count-ups, gráficos que se dibujan y SFX en cada transición.",
    stack: ["HyperFrames", "GSAP", "ElevenLabs", "1080p"],
  },
];

export default function ContentCenterDemo() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Content Center · Demo — Ezequiel Lamas";
    window.scrollTo(0, 0);
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="cc-page">
      <header className="cc-features-head">
        <div className="cc-eyebrow">Content Center · Presentation video</div>
        <h1>
          El producto, <em>en movimiento</em>
        </h1>
        <p className="cc-lead">
          Tres variaciones de un product showcase de motion graphics —voz en off argentina, música y
          transiciones dinámicas— que recrean las pantallas reales de la app. Animadas con
          HyperFrames + GSAP.{" "}
          <Link to="/content-center" style={{ color: "var(--ll-accent)" }}>
            Volver a la presentación
          </Link>
          .
        </p>
      </header>

      <div className="cc-shell">
        {VARIANTS.map((v) => (
          <motion.section
            key={v.id}
            className="cc-demo-block"
            initial={reveal.initial}
            whileInView={reveal.whileInView}
            viewport={reveal.viewport}
            transition={reveal.transition}
          >
            <div className="cc-demo-meta">
              <div>
                <div className="cc-demo-badge">{v.badge}</div>
                <h2>
                  {v.titleLead}
                  <em>{v.titleEm}</em>
                </h2>
                <p>{v.desc}</p>
              </div>
              <div className="cc-demo-stack">
                {v.stack.map((s) => (
                  <span className="cc-demo-tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="cc-demo-player">
              <video
                src={`/demo/cc-${v.id}.mp4`}
                poster={`/demo/cc-${v.id}.png`}
                controls
                autoPlay={v.autoPlay}
                muted={v.autoPlay}
                loop
                playsInline
                preload="metadata"
              />
            </div>
          </motion.section>
        ))}

        <p className="cc-demo-note">
          🔊 Las tres tienen <strong>voz en off</strong> (argentina, vía ElevenLabs), música y
          efectos de sonido — activá el sonido del reproductor para escucharlas. La primera arranca
          silenciada para poder autoreproducirse.
        </p>
      </div>

      <Footer />
    </div>
  );
}
