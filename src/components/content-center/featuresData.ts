import type { BrandKey } from "./IntegrationLogos";

/* ================================================================
   Content for the Content Center product landing. Sourced from the
   real /app feature inventory. Keep copy value-oriented and honest:
   the product exists and is in daily use.
================================================================ */

export interface MockRow {
  label: string;
  pill?: string;
  tone?: "accent" | "warm" | "blue";
}

export interface FeatureMock {
  caption: string;
  rows: MockRow[];
  meter?: number; // 0–100, optional progress bar
}

export interface ShowcaseFeature {
  id: string;
  index: string;
  title: string;
  /** Word wrapped in <em> (warm accent). */
  em: string;
  titleTail?: string;
  body: string;
  points: string[];
  brands: BrandKey[];
  mock: FeatureMock;
}

export const SHOWCASE_FEATURES: ShowcaseFeature[] = [
  {
    id: "guiones",
    index: "01 — Ideación",
    title: "De una idea suelta a un ",
    em: "guion listo",
    titleTail: " en 30 segundos",
    body: "Grabás un audio de memoria, pegás el link de un reel o escribís la idea en una línea. La IA devuelve el guion completo en tu tono: hook, desarrollo y CTA, con B-rolls, caption, hashtags y por qué funciona.",
    points: [
      "Audio, texto o link de referencia — combinables",
      "Estructura editorial: hook (0-5s), desarrollo, CTA",
      "Adaptá cualquier viral a tu voz con un click",
    ],
    brands: ["claude", "whisper"],
    mock: {
      caption: "Guion · borrador IA",
      rows: [
        { label: "Hook", pill: "0-5s", tone: "accent" },
        { label: "Desarrollo", pill: "120 palabras" },
        { label: "CTA", pill: "comentá 'IA'", tone: "warm" },
      ],
    },
  },
  {
    id: "referentes",
    index: "02 — Inteligencia",
    title: "Mirá exactamente ",
    em: "qué les funciona",
    titleTail: " a tus referentes",
    body: "Cargás a cualquier creator y con un click traés todos sus virales de Instagram, TikTok y YouTube, ordenados por views. La IA extrae el hook, el concepto y la estructura — y arma un informe estratégico por período.",
    points: [
      "Scraping multiplataforma ordenado por performance",
      "Concepto, hook y estructura extraídos por IA",
      "Informe estratégico de patrones, listo en minutos",
    ],
    brands: ["apify", "claude", "instagram", "tiktok", "youtube"],
    mock: {
      caption: "Banco de virales",
      rows: [
        { label: "Reel · cómo cobrar más", pill: "2.4M", tone: "accent" },
        { label: "Short · 3 errores", pill: "880K" },
        { label: "TT · setup tour", pill: "1.1M", tone: "warm" },
      ],
    },
  },
  {
    id: "produccion",
    index: "03 — Producción",
    title: "Carruseles, B-rolls y video ",
    em: "sin diseñador",
    titleTail: " externo",
    body: "Generás carruseles de marca slide a slide, B-rolls a partir del texto del guion, y videos largos de YouTube con avatar y voz sintética. Toda tu biblioteca de producción — portadas, recursos, motion — en un solo lugar.",
    points: [
      "Carruseles AI con plantillas de marca, slide a slide",
      "B-rolls generados desde el guion (imagen → video)",
      "YouTube con avatar de video y voz clonada",
    ],
    brands: ["gemini", "kling", "heygen", "elevenlabs"],
    mock: {
      caption: "Carrusel · 6 slides",
      rows: [
        { label: "01 · Cover", pill: "T1", tone: "accent" },
        { label: "03 · Feature", pill: "T2" },
        { label: "06 · CTA", pill: "T5", tone: "warm" },
      ],
    },
  },
  {
    id: "publicacion",
    index: "04 — Distribución",
    title: "Publicá en las tres plataformas ",
    em: "a la vez",
    body: "Un solo flujo programa el mismo contenido en Instagram, YouTube y TikTok, con captions adaptados por plataforma generados por IA. Subida en lote, propuestas de reels y los horarios óptimos según tus propios datos.",
    points: [
      "IG · YouTube · TikTok desde un solo formulario",
      "Captions diferenciados por plataforma con IA",
      "Horarios óptimos según tu engagement histórico",
    ],
    brands: ["zernio", "bunny", "instagram", "youtube", "tiktok"],
    mock: {
      caption: "Programado · jue 18:00",
      rows: [
        { label: "Instagram Reel", pill: "listo", tone: "accent" },
        { label: "YouTube Short", pill: "listo", tone: "accent" },
        { label: "TikTok", pill: "en cola", tone: "blue" },
      ],
    },
  },
  {
    id: "metricas",
    index: "05 — Inteligencia de datos",
    title: "Sabé si va a ser viral ",
    em: "antes de publicar",
    body: "Un dashboard unificado de seguidores y engagement de todas tus plataformas. Y por cada post, una predicción de viralidad que estima el tier esperado con los drivers y los riesgos identificados — para que ajustes antes de subir.",
    points: [
      "Seguidores y engagement de IG/YT/TT en una vista",
      "Tier de cada video: normal · 3× · 5× · outlier",
      "Predicción por post con drivers, riesgos y rango",
    ],
    brands: ["zernio"],
    mock: {
      caption: "Predicción de viralidad",
      rows: [
        { label: "Tier estimado", pill: "5×", tone: "accent" },
        { label: "Driver", pill: "hook fuerte", tone: "warm" },
        { label: "Riesgo", pill: "CTA largo", tone: "blue" },
      ],
      meter: 78,
    },
  },
  {
    id: "engagement",
    index: "06 — Engagement",
    title: "Respondé comentarios y DMs ",
    em: "con tu aprobación",
    body: "La IA prepara los borradores de respuesta a comentarios y mensajes en tu tono; vos editás y aprobás. Y convertís comentarios en leads: quien comenta una keyword recibe un DM automático con tu link.",
    points: [
      "Borradores de respuestas — nada se manda sin tu OK",
      "Comentario → DM automático como lead magnet",
      "Filtros por estado: pendientes, enviadas, rechazadas",
    ],
    brands: ["claude", "instagram"],
    mock: {
      caption: "Comentario · pendiente",
      rows: [
        { label: '"¿Cómo lo hiciste?"', pill: "nuevo", tone: "blue" },
        { label: "Borrador IA", pill: "editar", tone: "accent" },
        { label: "Enviar DM + link", pill: "aprobar", tone: "warm" },
      ],
    },
  },
  {
    id: "equipo",
    index: "07 — Equipo",
    title: "Tu editor y tu asesor, ",
    em: "adentro",
    body: "Asignás videos a tu editor en un board kanban con pagos en USD y ganancias transparentes. Tu asesor aprueba guiones antes de grabar y deja feedback sobre lo publicado. Las notificaciones por email salen solas.",
    points: [
      "Kanban de asignaciones con estado y pagos",
      "El asesor aprueba guiones y comenta videos",
      "Emails automáticos a cada miembro del equipo",
    ],
    brands: ["resend"],
    mock: {
      caption: "Board de producción",
      rows: [
        { label: "En progreso", pill: "3", tone: "blue" },
        { label: "Enviada", pill: "2", tone: "warm" },
        { label: "Aprobada · pagada", pill: "8", tone: "accent" },
      ],
    },
  },
];

export interface AICapability {
  tag: string;
  title: string;
  body: string;
}

export const AI_CAPABILITIES: AICapability[] = [
  { tag: "Claude", title: "Generación de guiones", body: "Hook, desarrollo y CTA en tu tono, con tu perfil de marca como contexto." },
  { tag: "Whisper", title: "Transcripción", body: "Audio de memoria o video de referencia convertido a texto al instante." },
  { tag: "Claude", title: "Análisis de referentes", body: "Concepto, hook y estructura de cada viral, más informes estratégicos." },
  { tag: "Modelo propio", title: "Predicción de viralidad", body: "Tier esperado por post cruzando tu historial y el de tus referentes." },
  { tag: "Claude + Whisper", title: "Captions por plataforma", body: "Copy adaptado a IG, YouTube y TikTok desde la transcripción del video." },
  { tag: "Gemini · Kling", title: "B-rolls generados", body: "Imágenes y clips de relleno creados a partir del texto del guion." },
  { tag: "Claude", title: "Carruseles AI", body: "Carruseles de marca completos, slide a slide, listos para exportar." },
  { tag: "Claude", title: "Respuestas asistidas", body: "Borradores de comentarios y DMs en tu voz, siempre con tu aprobación." },
  { tag: "Tu control", title: "Prompts personalizables", body: "Reescribís el prompt de cada tarea de IA o restaurás el default." },
];

/* ── Exhaustive catalog (features detail page) ── */

export interface CatalogFeature {
  name: string;
  desc: string;
  role: string;
  ai?: boolean;
}

export interface CatalogCategory {
  num: string;
  title: string;
  features: CatalogFeature[];
}

export const FEATURE_CATALOG: CatalogCategory[] = [
  {
    num: "01",
    title: "Ideación y guiones con IA",
    features: [
      { name: "Inbox de guiones", desc: "Pipeline de todos tus guiones por estado: borrador, agendado, grabado, posteado, archivado.", role: "Admin" },
      { name: "Nueva idea", desc: "Audio, texto libre o link de referencia → guion completo en tu tono.", role: "Admin", ai: true },
      { name: "Editor de guion", desc: "Hook, desarrollo, CTA y storytelling en secciones, con B-rolls, animations y producción.", role: "Admin", ai: true },
      { name: "Modo ingredientes", desc: "Fusioná varios virales del banco en un guion original con tu voz.", role: "Admin", ai: true },
      { name: "Regeneración y hooks alternativos", desc: "Reescribí el guion o generá hooks alternativos manteniendo el formato.", role: "Admin", ai: true },
    ],
  },
  {
    num: "02",
    title: "Referentes e inteligencia competitiva",
    features: [
      { name: "Banco de referentes", desc: "Tus creators de inspiración con handles, notas y acceso por plataforma.", role: "Admin · Editor · Asesor" },
      { name: "Grilla de virales", desc: "Scraping on-demand de IG/TikTok/YouTube ordenado por views, con filtros de fecha.", role: "Admin", ai: true },
      { name: "Análisis de video", desc: "Transcript + concepto (hook, formato, ángulo, CTA) de cada viral.", role: "Admin", ai: true },
      { name: "Informe estratégico", desc: "Síntesis de patrones de un referente por período, en markdown.", role: "Admin · Editor · Asesor", ai: true },
      { name: "Adaptar a mi voz", desc: "De 'me gustó este video' a un guion con tu tono en un click.", role: "Admin", ai: true },
    ],
  },
  {
    num: "03",
    title: "Sistema editorial: formatos, shapes y series",
    features: [
      { name: "Formatos", desc: "El menú de tipos de video que hacés; alimentan la generación de guiones.", role: "Admin · Asesor", ai: true },
      { name: "Shapes", desc: "Estructuras narrativas (antes/después, PAS…) combinables con cualquier formato.", role: "Admin" },
      { name: "Series", desc: "Contenido episódico agrupado con número de parte.", role: "Admin" },
    ],
  },
  {
    num: "04",
    title: "Producción multimedia",
    features: [
      { name: "Biblioteca de videos", desc: "Todo lo publicado, sincronizado, filtrable por plataforma, formato y tier.", role: "Admin", ai: true },
      { name: "Detalle de video", desc: "Embed, métricas por plataforma, guion, B-rolls, feedback y transcripción.", role: "Admin", ai: true },
      { name: "YouTube studio", desc: "Proyectos de video largo con estructura IA, thumbnails y avatar de video.", role: "Admin", ai: true },
      { name: "Carruseles", desc: "Creación y edición slide a slide con plantillas de marca y export a imágenes.", role: "Admin", ai: true },
      { name: "Hub de recursos", desc: "Lead magnets, portadas, B-rolls, motion graphics y animations en un lugar.", role: "Admin", ai: true },
    ],
  },
  {
    num: "05",
    title: "Publicación multiplataforma",
    features: [
      { name: "Cola de publicación", desc: "Outbox de programados, en publicación y fallidos, con filtros.", role: "Admin" },
      { name: "Nuevo post programado", desc: "Video o carrusel a IG/YT/TT con captions por plataforma y portada.", role: "Admin", ai: true },
      { name: "Subida en lote", desc: "Varios videos a la vez asignados a los próximos slots óptimos.", role: "Admin" },
      { name: "Propuestas de reels", desc: "Clips candidatos a reel detectados automáticamente, para aprobar o programar.", role: "Admin", ai: true },
      { name: "Calendario", desc: "Vista mensual/semanal de todo lo programado.", role: "Admin" },
      { name: "Conexiones", desc: "Conectá y desconectá IG, YouTube y TikTok; gestión de push.", role: "Admin" },
      { name: "Horarios óptimos", desc: "Slots recurrentes sincronizados con tus mejores horarios por engagement.", role: "Admin", ai: true },
    ],
  },
  {
    num: "06",
    title: "Métricas, analytics y predicción",
    features: [
      { name: "Dashboard", desc: "Seguidores, metas con auto-bump, engagement 7/30/90d y crecimiento multiplataforma.", role: "Admin", ai: true },
      { name: "Predicción de viralidad", desc: "Tier esperado por post con drivers, riesgos y rango, evaluado tras publicar.", role: "Admin", ai: true },
      { name: "Racha de publicación", desc: "Streak diario y semanal con badges para sostener la consistencia.", role: "Admin" },
    ],
  },
  {
    num: "07",
    title: "Engagement e interacciones",
    features: [
      { name: "Auto-respuesta con aprobación", desc: "Borradores de comentarios y DMs por IA; nada se envía sin tu OK.", role: "Admin", ai: true },
      { name: "Lead magnet comment → DM", desc: "Keyword en un comentario dispara un DM automático con tu link.", role: "Admin" },
    ],
  },
  {
    num: "08",
    title: "Workflow de equipo",
    features: [
      { name: "Board de asignaciones", desc: "Kanban de producción: abierta, en progreso, enviada, correcciones, aprobada, pagada.", role: "Admin" },
      { name: "Detalle y pagos", desc: "Estilo de edición, submissions, correcciones y marcado de pago en USD.", role: "Admin" },
      { name: "Vista del editor", desc: "Guion, B-rolls y especificaciones; subida del entregable con notas.", role: "Editor" },
      { name: "Ganancias", desc: "Pendiente vs. cobrado en USD, transparente para el editor.", role: "Editor" },
      { name: "Aprobación de guiones", desc: "El asesor aprueba o rechaza guiones con notas antes de grabar.", role: "Asesor" },
      { name: "Feedback de videos", desc: "Comentarios estructurados del asesor sobre lo publicado.", role: "Asesor" },
      { name: "Gestión de equipo", desc: "Invitá miembros, asigná roles y activá el pairing con asesores.", role: "Admin" },
    ],
  },
  {
    num: "09",
    title: "Configuración e IA personalizada",
    features: [
      { name: "Perfil de marca", desc: "El ADN del creator que la IA usa como contexto en cada generación.", role: "Admin", ai: true },
      { name: "Cuestionario de identidad", desc: "Historia, valores y estilo comunicacional para afinar el tono.", role: "Admin" },
      { name: "Prompts de IA", desc: "Reescribí el system prompt de cada tarea o restaurá el default.", role: "Admin", ai: true },
      { name: "Objetivos", desc: "Metas de seguidores por plataforma con auto-bump al alcanzarlas.", role: "Admin" },
    ],
  },
];
