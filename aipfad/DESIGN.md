# Design

## Subject, audience, job

AIPfad teaches AI literacy precisely — how tokens, context windows, prompts, and terminals actually work — to a DACH professional audience (developers, product people, governance/compliance staff, technical founders) who are often skeptical of AI-hype marketing. The landing page's one job: convince that reader in the first screen that this is a precision instrument, not a sales page, and get them into the placement or the path.

## Why not the sibling look

PythonPfad and SQLPfad share an explicitly "lively and welcoming" identity: indigo-tinted neutrals, a bright blue accent, a rainbow of per-module colors, IBM Plex Sans carrying both headings and body. That's the right voice for a beginner-friendly coding course. AIPfad's brief calls for something "more technical, precise, adult" — the same type family (continuity within the product family) but a different point of view.

## Token system

**Color** (full ramps in `src/app/globals.css` `@theme`; here the anchor values):

| Token                                       | Hex                               | Role                                                                                                                                                                                                                  |
| ------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ink-50`                                    | `#f6f4ef`                         | Page background — warm paper, not screen-white, no indigo tint                                                                                                                                                        |
| `ink-900`                                   | `#1d1a15`                         | Primary text — ink, not near-black-with-a-tint                                                                                                                                                                        |
| `signal-500`                                | `#b45309`                         | The one brand accent — burnt amber/ochre. Buttons, links, active states, highlighter-style emphasis. Chosen specifically to not be the purple/blue "AI gradient" default and to differ from the siblings' blue accent |
| `wire-500`                                  | `#24618f`                         | Reserved _exclusively_ for the Context Graph's connective lines and prerequisite indicators — one color, one job, so a "wire" always means a dependency relationship, nowhere else                                    |
| `success-500` / `caution-500` / `alert-500` | `#16794a` / `#8a6d00` / `#a32419` | Semantic feedback (passed / needs review / dangerous or failed) — deliberately distinct hues from `signal` so brand-accent and grading-feedback are never visually confused                                           |

Dark mode inverts the ink scale (paper → near-black `ink-950`, ink → `ink-50`) and lightens `signal`/`wire` shades for contrast; it is not a separate "neon on black" identity, just the same instrument under different light.

**Type**:

- **Display / headings / nav / eyebrows / numbers — IBM Plex Mono.** The deliberate risk: monospace as the _display_ face, not just the code face. The subject matter (tokens, terminal commands, message roles, JSON) is monospace-native; setting headlines in it signals "precision instrument" from the first pixel and is the one clear differentiator from the sibling products, which use Sans for display and Mono only inside code blocks.
- **Body — IBM Plex Sans.** Long-form lesson prose stays in the readable grotesque; Mono is never used for paragraphs of running text.
- Both self-hosted (`src/app/schriften/`, copied from the already-vendored, properly licensed PythonPfad assets — same OFL-licensed IBM Plex family, no new external asset).

**Layout**:

- No hero-plus-three-feature-cards template. The landing page opens with a short, confident claim directly above a _real_, functioning miniature of the Tokenizer Lab — an actual sentence breaking into labeled token chips — because that piece of UI **is** the product's thesis (exact mechanics, not hand-waving).
- Section rhythm uses hairline dividers and generous whitespace; "what you'll learn" renders as a typographic spec-list (mono labels, left-aligned, like a datasheet) rather than a grid of icon-tile cards. Cards are reserved for places that genuinely need visual separation (module previews, lesson cards in the library).
- Small border radius (`--radius-md` ≈ 6px) — precise, not the zero-radius newspaper look and not the soft/rounded SaaS look.

**Signature**: the **Context Graph** — a real, data-driven DAG of the actual taught concepts (Terminal → Dateien → Tokens → Context Window → Nachrichtenrollen → Prompting), laid out with the level-layering algorithm shared with PythonPfad's Wissenslandkarte (SVG connective lines in `wire-500`, real `<button>` nodes for keyboard/AT access — never `<text>` inside the SVG). It appears in miniature on the landing page and in full under `/wissenslandkarte`. It is functional, not decorative: every node is the real concept page.

## Self-critique against generic AI-design defaults

- Not cream-background + high-contrast-serif + terracotta: no serif anywhere, and the display face is mono, not a display serif.
- Not near-black + single neon accent: light-mode-first paper background; dark mode is a controlled inversion, not a separate "hacker" identity; no glow, no neon saturation.
- Not broadsheet/newspaper hairlines-and-zero-radius: hairline rules are used, but the display type is mono (not a masthead serif), radius is small-but-present, and the motif is "engineering notebook / datasheet," not newsprint columns.
- No purple/blue AI gradient, no glassmorphism, no bento grid, no rounded-icon-tile-per-heading, no sparkle iconography for "AI," no card-for-everything, no stock robot/brain art, no decorative neural-network background.

## Motion

One orchestrated moment on load: the hero sentence's tokens visually separate into labeled chips (the same interaction the Tokenizer Lab teaches). Everything else is quiet — subtle hover states (underline-offset shift, color shift), no scroll-triggered cascades, no idle looping animation. `prefers-reduced-motion` disables the load sequence entirely; the tokens render already-split.

## Accessibility

WCAG 2.2 AA contrast for all text/background pairs in both themes (verified per-pair, not assumed from the ramp). Focus is always visible (`:focus-visible`, 2px `wire` outline, never removed). Every callout/feedback state pairs color with an icon and text label, never color alone. Context Graph nodes are real buttons in document order, not SVG-only shapes.
