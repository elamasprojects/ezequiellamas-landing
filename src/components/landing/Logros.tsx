const STATS = [
  { number: "$300K+", label: "Vendido total en mi carrera" },
  { number: "+500", label: "Clientes en UGC Studio" },
  { number: "$30K", label: "Facturación UGC Studio Febrero 2026" },
  { number: "3", label: "Emprendimientos creados" },
  { number: "100+", label: "Workflows en n8n" },
  { number: "3", label: "Apps desarrolladas" },
  { number: "4K", label: "Seguidores Twitter en 6 meses" },
  { number: "4M+", label: "Impresiones en Twitter Finanzas" },
];

const HIGHLIGHTS = [
  {
    icon: "🎤",
    title: "Oratoria reconocida",
    body: "Premios al mejor orador en múltiples eventos de emprendedurismo. Masterclasses, pitcheos en eventos, y capacitaciones a empresas a $500/hora.",
  },
  {
    icon: "🧠",
    title: "Ingeniería aplicada",
    body: "3 años de ingeniería en el ITBA convertidos en pensamiento lógico que hoy usa para construir infraestructura compleja de negocios — sin necesitar el título.",
  },
  {
    icon: "💰",
    title: "Finanzas & Inversiones",
    body: "+3 años en mercados financieros. Cuenta de Twitter de inversiones con 4K seguidores y 4M+ de views. Acciones argentinas, EEUU, China y Brasil.",
  },
  {
    icon: "🌎",
    title: "Bilingüe nativo",
    body: "Inglés nativo — consumo contenido sin distinguir el idioma. Trabajé con equipos en EEUU, España y Latinoamérica indistintamente.",
  },
];

export default function Logros() {
  return (
    <section id="logros" style={{ background: "var(--ll-surface)" }}>
      <div className="section-label fade-in">04 — Logros</div>
      <h2 className="fade-in">
        Los <em>números</em>
      </h2>

      <div className="achievements-grid fade-in">
        {STATS.map((s) => (
          <div className="ach-stat" key={s.label}>
            <div className="ach-number">{s.number}</div>
            <div className="ach-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="ach-cards fade-in">
        {HIGHLIGHTS.map((h) => (
          <div className="ach-card" key={h.title}>
            <h3>
              <span className="ach-icon">{h.icon}</span> {h.title}
            </h3>
            <p>{h.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
