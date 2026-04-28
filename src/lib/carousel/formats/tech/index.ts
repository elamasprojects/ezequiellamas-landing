import type { FormatModule } from "../types";
import { tokens } from "./tokens";
import { css } from "./css";
import { ornaments } from "./ornaments";

const fmt: FormatModule = {
  slug: "tech",
  name: "Tech",
  tagline: "Mono cargado, vibe Berghain/Vetements",
  description:
    "Para contenido técnico denso. Mono dominante, hard edges, strikethrough y lime/orange sobre dark warm.",
  tokens,
  css,
  ornaments,
  fontsUrl:
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@1,9..144,400..900&family=Playfair+Display:ital,wght@1,700&display=swap",
};

export default fmt;
