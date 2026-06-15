import { useEffect } from "react";
import { motion } from "framer-motion";
import "@/styles/content-center.css";
import Nav from "@/components/content-center/Nav";
import Hero from "@/components/content-center/Hero";
import LogoMarquee from "@/components/content-center/LogoMarquee";
import FeatureSection from "@/components/content-center/FeatureSection";
import AIBand from "@/components/content-center/AIBand";
import WaitlistForm from "@/components/content-center/WaitlistForm";
import Footer from "@/components/content-center/Footer";
import { reveal } from "@/components/content-center/motion";
import { SHOWCASE_FEATURES } from "@/components/content-center/featuresData";

function ValueProp() {
  return (
    <section className="cc-section cc-valueprop">
      <div className="cc-shell">
        <motion.div
          className="cc-section-head"
          initial={reveal.initial}
          whileInView={reveal.whileInView}
          viewport={reveal.viewport}
          transition={reveal.transition}
        >
          <div className="cc-eyebrow">El problema</div>
          <h2 className="cc-h2">
            Dejá de saltar entre <em>diez apps</em>
          </h2>
          <p className="cc-lead">
            Notas para los guiones. Otra app para editar. Un Drive para los B-rolls. Tres
            plataformas para publicar. Una planilla para las métricas. Content Center reemplaza todo
            ese stack disperso por un único flujo: de la idea al posteo a la métrica, sin cambiar de
            pestaña.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default function ContentCenter() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Content Center — Ezequiel Lamas";
    window.scrollTo(0, 0);
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="cc-page">
      <Nav />
      <Hero />
      <LogoMarquee />
      <ValueProp />

      <section className="cc-section">
        <div className="cc-shell">
          <motion.div
            className="cc-section-head"
            initial={reveal.initial}
            whileInView={reveal.whileInView}
            viewport={reveal.viewport}
            transition={reveal.transition}
          >
            <div className="cc-eyebrow">Qué hace</div>
            <h2 className="cc-h2">
              Todo el ciclo de contenido, <em>en una sola herramienta</em>
            </h2>
            <p className="cc-lead">
              Siete sistemas que trabajan juntos. Cada uno te ahorra horas — y juntos te dan algo que
              ninguna app suelta puede: el panorama completo de tu marca.
            </p>
          </motion.div>

          {SHOWCASE_FEATURES.map((feature, i) => (
            <FeatureSection key={feature.id} feature={feature} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>

      <AIBand />
      <WaitlistForm />
      <Footer />
    </div>
  );
}
