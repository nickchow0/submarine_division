// ─── About Page ──────────────────────────────────────────────────────────────

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — Submarine Division',
  description: 'About Nick Chow and Submarine Division underwater photography.',
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">

      {/* Bio */}
      <section className="space-y-4">
        <h2 className="text-2xl text-slate-100 font-semibold">About Me</h2>
        <p className="text-slate-400 leading-relaxed">
          Hi, I'm Nick Chow — an underwater and nature photographer based in San Francisco, California.
          I've been diving and shooting since 2013, drawn to the vibranct creatures beneath the surface.
          My work focuses on capturing marine life and beauty of the ocean.
        </p>
        <p className="text-slate-400 leading-relaxed">
          [Add more about your background, what inspires you, or how you got into underwater photography.]
        </p>
      </section>

      {/* Gear */}
      <section className="space-y-4">
        <h2 className="text-2xl text-slate-100 font-semibold">Gear</h2>
        <ul className="text-slate-400 space-y-2">
          <li><span className="text-slate-300">Camera:</span> Sony A7RIII</li>
          <li><span className="text-slate-300">Housing:</span> Nauticam</li>
          <li><span className="text-slate-300">Lenses:</span> Nikonos RS 13, Sony 28-60mm + WWL-1, Sony 90mm macro, Nauticam SMC-1</li>
          <li><span className="text-slate-300">Lighting:</span> Retra Prime x2</li>
        </ul>
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="text-2xl text-slate-100 font-semibold">Get in Touch</h2>
        <p className="text-slate-400 leading-relaxed">
          For prints, licensing, or collaborations, feel free to reach out.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href="mailto:submarinedivision@email.com"
            className="px-4 py-2 rounded-lg bg-ocean-800 border border-ocean-700 text-sky-400 hover:border-sky-500 transition-colors"
          >
            Email
          </a>
          <a
            href="https://instagram.com/submarinedivision"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-ocean-800 border border-ocean-700 text-sky-400 hover:border-sky-500 transition-colors"
          >
            Instagram
          </a>
        </div>
      </section>

    </div>
  )
}
