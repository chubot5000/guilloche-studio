"use client";

import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type ColorMode = "single" | "layered";

type Settings = {
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
  lineWeight: number;
  opacity: number;
  quality: number;
  paper: string;
  ink: string;
  palette: string;
  colorMode: ColorMode;
};

type Preset = {
  name: string;
  note: string;
  settings: Partial<Settings>;
};

const VIEWBOX = 900;
const CENTER = VIEWBOX / 2;

const palettes: Record<string, string[]> = {
  Treasury: ["#173A59", "#285E78", "#8D4C3E", "#C08C56", "#173A59"],
  Botanical: ["#173F35", "#3C6A50", "#A26943", "#C69A63", "#173F35"],
  Vermilion: ["#8E2F2A", "#B94A3A", "#244C57", "#D29454", "#8E2F2A"],
  Midnight: ["#18233B", "#40568D", "#7E4968", "#B5794D", "#18233B"],
};

const baseSettings: Settings = {
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
  lineWeight: 0.7,
  opacity: 0.84,
  quality: 9000,
  paper: "#F1EBDD",
  ink: "#173A59",
  palette: "Treasury",
  colorMode: "layered",
};

const presets: Preset[] = [
  {
    name: "Treasury",
    note: "Interlocking bands",
    settings: {},
  },
  {
    name: "Rosette",
    note: "Dense floral center",
    settings: {
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
    name: "Orbit",
    note: "Open elliptical weave",
    settings: {
      bands: 4,
      innerRadius: 106,
      outerRadius: 336,
      nodes: 97,
      divisor: 31,
      innerRipples: 5,
      outerRipples: 17,
      innerAmplitude: 16,
      outerAmplitude: 12,
      aspect: 0.72,
      rotation: -12,
      palette: "Midnight",
    },
  },
  {
    name: "Medallion",
    note: "Fine radial lattice",
    settings: {
      bands: 5,
      innerRadius: 44,
      outerRadius: 356,
      nodes: 223,
      divisor: 67,
      innerRipples: 8,
      outerRipples: 32,
      innerAmplitude: 6,
      outerAmplitude: 17,
      lineWeight: 0.52,
      palette: "Botanical",
    },
  },
];

function gcd(a: number, b: number) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x;
}

function fixed(value: number) {
  return Number(value.toFixed(2));
}

function pathForBand(settings: Settings, band: number) {
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

  const inner = boundary(band);
  const outer = boundary(band + 1);
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
  const commands: string[] = [];

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
    const x = CENTER + Math.cos(angle) * radius * xScale;
    const y = CENTER + Math.sin(angle) * radius * yScale;
    commands.push(`${index ? "L" : "M"}${fixed(x)} ${fixed(y)}`);
  }

  return commands.join("");
}

function svgMarkup(settings: Settings, paths: string[]) {
  const colors = palettes[settings.palette] ?? palettes.Treasury;
  const pathMarkup = paths
    .map((path, index) => {
      const stroke =
        settings.colorMode === "single"
          ? settings.ink
          : colors[index % colors.length];
      return `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${settings.lineWeight}" stroke-opacity="${settings.opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${VIEWBOX}" height="${VIEWBOX}">
  <title>Guilloché pattern</title>
  <metadata>Generated with Rouletté Guilloché Studio</metadata>
  <rect width="100%" height="100%" fill="${settings.paper}"/>
  ${pathMarkup}
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

  const paths = useMemo(
    () =>
      Array.from({ length: renderSettings.bands }, (_, index) =>
        pathForBand(renderSettings, index),
      ),
    [renderSettings],
  );

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
      innerRipples: 4 + Math.floor(Math.random() * 8),
      outerRipples: 15 + Math.floor(Math.random() * 20),
      innerAmplitude: 4 + Math.floor(Math.random() * 15),
      outerAmplitude: 10 + Math.floor(Math.random() * 25),
      phase: fixed(Math.random() * Math.PI * 2),
      bandPhase: fixed(0.2 + Math.random() * 1.5),
      aspect: fixed(0.72 + Math.random() * 0.56),
      rotation: Math.floor(-30 + Math.random() * 61),
      palette: paletteNames[Math.floor(Math.random() * paletteNames.length)],
    }));
    setActivePreset("Custom");
    flash("A new pattern is on the press.");
  };

  const downloadSvg = () => {
    downloadBlob(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      `guilloche-${settings.nodes}-${settings.divisor}.svg`,
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
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(
            blob,
            `guilloche-${settings.nodes}-${settings.divisor}.png`,
          );
          flash("High-resolution PNG exported.");
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.src = url;
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
        <p className="edition">EDITION 01 / PARAMETRIC ENGRAVING</p>
      </header>

      <div className="studio-grid" id="top">
        <aside className="controls-panel" aria-label="Pattern controls">
          <section className="intro">
            <p className="eyebrow">Pattern workshop</p>
            <h1>Draw with mathematics.</h1>
            <p>
              Tune a circular sine weave into intricate, press-ready linework.
              Every result remains fully editable as a vector.
            </p>
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
              <RangeControl
                label="Nodes"
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
                  complexity === 1 ? "is-good" : "is-warning"
                }`}
              >
                <span>{complexity === 1 ? "Coprime pair" : `Shared factor ${complexity}`}</span>
                <small>
                  {complexity === 1
                    ? "Maximum overlap complexity"
                    : "Try neighboring values for a denser weave"}
                </small>
              </div>
              <RangeControl
                label="Global phase"
                value={settings.phase}
                min={0}
                max={6.28}
                step={0.01}
                onChange={(value) => update("phase", value)}
              />
              <RangeControl
                label="Band offset"
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
              <span>03 / Boundaries</span>
              <span className="summary-mark" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="control-stack">
              <RangeControl
                label="Inner ripples"
                value={settings.innerRipples}
                min={1}
                max={40}
                onChange={(value) => update("innerRipples", value)}
              />
              <RangeControl
                label="Outer ripples"
                value={settings.outerRipples}
                min={1}
                max={48}
                onChange={(value) => update("outerRipples", value)}
              />
              <RangeControl
                label="Inner amplitude"
                value={settings.innerAmplitude}
                min={0}
                max={48}
                onChange={(value) => update("innerAmplitude", value)}
              />
              <RangeControl
                label="Outer amplitude"
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
              <p className="eyebrow">Live plate</p>
              <h2>{activePreset === "Custom" ? "Untitled study" : activePreset}</h2>
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
                className="artboard"
                viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
                role="img"
                aria-label={`${settings.bands}-band guilloché pattern with ${settings.nodes} nodes and divisor ${settings.divisor}`}
              >
                <rect width="100%" height="100%" fill={renderSettings.paper} />
                {paths.map((path, index) => (
                  <path
                    key={`${index}-${renderSettings.bands}`}
                    d={path}
                    fill="none"
                    stroke={
                      renderSettings.colorMode === "single"
                        ? renderSettings.ink
                        : colors[index % colors.length]
                    }
                    strokeWidth={renderSettings.lineWeight}
                    strokeOpacity={renderSettings.opacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            </div>
            <div className="plate-caption">
              <span>PLATE R-{settings.nodes}.{settings.divisor}</span>
              <span>
                {settings.bands} {settings.bands === 1 ? "BAND" : "BANDS"} /{" "}
                {settings.quality.toLocaleString()} PTS
              </span>
            </div>
          </div>

          <div className="preview-footer">
            <div className="formula">
              <span>r(t)</span>
              <code>mid + sin(t × nodes ÷ divisor) × range</code>
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
