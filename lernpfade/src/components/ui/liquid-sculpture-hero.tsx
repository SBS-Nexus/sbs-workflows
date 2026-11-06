'use client';

/**
 * Liquid Sculpture Hero — eine metallische Skulptur, die unter dem Zeiger zu
 * Partikeln zerfließt und danach wieder zum ruhigen Bild wird.
 *
 * Grundlage ist „Liquid Sculpture Hero“ von Guglielmo Giannattasio
 * (https://21st.dev/@gughigug/components/liquid-sculpture-hero), laut 21st.dev
 * unter der MIT-Lizenz; Lizenztext und Herkunft der Bilder stehen in
 * `lernpfade/THIRD_PARTY_NOTICES.md`. Der Urheberhinweis bleibt sichtbar
 * (`showCredit`).
 *
 * Für den Hub angepasst (Begründung und Tests: `lernpfade/docs/LIQUID-HERO.md`):
 *
 * - Text, Links und statisches Bild stehen vollständig im Server-HTML und
 *   funktionieren ohne JavaScript. Die Bildfläche reserviert CSS über
 *   `aspect-ratio`; die Höhe wächst mit dem Inhalt (Zoom, lange Texte).
 * - Die WebGL2-Engine wird erst nach der Hydration per `import()` geladen.
 * - Ein zentraler Fehlerpfad beendet Bildwechsel, gibt die Engine frei und
 *   lässt das statische Bild stehen; späte Frame-Callbacks schalten ihn nicht
 *   wieder um.
 * - Eigene Bilder fallen nie auf die Demo-Skulptur zurück.
 * - Reduzierte Bewegung ist eine echte statische Ansicht: keine Engine, keine
 *   Bildschleife, keine Zeigereffekte — auch nach einem Wechsel zur Laufzeit.
 * - Die Engine läuft nur, solange die Hero im Viewport UND der Tab sichtbar ist.
 */

import * as React from 'react';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import type { EngineOptions, LiquidEngine } from './liquid-sculpture-engine';
import {
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  clamp,
  containRect,
  inverseBackgroundMatrix,
  isCrossOrigin,
  isDarkColor,
  parseColorLiteral,
  resolveSources,
  selectSculptureSource,
  type Rgb,
} from './liquid-sculpture-model';

export interface SculptureHeroLink {
  label: string;
  href: string;
}

export interface SculptureHeroProps {
  /** Skulptur für das helle Design. Ohne `src` zeigt die Komponente die Original-Demo. */
  src?: string;
  /** Optionale Variante für das dunkle Design. */
  darkSrc?: string;
  /** Optionale Hochformat-Variante für Telefone (hell bzw. dunkel). */
  mobileSrc?: string;
  mobileDarkSrc?: string;
  /** Seitenverhältnis (Breite/Höhe) der Basis- bzw. Mobilvariante; reserviert die Fläche vor dem Laden. */
  imageAspect?: number;
  mobileImageAspect?: number;
  /** Leer = dekorativ (Standard für eigene Bilder). */
  imageAlt?: string;
  /**
   * Nur für helle Bilder ohne Transparenz: flache Hintergrundfarbe im Bild als
   * Literal (z. B. `#E9EAE5`). Damit verschmilzt auch das statische Bild mit
   * der Fläche der Hero. Ohne Angabe ermittelt die Engine sie aus den Bildecken.
   */
  imageBackground?: string;

  brand?: string;
  brandHref?: string;
  navLabel?: string;
  navLinks?: SculptureHeroLink[];
  navCta?: SculptureHeroLink;
  showNav?: boolean;

  eyebrow?: string;
  /** Zeilenumbrüche mit `\n`. */
  headline?: string;
  /** Teil der Überschrift in der Akzentfarbe/-schrift. */
  headlineAccent?: string;
  headingId?: string;
  body?: string;
  primaryCta?: SculptureHeroLink;
  secondaryCta?: SculptureHeroLink;
  hint?: string;
  hintTouch?: string;

  /** Fläche im hellen Design — beliebiger CSS-Farbwert, auch `var(--bg)`. */
  background?: string;
  /** Fläche im dunklen Design. */
  darkBackground?: string;
  theme?: 'light' | 'dark';
  /** Umschalter Hell/Dunkel in der Hero-Navigation. */
  themeToggle?: boolean;
  textColor?: string;
  mutedColor?: string;
  accentColor?: string;
  headingFont?: string;
  accentFont?: string;
  bodyFont?: string;
  /** Lädt Geist und Instrument Serif von Google Fonts. Aus Datenschutzgründen standardmäßig aus. */
  loadFonts?: boolean;

  /** 1 = Standardgröße für den Breakpoint. */
  sculptureScale?: number;
  mobileSculptureScale?: number;
  /** Versatz in % der Hero-Breite bzw. -Höhe. */
  sculptureX?: number;
  sculptureY?: number;

  interactive?: boolean;
  /** 0 – 2 */
  strength?: number;
  /** Radius der Störung in px bei 1440 px Breite. */
  radius?: number;
  /** 0,15 – 2, vervielfacht die Partikelzahl. */
  particleDensity?: number;
  /** 0 – 3, Partikelgröße relativ zum Raster. */
  dotSize?: number;
  /** 0 – 2, wie weit Partikel bei einer Störung wandern. */
  particleSpread?: number;
  /** 0 – 2, Wirbel des gestörten Materials. */
  turbulence?: number;
  /** 0 – 2, wie stark die ganze Skulptur unter dem Zeiger fließt. */
  liquid?: number;
  /** Schnelle Partikel zu Schlieren strecken. */
  streaks?: boolean;
  /** In Ruhe: das scharfe Bild oder das Partikelfeld. */
  restStyle?: 'image' | 'particles';
  /** 0 – 2, wie schnell das Material zurückfindet. */
  returnSpeed?: number;
  /** Dauerhafte Bewegung im Ruhezustand. */
  ambient?: boolean;
  /** 0 – 2 */
  ambientIntensity?: number;
  /** 0,25 – 3 */
  speed?: number;
  /** Zusammensetzen beim Laden. */
  intro?: boolean;

  /** Mindesthöhe; der Inhalt darf darüber hinauswachsen. */
  minHeight?: string;
  /** Großes, blasses Wort hinter der Skulptur. Leer = aus. */
  backdropText?: string;
  showCredit?: boolean;
  creditLabel?: string;
  creditHref?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Inhalte der Original-Demo — gelten nur, solange kein eigenes `src` gesetzt ist. */
const DEMO = {
  sources: {
    src: 'https://cdn.21st.dev/assets/mirror/ae/ae8c3de9003460e59182e950ccd345f68f27f9d0e4808b64c92c962a4eca7120.webp',
    darkSrc: 'https://cdn.21st.dev/assets/mirror/a1/a1fa387b6e417b26a25f317559c87cce4d241c1052c52a2b3bc2966b2aaf9b65.webp',
    mobileSrc: 'https://cdn.21st.dev/assets/mirror/b0/b0c8d8e5d64b8cec906a3b390e3dc7c9a5af08334bf0632873c601782cb4bc46.webp',
    mobileDarkSrc:
      'https://cdn.21st.dev/assets/mirror/9a/9a82cb59be1bfde59855b79d7a565e487155a89f4d52eac74dcc10e267b2b6d1.webp',
  },
  imageAspect: 1983 / 793,
  mobileImageAspect: 1024 / 1300,
  imageAlt: 'Abstract sculpture of interwoven metallic filaments and particles',
  brand: 'Forma®',
  navLinks: [
    { label: 'Work', href: '#' },
    { label: 'Studio', href: '#' },
    { label: 'Approach', href: '#' },
    { label: 'Journal', href: '#' },
  ],
  navCta: { label: 'Contact', href: '#' },
  eyebrow: 'Independent studio — Est. 2019',
  headline: 'Form that\nanswers back.',
  headlineAccent: 'answers back.',
  body: 'We shape products, identities and spaces with the precision of engineering and the patience of craft — work that holds up under attention.',
  primaryCta: { label: 'Start a project', href: '#' },
  secondaryCta: { label: 'Selected work', href: '#' },
  hint: 'Move across the form',
  hintTouch: 'Touch the form',
  background: '#EBE9E5',
  darkBackground: '#111110',
  textColor: '#151514',
  darkTextColor: '#F1EFEA',
  headingFont: "'Geist', 'Helvetica Neue', Arial, sans-serif",
  accentFont: "'Instrument Serif', 'Times New Roman', serif",
  bodyFont: "'Geist', 'Helvetica Neue', Arial, sans-serif",
  backdropText: 'forma',
  creditLabel: 'by guglielmogiannattasio.it',
  creditHref: 'https://guglielmogiannattasio.it',
} as const;

/** Sichtbare Bildpause beim Wechsel, bevor das neue Bild auf die GPU geht. */
const SWAP_DELAY_MS = 280;
const TOUCH_QUERY = '(hover: none), (pointer: coarse)';

function subscribeTo(query: string) {
  return (onChange: () => void): (() => void) => {
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  };
}
const subscribeReducedMotion = subscribeTo(REDUCED_MOTION_QUERY);
const subscribeTouch = subscribeTo(TOUCH_QUERY);
const matches = (query: string) => (): boolean => window.matchMedia(query).matches;
const notOnServer = (): boolean => false;

let fontsInjected = false;
function injectFonts(): void {
  if (fontsInjected || typeof document === 'undefined') return;
  fontsInjected = true;
  const id = 'sh-fonts';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap';
  document.head.appendChild(link);
}

/**
 * Löst einen Farbwert aus den berechneten Styles auf — auch `var(--bg)` oder
 * `oklch(…)` — und liefert sRGB 0–1 für die Shader. Der Canvas-Umweg wandelt
 * jede Farbe, die der Browser kennt, in sRGB-Bytes um.
 */
function resolveRenderedColor(element: HTMLElement, property: string): Rgb | null {
  const raw = getComputedStyle(element).getPropertyValue(property).trim();
  if (!raw) return null;
  const literal = parseColorLiteral(raw);
  if (literal) return literal;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  // Eine ungültige Farbe lässt fillStyle unverändert — bei beiden Proben.
  const accepted = ['#000000', '#ffffff'].some((probe) => {
    context.fillStyle = probe;
    context.fillStyle = raw;
    return context.fillStyle !== probe;
  });
  if (!accepted) return null;
  context.clearRect(0, 0, 1, 1);
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function renderHeadline(text: string, accent: string): React.ReactNode[] {
  return text.split('\n').map((line, index) => {
    let content: React.ReactNode = line;
    const highlighted = accent.trim();
    const at = highlighted ? line.indexOf(highlighted) : -1;
    if (at >= 0) {
      content = (
        <>
          {line.slice(0, at)}
          <span className="sh-accent">{highlighted}</span>
          {line.slice(at + highlighted.length)}
        </>
      );
    }
    return (
      <span className="sh-line" key={index}>
        {content}
      </span>
    );
  });
}

type Controller = {
  /** Lädt das Bild, das zu Design und Layout passt (nur die jüngste Anfrage zählt). */
  reload: () => void;
  /** Übernimmt Farbe und Optionen nach einem Render. */
  refresh: () => void;
};

export default function SculptureHero(props: SculptureHeroProps): React.ReactElement {
  const {
    src,
    darkSrc,
    mobileSrc,
    mobileDarkSrc,
    imageBackground,
    brand = DEMO.brand,
    brandHref = '/',
    navLabel = 'Hero-Navigation',
    navLinks = DEMO.navLinks,
    navCta = DEMO.navCta,
    showNav = true,
    eyebrow = DEMO.eyebrow,
    headline = DEMO.headline,
    headlineAccent = DEMO.headlineAccent,
    body = DEMO.body,
    primaryCta = DEMO.primaryCta,
    secondaryCta = DEMO.secondaryCta,
    hint = DEMO.hint,
    hintTouch = DEMO.hintTouch,
    background: lightBackground = DEMO.background,
    darkBackground = DEMO.darkBackground,
    theme = 'light',
    themeToggle = true,
    textColor,
    mutedColor,
    accentColor,
    headingFont = DEMO.headingFont,
    accentFont = DEMO.accentFont,
    bodyFont = DEMO.bodyFont,
    loadFonts = false,
    sculptureScale = 1,
    mobileSculptureScale = 1,
    sculptureX = 0,
    sculptureY = 0,
    interactive = true,
    strength = 1,
    radius = 220,
    particleDensity = 1,
    particleSpread = 1,
    dotSize = 1,
    turbulence = 1,
    liquid = 1,
    streaks = true,
    restStyle = 'image',
    returnSpeed = 1,
    ambient = false,
    ambientIntensity = 1,
    speed = 1,
    intro = false,
    minHeight = '100svh',
    backdropText = DEMO.backdropText,
    showCredit = true,
    creditLabel = DEMO.creditLabel,
    creditHref = DEMO.creditHref,
    className,
    style,
  } = props;

  const usingDemo = !src;
  const imageAspect = props.imageAspect ?? (usingDemo ? DEMO.imageAspect : 16 / 9);
  const mobileImageAspect =
    props.mobileImageAspect ?? (usingDemo ? DEMO.mobileImageAspect : mobileSrc ? 4 / 5 : imageAspect);
  const imageAlt = props.imageAlt ?? (usingDemo ? DEMO.imageAlt : '');

  const rootRef = React.useRef<HTMLElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const figureRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const controllerRef = React.useRef<Controller | null>(null);

  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = props.headingId ?? `sh-title-${uid}`;
  const tintId = `sh-tint-${uid}`;

  const [mode, setMode] = React.useState<'light' | 'dark'>(theme);
  React.useEffect(() => setMode(theme), [theme]);

  const reducedMotion = React.useSyncExternalStore(subscribeReducedMotion, matches(REDUCED_MOTION_QUERY), notOnServer);
  const isTouch = React.useSyncExternalStore(subscribeTouch, matches(TOUCH_QUERY), notOnServer);

  const background = mode === 'dark' ? darkBackground : lightBackground;
  // Ohne aufgelöste Farbe (z. B. `var(--bg)`) entscheidet das Design, nicht ein geratener Hex-Wert.
  const literalBackground = parseColorLiteral(background);
  const darkGround = literalBackground ? isDarkColor(literalBackground) : mode === 'dark';
  const fg = textColor || (darkGround ? DEMO.darkTextColor : DEMO.textColor);

  const sources = React.useMemo(
    () => resolveSources({ src, darkSrc, mobileSrc, mobileDarkSrc }, DEMO.sources),
    [src, darkSrc, mobileSrc, mobileDarkSrc],
  );
  const dark = mode === 'dark';
  const wideSrc = selectSculptureSource(sources, { mobile: false, dark });
  const tallSrc = selectSculptureSource(sources, { mobile: true, dark });

  // Der flache Bildhintergrund ist nur für die hellen Bilder bekannt.
  const imageBackgroundRgb = React.useMemo(
    () => (dark ? null : parseColorLiteral(imageBackground)),
    [dark, imageBackground],
  );
  const tintMatrix = imageBackgroundRgb ? inverseBackgroundMatrix(imageBackgroundRgb) : null;

  // Ohne Bewegung zeigte die Engine nur dasselbe Bild wie das statische <img>.
  const engineWanted = !reducedMotion && (interactive || ambient || intro || restStyle === 'particles');

  const latest = React.useRef({ sources, dark, background, options: {} as Omit<EngineOptions, 'bg'> });
  React.useEffect(() => {
    latest.current = {
      sources,
      dark,
      background,
      options: {
        interactive,
        strength: clamp(strength, 0, 2),
        radius: clamp(radius, 40, 600),
        density: clamp(particleDensity, 0.15, 2),
        dotSize: clamp(dotSize, 0.2, 3),
        spread: clamp(particleSpread, 0, 2),
        turbulence: clamp(turbulence, 0, 2),
        liquid: clamp(liquid, 0, 2),
        streaks,
        restStyle,
        returnSpeed: clamp(returnSpeed, 0, 2),
        ambient,
        ambientIntensity: clamp(ambientIntensity, 0, 2),
        speed: clamp(speed, 0.25, 3),
        intro,
        reducedMotion: false,
        imgBg: imageBackgroundRgb ? [imageBackgroundRgb[0], imageBackgroundRgb[1], imageBackgroundRgb[2]] : null,
      },
    };
  });

  React.useEffect(() => {
    if (loadFonts) injectFonts();
  }, [loadFonts]);

  // Ein Bild, das schon vor der Hydration scheiterte, löst kein onError mehr aus.
  React.useEffect(() => {
    const img = imgRef.current;
    const root = rootRef.current;
    if (img && root && img.complete && img.naturalWidth === 0) root.dataset.img = 'error';
  }, []);

  React.useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const figure = figureRef.current;
    if (!root || !stage || !figure || !engineWanted) return;

    let disposed = false;
    let failed = false;
    let engine: LiquidEngine | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let token = 0;
    let requested: string | undefined;
    let swapTimer = 0;
    let pending: HTMLImageElement | null = null;
    let aspect = 0;
    let inView = false;
    let pageVisible = !document.hidden;
    const phone = window.matchMedia(MOBILE_QUERY);
    const detach: Array<() => void> = [];

    // Fläche aus dem tatsächlich gerenderten Wert, nicht aus dem CSS-Ausdruck.
    const ground = (): [number, number, number] => {
      const resolved = resolveRenderedColor(root, '--sh-bg') ??
        parseColorLiteral(latest.current.background) ?? [0.92, 0.91, 0.9];
      return [resolved[0], resolved[1], resolved[2]];
    };
    const options = (): EngineOptions => ({ ...latest.current.options, bg: ground() });

    const dropPending = () => {
      window.clearTimeout(swapTimer);
      if (pending) {
        pending.onload = null;
        pending.onerror = null;
        pending = null;
      }
    };

    /** Der einzige Fehlerpfad: Wechsel beenden, Engine freigeben, statisches Bild zeigen. */
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      token += 1; // späte Lade- und Frame-Callbacks verfallen
      dropPending();
      engine?.destroy();
      engine = null;
      canvas?.remove();
      canvas = null;
      delete root.dataset.swap;
      delete root.dataset.motion;
      delete root.dataset.glSrc;
      root.dataset.gl = 'off';
    };

    const relayout = () => {
      if (!engine) return;
      const outer = root.getBoundingClientRect();
      const inner = figure.getBoundingClientRect();
      const box = { x: inner.left - outer.left, y: inner.top - outer.top, w: inner.width, h: inner.height };
      engine.resize(root.clientWidth, root.clientHeight, containRect(box, aspect));
    };

    const load = (next: string | undefined) => {
      // Verglichen wird mit der zuletzt angeforderten Quelle, nicht mit der gezeigten:
      // Ein schon hochgeladenes, noch nicht gezeigtes Bild darf nie als „aktuell“ gelten.
      if (disposed || failed || !engine || !next || next === requested) return;
      requested = next;
      const mine = ++token;
      dropPending();
      const swapping = root.dataset.gl === 'on';
      if (swapping) root.dataset.swap = '1';
      const image = new Image();
      pending = image;
      image.decoding = 'async';
      if (isCrossOrigin(next, window.location.href)) image.crossOrigin = 'anonymous';
      image.onload = () => {
        if (mine !== token || disposed || failed || !engine) return;
        pending = null;
        aspect = image.naturalWidth / image.naturalHeight || aspect;
        engine.onFirstFrame = () => {
          if (mine !== token || disposed || failed) return;
          root.dataset.gl = 'on';
          root.dataset.glSrc = next;
          delete root.dataset.swap;
        };
        try {
          relayout();
          engine.setImage(image);
          relayout();
        } catch {
          fail();
        }
      };
      image.onerror = () => {
        if (mine !== token || disposed || failed) return;
        // Das angeforderte Bild fehlt: kein veraltetes Bild weiterzeigen.
        fail();
      };
      swapTimer = window.setTimeout(() => {
        image.src = next;
      }, swapping ? SWAP_DELAY_MS : 0);
    };

    const currentSource = () =>
      selectSculptureSource(latest.current.sources, { mobile: phone.matches, dark: latest.current.dark });

    const updateVisibility = () => engine?.setVisible(inView && pageVisible);

    const start = (Engine: typeof LiquidEngine) => {
      if (disposed) return;
      canvas = document.createElement('canvas');
      canvas.className = 'sh-canvas';
      stage.appendChild(canvas);
      try {
        engine = new Engine(canvas, options(), fail);
      } catch {
        fail();
        return;
      }
      engine.onActivity = (active) => {
        if (!disposed && !failed) root.dataset.motion = active ? 'active' : 'rest';
      };
      // erst sichtbar, wenn der IntersectionObserver es meldet
      engine.setVisible(false);

      const resize = new ResizeObserver(relayout);
      resize.observe(root);
      resize.observe(figure);
      const intersection = new IntersectionObserver((entries) => {
        for (const entry of entries) inView = entry.isIntersecting;
        updateVisibility();
      });
      intersection.observe(root);
      const onVisibility = () => {
        pageVisible = !document.hidden;
        updateVisibility();
      };
      document.addEventListener('visibilitychange', onVisibility);
      const onLayout = () => load(currentSource());
      phone.addEventListener('change', onLayout);

      const position = (event: PointerEvent) => {
        const bounds = root.getBoundingClientRect();
        return [event.clientX - bounds.left, event.clientY - bounds.top] as const;
      };
      const touched = () => {
        root.dataset.touched = '1';
      };
      const onMove = (event: PointerEvent) => {
        const touch = event.pointerType === 'touch';
        if (touch && event.buttons === 0 && event.pressure === 0) return;
        engine?.pointer('move', ...position(event), touch);
        touched();
      };
      const onDown = (event: PointerEvent) => {
        engine?.pointer('down', ...position(event), event.pointerType === 'touch');
        touched();
      };
      const onUp = (event: PointerEvent) => engine?.pointer('up', ...position(event), event.pointerType === 'touch');
      const onLeave = (event: PointerEvent) =>
        engine?.pointer('leave', ...position(event), event.pointerType === 'touch');
      const listeners: Array<[string, (event: PointerEvent) => void]> = [
        ['pointermove', onMove],
        ['pointerdown', onDown],
        ['pointerup', onUp],
        ['pointercancel', onUp],
        ['pointerleave', onLeave],
      ];
      for (const [type, listener] of listeners) root.addEventListener(type, listener as EventListener, { passive: true });

      detach.push(() => {
        resize.disconnect();
        intersection.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        phone.removeEventListener('change', onLayout);
        for (const [type, listener] of listeners) root.removeEventListener(type, listener as EventListener);
      });

      controllerRef.current = {
        reload: () => load(currentSource()),
        refresh: () => {
          if (!engine || failed) return;
          engine.setOptions(options());
        },
      };
      load(currentSource());
    };

    import('./liquid-sculpture-engine').then(
      (module) => start(module.LiquidEngine),
      () => fail(), // Chunk nicht ladbar: statisches Bild bleibt
    );

    return () => {
      disposed = true;
      controllerRef.current = null;
      dropPending();
      for (const run of detach) run();
      engine?.destroy();
      engine = null;
      canvas?.remove();
      canvas = null;
      delete root.dataset.gl;
      delete root.dataset.swap;
      delete root.dataset.motion;
      delete root.dataset.glSrc;
    };
  }, [engineWanted]);

  // Design- oder Quellenwechsel: neues Bild laden (die Engine hält ihren Zustand).
  React.useEffect(() => {
    controllerRef.current?.reload();
  }, [sources, dark]);

  // Optionen und aufgelöste Hintergrundfarbe live übernehmen, ohne die Engine neu zu bauen.
  React.useEffect(() => {
    controllerRef.current?.refresh();
  }, [
    interactive,
    strength,
    radius,
    particleDensity,
    dotSize,
    particleSpread,
    turbulence,
    liquid,
    streaks,
    restStyle,
    returnSpeed,
    ambient,
    ambientIntensity,
    speed,
    intro,
    background,
    imageBackgroundRgb,
  ]);

  const accent = accentColor || fg;
  const vars = {
    '--sh-bg': background,
    '--sh-fg': fg,
    '--sh-acc': accent,
    ...(mutedColor ? { '--sh-muted-color': mutedColor } : {}),
    '--sh-head': headingFont,
    '--sh-accent': accentFont,
    '--sh-body': bodyFont,
    '--sh-min-h': minHeight,
    '--sh-aspect-wide': imageAspect,
    '--sh-aspect-tall': mobileImageAspect,
    '--sh-scale': clamp(sculptureScale, 0.3, 3),
    '--sh-scale-tall': clamp(mobileSculptureScale, 0.3, 3),
    '--sh-x': `${sculptureX}cqi`,
    '--sh-y': `${sculptureY}svh`,
    ...(backdropText ? { '--sh-backdrop-chars': Math.max(1, backdropText.length) } : {}),
  } as React.CSSProperties;

  const hintText = isTouch ? hintTouch : hint;
  const decorative = !imageAlt;

  return (
    <section
      ref={rootRef}
      className={`sh-root${className ? ` ${className}` : ''}`}
      style={{ ...vars, ...style }}
      aria-labelledby={titleId}
    >
      {tintMatrix ? (
        <svg className="sh-defs" aria-hidden="true" focusable="false">
          {/* Gegenstück zum Bild-Shader: Bildfarbe × Fläche ÷ Bildhintergrund. */}
          <filter id={tintId} colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
            <feFlood className="sh-tint-flood" result="ground" />
            <feComposite in="SourceGraphic" in2="ground" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
            <feColorMatrix type="matrix" values={tintMatrix} />
          </filter>
        </svg>
      ) : null}

      <div ref={stageRef} className="sh-stage" aria-hidden="true" />

      {showNav ? (
        <nav className="sh-nav" aria-label={navLabel}>
          <a className="sh-brand" href={brandHref}>
            {brand}
          </a>
          <ul className="sh-links">
            {navLinks.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <a className="sh-link" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
            {themeToggle ? (
              <li className="sh-keep">
                <button
                  type="button"
                  className="sh-theme"
                  aria-label={dark ? 'Helles Design einschalten' : 'Dunkles Design einschalten'}
                  onClick={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))}
                >
                  {dark ? <Sun aria-hidden="true" size={15} strokeWidth={1.5} /> : <Moon aria-hidden="true" size={15} strokeWidth={1.5} />}
                </button>
              </li>
            ) : null}
            {navCta?.label ? (
              <li className="sh-keep">
                <a className="sh-navcta" href={navCta.href}>
                  {navCta.label}
                </a>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}

      <div className="sh-figure-wrap">
        {backdropText ? (
          <div className="sh-backdrop-layer" aria-hidden="true">
            <span className="sh-backdrop">{backdropText}</span>
          </div>
        ) : null}
        <div ref={figureRef} className="sh-figure" aria-hidden={decorative ? 'true' : undefined}>
          <picture>
            {tallSrc && tallSrc !== wideSrc ? <source media={MOBILE_QUERY} srcSet={tallSrc} /> : null}
            <img
              ref={imgRef}
              className="sh-fallback"
              src={wideSrc}
              alt={imageAlt}
              decoding="async"
              fetchPriority="high"
              draggable={false}
              style={tintMatrix ? { filter: `url(#${tintId})` } : undefined}
              onError={() => {
                if (rootRef.current) rootRef.current.dataset.img = 'error';
              }}
              onLoad={() => {
                if (rootRef.current) delete rootRef.current.dataset.img;
              }}
            />
          </picture>
        </div>
      </div>

      {interactive && hintText ? (
        <p className="sh-hint" aria-hidden="true">
          {hintText}
        </p>
      ) : null}

      <div className="sh-content">
        <div>
          {eyebrow ? <p className="sh-eyebrow">{eyebrow}</p> : null}
          <h1 className="sh-h1" id={titleId}>
            {renderHeadline(headline, headlineAccent)}
          </h1>
        </div>
        <div className="sh-aside">
          {body ? <p className="sh-body">{body}</p> : null}
          <div className="sh-ctas">
            {primaryCta?.label ? (
              <a className="sh-btn" href={primaryCta.href}>
                {primaryCta.label}
                <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
              </a>
            ) : null}
            {secondaryCta?.label ? (
              <a className="sh-txt" href={secondaryCta.href}>
                {secondaryCta.label}
                <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {showCredit && creditLabel ? (
        <p className="sh-credit">
          <a href={creditHref}>{creditLabel}</a>
        </p>
      ) : null}
    </section>
  );
}
