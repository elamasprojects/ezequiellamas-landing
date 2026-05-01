/**
 * Sample carousel for visual fidelity testing.
 * Used by:
 *   - scripts/render-carousel-test.ts (writes to tmp/carousel-test/index.html)
 *   - the editor preview when carousel id === "_sample" (dev convenience)
 *
 * Topic: "cómo armé el sistema de UGC scripts que escala a 100 clientes"
 * (matches the example in v2.2 §9 invocation).
 */

import type { Slide } from "./types";

export const SAMPLE_SLIDES: Slide[] = [
  // Slide 1 — T1 Cover
  {
    index: 0,
    template: "T1Cover",
    content: {
      mascotIcon: ">_",
      headlineLine1: "100 clientes en 3 meses.",
      headlineLine2Punch: "Sin pagar fees.",
      subtitle:
        "Te muestro **el sistema** que arme para escribir scripts UGC al toque, manteniendo voz y formato por cliente.",
      comparisonOld: "$30/mes por seat",
      comparisonNew: "$0 con tu propio stack",
      previewChips: ["AGENT 01", "DB", "TEMPLATES", "FEEDBACK"],
    },
  },
  // Slide 2 — T2 Single Feature
  {
    index: 1,
    template: "T2Feature",
    content: {
      partLabel: "PARTE 01",
      iconText: "?",
      title: "El bardo es claro",
      contextText:
        "La mayoria escribe **un script por vez**, mira el ultimo, lo edita en Google Docs, y reza para que el cliente no pida 5 cambios.",
      cardHeader: "> LO QUE NO ESCALA",
      cardTitle: "Escribir cada script *a mano*.",
      cardBullets: [
        { text: "Te volves loco con cada brief", type: "negative" },
        { text: "Los cambios del cliente te comen el dia", type: "negative" },
        { text: "No hay forma de mantener tono entre 10 scripts", type: "negative" },
        { text: "Cuando llegas a 100 clientes, **literalmente no podes**", type: "negative" },
      ],
    },
  },
  // Slide 3 — T3 4-Grid
  {
    index: 2,
    template: "T3Grid",
    content: {
      partLabel: "PARTE 02",
      headlineMain: "Lo que el 90% hace mal.",
      headlineAccent: "Lo que importa.",
      cards: [
        {
          badge: "// CODE",
          title: "Un agente, no chatbot",
          description: "El agente recibe brief, formato y avatar. Te devuelve script. **Cero ida-y-vuelta.**",
        },
        {
          badge: "DB",
          title: "Base de datos viva",
          description: "Todos los scripts pasados se indexan. Cada nuevo script tiene contexto historico.",
        },
        {
          badge: "TX",
          title: "Templates por formato",
          description: "Cada formato (UGC, talking head, demo) tiene su esqueleto. **No partis de cero.**",
        },
        {
          badge: ">_",
          title: "Feedback como input",
          description: "El cliente comenta, el agente aprende. La proxima ronda corre mas fina.",
        },
      ],
      callout: "**4 piezas. 100 clientes. 10 horas/semana.** Ese es el numero.",
    },
  },
  // Slide 4 — T4 VS Comparison
  {
    index: 3,
    template: "T4VS",
    content: {
      partLabel: "PARTE 03",
      headline: "Como lo hace una agencia normal **vs**. como lo hago yo.",
      leftLabel: "AGENCIA NORMAL",
      leftTitle: "Manual + 5 personas",
      leftBullets: [
        "1 strategist por cliente",
        "1 copywriter por script",
        "1 PM coordinando",
        "Google Docs + Slack + Notion",
        "$8k/mes en headcount",
      ],
      leftFooterLines: ["TOTAL: ~$8.000/mes"],
      rightLabel: "MI APROACH",
      rightTitlePrefix: "Sistema",
      rightTitlePunch: "construido.",
      rightBullets: [
        "1 agente con contexto historico",
        "Templates por formato (10 listos)",
        "DB de scripts pasados",
        "Yo edito al final, 5 min",
        "Sin headcount extra",
      ],
      rightFooterLines: ["TOTAL: ~$30/mes en API"],
    },
  },
  // Slide 5 — T2 Single Feature (the result)
  {
    index: 4,
    template: "T2Feature",
    content: {
      partLabel: "PARTE 04",
      iconText: "%",
      title: "Numeros concretos",
      contextText: "Despues de 3 meses corriendo el sistema:",
      cardHeader: "> EL RESULTADO",
      cardTitle: "100 clientes activos. *Sin pagar fees.*",
      cardBullets: [
        { text: "**$30k/mes** en revenue recurrente", type: "positive" },
        { text: "**10 hs/semana** de trabajo mio", type: "positive" },
        { text: "**$30/mes** en costos de API total", type: "positive" },
        { text: "**0** PMs, strategists, copywriters extra", type: "positive" },
      ],
    },
  },
  // Slide 6 — T5 CTA
  {
    index: 5,
    template: "T5CTA",
    content: {
      headline: 'COMENTA "SISTEMA" ABAJO Y TE LO MANDO POR DM',
      subtitle:
        "Te paso el flow exacto: el agente, los templates, la estructura de DB, y como armo el feedback loop. **Todo gratis.**",
      keyword: "SISTEMA",
      tags: ["AGENT", "DATABASE", "TEMPLATES", "FEEDBACK"],
      signatureText: "**@ezequiellamass** — sistemas UGC que escalan",
    },
  },
];
