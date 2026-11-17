"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SHOWCASE, filmsPage } from "@/components/studio/showcase";

/** Films from the homepage library, as a shelf of posters that lift toward you. */
export function LibraryShelf() {
  return (
    <section aria-labelledby="shelf-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            <span aria-hidden="true">▶ </span>Now showing
          </p>
          <h2 id="shelf-title" className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
            Made with Creator Agent
          </h2>
        </div>
        <a
          href={filmsPage()}
          target="_blank"
          rel="noopener"
          className="group inline-flex shrink-0 items-center gap-1 text-sm text-muted transition-colors duration-150 hover:text-ink"
        >
          Film library
          <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </a>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
        {SHOWCASE.map((f, i) => (
          <motion.li
            key={f.id}
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: [0.2, 0, 0, 1] }}
          >
            <motion.a
              href={filmsPage(f.id)}
              target="_blank"
              rel="noopener"
              className="group block"
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            >
              <span className="relative block overflow-hidden rounded-2xl shadow-[0_0_0_1px_var(--color-line),0_24px_50px_-28px_rgba(0,0,0,0.9)] transition-shadow duration-300 group-hover:shadow-[0_0_0_1px_rgba(242,181,68,0.35),0_30px_60px_-24px_rgba(242,181,68,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized webp */}
                <img
                  src={f.poster}
                  alt={`Poster for ${f.title}`}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[9/16] w-full object-cover outline outline-1 -outline-offset-1 outline-white/10 transition-[scale] duration-500 ease-out group-hover:scale-[1.03]"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </span>
              <span className="mt-3 block truncate text-sm font-medium text-ink">{f.title}</span>
              <span className="block text-xs text-muted">
                {f.genre} · {f.lang === "ta" ? <span className="font-tamil">தமிழ்</span> : "English"}
              </span>
            </motion.a>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
