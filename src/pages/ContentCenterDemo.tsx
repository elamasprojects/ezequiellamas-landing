import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "@/styles/content-center.css";
import Footer from "@/components/content-center/Footer";
import { reveal } from "@/components/content-center/motion";

const STACK = ["HyperFrames", "GSAP", "ElevenLabs", "1080p"];

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
          Un product showcase de motion graphics — voz en off argentina, música y transiciones
          dinámicas — que recrea las pantallas reales de la app con datos reales. Animado con
          HyperFrames + GSAP.{" "}
          <Link to="/content-center" style={{ color: "var(--ll-accent)" }}>
            Volver a la presentación
          </Link>
          .
        </p>
      </header>

      <div className="cc-shell">
        <motion.section
          className="cc-demo-block"
          initial={reveal.initial}
          whileInView={reveal.whileInView}
          viewport={reveal.viewport}
          transition={reveal.transition}
        >
          <div className="cc-demo-meta">
            <div>
              <h2>
                Versión <em>Kinética</em>
              </h2>
              <p>
                Energía alta: escenas que se empujan (sin pisarse), tipografía grande, count-ups,
                gráficos que se dibujan y SFX en cada transición.
              </p>
            </div>
            <div className="cc-demo-stack">
              {STACK.map((s) => (
                <span className="cc-demo-tag" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="cc-demo-player">
            <video
              src="/demo/cc-kinetic.mp4"
              poster="/demo/cc-kinetic.png"
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>

          <p className="cc-demo-note">
            🔊 Tiene <strong>voz en off</strong> (argentina, vía ElevenLabs), música y efectos de
            sonido — activá el sonido del reproductor para escucharla. El video arranca silenciado
            para poder autoreproducirse.
          </p>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
}
