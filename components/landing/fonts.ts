import { Archivo } from "next/font/google";

// One family for the whole landing page; the width axis gives amounts a
// condensed, statement-like voice without introducing a second typeface.
export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});
