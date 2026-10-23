import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* Absolute base for the Open Graph image URL. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finync.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Finync",
  description: "Controle financeiro pessoal com cartões, faturas e despesas em um só lugar.",
  applicationName: "Finync",
  appleWebApp: {
    capable: true,
    title: "Finync",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}
