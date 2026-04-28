import type { FormatModule } from "../types";
import { tokens } from "./tokens";
import { css } from "./css";
import { ornaments } from "./ornaments";

const fmt: FormatModule = {
  slug: "diario",
  name: "Diario",
  tagline: "Editorial impreso para autoridad",
  description:
    "Para cuando el contenido pesa más que el algoritmo. Bodoni / Caslon, papel cream, drop caps y rojo periodístico.",
  tokens,
  css,
  ornaments,
  fontsUrl:
    "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Libre+Caslon+Display&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
};

export default fmt;
