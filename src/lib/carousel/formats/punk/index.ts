import type { FormatModule } from "../types";
import { tokens } from "./tokens";
import { css } from "./css";
import { ornaments } from "./ornaments";

const fmt: FormatModule = {
  slug: "punk",
  name: "Punk",
  tagline: "Frenar el scroll a la fuerza",
  description:
    "Neo-brutalismo Memphis 80s. Formas locas, sombras duras, colores que pegan. Para hooks virales y anuncios de producto.",
  tokens,
  css,
  ornaments,
  fontsUrl:
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..900&family=JetBrains+Mono:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,700&display=swap",
};

export default fmt;
