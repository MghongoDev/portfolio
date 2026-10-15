"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";

const links = [
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
  { href: "/resume", label: "Résumé" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="rise sticky top-0 z-50 border-b border-line bg-ink/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="press font-mono text-base font-semibold tracking-tight text-paper"
          aria-label={`${site.name} — home`}
          onClick={() => setOpen(false)}
        >
          DM<span className="blink text-accent">_</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`link-slide text-sm tcolor ${
                pathname.startsWith(link.href) ? "text-paper" : "text-muted hover:text-paper"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/contact" className="btn btn-primary press !px-4 !py-2 text-xs">
            Let&apos;s talk
          </Link>
        </nav>

        <button
          type="button"
          className="press flex h-10 w-10 items-center justify-center rounded-lg border border-line text-paper md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            {open ? (
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="rise absolute inset-x-0 top-full border-b border-line bg-ink/95 backdrop-blur-md md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {[...links, { href: "/contact", label: "Contact" }].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-3 text-sm text-muted tcolor hover:bg-ink-3 hover:text-paper"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
