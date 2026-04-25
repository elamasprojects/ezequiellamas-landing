const PILLARS = [
  {
    label: "Marca Personal",
    title: "YouTube & contenido educativo",
    body: "Cursos largos sobre emprendimiento e IA. Análisis de modelos de negocio. Importar los mejores conceptos del mundo anglosajón a Latam.",
  },
  {
    label: "Comunidad",
    title: "Comunidad de Emprendedores",
    body: "Todo lo que un emprendedor necesita para crecer estructurado y sin quemarse la cabeza.",
  },
  {
    label: "Eventos",
    title: "Presenciales con pizarrón",
    body: "Sesiones donde emprendedores presentan su negocio y me llevo 5 minutos para resolverles un cuello de botella.",
  },
  {
    label: "Consultoría",
    title: "High-ticket 1 a 1",
    body: "Consultoría a dueños de negocio: reestructurar ofertas, mejorar producto, optimizar adquisición, armar money models.",
  },
  {
    label: "Libertad",
    title: "Negocio que no dependa de mí",
    body: "Un equipo que ejecute. Ingresos pasivos. Viajar con tranquilidad. Tiempo con mis seres queridos. Seguir siendo humilde.",
  },
];

export default function Vision() {
  return (
    <section id="vision">
      <div className="section-label fade-in">05 — Visión a largo plazo</div>
      <h2 className="fade-in">
        Hacia dónde <em>voy</em>
      </h2>

      <div className="vision-block fade-in">
        <div className="vision-main">
          <h3>
            Ser el Hormozi de <em>Argentina</em>
          </h3>
          <p>
            Mi objetivo a largo plazo es convertirme en el referente de emprendimiento en
            Latinoamérica. No por el ego — sino porque sé que puedo ayudar a miles de
            emprendedores a construir mejores negocios.
          </p>
          <p>
            Quiero que alguien me cuente su negocio en un minuto y yo pueda decirle
            exactamente qué cambiar para facturar un 50% más el mes siguiente. Esa claridad
            solo viene de la experiencia, y la estoy construyendo todos los días.
          </p>
          <p>
            No me importa la plata en sí. Me importa el impacto. Me importa la libertad. Me
            importa poder ayudar a emprendedores porque son las personas con las que más
            sinergia tengo. Son mis amigos, mis pares, mi tribu.
          </p>
        </div>

        <div className="vision-pillars">
          {PILLARS.map((p) => (
            <div className="vision-pillar" key={p.label}>
              <div className="vp-label">{p.label}</div>
              <h4>{p.title}</h4>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="quote-block fade-in"
        style={{ marginTop: "3.5rem", borderLeftColor: "var(--ll-warm)" }}
      >
        <p>
          "No busco generar más dinero. Busco construir algo que genere impacto, me llene y
          me dé libertad. La plata va a llegar — porque encima que no la voy a buscar, va a
          llegar todavía más."
        </p>
      </div>
    </section>
  );
}
