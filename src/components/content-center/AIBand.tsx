import { motion } from "framer-motion";
import { reveal, staggerParent, staggerChild } from "./motion";
import { AI_CAPABILITIES } from "./featuresData";

export default function AIBand() {
  return (
    <section className="cc-aiband">
      <div className="cc-shell">
        <motion.div
          className="cc-section-head"
          initial={reveal.initial}
          whileInView={reveal.whileInView}
          viewport={reveal.viewport}
          transition={reveal.transition}
        >
          <div className="cc-eyebrow">Potenciado por IA</div>
          <h2 className="cc-h2">
            La IA no es un botón. Es el <em>motor</em>.
          </h2>
          <p className="cc-lead">
            Cada etapa tiene IA adentro — desde la primera idea hasta la respuesta al último
            comentario. Y vos mantenés el control: los prompts son tuyos y editables.
          </p>
        </motion.div>

        <motion.div
          className="cc-ai-grid"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
        >
          {AI_CAPABILITIES.map((cap) => (
            <motion.div className="cc-ai-card" key={cap.title} variants={staggerChild}>
              <div className="cc-ai-tag">{cap.tag}</div>
              <h4>{cap.title}</h4>
              <p>{cap.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
