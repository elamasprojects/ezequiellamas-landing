import type { FormatModule } from "../types";
import { tokens } from "./tokens";
import { css } from "./css";
import { ornaments } from "./ornaments";

const fmt: FormatModule = {
  slug: "minimalista",
  name: "Minimalista",
  tagline: "Una sola idea por slide",
  description:
    "Glassmorphism, gradient orbs, vibe Linear / Apple / Vercel. Para contenido que no necesita explicar de más.",
  tokens,
  css,
  ornaments,
  fontsUrl:
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..900&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@1,700&display=swap",
};

export default fmt;
