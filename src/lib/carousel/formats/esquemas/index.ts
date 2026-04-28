import type { FormatModule } from "../types";
import { tokens } from "./tokens";
import { css } from "./css";
import { ornaments } from "./ornaments";

const fmt: FormatModule = {
  slug: "esquemas",
  name: "Esquemas",
  tagline: "Diagrama técnico para enseñar",
  description:
    "Blueprint architect con grid + flow de nodos. Para tutoriales y conceptos donde el diagrama dice más que las palabras.",
  tokens,
  css,
  ornaments,
  fontsUrl:
    "https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..900&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@1,700&display=swap",
};

export default fmt;
