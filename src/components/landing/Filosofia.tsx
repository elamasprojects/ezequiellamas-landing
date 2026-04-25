const PRINCIPLES = [
  {
    num: "01",
    title: "Crear > Consumir",
    body: "Lo que más energía me da es construir algo de cero. Un producto, un negocio, un sistema, una landing. El acto de crear es lo que me mueve — no el resultado.",
  },
  {
    num: "02",
    title: "Pensar como ingeniero",
    body: "Todo es input → proceso → output. Uso First Principles para descomponer problemas complejos, eliminar ruido y encontrar la solución más simple y escalable.",
  },
  {
    num: "03",
    title: "IA con criterio, no por moda",
    body: "La inteligencia artificial se usa cuando resuelve un problema real, no porque está de moda. Hay que saber sus alcances y limitaciones antes de implementarla.",
  },
  {
    num: "04",
    title: "Aportar antes de vender",
    body: "La autoridad se construye dando valor primero, por mucho tiempo, sin pedir nada a cambio. Cuando finalmente vendés, la gente ya confía en vos.",
  },
  {
    num: "05",
    title: "Rodearte bien lo cambia todo",
    body: "Mis amigos emprendedores cambiaron mi vida. Hacemos lo mismo, buscamos lo mismo, nos empujamos. El entorno define la velocidad de tu crecimiento.",
  },
  {
    num: "06",
    title: "Simple y austero",
    body: "No me importa el Lamborghini. Me importa la libertad de tiempo, de ubicación, de elegir en qué trabajo y cuándo. La riqueza real es tener opciones.",
  },
];

export default function Filosofia() {
  return (
    <section id="filosofia">
      <div className="section-label fade-in">01 — Filosofía</div>
      <h2 className="fade-in">
        En qué <em>creo</em>
      </h2>
      <p className="section-intro fade-in">
        Principios que guían cada decisión que tomo, cada negocio que construyo y cada
        persona con la que trabajo.
      </p>

      <div className="philosophy-grid">
        {PRINCIPLES.map((p) => (
          <div className="phil-card fade-in" key={p.num}>
            <div className="phil-num">{p.num}</div>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
