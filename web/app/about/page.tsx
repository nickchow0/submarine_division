// ─── About Page ──────────────────────────────────────────────────────────────

import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Submarine Division",
  description: "About Nick Chow and Submarine Division underwater photography.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      {/* Bio */}
      <section className="space-y-4">
        <h2 className="text-2xl text-slate-100 font-semibold">About Me</h2>
        <p className="text-slate-400 leading-relaxed">
          Hi, I’m Nick Chow — an underwater and nature photographer based in San
          Francisco. I’ve been diving since 2013, when I was first drawn by the
          unique creatures in the ocean.
        </p>
        <p className="text-slate-400 leading-relaxed">
          My work is driven by curiosity and a focus on conservation. I
          photograph a range of subjects, from macro and animal behavior to
          wrecks and coral reefs.
        </p>
        <p className="text-slate-400 leading-relaxed">
          Recently, I’ve been focusing on technical diving, including cold water
          and rebreather diving, which allows me to spend more time underwater
          and reach places that are less commonly explored.
        </p>
      </section>

      {/* Photos */}
      <div className="grid grid-cols-2 gap-3">
        <Image
          src="https://cdn.sanity.io/images/vtmlottj/production/b93880fd8b93c7cc96c7e0f0692e8362d5db2aae-6733x4491.jpg?w=800&q=85&fm=jpg&auto=format"
          alt="Nick Chow underwater"
          width={800}
          height={534}
          className="rounded-lg object-cover w-full aspect-[4/3]"
        />
        <Image
          src="https://cdn.sanity.io/images/vtmlottj/production/3d7c99ba9c64500303e5babbab0327766896c59d-2048x1366.jpg?w=800&q=85&fm=jpg&auto=format"
          alt="Nick Chow underwater"
          width={800}
          height={534}
          className="rounded-lg object-cover w-full aspect-[4/3]"
        />
      </div>

      {/* Gear */}
      <section className="space-y-4">
        <h2 className="text-2xl text-slate-100 font-semibold">Gear</h2>
        <ul className="text-slate-400 space-y-2">
          <li>
            <span className="text-slate-300">Camera:</span> Sony A7RIII
          </li>
          <li>
            <span className="text-slate-300">Housing:</span> Nauticam
          </li>
          <li>
            <span className="text-slate-300">Lenses:</span>
          </li>
          <li className="ml-4">Sony 90mm macro + Nauticam SMC-1</li>
          <li className="ml-4">Nikonos RS 13</li>
          <li className="ml-4">Sony 28-60mm + WWL-1</li>
          <li className="ml-4">Sony 16-35 f/4</li>
          <li>
            <span className="text-slate-300">Lighting:</span> Retra Prime x2,
            Retra LSD
          </li>
          <li>
            <span className="text-slate-300">Dive gear:</span> rEvo III
            Expedition hCCR
          </li>
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
            href="https://instagram.com/submarinedivision"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.057-1.645.069-4.849.069-3.204 0-3.584-.012-4.849-.069-3.259-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.322a1.44 1.44 0 110-2.881 1.44 1.44 0 010 2.881z" />
            </svg>
          </a>
          <a
            href="mailto:submarinediv@gmail.com"
            className="text-sky-400 hover:text-sky-300 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}
