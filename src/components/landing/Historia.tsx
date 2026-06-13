const TIMELINE = [
  "Empecé el gimnasio a los 16 — me ordenó la vida",
  "+40 libros leídos en 3 años",
  "Diseño gráfico (UTN) + Programación web, apps y robots (Arduino)",
  "3 años de ingeniería en el ITBA",
  "Primera mentoría de ventas — $250 USD",
  "Vendedor para negocios de USA, España y Latam",
  "Asesor financiero — 3 años en bolsa",
  "XLaunch — primera agencia de marketing",
  "AdvantX — agencia de IA y automatizaciones",
  "UGC Studio — $1K → $8K → $18K → $30K/mes",
  "Me mudé solo a los 20",
  "Bilingüe inglés-español nativo",
];

export default function Historia() {
  return (
    <section id="historia" style={{ background: "var(--ll-surface)" }}>
      <div className="section-label fade-in">02 — Mi historia</div>
      <h2 className="fade-in">
        No sabía hacer nada, ahora tengo <em>+500 clientes</em>
      </h2>

      <div className="story-layout">
        <div className="story-text fade-in">
          <p>
            Todo empezó a los 16, cuando arranqué el gimnasio. Eso me obligó a dormir bien,
            comer bien, y de repente tenía la disciplina para leer.{" "}
            <strong>Empecé con cómics, terminé leyendo teoría de inversiones de los años 50.</strong>
          </p>
          <p>
            Me leí más de 40 libros. Pasé de juegos super dopamínicos a que mi único juego
            sea el ajedrez. Limité redes sociales. Empecé a construir buenos hábitos. El
            gimnasio me ordenó la vida.
          </p>
          <p>
            Después vino la formación técnica:{" "}
            <strong>
              diseño gráfico en la UTN, programación web, apps y robots (Arduino), tres años
              de ingeniería en el ITBA.
            </strong>{" "}
            La ingeniería me enseñó a pensar distinto — estructurar la lógica de una forma
            que hoy aplico a todo lo que hago.
          </p>
          <p>
            A los 17 ya quería emprender. Probé de todo: hacía páginas web, identidades de
            marca, diseño. Hasta que pagué mi primera mentoría de ventas por $250 USD y todo
            cambió.{" "}
            <strong>
              Aprendí a vender, y cuando aprendés a vender, podés construir cualquier cosa.
            </strong>
          </p>
          <p>
            Pasé por agencias, equipos de ventas en EEUU, España y Latam. Gané mis primeros
            dólares y euros. Me mudé solo. Y seguí construyendo, emprendimiento tras
            emprendimiento, cada uno mejor que el anterior.
          </p>
          <p>
            Hoy tengo 3 emprendimientos en mi historial, casi 100 clientes en mi agencia
            actual, un equipo de 15 personas, y la convicción de que recién estoy empezando.
          </p>
        </div>

        <div className="story-highlight fade-in">
          <div className="sh-label">El camino en resumen</div>
          <ul className="sh-list">
            {TIMELINE.map((item, i) => (
              <li key={i}>
                <span className="sh-icon">→</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
