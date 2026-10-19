import SculptureHero from '@/components/ui/liquid-sculpture-hero';

/**
 * Startseiten-Hero des Hubs: Produkttexte und Konfiguration der Liquid
 * Sculpture Hero. Server Component — Überschrift, Text und Links stehen im
 * Server-HTML; nur die Skulptur-Engine läuft im Browser.
 *
 * Festgelegt für die Integration (siehe `docs/LIQUID-HERO.md`):
 * - keine eigene Navigation und kein Hell/Dunkel-Schalter — der Hub hat seine
 *   Seitennavigation und ist hell;
 * - keine Google Fonts: Schrift, Fläche und Farben kommen aus den Hub-Tokens;
 * - ruhiger Ausgangspunkt: scharfes Bild in Ruhe, keine Dauer- oder
 *   Einstiegsanimation; Partikeldichte 0,45 ist ein Startwert, kein
 *   gemessenes Optimum.
 * - Bilder lokal unter `public/images/hero/` (Herkunft:
 *   `THIRD_PARTY_NOTICES.md`); `imageBackground` ist ihr gemessener flacher
 *   Grund, Seitenverhältnisse aus den Bilddateien.
 */
export function LernpfadeHero(): React.ReactElement {
  return (
    <SculptureHero
      src="/images/hero/skulptur.webp"
      mobileSrc="/images/hero/skulptur-mobil.webp"
      imageAspect={1983 / 793}
      mobileImageAspect={1024 / 1300}
      imageAlt=""
      imageBackground="#E9EAE5"
      showNav={false}
      themeToggle={false}
      loadFonts={false}
      theme="light"
      background="var(--bg)"
      textColor="var(--text)"
      mutedColor="var(--muted)"
      accentColor="var(--indigo)"
      headingFont="var(--font-sans)"
      accentFont="var(--font-sans)"
      bodyFont="var(--font-sans)"
      eyebrow="Eine Plattform. Mehrere Fähigkeiten."
      headline={'Technologie lernen.\nZusammen­hänge verstehen.'}
      headlineAccent={'Zusammen­hänge verstehen.'}
      headingId="startseite-titel"
      body="Python, SQL, Git und AI – mit einem gemeinsamen Lernmodell. Verstehen, anwenden, prüfen und gezielt wiederholen."
      primaryCta={{ label: 'Lernpfad wählen', href: '#pfade' }}
      secondaryCta={{ label: 'So funktioniert das Lernen', href: '#lernmodell' }}
      hint="Bewege den Zeiger über die Form"
      hintTouch="Berühre die Form"
      restStyle="image"
      ambient={false}
      intro={false}
      particleDensity={0.45}
      backdropText=""
      minHeight="calc(100svh - 4.6rem)"
      creditLabel="Skulptur und Partikeleffekt: Guglielmo Giannattasio"
      creditHref="https://guglielmogiannattasio.it"
      style={
        {
          '--sh-content-w': 'min(1160px, calc(100% - 2rem))',
          '--sh-content-pad': '0px',
          '--sh-eyebrow': 'var(--indigo)',
          '--sh-accent-style': 'normal',
          '--sh-accent-weight': 'inherit',
        } as React.CSSProperties
      }
    />
  );
}
