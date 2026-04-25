const CAREER = [
  {
    period: "Oct 2025 — Presente",
    company: "UGC Studio",
    role: "Co-Founder · Producto, IT & Automatizaciones",
    desc: "Agencia de UGC con inteligencia artificial para e-commerces, agencias y negocios digitales. Lidero el área de producto: toda la infraestructura tecnológica, bases de datos, automatizaciones y sistemas de fulfillment. Co-fundada con Geronimo Devincenzi. Equipo de ~15 personas. Crecimiento de $1K a $30K/mes en 3 meses.",
    tags: ["Producto", "n8n", "IA Generativa", "UGC", "Scaling"],
  },
  {
    period: "Abr 2025 — Presente",
    company: "AdvantX",
    role: "Founder & CEO",
    desc: "Agencia de inteligencia artificial y automatizaciones. Ayudo a infoproductores a automatizar procesos, reducir costos y potenciar su escalabilidad. Adquisición de clientes, conversión de ventas y mejora de servicio a través de IA y workflows automatizados. 8 clientes, proyecto de $6,000 cerrado.",
    tags: ["Automatizaciones", "IA", "Consultoría", "Decision-Making"],
  },
  {
    period: "Dic 2023 — Feb 2025",
    company: "GrowthX",
    role: "Sales Representative · Full-time",
    desc: "La primera institución educativa para startups en Latinoamérica. Vendí programas de Growth Marketing, Product Management y creación de startups. Trabajé con el equipo en Miami, FL. Identifiqué problemas de distribución en startups y diseñé campañas full-service para canales de crecimiento.",
    tags: ["Ventas", "Startups", "Growth", "Miami, FL", "Comunicación"],
  },
  {
    period: "Ene 2024 — Abr 2024",
    company: "XLaunch",
    role: "Co-Founder",
    desc: "Agencia de marketing digital dedicada a lanzamientos de productos para influencers y profesionales con audiencia. Creamos embudos de venta, sistemas de adquisición, organizamos eventos en vivo, gestionamos campañas de anuncios y planificamos todo el contenido durante el lanzamiento. Metodología basada en storytelling y calentamiento progresivo de leads.",
    tags: ["Marketing Digital", "Lanzamientos", "Funnels", "Content Strategy", "Ads"],
  },
];

export default function Recorrido() {
  return (
    <section id="recorrido">
      <div className="section-label fade-in">03 — Recorrido profesional</div>
      <h2 className="fade-in">
        Dónde <em>trabajé</em>
      </h2>

      <div className="career-timeline fade-in">
        {CAREER.map((item) => (
          <div className="career-item" key={item.company}>
            <div className="career-period">{item.period}</div>
            <div className="career-body">
              <div className="career-company">{item.company}</div>
              <div className="career-role">{item.role}</div>
              <div className="career-desc">{item.desc}</div>
              <div className="career-tags">
                {item.tags.map((tag) => (
                  <span className="career-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
