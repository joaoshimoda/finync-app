import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { FinyncLogo } from "@/components/branding/FinyncLogo";
import { archivo } from "@/components/landing/fonts";
import { cn } from "@/lib/utils";

export const LEGAL_UPDATED_AT = "24 de outubro de 2026";

// Set NEXT_PUBLIC_CONTACT_EMAIL to publish a contact address on the legal pages.
export const legalContactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

export function LegalContact() {
  return legalContactEmail ? (
    <a href={`mailto:${legalContactEmail}`}>{legalContactEmail}</a>
  ) : (
    <>o canal de contato indicado no site</>
  );
}

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/* Shared frame of /termos and /privacidade: landing typography, a sticky
   table of contents on wide screens and readable prose. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
  otherDocument,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  otherDocument: { href: string; label: string };
}) {
  return (
    <div
      className={cn(
        archivo.variable,
        "landing min-h-svh bg-background font-landing text-foreground selection:bg-primary selection:text-primary-foreground",
      )}
    >
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link
          href="/"
          aria-label="Finync, página inicial"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FinyncLogo eager className="w-[88px]" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar ao site
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <div className="border-b border-border pb-10 pt-6 sm:pt-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] font-semibold tracking-[-0.035em] [font-stretch:88%]">
            {title}
          </h1>
          <div className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-muted-foreground">
            {intro}
          </div>
          <p className="mt-5 text-[13px] text-muted-foreground">
            Última atualização: {LEGAL_UPDATED_AT}
          </p>
        </div>

        <div className="grid gap-10 pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Nesta página" className="max-lg:hidden">
            <ol className="sticky top-8 space-y-2 text-[14px]">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="tabular-nums opacity-60">{index + 1}.</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="max-w-2xl space-y-10 text-[15px] leading-[1.75] text-foreground/85 [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_li]:pl-1 [&_p+p]:mt-3 [&_ul+p]:mt-3[&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="mb-3 text-[20px] leading-tight font-semibold tracking-[-0.02em] text-foreground">
                  <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
                  {section.title}
                </h2>
                {section.body}
              </section>
            ))}

            <p className="border-t border-border pt-8 text-[14px] text-muted-foreground">
              Veja também: <Link href={otherDocument.href}>{otherDocument.label}</Link>
            </p>
          </article>
        </div>
      </main>
    </div>
  );
}
