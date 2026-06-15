import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "@/styles/content-center.css";
import Nav from "@/components/content-center/Nav";
import WaitlistForm from "@/components/content-center/WaitlistForm";
import Footer from "@/components/content-center/Footer";
import { reveal } from "@/components/content-center/motion";
import { FEATURE_CATALOG } from "@/components/content-center/featuresData";

export default function ContentCenterFeatures() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Content Center · Features — Ezequiel Lamas";
    window.scrollTo(0, 0);
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="cc-page">
      <Nav />

      <header className="cc-features-head">
        <div className="cc-eyebrow">Content Center · Catálogo completo</div>
        <h1>
          Todas las <em>features</em>
        </h1>
        <p className="cc-lead">
          El detalle completo de lo que ya se puede hacer dentro de Content Center, agrupado por área.
          ¿Preferís el panorama? Volvé a{" "}
          <Link to="/content-center" style={{ color: "var(--ll-accent)" }}>
            la presentación
          </Link>
          .
        </p>
      </header>

      <div className="cc-shell">
        {FEATURE_CATALOG.map((cat) => (
          <motion.section
            className="cc-cat"
            key={cat.num}
            initial={reveal.initial}
            whileInView={reveal.whileInView}
            viewport={reveal.viewport}
            transition={reveal.transition}
          >
            <div className="cc-cat-head">
              <span className="cc-cat-num">{cat.num}</span>
              <h2>{cat.title}</h2>
            </div>
            <div className="cc-feat-grid">
              {cat.features.map((f) => (
                <div className="cc-feat" key={f.name}>
                  <div className="cc-feat-top">
                    <h3>{f.name}</h3>
                    {f.ai && <span className="cc-badge ai">IA</span>}
                    <span className="cc-badge role">{f.role}</span>
                  </div>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <WaitlistForm />
      <Footer />
    </div>
  );
}
