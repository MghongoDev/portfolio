import type { Metadata } from "next";
import Reveal from "@/components/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach David Mwandairo by email, LinkedIn, or GitHub. No forms, and email is fastest.",
};

const channels = [
  {
    label: "Email",
    value: site.links.email,
    href: `mailto:${site.links.email}`,
    hint: "Fastest: I reply within a day",
    external: false,
  },
  {
    label: "LinkedIn",
    value: "in/david-mwandairo",
    href: site.links.linkedin,
    hint: "For recruiter conversations",
    external: true,
  },
  {
    label: "GitHub",
    value: site.links.githubUser,
    href: site.links.github,
    hint: "Where the work lives",
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24 lg:py-32">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Contact</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-paper sm:text-5xl">
          Let&apos;s talk<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          No forms, no gatekeeping. Pick a channel. Email reaches me fastest.
        </p>
      </Reveal>

      <div className="mt-14 border-t border-line">
        {channels.map((channel, i) => (
          <Reveal key={channel.label} delay={i * 70}>
            <a
              href={channel.href}
              {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group press flex items-center justify-between gap-6 border-b border-line px-2 py-9 transition-colors [transition-timing-function:var(--ease-snap)] hover:bg-ink-2/70 sm:px-4"
            >
              <span>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-faint">{channel.label}</span>
                <span className="tcolor mt-1.5 block font-display text-xl font-semibold text-paper group-hover:text-accent sm:text-2xl">
                  {channel.value}
                </span>
                <span className="mt-1 block text-sm text-muted">{channel.hint}</span>
              </span>
              <span
                className="tcolor font-mono text-xl text-accent transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:translate-x-1"
                aria-hidden="true"
              >
                {channel.external ? "↗" : "→"}
              </span>
            </a>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
