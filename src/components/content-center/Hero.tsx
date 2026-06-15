import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { staggerParent, staggerChild } from "./motion";

const STATS: { num: string; em?: string; label: string }[] = [
  { num: "1", label: "Centro de comando" },
  { num: "3", label: "Plataformas nativas" },
  { em: "15+", num: "", label: "Herramientas integradas" },
  { num: "9", label: "Áreas de trabajo" },
];

export default function Hero() {
  return (
    <header className="cc-hero" id="top">
      <div className="cc-hero-grid" aria-hidden="true" />
      <motion.div
        className="cc-hero-inner"
        variants={staggerParent}
        initial="hidden"
        animate="show"
      >
        <motion.span className="cc-hero-badge" variants={staggerChild}>
          <span className="cc-nav-dot" aria-hidden="true" />
          Producto en uso · lista de espera privada
        </motion.span>

        <motion.h1 variants={staggerChild}>
          Un solo lugar para <em>todo</em> tu contenido
        </motion.h1>

        <motion.p className="cc-hero-tagline" variants={staggerChild}>
          <strong>Content Center</strong> es el centro de comando que uso todos los días para correr
          mi marca: guiones, producción, publicación, métricas y predicción de viralidad. Potenciado
          con IA, de punta a punta.
        </motion.p>

        <motion.div className="cc-hero-cta" variants={staggerChild}>
          <a className="cc-btn cc-btn-primary" href="#waitlist">
            Sumarme a la lista →
          </a>
          <Link className="cc-btn cc-btn-ghost" to="/content-center/features">
            Ver todas las features
          </Link>
        </motion.div>

        <motion.div className="cc-hero-stats" variants={staggerChild}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="cc-stat-num">{s.em ? <em>{s.em}</em> : s.num}</div>
              <div className="cc-stat-label">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </header>
  );
}
