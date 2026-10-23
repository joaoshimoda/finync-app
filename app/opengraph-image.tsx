import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* Link preview card (WhatsApp, iMessage, redes sociais) with the brand tile. */
export const alt = "Finync — controle financeiro pessoal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const mark = await readFile(join(process.cwd(), "public/finync-mark.svg"), "utf8");
  const lightMark = mark.replaceAll("#2c603c", "#f4f7f2");
  const markSrc = `data:image/svg+xml;base64,${Buffer.from(lightMark).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: "linear-gradient(135deg, #3a8a55 0%, #1b4428 100%)",
          color: "#f4f7f2",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markSrc} width={440} height={240} alt="" />
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
          Finync
        </div>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>
          Cartões, faturas e despesas em um só lugar.
        </div>
      </div>
    ),
    size,
  );
}
