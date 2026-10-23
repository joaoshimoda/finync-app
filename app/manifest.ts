import type { MetadataRoute } from "next";

/* Installable app: name, colours and icons used on the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finync",
    short_name: "Finync",
    description: "Controle financeiro pessoal com cartões, faturas e despesas em um só lugar.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
