export type FontOption = {
  name: string
  family: string
  googleFamily: string
  stack: string
  serif: boolean
}

export const FONTS: FontOption[] = [
  // ── Sans-serif ──────────────────────────────────────────────────────────────
  { name: 'Inter (current)', family: 'Inter', googleFamily: 'Inter:wght@300;400;500', stack: '"Inter", system-ui, sans-serif', serif: false },
  { name: 'Raleway', family: 'Raleway', googleFamily: 'Raleway:ital,wght@0,300;0,400;0,500;1,300', stack: '"Raleway", sans-serif', serif: false },
  { name: 'Josefin Sans', family: 'Josefin Sans', googleFamily: 'Josefin+Sans:ital,wght@0,300;0,400;1,300', stack: '"Josefin Sans", sans-serif', serif: false },
  { name: 'Jost', family: 'Jost', googleFamily: 'Jost:ital,wght@0,300;0,400;0,500;1,300', stack: '"Jost", sans-serif', serif: false },
  { name: 'Outfit', family: 'Outfit', googleFamily: 'Outfit:wght@300;400;500', stack: '"Outfit", sans-serif', serif: false },
  { name: 'Work Sans', family: 'Work Sans', googleFamily: 'Work+Sans:ital,wght@0,300;0,400;0,500;1,300', stack: '"Work Sans", sans-serif', serif: false },
  { name: 'Nunito', family: 'Nunito', googleFamily: 'Nunito:ital,wght@0,300;0,400;0,500;1,300', stack: '"Nunito", sans-serif', serif: false },
  // ── Serif ───────────────────────────────────────────────────────────────────
  { name: 'EB Garamond', family: 'EB Garamond', googleFamily: 'EB+Garamond:ital,wght@0,400;0,500;1,400', stack: '"EB Garamond", Garamond, serif', serif: true },
  { name: 'Cormorant Garamond', family: 'Cormorant Garamond', googleFamily: 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400', stack: '"Cormorant Garamond", serif', serif: true },
  { name: 'Playfair Display', family: 'Playfair Display', googleFamily: 'Playfair+Display:ital,wght@0,400;0,500;1,400', stack: '"Playfair Display", serif', serif: true },
  { name: 'Lora', family: 'Lora', googleFamily: 'Lora:ital,wght@0,400;0,500;1,400', stack: '"Lora", serif', serif: true },
  { name: 'Libre Baskerville', family: 'Libre Baskerville', googleFamily: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', stack: '"Libre Baskerville", serif', serif: true },
  { name: 'Source Serif 4', family: 'Source Serif 4', googleFamily: 'Source+Serif+4:ital,wght@0,300;0,400;0,600;1,400', stack: '"Source Serif 4", serif', serif: true },
  { name: 'DM Serif Display', family: 'DM Serif Display', googleFamily: 'DM+Serif+Display:ital@0;1', stack: '"DM Serif Display", serif', serif: true },
  { name: 'Spectral', family: 'Spectral', googleFamily: 'Spectral:ital,wght@0,300;0,400;0,600;1,400', stack: '"Spectral", serif', serif: true },
  { name: 'Crimson Text', family: 'Crimson Text', googleFamily: 'Crimson+Text:ital,wght@0,400;0,600;1,400', stack: '"Crimson Text", serif', serif: true },
  { name: 'Merriweather', family: 'Merriweather', googleFamily: 'Merriweather:ital,wght@0,300;0,400;1,300', stack: '"Merriweather", serif', serif: true },
  { name: 'Vollkorn', family: 'Vollkorn', googleFamily: 'Vollkorn:ital,wght@0,400;0,500;1,400', stack: '"Vollkorn", serif', serif: true },
  { name: 'Cardo', family: 'Cardo', googleFamily: 'Cardo:ital,wght@0,400;0,700;1,400', stack: '"Cardo", serif', serif: true },
  { name: 'Cinzel', family: 'Cinzel', googleFamily: 'Cinzel:wght@400;500;600', stack: '"Cinzel", serif', serif: true },
  { name: 'Gilda Display', family: 'Gilda Display', googleFamily: 'Gilda+Display', stack: '"Gilda Display", serif', serif: true },
  { name: 'Frank Ruhl Libre', family: 'Frank Ruhl Libre', googleFamily: 'Frank+Ruhl+Libre:wght@300;400;500', stack: '"Frank Ruhl Libre", serif', serif: true },
  { name: 'Bitter', family: 'Bitter', googleFamily: 'Bitter:ital,wght@0,300;0,400;0,500;1,400', stack: '"Bitter", serif', serif: true },
  { name: 'PT Serif', family: 'PT Serif', googleFamily: 'PT+Serif:ital,wght@0,400;0,700;1,400', stack: '"PT Serif", serif', serif: true },
  { name: 'Josefin Slab', family: 'Josefin Slab', googleFamily: 'Josefin+Slab:ital,wght@0,300;0,400;1,300', stack: '"Josefin Slab", serif', serif: true },
  { name: 'Zilla Slab', family: 'Zilla Slab', googleFamily: 'Zilla+Slab:ital,wght@0,300;0,400;0,500;1,400', stack: '"Zilla Slab", serif', serif: true },
]
