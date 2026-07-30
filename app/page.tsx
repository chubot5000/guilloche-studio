"use client";

import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type ColorMode = "single" | "layered";
type PatternMode = "medallion" | "ribbon" | "field";
type TubeStyle = "ribbon" | "tube";

type Settings = {
  mode: PatternMode;
  bands: number;
  innerRadius: number;
  outerRadius: number;
  nodes: number;
  divisor: number;
  innerRipples: number;
  outerRipples: number;
  innerAmplitude: number;
  outerAmplitude: number;
  phase: number;
  bandPhase: number;
  aspect: number;
  rotation: number;
  tubeStyle: TubeStyle;
  tubeWidth: number;
  tubeThreads: number;
  tubeTwist: number;
  tubeBends: number;
  tubeDepth: number;
  tubeTaper: number;
  fieldDensity: number;
  fieldScale: number;
  fieldDrift: number;
  fieldCrossWeave: boolean;
  lineWeight: number;
  opacity: number;
  quality: number;
  paper: string;
  ink: string;
  palette: string;
  colorMode: ColorMode;
  transparent: boolean;
};

type Preset = {
  name: string;
  note: string;
  settings: Partial<Settings>;
};

type RenderPath = {
  d: string;
  colorIndex: number;
  opacity?: number;
  weight?: number;
};

const VIEWBOX = 900;
const CENTER = VIEWBOX / 2;

const palettes: Record<string, string[]> = {
  Treasury: ["#173A59", "#285E78", "#8D4C3E", "#C08C56", "#173A59"],
  Botanical: ["#173F35", "#3C6A50", "#A26943", "#C69A63", "#173F35"],
  Vermilion: ["#8E2F2A", "#B94A3A", "#244C57", "#D29454", "#8E2F2A"],
  Midnight: ["#18233B", "#40568D", "#7E4968", "#B5794D", "#18233B"],
};

const modeOptions: Array<{
  mode: PatternMode;
  label: string;
  note: string;
}> = [
  { mode: "medallion", label: "Medallion", note: "Radial" },
  { mode: "ribbon", label: "Ribbon / tube", note: "Flowing" },
  { mode: "field", label: "Field", note: "Background" },
];

const baseSettings: Settings = {
  mode: "medallion",
  bands: 3,
  innerRadius: 58,
  outerRadius: 348,
  nodes: 141,
  divisor: 41,
  innerRipples: 6,
  outerRipples: 24,
  innerAmplitude: 10,
  outerAmplitude: 22,
  phase: 0,
  bandPhase: 0.5,
  aspect: 1,
  rotation: 0,
  tubeStyle: "tube",
  tubeWidth: 245,
  tubeThreads: 14,
  tubeTwist: 5,
  tubeBends: 1.4,
  tubeDepth: 118,
  tubeTaper: 0.22,
  fieldDensity: 34,
  fieldScale: 1,
  fieldDrift: 0.33,
  fieldCrossWeave: false,
  lineWeight: 0.7,
  opacity: 0.84,
  quality: 9000,
  paper: "#F1EBDD",
  ink: "#173A59",
  palette: "Treasury",
  colorMode: "layered",
  transparent: false,
};

const presets: Preset[] = [
  {
    name: "Treasury",
    note: "Interlocking rings",
    settings: {},
  },
  {
    name: "Rosette",
    note: "Floral medallion",
    settings: {
      mode: "medallion",
      bands: 2,
      innerRadius: 18,
      outerRadius: 350,
      nodes: 171,
      divisor: 53,
      innerRipples: 9,
      outerRipples: 29,
      innerAmplitude: 4,
      outerAmplitude: 34,
      bandPhase: 1.2,
      palette: "Vermilion",
    },
  },
  {
    name: "Silk Ribbon",
    note: "Flat flowing braid",
    settings: {
      mode: "ribbon",
      tubeStyle: "ribbon",
      bands: 4,
      tubeThreads: 12,
      tubeTwist: 4.2,
      tubeWidth: 260,
      tubeBends: 1.6,
      tubeDepth: 112,
      tubeTaper: 0.35,
      innerRipples: 7,
      outerRipples: 13,
      innerAmplitude: 6,
      outerAmplitude: 12,
      palette: "Vermilion",
    },
  },
  {
    name: "Brass Tube",
    note: "Rounded woven form",
    settings: {
      mode: "ribbon",
      tubeStyle: "tube",
      bands: 3,
      tubeThreads: 14,
      tubeTwist: 4.8,
      tubeWidth: 286,
      tubeBends: 1.3,
      tubeDepth: 122,
      tubeTaper: 0.2,
      innerRipples: 5,
      outerRipples: 17,
      innerAmplitude: 5,
      outerAmplitude: 16,
      lineWeight: 0.9,
      palette: "Botanical",
    },
  },
  {
    name: "Engraver’s Field",
    note: "Repeating backdrop",
    settings: {
      mode: "field",
      fieldDensity: 38,
      fieldScale: 0.82,
      fieldDrift: 0.27,
      fieldCrossWeave: false,
      nodes: 119,
      divisor: 43,
      innerRipples: 8,
      outerRipples: 17,
      innerAmplitude: 9,
      outerAmplitude: 13,
      lineWeight: 0.58,
      palette: "Treasury",
    },
  },
  {
    name: "Moiré Field",
    note: "Cross-woven ground",
    settings: {
      mode: "field",
      fieldDensity: 28,
      fieldScale: 1.34,
      fieldDrift: 0.48,
      fieldCrossWeave: true,
      nodes: 157,
      divisor: 59,
      innerRipples: 11,
      outerRipples: 23,
      innerAmplitude: 7,
      outerAmplitude: 10,
      lineWeight: 0.45,
      opacity: 0.62,
      palette: "Midnight",
    },
  },
];

function gcd(a: number, b: number) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

function fixed(value: number) {
  return Number(value.toFixed(2));
}

function rotatePoint(x: number, y: number, degrees: number) {
  if (!degrees) return { x, y };
  const angle = (degrees * Math.PI) / 180;
  const dx = x - CENTER;
  const dy = y - CENTER;
  return {
    x: CENTER + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: CENTER + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

function commandsFromPoints(points: Array<{ x: number; y: number }>) {
  return points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${fixed(point.x)} ${fixed(point.y)}`,
    )
    .join("");
}

function radialPaths(settings: Settings): RenderPath[] {
  const {
    bands,
    innerRadius,
    outerRadius,
    nodes,
    divisor,
    innerRipples,
    outerRipples,
    innerAmplitude,
    outerAmplitude,
    phase,
    bandPhase,
    aspect,
    rotation,
    quality,
  } = settings;

  const boundary = (index: number) => {
    const progress = index / bands;
    return {
      radius: innerRadius + (outerRadius - innerRadius) * progress,
      ripples: Math.round(
        innerRipples + (outerRipples - innerRipples) * progress,
      ),
      amplitude:
        innerAmplitude + (outerAmplitude - innerAmplitude) * progress,
      phase: bandPhase * index,
    };
  };

  const totalAngle = Math.PI * 2 * divisor;
  const pointCount = Math.min(
    24000,
    Math.max(2400, quality, Math.ceil(nodes * 28)),
  );
  const rotationRadians = (rotation * Math.PI) / 180;
  const xScale = aspect >= 1 ? 1 / aspect : 1;
  const yScale = aspect <= 1 ? aspect : 1;
  const maxRadius =
    outerRadius + Math.max(innerAmplitude, outerAmplitude) + 6;
  const fit = 395 / maxRadius;

  return Array.from({ length: bands }, (_, band) => {
    const inner = boundary(band);
    const outer = boundary(band + 1);
    const points: Array<{ x: number; y: number }> = [];

    for (let index = 0; index <= pointCount; index += 1) {
      const t = (totalAngle * index) / pointCount;
      const r0 =
        inner.radius +
        Math.sin(t * inner.ripples + inner.phase) * inner.amplitude;
      const r1 =
        outer.radius +
        Math.sin(t * outer.ripples + outer.phase) * outer.amplitude;
      const halfRange = (r1 - r0) * 0.5;
      const midpoint = r0 + halfRange;
      const carrier =
        Math.sin((t * nodes) / divisor + phase + band * bandPhase * 0.22) *
        halfRange;
      const radius = (midpoint + carrier) * fit;
      const angle = t + rotationRadians;
      points.push({
        x: CENTER + Math.cos(angle) * radius * xScale,
        y: CENTER + Math.sin(angle) * radius * yScale,
      });
    }

    return { d: commandsFromPoints(points), colorIndex: band };
  });
}

function ribbonPaths(settings: Settings): RenderPath[] {
  const {
    bands,
    innerRipples,
    outerRipples,
    innerAmplitude,
    outerAmplitude,
    phase,
    bandPhase,
    rotation,
    tubeStyle,
    tubeWidth,
    tubeThreads,
    tubeTwist,
    tubeBends,
    tubeDepth,
    tubeTaper,
    quality,
  } = settings;
  const pointCount = Math.min(1600, Math.max(600, Math.round(quality / 8)));

  const frameAt = (progress: number) => {
    const wave = Math.PI * 2 * tubeBends * progress + phase * 0.22;
    const x = 74 + progress * 752;
    const y =
      CENTER +
      tubeDepth * 0.72 * Math.sin(wave) +
      tubeDepth * 0.18 * Math.sin(wave * 0.5 + 1.15);
    const dx = 752;
    const dy =
      tubeDepth * 0.72 * Math.PI * 2 * tubeBends * Math.cos(wave) +
      tubeDepth *
        0.18 *
        Math.PI *
        tubeBends *
        Math.cos(wave * 0.5 + 1.15);
    const length = Math.hypot(dx, dy);
    return { x, y, nx: -dy / length, ny: dx / length };
  };

  const radiusAt = (progress: number) => {
    const taper =
      1 - tubeTaper * Math.pow(Math.abs(progress - 0.5) * 2, 1.7);
    const edgeTexture =
      Math.sin(
        Math.PI * 2 * progress * innerRipples + phase * 0.31,
      ) *
        innerAmplitude *
        0.16 +
      Math.sin(
        Math.PI * 2 * progress * outerRipples -
          phase * 0.19 +
          bandPhase,
      ) *
        outerAmplitude *
        0.11;
    return Math.max(14, tubeWidth * 0.5 * taper + edgeTexture);
  };

  const projectedOffset = (angle: number, progress: number) => {
    const radius = radiusAt(progress);
    if (tubeStyle === "ribbon") {
      return Math.sin(angle) * radius;
    }
    return Math.sin(angle) * radius;
  };

  const place = (progress: number, offset: number) => {
    const frame = frameAt(progress);
    return rotatePoint(
      frame.x + frame.nx * offset,
      frame.y + frame.ny * offset,
      rotation,
    );
  };

  const backPaths: RenderPath[] = [];
  const frontPaths: RenderPath[] = [];
  const familyDirections = [1, -1];

  for (let family = 0; family < familyDirections.length; family += 1) {
    const direction = familyDirections[family];
    for (let thread = 0; thread < tubeThreads; thread += 1) {
      const phaseOffset = (Math.PI * 2 * thread) / tubeThreads;
      const points: Array<{ x: number; y: number }> = [];
      const frontCommands: string[] = [];
      let frontOpen = false;
      let frontDepthTotal = 0;
      let frontDepthSamples = 0;

      for (let index = 0; index <= pointCount; index += 1) {
        const progress = index / pointCount;
        const angle =
          direction * Math.PI * 2 * tubeTwist * progress +
          phaseOffset +
          phase +
          family * bandPhase;
        const depth = Math.cos(angle);
        const point = place(
          progress,
          projectedOffset(angle, progress),
        );
        points.push(point);

        if (tubeStyle === "tube" && depth > -0.04) {
          frontCommands.push(
            `${frontOpen ? "L" : "M"}${fixed(point.x)} ${fixed(point.y)}`,
          );
          frontOpen = true;
          frontDepthTotal += depth;
          frontDepthSamples += 1;
        } else {
          frontOpen = false;
        }
      }

      const laneSize = Math.max(1, Math.ceil(tubeThreads / bands));
      const colorIndex =
        Math.floor(thread / laneSize) + family * Math.max(1, bands - 1);
      backPaths.push({
        d: commandsFromPoints(points),
        colorIndex,
        opacity: tubeStyle === "tube" ? 0.2 : family ? 0.52 : 0.72,
        weight: tubeStyle === "tube" ? 0.76 : family ? 0.78 : 1,
      });

      if (frontCommands.length) {
        const meanDepth = frontDepthTotal / Math.max(1, frontDepthSamples);
        frontPaths.push({
          d: frontCommands.join(""),
          colorIndex,
          opacity: 0.72 + meanDepth * 0.28,
          weight: 0.92 + meanDepth * 0.22,
        });
      }
    }
  }

  const contourPaths: RenderPath[] = [];
  const contourCount = tubeStyle === "tube" ? 9 : 5;
  for (let contour = 0; contour < contourCount; contour += 1) {
    const normalized = -1 + (contour / Math.max(1, contourCount - 1)) * 2;
    const points: Array<{ x: number; y: number }> = [];
    for (let index = 0; index <= 900; index += 1) {
      const progress = index / 900;
      points.push(place(progress, radiusAt(progress) * normalized));
    }
    const edge = contour === 0 || contour === contourCount - 1;
    contourPaths.push({
      d: commandsFromPoints(points),
      colorIndex: Math.floor(
        ((normalized + 1) * 0.5) * Math.max(1, bands - 1),
      ),
      opacity: edge ? 0.58 : 0.14 + (1 - Math.abs(normalized)) * 0.18,
      weight: edge ? 1.2 : 0.58,
    });
  }

  return [...backPaths, ...contourPaths, ...frontPaths];
}

function fieldPaths(settings: Settings): RenderPath[] {
  const {
    nodes,
    divisor,
    innerRipples,
    outerRipples,
    innerAmplitude,
    outerAmplitude,
    phase,
    bandPhase,
    rotation,
    fieldDensity,
    fieldScale,
    fieldDrift,
    fieldCrossWeave,
    quality,
  } = settings;
  const overscan = 240;
  const totalSpan = VIEWBOX + overscan * 2;
  const rowCount = fieldDensity * 2 + 12;
  const rowGap = totalSpan / Math.max(1, rowCount - 1);
  const pointsPerLine = Math.max(
    520,
    Math.min(1200, Math.round(quality / 9)),
  );
  const weaveCycles = (nodes / divisor) * fieldScale * 2.6;
  const paths: RenderPath[] = [];

  const line = (row: number, familyAngle: number) => {
    const points: Array<{ x: number; y: number }> = [];
    const base = -overscan + row * rowGap;
    for (let index = 0; index <= pointsPerLine; index += 1) {
      const progress = index / pointsPerLine;
      const along = -overscan + progress * totalSpan;
      const drift = row * fieldDrift;
      const broad =
        Math.sin(
          Math.PI * 2 * progress * innerRipples * fieldScale * 0.18 +
            drift +
            phase,
        ) *
        innerAmplitude *
        0.82;
      const fine =
        Math.sin(
          Math.PI * 2 * progress * outerRipples * fieldScale * 0.14 -
            drift * 0.61 +
            phase * 0.5,
        ) *
        outerAmplitude *
        0.58;
      const weave =
        Math.sin(
          Math.PI * 2 * progress * weaveCycles +
            drift * 1.7 +
            bandPhase * row,
        ) *
        rowGap *
        0.62;
      const cross = base + broad + fine + weave;
      points.push(rotatePoint(along, cross, rotation + familyAngle));
    }
    return commandsFromPoints(points);
  };

  for (let row = 0; row < rowCount; row += 1) {
    paths.push({
      d: line(row, 0),
      colorIndex: Math.floor(row / 4),
      opacity: 0.84 + (row % 3) * 0.05,
    });
  }

  if (fieldCrossWeave) {
    for (let row = 0; row < rowCount; row += 1) {
      paths.push({
        d: line(row, 58),
        colorIndex: Math.floor(row / 4) + 1,
        opacity: 0.52 + (row % 2) * 0.07,
        weight: 0.9,
      });
    }
  }

  return paths;
}

function generatePaths(settings: Settings) {
  if (settings.mode === "ribbon") return ribbonPaths(settings);
  if (settings.mode === "field") return fieldPaths(settings);
  return radialPaths(settings);
}

function pathStroke(
  settings: Settings,
  path: RenderPath,
  colors: string[],
) {
  return settings.colorMode === "single"
    ? settings.ink
    : colors[path.colorIndex % colors.length];
}

function svgMarkup(settings: Settings, paths: RenderPath[]) {
  const colors = palettes[settings.palette] ?? palettes.Treasury;
  const pathMarkup = paths
    .map((path) => {
      const stroke = pathStroke(settings, path, colors);
      return `<path d="${path.d}" fill="none" stroke="${stroke}" stroke-width="${settings.lineWeight * (path.weight ?? 1)}" stroke-opacity="${settings.opacity * (path.opacity ?? 1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  const paper = settings.transparent
    ? ""
    : `<rect width="100%" height="100%" fill="${settings.paper}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${VIEWBOX}" height="${VIEWBOX}">
  <title>${settings.mode} guilloché pattern</title>
  <metadata>Generated with Rouletté Guilloché Studio</metadata>
  <defs><clipPath id="guilloche-plate"><rect width="${VIEWBOX}" height="${VIEWBOX}"/></clipPath></defs>
  ${paper}
  <g clip-path="url(#guilloche-plate)">${pathMarkup}</g>
</svg>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: RangeControlProps) {
  return (
    <label className="range-control">
      <span className="control-label">
        <span>{label}</span>
        <output>
          {Number.isInteger(step) ? value : value.toFixed(step < 0.1 ? 2 : 1)}
          {unit}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={
          {
            "--range-progress": `${((value - min) / (max - min)) * 100}%`,
          } as CSSProperties
        }
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function Home() {
  const [settings, setSettings] = useState<Settings>(baseSettings);
  const [activePreset, setActivePreset] = useState("Treasury");
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderSettings = useDeferredValue(settings);
  const paths = useMemo(() => generatePaths(renderSettings), [renderSettings]);
  const colors =
    palettes[renderSettings.palette] ?? palettes[baseSettings.palette];
  const complexity = gcd(settings.nodes, settings.divisor);
  const svg = useMemo(
    () => svgMarkup(renderSettings, paths),
    [renderSettings, paths],
  );

  const flash = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2200);
  };

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setActivePreset("Custom");
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const choosePreset = (preset: Preset) => {
    setSettings({ ...baseSettings, ...preset.settings });
    setActivePreset(preset.name);
  };

  const chooseMode = (mode: PatternMode) => {
    update("mode", mode);
    flash(
      mode === "ribbon"
        ? "Ribbon geometry loaded."
        : mode === "field"
          ? "Background field loaded."
          : "Radial geometry loaded.",
    );
  };

  const randomize = () => {
    const divisors = [17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67];
    const divisor = divisors[Math.floor(Math.random() * divisors.length)];
    let nodes = 80 + Math.floor(Math.random() * 151);
    while (gcd(nodes, divisor) !== 1) nodes += 1;
    const paletteNames = Object.keys(palettes);
    setSettings((current) => ({
      ...current,
      bands: 2 + Math.floor(Math.random() * 4),
      nodes,
      divisor,
      innerRipples: 4 + Math.floor(Math.random() * 9),
      outerRipples: 14 + Math.floor(Math.random() * 20),
      innerAmplitude: 4 + Math.floor(Math.random() * 14),
      outerAmplitude: 9 + Math.floor(Math.random() * 24),
      phase: fixed(Math.random() * Math.PI * 2),
      bandPhase: fixed(0.2 + Math.random() * 1.5),
      aspect: fixed(0.72 + Math.random() * 0.56),
      rotation: Math.floor(-24 + Math.random() * 49),
      tubeWidth: 180 + Math.floor(Math.random() * 151),
      tubeThreads: 10 + Math.floor(Math.random() * 11),
      tubeTwist: fixed(3 + Math.random() * 5),
      tubeBends: fixed(0.8 + Math.random() * 2.7),
      tubeDepth: 55 + Math.floor(Math.random() * 111),
      tubeTaper: fixed(Math.random() * 0.62),
      fieldDensity: 20 + Math.floor(Math.random() * 37),
      fieldScale: fixed(0.55 + Math.random() * 1.25),
      fieldDrift: fixed(0.12 + Math.random() * 0.62),
      palette: paletteNames[Math.floor(Math.random() * paletteNames.length)],
    }));
    setActivePreset("Custom");
    flash("A new pattern is on the press.");
  };

  const downloadSvg = () => {
    downloadBlob(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      `guilloche-${settings.mode}-${settings.nodes}-${settings.divisor}.svg`,
    );
    flash("Vector SVG exported.");
  };

  const copySvg = async () => {
    try {
      await navigator.clipboard.writeText(svg);
      flash("SVG copied to clipboard.");
    } catch {
      flash("Clipboard access was unavailable.");
    }
  };

  const downloadPng = () => {
    const source = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 2400;
      canvas.height = 2400;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(
            blob,
            `guilloche-${settings.mode}-${settings.nodes}-${settings.divisor}.png`,
          );
          flash("High-resolution PNG exported.");
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.src = url;
  };

  const modeCode =
    settings.mode === "ribbon" ? "T" : settings.mode === "field" ? "F" : "R";
  const structureLabel =
    settings.mode === "field"
      ? `${paths.length.toLocaleString()} ENGRAVED LINES`
      : settings.mode === "ribbon"
        ? `${settings.tubeThreads} × 2 HELICAL THREADS`
        : `${settings.bands} ${settings.bands === 1 ? "STRAND" : "STRANDS"}`;
  const formula =
    settings.mode === "ribbon"
      ? {
          symbol: "p(u)",
          expression: "centerline(u) + normal(u) × weave(u)",
        }
      : settings.mode === "field"
        ? {
            symbol: "yᵢ(x)",
            expression: "rowᵢ + wave₁(x) + wave₂(x) + driftᵢ",
          }
        : {
            symbol: "r(t)",
            expression: "mid + sin(t × nodes ÷ divisor) × range",
          };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Rouletté home">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>ROULETTÉ</strong>
            <small>GUILLOCHÉ STUDIO</small>
          </span>
        </a>
        <p className="edition">EDITION 02 / CURVES, RIBBONS & FIELDS</p>
      </header>

      <div className="studio-grid" id="top">
        <aside className="controls-panel" aria-label="Pattern controls">
          <section className="intro">
            <p className="eyebrow">Pattern workshop</p>
            <h1>Draw in rings, ribbons, and fields.</h1>
            <p>
              Wrap the same mathematical weave around a medallion, along a
              flowing tube, or across an entire background.
            </p>
          </section>

          <section className="control-section mode-section">
            <div className="section-heading">
              <h2>Construction</h2>
            </div>
            <div className="mode-grid">
              {modeOptions.map((option, index) => (
                <button
                  type="button"
                  key={option.mode}
                  className={`mode-card ${
                    settings.mode === option.mode ? "is-active" : ""
                  }`}
                  onClick={() => chooseMode(option.mode)}
                  aria-pressed={settings.mode === option.mode}
                >
                  <span>0{index + 1}</span>
                  <strong>{option.label}</strong>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="control-section preset-section">
            <div className="section-heading">
              <h2>Starting plate</h2>
              <button className="text-button" type="button" onClick={randomize}>
                Surprise me <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div className="preset-grid">
              {presets.map((preset, index) => (
                <button
                  type="button"
                  key={preset.name}
                  className={`preset-card ${
                    activePreset === preset.name ? "is-active" : ""
                  }`}
                  onClick={() => choosePreset(preset)}
                >
                  <span className="preset-number">0{index + 1}</span>
                  <strong>{preset.name}</strong>
                  <small>{preset.note}</small>
                </button>
              ))}
            </div>
          </section>

          <details className="control-section" open>
            <summary>
              <span>01 / Structure</span>
              <span className="summary-mark" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="control-stack">
              {settings.mode === "medallion" && (
                <>
                  <RangeControl
                    label="Bands"
                    value={settings.bands}
                    min={1}
                    max={6}
                    onChange={(value) => update("bands", value)}
                  />
                  <RangeControl
                    label="Inner radius"
                    value={settings.innerRadius}
                    min={8}
                    max={Math.max(28, settings.outerRadius - 30)}
                    onChange={(value) => update("innerRadius", value)}
                  />
                  <RangeControl
                    label="Outer radius"
                    value={settings.outerRadius}
                    min={settings.innerRadius + 30}
                    max={390}
                    onChange={(value) => update("outerRadius", value)}
                  />
                  <RangeControl
                    label="Aspect"
                    value={settings.aspect}
                    min={0.55}
                    max={1.45}
                    step={0.01}
                    onChange={(value) => update("aspect", value)}
                  />
                </>
              )}

              {settings.mode === "ribbon" && (
                <>
                  <div className="segmented" aria-label="Ribbon profile">
                    <button
                      type="button"
                      className={
                        settings.tubeStyle === "ribbon" ? "is-active" : ""
                      }
                      onClick={() => update("tubeStyle", "ribbon")}
                    >
                      Flat ribbon
                    </button>
                    <button
                      type="button"
                      className={
                        settings.tubeStyle === "tube" ? "is-active" : ""
                      }
                      onClick={() => update("tubeStyle", "tube")}
                    >
                      Round tube
                    </button>
                  </div>
                  <RangeControl
                    label="Color lanes"
                    value={settings.bands}
                    min={1}
                    max={6}
                    onChange={(value) => update("bands", value)}
                  />
                  <RangeControl
                    label="Surface threads"
                    value={settings.tubeThreads}
                    min={6}
                    max={28}
                    onChange={(value) => update("tubeThreads", value)}
                  />
                  <RangeControl
                    label="Ribbon width"
                    value={settings.tubeWidth}
                    min={60}
                    max={360}
                    onChange={(value) => update("tubeWidth", value)}
                  />
                  <RangeControl
                    label="Path bends"
                    value={settings.tubeBends}
                    min={0.5}
                    max={4}
                    step={0.1}
                    onChange={(value) => update("tubeBends", value)}
                  />
                  <RangeControl
                    label="Bend depth"
                    value={settings.tubeDepth}
                    min={0}
                    max={180}
                    onChange={(value) => update("tubeDepth", value)}
                  />
                  <RangeControl
                    label="End taper"
                    value={settings.tubeTaper}
                    min={0}
                    max={0.8}
                    step={0.01}
                    onChange={(value) => update("tubeTaper", value)}
                  />
                </>
              )}

              {settings.mode === "field" && (
                <>
                  <RangeControl
                    label="Field density"
                    value={settings.fieldDensity}
                    min={10}
                    max={72}
                    onChange={(value) => update("fieldDensity", value)}
                  />
                  <RangeControl
                    label="Wave scale"
                    value={settings.fieldScale}
                    min={0.35}
                    max={2.5}
                    step={0.01}
                    onChange={(value) => update("fieldScale", value)}
                  />
                  <RangeControl
                    label="Row drift"
                    value={settings.fieldDrift}
                    min={0}
                    max={1.5}
                    step={0.01}
                    onChange={(value) => update("fieldDrift", value)}
                  />
                  <div className="segmented" aria-label="Field weave">
                    <button
                      type="button"
                      className={!settings.fieldCrossWeave ? "is-active" : ""}
                      onClick={() => update("fieldCrossWeave", false)}
                    >
                      Flow lines
                    </button>
                    <button
                      type="button"
                      className={settings.fieldCrossWeave ? "is-active" : ""}
                      onClick={() => update("fieldCrossWeave", true)}
                    >
                      Cross weave
                    </button>
                  </div>
                </>
              )}

              <RangeControl
                label="Rotation"
                value={settings.rotation}
                min={-90}
                max={90}
                unit="°"
                onChange={(value) => update("rotation", value)}
              />
            </div>
          </details>

          <details className="control-section" open>
            <summary>
              <span>02 / Weave</span>
              <span className="summary-mark" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="control-stack">
              {settings.mode === "ribbon" ? (
                <>
                  <RangeControl
                    label="Twist turns"
                    value={settings.tubeTwist}
                    min={1}
                    max={16}
                    step={0.1}
                    onChange={(value) => update("tubeTwist", value)}
                  />
                  <div className="math-note is-good">
                    <span>Double helix</span>
                    <small>
                      Front and rear threads are depth-layered
                    </small>
                  </div>
                </>
              ) : (
                <>
                  <RangeControl
                    label={settings.mode === "field" ? "Wave nodes" : "Nodes"}
                    value={settings.nodes}
                    min={20}
                    max={260}
                    onChange={(value) => update("nodes", value)}
                  />
                  <RangeControl
                    label="Divisor"
                    value={settings.divisor}
                    min={2}
                    max={97}
                    onChange={(value) => update("divisor", value)}
                  />
                  <div
                    className={`math-note ${
                      settings.mode === "field" || complexity === 1
                        ? "is-good"
                        : "is-warning"
                    }`}
                  >
                    <span>
                      {settings.mode === "medallion"
                        ? complexity === 1
                          ? "Coprime pair"
                          : `Shared factor ${complexity}`
                        : `${(settings.nodes / settings.divisor).toFixed(2)} ratio`}
                    </span>
                    <small>
                      {settings.mode === "medallion"
                        ? complexity === 1
                          ? "Maximum overlap complexity"
                          : "Try neighboring values for a denser weave"
                        : "Sets the interference frequency"}
                    </small>
                  </div>
                </>
              )}
              <RangeControl
                label="Global phase"
                value={settings.phase}
                min={0}
                max={6.28}
                step={0.01}
                onChange={(value) => update("phase", value)}
              />
              <RangeControl
                label="Strand offset"
                value={settings.bandPhase}
                min={0}
                max={2}
                step={0.01}
                onChange={(value) => update("bandPhase", value)}
              />
            </div>
          </details>

          <details className="control-section">
            <summary>
              <span>
                03 /{" "}
                {settings.mode === "ribbon"
                  ? "Edge texture"
                  : settings.mode === "field"
                    ? "Wave blend"
                    : "Boundaries"}
              </span>
              <span className="summary-mark" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="control-stack">
              <RangeControl
                label="Primary ripples"
                value={settings.innerRipples}
                min={1}
                max={40}
                onChange={(value) => update("innerRipples", value)}
              />
              <RangeControl
                label="Secondary ripples"
                value={settings.outerRipples}
                min={1}
                max={48}
                onChange={(value) => update("outerRipples", value)}
              />
              <RangeControl
                label="Primary amplitude"
                value={settings.innerAmplitude}
                min={0}
                max={48}
                onChange={(value) => update("innerAmplitude", value)}
              />
              <RangeControl
                label="Secondary amplitude"
                value={settings.outerAmplitude}
                min={0}
                max={48}
                onChange={(value) => update("outerAmplitude", value)}
              />
            </div>
          </details>

          <details className="control-section">
            <summary>
              <span>04 / Finish</span>
              <span className="summary-mark" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="control-stack">
              <div className="segmented" aria-label="Color mode">
                <button
                  type="button"
                  className={settings.colorMode === "single" ? "is-active" : ""}
                  onClick={() => update("colorMode", "single")}
                >
                  Single ink
                </button>
                <button
                  type="button"
                  className={settings.colorMode === "layered" ? "is-active" : ""}
                  onClick={() => update("colorMode", "layered")}
                >
                  Layered
                </button>
              </div>
              <div className="segmented" aria-label="Background">
                <button
                  type="button"
                  className={!settings.transparent ? "is-active" : ""}
                  onClick={() => update("transparent", false)}
                >
                  Paper
                </button>
                <button
                  type="button"
                  className={settings.transparent ? "is-active" : ""}
                  onClick={() => update("transparent", true)}
                >
                  Transparent
                </button>
              </div>
              <label className="select-control">
                <span>Palette</span>
                <select
                  value={settings.palette}
                  onChange={(event) => update("palette", event.target.value)}
                  disabled={settings.colorMode === "single"}
                >
                  {Object.keys(palettes).map((palette) => (
                    <option value={palette} key={palette}>
                      {palette}
                    </option>
                  ))}
                </select>
              </label>
              <div className="color-row">
                <label>
                  <span>Paper</span>
                  <span className="color-field">
                    <input
                      type="color"
                      value={settings.paper}
                      onChange={(event) => update("paper", event.target.value)}
                      disabled={settings.transparent}
                    />
                    <code>{settings.paper}</code>
                  </span>
                </label>
                <label>
                  <span>Ink</span>
                  <span className="color-field">
                    <input
                      type="color"
                      value={settings.ink}
                      onChange={(event) => update("ink", event.target.value)}
                    />
                    <code>{settings.ink}</code>
                  </span>
                </label>
              </div>
              <RangeControl
                label="Line weight"
                value={settings.lineWeight}
                min={0.25}
                max={2.5}
                step={0.05}
                onChange={(value) => update("lineWeight", value)}
              />
              <RangeControl
                label="Ink opacity"
                value={settings.opacity}
                min={0.2}
                max={1}
                step={0.01}
                onChange={(value) => update("opacity", value)}
              />
              <label className="select-control">
                <span>Vector detail</span>
                <select
                  value={settings.quality}
                  onChange={(event) =>
                    update("quality", Number(event.target.value))
                  }
                >
                  <option value={4800}>Draft · 4.8k points</option>
                  <option value={9000}>Fine · 9k points</option>
                  <option value={15000}>Press · 15k points</option>
                </select>
              </label>
            </div>
          </details>
        </aside>

        <section className="preview-panel" aria-label="Guilloché preview">
          <div className="preview-toolbar">
            <div>
              <p className="eyebrow">
                Live plate / {settings.mode}
              </p>
              <h2>
                {activePreset === "Custom" ? "Untitled study" : activePreset}
              </h2>
            </div>
            <div className="toolbar-actions">
              <button className="secondary-button" type="button" onClick={copySvg}>
                Copy SVG
              </button>
              <button className="primary-button" type="button" onClick={downloadSvg}>
                Export vector <span aria-hidden="true">↓</span>
              </button>
            </div>
          </div>

          <div className="artboard-frame">
            <div className="registration registration-top">
              <span />
              <span>900 × 900</span>
              <span />
            </div>
            <div className="artboard-wrap">
              <svg
                className={`artboard ${
                  renderSettings.transparent ? "is-transparent" : ""
                }`}
                viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
                role="img"
                aria-label={
                  settings.mode === "ribbon"
                    ? `${settings.tubeStyle} guilloché with ${settings.tubeThreads} helical threads and ${settings.tubeTwist} turns`
                    : `${settings.mode} guilloché pattern with ${settings.nodes} nodes and divisor ${settings.divisor}`
                }
              >
                <defs>
                  <clipPath id="preview-plate">
                    <rect width={VIEWBOX} height={VIEWBOX} />
                  </clipPath>
                </defs>
                {!renderSettings.transparent && (
                  <rect width="100%" height="100%" fill={renderSettings.paper} />
                )}
                <g clipPath="url(#preview-plate)">
                  {paths.map((path, index) => (
                    <path
                      key={`${index}-${renderSettings.mode}`}
                      d={path.d}
                      fill="none"
                      stroke={pathStroke(renderSettings, path, colors)}
                      strokeWidth={
                        renderSettings.lineWeight * (path.weight ?? 1)
                      }
                      strokeOpacity={
                        renderSettings.opacity * (path.opacity ?? 1)
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              </svg>
            </div>
            <div className="plate-caption">
              <span>
                PLATE {modeCode}-{settings.nodes}.{settings.divisor}
              </span>
              <span>
                {structureLabel}
              </span>
            </div>
          </div>

          <div className="preview-footer">
            <div className="formula">
              <span>{formula.symbol}</span>
              <code>{formula.expression}</code>
            </div>
            <button className="png-button" type="button" onClick={downloadPng}>
              Download 2400px PNG
            </button>
          </div>
        </section>
      </div>

      <div className={`notice ${notice ? "is-visible" : ""}`} role="status">
        {notice}
      </div>
    </main>
  );
}
