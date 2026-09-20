import clsx from "clsx";
import * as React from "react";
import styles from "./index.module.css";

/* Border beam motion adapted from Motiq's MIT-licensed Border Beam Panel. */
const PARKED_ANGLE = 40;

type BorderBeamElement = "article" | "div" | "section";

export interface BorderBeamPanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: BorderBeamElement;
  beams?: 1 | 2;
  colors?: [string, string?];
  glow?: boolean;
  pauseWhenHidden?: boolean;
  radius?: number;
  reducedMotion?: boolean;
  seed?: number;
  speed?: number;
  thickness?: number;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    setReduced(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}

function useVisibilityPause(ref: React.RefObject<HTMLElement | null>): boolean {
  const [onScreen, setOnScreen] = React.useState(true);
  const [tabVisible, setTabVisible] = React.useState(true);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.05 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  React.useEffect(() => {
    const handleVisibilityChange = () => setTabVisible(document.visibilityState !== "hidden");
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return onScreen && tabVisible;
}

function comet(color: string, highlight: string, opacity: number, start: number): string {
  return [
    `color-mix(in srgb, ${color} 4%, transparent) ${start + 18}deg`,
    `color-mix(in srgb, ${color} ${opacity}%, transparent) ${start + 46}deg`,
    `${color} ${start + 56}deg`,
    `${highlight} ${start + 60}deg`,
    `transparent ${start + 63}deg`,
  ].join(", ");
}

function createGradient(beams: 1 | 2, colors?: [string, string?]): string {
  const first = colors?.[0] ?? "rgb(var(--primary-5))";
  const second = colors?.[1] ?? "rgb(var(--cyan-5))";
  const stops = [
    "transparent 0deg",
    comet(first, `color-mix(in srgb, ${first} 22%, white)`, 55, 0),
  ];

  if (beams === 2) {
    stops.push(
      "transparent 198deg",
      comet(second, `color-mix(in srgb, ${second} 26%, white)`, 50, 198),
    );
  }
  stops.push("transparent 360deg");
  return `conic-gradient(from var(--border-beam-angle), ${stops.join(", ")})`;
}

type BorderBeamStyle = React.CSSProperties & {
  "--border-beam-angle": string;
  "--border-beam-gradient": string;
  "--border-beam-radius": string;
  "--border-beam-thickness": string;
};

export function BorderBeamPanel({
  as: Component = "div",
  beams = 2,
  colors,
  glow = true,
  pauseWhenHidden = true,
  radius = 16,
  reducedMotion,
  seed = 1,
  speed = 24,
  thickness = 2,
  className,
  style,
  children,
  ...props
}: BorderBeamPanelProps) {
  const rootRef = React.useRef<HTMLElement | null>(null);
  const systemReduced = useReducedMotion();
  const [hydrated, setHydrated] = React.useState(false);
  const visible = useVisibilityPause(rootRef);
  const staticMode = reducedMotion === true || (hydrated && systemReduced);
  const paused = pauseWhenHidden && !visible;
  const animate = !staticMode && !paused;
  const startAngle = React.useMemo(() => (((seed * 137.508) % 360) + 360) % 360, [seed]);
  const angleRef = React.useRef(startAngle);

  React.useEffect(() => setHydrated(true), []);

  const paint = React.useCallback((angle: number) => {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    rootRef.current?.style.setProperty("--border-beam-angle", `${normalizedAngle.toFixed(2)}deg`);
  }, []);

  React.useEffect(() => {
    if (!animate) return;
    let animationFrame = 0;
    let lastTime = 0;

    const frame = (now: number) => {
      if (!lastTime) lastTime = now;
      const elapsed = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      angleRef.current += speed * elapsed;
      paint(angleRef.current);
      animationFrame = requestAnimationFrame(frame);
    };

    animationFrame = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrame);
  }, [animate, paint, speed]);

  React.useEffect(() => {
    if (!staticMode) return;
    angleRef.current = PARKED_ANGLE;
    paint(PARKED_ANGLE);
  }, [paint, staticMode]);
  const panelStyle: BorderBeamStyle = {
    "--border-beam-angle": `${startAngle.toFixed(2)}deg`,
    "--border-beam-gradient": createGradient(beams, colors),
    "--border-beam-radius": `${radius}px`,
    "--border-beam-thickness": `${Math.max(1, thickness)}px`,
    ...style,
  };

  return (
    <Component
      ref={(element) => {
        rootRef.current = element;
      }}
      className={clsx(styles.panel, className)}
      style={panelStyle}
      data-motion={staticMode ? "static" : "animated"}
      data-paused={paused}
      {...props}
    >
      {glow ? <span aria-hidden="true" className={styles.glow} /> : null}
      <span aria-hidden="true" className={styles.ring} />
      {children}
    </Component>
  );
}
