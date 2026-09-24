"use client";

import NextImage from "next/image";
import {
  useEffect,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowsClockwise } from "@phosphor-icons/react/ArrowsClockwise";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { Check } from "@phosphor-icons/react/Check";
import { CirclesThree } from "@phosphor-icons/react/CirclesThree";
import { CopySimple } from "@phosphor-icons/react/CopySimple";
import { CornersOut } from "@phosphor-icons/react/CornersOut";
import { DownloadSimple } from "@phosphor-icons/react/DownloadSimple";
import { Flower } from "@phosphor-icons/react/Flower";
import { GlobeHemisphereWest } from "@phosphor-icons/react/GlobeHemisphereWest";
import { GridFour } from "@phosphor-icons/react/GridFour";
import { IntersectThree } from "@phosphor-icons/react/IntersectThree";
import { Lifebuoy } from "@phosphor-icons/react/Lifebuoy";
import { Pause } from "@phosphor-icons/react/Pause";
import { Play } from "@phosphor-icons/react/Play";
import { Record } from "@phosphor-icons/react/Record";
import { FileJs } from "@phosphor-icons/react/FileJs";
import { WaveSine } from "@phosphor-icons/react/WaveSine";
import { Waves } from "@phosphor-icons/react/Waves";
import { strToU8, zip } from "fflate";

type ColorMode = "single" | "layered";
type PatternMode =
  | "medallion"
  | "spirograph"
  | "border"
  | "ribbon"
  | "field"
  | "moire"
  | "hatch"
  | "globe"
  | "torus";
type TubeStyle = "ribbon" | "tube";
type CanvasRatio = "1:1" | "3:2" | "16:9";
type GlobeNodeStyle = "filled" | "stroked";
type GlobeNodeShape = "circle" | "triangle" | "diamond";
type GlobeSpinDirection = 1 | -1;
type GlobeFrameRate = 30 | 60;
type SpiroType = "hypotrochoid" | "epitrochoid";
type MoireType = "linear" | "radial";

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
  spiroType: SpiroType;
  spiroFixedRadius: number;
  spiroRollingRadius: number;
  spiroPenOffset: number;
  spiroScale: number;
  spiroLayers: number;
  spiroLayerRotation: number;
  borderLayers: number;
  borderMargin: number;
  borderSpacing: number;
  borderAmplitude: number;
  borderFrequency: number;
  borderRoundness: number;
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
  moireType: MoireType;
  moireSpacing: number;
  moireAngle: number;
  moireOffset: number;
  moirePhase: number;
  hatchHeight: number;
  hatchLength: number;
  hatchSpacing: number;
  hatchMargin: number;
  globeDetail: number;
  globeRadius: number;
  globeYaw: number;
  globeTilt: number;
  globeRoll: number;
  globeSpinAxisTilt: number;
  globeSpinAxisHeading: number;
  globeSpinSpeed: number;
  globeSpinDirection: GlobeSpinDirection;
  globeFrameRate: GlobeFrameRate;
  globeBackOpacity: number;
  globeNodeAmount: number;
  globeNodeSize: number;
  globeNodeStyle: GlobeNodeStyle;
  globeNodeShape: GlobeNodeShape;
  globeStroke: string;
  globeNodeFill: string;
  globeNodeStroke: string;
  torusMajorRadius: number;
  torusMinorRadius: number;
  torusMajorSegments: number;
  torusMinorSegments: number;
  torusYaw: number;
  torusTilt: number;
  torusRoll: number;
  canvasRatio: CanvasRatio;
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
  fill?: boolean;
  stroke?: boolean;
  fillColor?: string;
  strokeColor?: string;
};

type Vector3 = { x: number; y: number; z: number };

const CANVAS_HEIGHT = 900;
const PREVIEW_QUALITY = 1800;
const canvasSizes: Record<
  CanvasRatio,
  { width: number; height: number; label: string }
> = {
  "1:1": { width: 900, height: CANVAS_HEIGHT, label: "Square" },
  "3:2": { width: 1350, height: CANVAS_HEIGHT, label: "Landscape" },
  "16:9": { width: 1600, height: CANVAS_HEIGHT, label: "Widescreen" },
};

function canvasSize(settings: Pick<Settings, "canvasRatio">) {
  return canvasSizes[settings.canvasRatio];
}

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
  { mode: "spirograph", label: "Spirograph", note: "Trochoid" },
  { mode: "border", label: "Guilloché border", note: "Frame" },
  { mode: "ribbon", label: "Ribbon / tube", note: "Flowing" },
  { mode: "field", label: "Field", note: "Background" },
  { mode: "moire", label: "Moiré interference", note: "Optical" },
  { mode: "hatch", label: "Wave hatch", note: "Parallel sine" },
  { mode: "globe", label: "Globe", note: "Geodesic mesh" },
  { mode: "torus", label: "Torus mesh", note: "Parametric" },
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
  spiroType: "hypotrochoid",
  spiroFixedRadius: 96,
  spiroRollingRadius: 37,
  spiroPenOffset: 72,
  spiroScale: 340,
  spiroLayers: 2,
  spiroLayerRotation: 3,
  borderLayers: 8,
  borderMargin: 86,
  borderSpacing: 7,
  borderAmplitude: 10,
  borderFrequency: 28,
  borderRoundness: 6,
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
  moireType: "linear",
  moireSpacing: 10,
  moireAngle: 7,
  moireOffset: 0,
  moirePhase: 0.45,
  hatchHeight: 81,
  hatchLength: 271,
  hatchSpacing: 4.55,
  hatchMargin: 68,
  globeDetail: 2,
  globeRadius: 365,
  globeYaw: -12,
  globeTilt: -8,
  globeRoll: 2,
  globeSpinAxisTilt: 0,
  globeSpinAxisHeading: 0,
  globeSpinSpeed: 10,
  globeSpinDirection: 1,
  globeFrameRate: 60,
  globeBackOpacity: 0.13,
  globeNodeAmount: 0,
  globeNodeSize: 4,
  globeNodeStyle: "filled",
  globeNodeShape: "circle",
  globeStroke: "#8C857B",
  globeNodeFill: "#173A59",
  globeNodeStroke: "#C08C56",
  torusMajorRadius: 245,
  torusMinorRadius: 92,
  torusMajorSegments: 32,
  torusMinorSegments: 14,
  torusYaw: 20,
  torusTilt: -24,
  torusRoll: -4,
  canvasRatio: "1:1",
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
    settings: { mode: "medallion" },
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
    name: "Hypotrochoid Seal",
    note: "Closed rolling curve",
    settings: {
      mode: "spirograph",
      spiroType: "hypotrochoid",
      spiroFixedRadius: 96,
      spiroRollingRadius: 37,
      spiroPenOffset: 72,
      spiroScale: 340,
      spiroLayers: 2,
      spiroLayerRotation: 3,
      lineWeight: 0.62,
      palette: "Treasury",
    },
  },
  {
    name: "Epicyclic Bloom",
    note: "Layered outer roll",
    settings: {
      mode: "spirograph",
      spiroType: "epitrochoid",
      spiroFixedRadius: 84,
      spiroRollingRadius: 29,
      spiroPenOffset: 44,
      spiroScale: 330,
      spiroLayers: 3,
      spiroLayerRotation: 2,
      lineWeight: 0.54,
      palette: "Vermilion",
    },
  },
  {
    name: "Security Frame",
    note: "Woven superellipse",
    settings: {
      mode: "border",
      borderLayers: 8,
      borderMargin: 86,
      borderSpacing: 7,
      borderAmplitude: 10,
      borderFrequency: 28,
      borderRoundness: 6,
      bandPhase: 0.55,
      lineWeight: 0.55,
      palette: "Treasury",
    },
  },
  {
    name: "Oval Reserve",
    note: "Fine engraved cartouche",
    settings: {
      mode: "border",
      borderLayers: 12,
      borderMargin: 105,
      borderSpacing: 4.5,
      borderAmplitude: 6,
      borderFrequency: 36,
      borderRoundness: 2,
      bandPhase: 0.32,
      lineWeight: 0.45,
      palette: "Botanical",
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
  {
    name: "Interference Grid",
    note: "Twin line fields",
    settings: {
      mode: "moire",
      moireType: "linear",
      moireSpacing: 10,
      moireAngle: 7,
      moireOffset: 0,
      moirePhase: 0.45,
      lineWeight: 0.48,
      opacity: 0.72,
      palette: "Treasury",
    },
  },
  {
    name: "Offset Rings",
    note: "Concentric interference",
    settings: {
      mode: "moire",
      moireType: "radial",
      moireSpacing: 12,
      moireAngle: 8,
      moireOffset: 34,
      moirePhase: 0.5,
      lineWeight: 0.58,
      opacity: 0.76,
      palette: "Midnight",
    },
  },
  {
    name: "Geodesic Globe",
    note: "Triangulated sphere",
    settings: {
      mode: "globe",
      globeDetail: 2,
      globeRadius: 365,
      globeYaw: -12,
      globeTilt: -8,
      globeRoll: 2,
      globeBackOpacity: 0.13,
      globeNodeAmount: 0,
      globeStroke: "#8C857B",
      lineWeight: 1.05,
      opacity: 0.9,
      paper: "#FBFAF7",
      ink: "#8C857B",
      colorMode: "single",
    },
  },
  {
    name: "Dense Orb",
    note: "Fine geodesic lattice",
    settings: {
      mode: "globe",
      globeDetail: 3,
      globeRadius: 350,
      globeYaw: 18,
      globeTilt: -14,
      globeRoll: -5,
      globeBackOpacity: 0.08,
      globeNodeAmount: 24,
      globeNodeSize: 2.5,
      globeNodeStyle: "stroked",
      globeNodeShape: "diamond",
      globeStroke: "#6D716E",
      globeNodeFill: "#F4F0E7",
      globeNodeStroke: "#6D716E",
      lineWeight: 0.52,
      opacity: 0.86,
      paper: "#F4F0E7",
      ink: "#6D716E",
      colorMode: "single",
    },
  },
  {
    name: "Nodal Sphere",
    note: "Marked intersections",
    settings: {
      mode: "globe",
      globeDetail: 2,
      globeRadius: 355,
      globeYaw: 8,
      globeTilt: -11,
      globeRoll: 0,
      globeBackOpacity: 0.08,
      globeNodeAmount: 100,
      globeNodeSize: 4.5,
      globeNodeStyle: "filled",
      globeNodeShape: "circle",
      globeStroke: "#765F52",
      globeNodeFill: "#765F52",
      globeNodeStroke: "#C69A63",
      lineWeight: 0.7,
      opacity: 0.9,
      paper: "#F8F4EA",
      ink: "#765F52",
      colorMode: "single",
    },
  },
  {
    name: "Wire Torus",
    note: "Two-sided ring mesh",
    settings: {
      mode: "torus",
      torusMajorRadius: 245,
      torusMinorRadius: 92,
      torusMajorSegments: 32,
      torusMinorSegments: 14,
      torusYaw: 20,
      torusTilt: -24,
      torusRoll: -4,
      globeBackOpacity: 0.12,
      globeNodeAmount: 0,
      lineWeight: 0.82,
      opacity: 0.9,
      paper: "#FBFAF7",
      ink: "#756F67",
      colorMode: "single",
    },
  },
  {
    name: "Nodal Ring",
    note: "Marked parametric lattice",
    settings: {
      mode: "torus",
      torusMajorRadius: 230,
      torusMinorRadius: 110,
      torusMajorSegments: 24,
      torusMinorSegments: 12,
      torusYaw: -16,
      torusTilt: -32,
      torusRoll: 5,
      globeBackOpacity: 0.09,
      globeNodeAmount: 35,
      globeNodeSize: 3.5,
      globeNodeStyle: "stroked",
      globeNodeShape: "diamond",
      globeNodeFill: "#F8F4EA",
      globeNodeStroke: "#765F52",
      lineWeight: 0.68,
      opacity: 0.9,
      paper: "#F8F4EA",
      ink: "#765F52",
      colorMode: "single",
    },
  },
  {
    name: "Reference Hatch",
    note: "Supplied wave study",
    settings: {
      mode: "hatch",
      hatchHeight: 81,
      hatchLength: 271,
      hatchSpacing: 4.55,
      hatchMargin: 68,
      lineWeight: 2.95,
      opacity: 1,
      paper: "#D9D9D9",
      ink: "#F7F2EB",
      colorMode: "single",
      rotation: 0,
      phase: 0,
    },
  },
  {
    name: "Security Hatch",
    note: "Fine parallel waves",
    settings: {
      mode: "hatch",
      hatchHeight: 42,
      hatchLength: 184,
      hatchSpacing: 8.5,
      hatchMargin: 24,
      lineWeight: 0.65,
      opacity: 0.92,
      paper: "#F1EBDD",
      ink: "#173A59",
      colorMode: "single",
      rotation: -8,
      phase: 0.8,
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

function precise(value: number) {
  return Number(value.toFixed(3));
}

function safeHatchThickness(
  settings: Pick<
    Settings,
    "hatchHeight" | "hatchLength" | "hatchSpacing"
  >,
) {
  const maximumSlope = (Math.PI * settings.hatchHeight) / settings.hatchLength;
  const minimumNormalSpacing =
    settings.hatchSpacing / Math.hypot(1, maximumSlope);
  const guarded = Math.min(12, minimumNormalSpacing * 0.9);
  return Math.max(0.25, fixed(Math.floor(guarded / 0.05) * 0.05));
}

function withSafeHatchThickness(settings: Settings) {
  if (settings.mode !== "hatch") return settings;
  return {
    ...settings,
    lineWeight: Math.min(settings.lineWeight, safeHatchThickness(settings)),
  };
}

function rotatePoint(
  x: number,
  y: number,
  degrees: number,
  width: number,
  height: number,
) {
  if (!degrees) return { x, y };
  const angle = (degrees * Math.PI) / 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const dx = x - centerX;
  const dy = y - centerY;
  return {
    x: centerX + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: centerY + dx * Math.sin(angle) + dy * Math.cos(angle),
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
  const { width, height } = canvasSize(settings);
  const centerX = width / 2;
  const centerY = height / 2;

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
    Math.max(1200, quality, Math.ceil(nodes * 14)),
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
        x: centerX + Math.cos(angle) * radius * xScale,
        y: centerY + Math.sin(angle) * radius * yScale,
      });
    }

    return { d: commandsFromPoints(points), colorIndex: band };
  });
}

function signedPower(value: number, exponent: number) {
  return Math.sign(value) * Math.abs(value) ** exponent;
}

function borderPaths(settings: Settings): RenderPath[] {
  const {
    borderLayers,
    borderMargin,
    borderSpacing,
    borderAmplitude,
    borderFrequency,
    borderRoundness,
    phase,
    bandPhase,
    rotation,
    quality,
  } = settings;
  const { width, height } = canvasSize(settings);
  const centerX = width / 2;
  const centerY = height / 2;
  const pointCount = Math.min(4800, Math.max(720, Math.round(quality / 2)));
  const exponent = 2 / borderRoundness;

  return Array.from({ length: borderLayers }, (_, layer) => {
    const a = Math.max(
      28,
      width / 2 - borderMargin - borderAmplitude - layer * borderSpacing,
    );
    const b = Math.max(
      28,
      height / 2 - borderMargin - borderAmplitude - layer * borderSpacing,
    );
    const basePoint = (angle: number) => ({
      x: centerX + a * signedPower(Math.cos(angle), exponent),
      y: centerY + b * signedPower(Math.sin(angle), exponent),
    });
    const points: Array<{ x: number; y: number }> = [];
    const delta = (Math.PI * 2) / pointCount;

    for (let index = 0; index < pointCount; index += 1) {
      const angle = (Math.PI * 2 * index) / pointCount;
      const previous = basePoint(angle - delta);
      const next = basePoint(angle + delta);
      const tangentX = next.x - previous.x;
      const tangentY = next.y - previous.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const wave =
        borderAmplitude *
        Math.sin(borderFrequency * angle + phase + layer * bandPhase);
      const base = basePoint(angle);
      points.push(
        rotatePoint(
          base.x + (tangentY / tangentLength) * wave,
          base.y - (tangentX / tangentLength) * wave,
          rotation,
          width,
          height,
        ),
      );
    }

    return {
      d: `${commandsFromPoints(points)}Z`,
      colorIndex: layer,
    };
  });
}

function spirographPaths(settings: Settings): RenderPath[] {
  const {
    spiroType,
    spiroFixedRadius,
    spiroRollingRadius,
    spiroPenOffset,
    spiroScale,
    spiroLayers,
    spiroLayerRotation,
    phase,
    rotation,
    quality,
  } = settings;
  const { width, height } = canvasSize(settings);
  const centerX = width / 2;
  const centerY = height / 2;
  const closureTurns = spiroRollingRadius / gcd(
    spiroFixedRadius,
    spiroRollingRadius,
  );
  const totalAngle = Math.PI * 2 * closureTurns;
  const pointCount = Math.min(
    14000,
    Math.max(
      1200,
      Math.round(quality * Math.min(4, Math.max(1, closureTurns / 4))),
    ),
  );
  const baseRadius =
    spiroType === "hypotrochoid"
      ? spiroFixedRadius - spiroRollingRadius
      : spiroFixedRadius + spiroRollingRadius;
  const maximumExtent = Math.abs(baseRadius) + spiroPenOffset || 1;
  const fit = spiroScale / maximumExtent;

  return Array.from({ length: spiroLayers }, (_, layer) => {
    const points: Array<{ x: number; y: number }> = [];
    const layerRotation = rotation + layer * spiroLayerRotation;
    for (let index = 0; index < pointCount; index += 1) {
      const t = (totalAngle * index) / pointCount + phase;
      const rollingAngle = (baseRadius / spiroRollingRadius) * t;
      const x =
        baseRadius * Math.cos(t) +
        (spiroType === "hypotrochoid" ? 1 : -1) *
          spiroPenOffset *
          Math.cos(rollingAngle);
      const y =
        baseRadius * Math.sin(t) -
        spiroPenOffset * Math.sin(rollingAngle);
      points.push(
        rotatePoint(
          centerX + x * fit,
          centerY + y * fit,
          layerRotation,
          width,
          height,
        ),
      );
    }
    return {
      d: `${commandsFromPoints(points)}Z`,
      colorIndex: layer,
      opacity: 1 - layer * 0.08,
    };
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
  const { width, height } = canvasSize(settings);
  const horizontalMargin = Math.min(110, width * 0.082);
  const run = width - horizontalMargin * 2;
  const pointCount = Math.min(1600, Math.max(600, Math.round(quality / 8)));

  const frameAt = (progress: number) => {
    const wave = Math.PI * 2 * tubeBends * progress + phase * 0.22;
    const x = horizontalMargin + progress * run;
    const y =
      height / 2 +
      tubeDepth * 0.72 * Math.sin(wave) +
      tubeDepth * 0.18 * Math.sin(wave * 0.5 + 1.15);
    const dx = run;
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
      width,
      height,
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
  const { width, height } = canvasSize(settings);
  const overscan = Math.ceil(Math.max(width, height) * 0.34);
  const horizontalSpan = width + overscan * 2;
  const verticalSpan = height + overscan * 2;
  const rowCount = fieldDensity * 2 + 12;
  const rowGap = verticalSpan / Math.max(1, rowCount - 1);
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
      const along = -overscan + progress * horizontalSpan;
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
      points.push(
        rotatePoint(
          along,
          cross,
          rotation + familyAngle,
          width,
          height,
        ),
      );
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

function circlePath(centerX: number, centerY: number, radius: number) {
  return `M${precise(centerX - radius)} ${precise(centerY)}A${precise(radius)} ${precise(radius)} 0 1 0 ${precise(centerX + radius)} ${precise(centerY)}A${precise(radius)} ${precise(radius)} 0 1 0 ${precise(centerX - radius)} ${precise(centerY)}`;
}

function moirePaths(settings: Settings): RenderPath[] {
  const {
    moireType,
    moireSpacing,
    moireAngle,
    moireOffset,
    moirePhase,
    rotation,
  } = settings;
  const { width, height } = canvasSize(settings);
  const centerX = width / 2;
  const centerY = height / 2;
  const reach = Math.hypot(width, height) * 0.72;
  const paths: RenderPath[] = [];

  if (moireType === "linear") {
    const addFamily = (family: number, angleDegrees: number, shift: number) => {
      const angle = (angleDegrees * Math.PI) / 180;
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      const normalX = -directionY;
      const normalY = directionX;
      const lineCount = Math.ceil((reach * 2) / moireSpacing) + 2;
      const start = -Math.floor(lineCount / 2);

      for (let index = 0; index < lineCount; index += 1) {
        const offset = (start + index) * moireSpacing + shift;
        const anchorX = centerX + normalX * offset;
        const anchorY = centerY + normalY * offset;
        paths.push({
          d: `M${precise(anchorX - directionX * reach)} ${precise(anchorY - directionY * reach)}L${precise(anchorX + directionX * reach)} ${precise(anchorY + directionY * reach)}`,
          colorIndex: family,
          opacity: family ? 0.82 : 1,
        });
      }
    };

    addFamily(0, rotation - moireAngle / 2, 0);
    addFamily(
      1,
      rotation + moireAngle / 2,
      moireOffset + moirePhase * moireSpacing,
    );
    return paths;
  }

  const centerAngle = (rotation * Math.PI) / 180;
  const offsetX = (Math.cos(centerAngle) * moireOffset) / 2;
  const offsetY = (Math.sin(centerAngle) * moireOffset) / 2;
  const centers = [
    { x: centerX - offsetX, y: centerY - offsetY, phase: 0 },
    {
      x: centerX + offsetX,
      y: centerY + offsetY,
      phase: moirePhase * moireSpacing,
    },
  ];

  centers.forEach((center, family) => {
    const ringCount = Math.ceil((reach + moireOffset) / moireSpacing) + 1;
    for (let ring = 1; ring <= ringCount; ring += 1) {
      const radius = ring * moireSpacing + center.phase;
      paths.push({
        d: circlePath(center.x, center.y, radius),
        colorIndex: family,
        opacity: family ? 0.82 : 1,
      });
    }
  });

  return paths;
}

function hatchPaths(settings: Settings): RenderPath[] {
  const {
    hatchHeight,
    hatchLength,
    hatchSpacing,
    phase,
    rotation,
    quality,
  } = settings;
  const { width, height } = canvasSize(settings);
  const overscan = Math.ceil(Math.max(width, height) * 0.45);
  const startX = -overscan;
  const endX = width + overscan;
  const horizontalSpan = endX - startX;
  const verticalSpan = height + overscan * 2;
  const rowCount = Math.ceil(verticalSpan / hatchSpacing) + 1;
  const amplitude = hatchHeight * 0.5;
  const angularFrequency = (Math.PI * 2) / hatchLength;
  const segmentsPerWave = quality >= 15000 ? 24 : quality <= 4800 ? 8 : 16;
  const segmentCount = Math.max(
    1,
    Math.ceil((horizontalSpan / hatchLength) * segmentsPerWave),
  );
  const segmentWidth = horizontalSpan / segmentCount;

  const curveSample = (x: number, baseline: number) => {
    const angle = angularFrequency * x + phase;
    return {
      x,
      y: baseline + amplitude * Math.sin(angle),
      slope: amplitude * angularFrequency * Math.cos(angle),
    };
  };

  return Array.from({ length: rowCount }, (_, row) => {
    const baseline = -overscan + row * hatchSpacing;
    const first = curveSample(startX, baseline);
    const firstPoint = rotatePoint(
      first.x,
      first.y,
      rotation,
      width,
      height,
    );
    const commands = [
      `M${precise(firstPoint.x)} ${precise(firstPoint.y)}`,
    ];

    for (let index = 0; index < segmentCount; index += 1) {
      const x0 = startX + index * segmentWidth;
      const x1 = index === segmentCount - 1 ? endX : x0 + segmentWidth;
      const segment = x1 - x0;
      const start = curveSample(x0, baseline);
      const end = curveSample(x1, baseline);
      const controlA = rotatePoint(
        x0 + segment / 3,
        start.y + (start.slope * segment) / 3,
        rotation,
        width,
        height,
      );
      const controlB = rotatePoint(
        x1 - segment / 3,
        end.y - (end.slope * segment) / 3,
        rotation,
        width,
        height,
      );
      const endPoint = rotatePoint(
        end.x,
        end.y,
        rotation,
        width,
        height,
      );
      commands.push(
        `C${precise(controlA.x)} ${precise(controlA.y)} ${precise(controlB.x)} ${precise(controlB.y)} ${precise(endPoint.x)} ${precise(endPoint.y)}`,
      );
    }

    return {
      d: commands.join(""),
      colorIndex: row,
    };
  });
}

function normalizeVector(vector: Vector3): Vector3 {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function rotateVector(
  vector: Vector3,
  yawDegrees: number,
  tiltDegrees: number,
  rollDegrees: number,
): Vector3 {
  const yaw = (yawDegrees * Math.PI) / 180;
  const tilt = (tiltDegrees * Math.PI) / 180;
  const roll = (rollDegrees * Math.PI) / 180;

  const yawX = vector.x * Math.cos(yaw) + vector.z * Math.sin(yaw);
  const yawZ = -vector.x * Math.sin(yaw) + vector.z * Math.cos(yaw);
  const tiltY = vector.y * Math.cos(tilt) - yawZ * Math.sin(tilt);
  const tiltZ = vector.y * Math.sin(tilt) + yawZ * Math.cos(tilt);

  return {
    x: yawX * Math.cos(roll) - tiltY * Math.sin(roll),
    y: yawX * Math.sin(roll) + tiltY * Math.cos(roll),
    z: tiltZ,
  };
}

type GlobeGeometry = {
  vertices: Vector3[];
  edges: Array<[number, number]>;
};

const globeGeometryCache = new Map<number, GlobeGeometry>();

function globeGeometry(detail: number): GlobeGeometry {
  const cached = globeGeometryCache.get(detail);
  if (cached) return cached;

  const golden = (1 + Math.sqrt(5)) / 2;
  const vertices: Vector3[] = [
    { x: -1, y: golden, z: 0 },
    { x: 1, y: golden, z: 0 },
    { x: -1, y: -golden, z: 0 },
    { x: 1, y: -golden, z: 0 },
    { x: 0, y: -1, z: golden },
    { x: 0, y: 1, z: golden },
    { x: 0, y: -1, z: -golden },
    { x: 0, y: 1, z: -golden },
    { x: golden, y: 0, z: -1 },
    { x: golden, y: 0, z: 1 },
    { x: -golden, y: 0, z: -1 },
    { x: -golden, y: 0, z: 1 },
  ].map(normalizeVector);
  let faces: Array<[number, number, number]> = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  for (let level = 0; level < detail; level += 1) {
    const midpointCache = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const cachedMidpoint = midpointCache.get(key);
      if (cachedMidpoint !== undefined) return cachedMidpoint;
      const left = vertices[a];
      const right = vertices[b];
      const index =
        vertices.push(
          normalizeVector({
            x: (left.x + right.x) / 2,
            y: (left.y + right.y) / 2,
            z: (left.z + right.z) / 2,
          }),
        ) - 1;
      midpointCache.set(key, index);
      return index;
    };

    const nextFaces: Array<[number, number, number]> = [];
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      nextFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = nextFaces;
  }

  const edgeMap = new Map<string, [number, number]>();
  for (const [a, b, c] of faces) {
    for (const [start, end] of [
      [a, b],
      [b, c],
      [c, a],
    ] as Array<[number, number]>) {
      const key = start < end ? `${start}:${end}` : `${end}:${start}`;
      if (!edgeMap.has(key)) edgeMap.set(key, [start, end]);
    }
  }

  const geometry = { vertices, edges: Array.from(edgeMap.values()) };
  globeGeometryCache.set(detail, geometry);
  return geometry;
}

function rotateAroundAxis(
  vector: Vector3,
  axis: Vector3,
  angleDegrees: number,
): Vector3 {
  const angle = (angleDegrees * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const dot = vector.x * axis.x + vector.y * axis.y + vector.z * axis.z;
  return {
    x:
      vector.x * cosine +
      (axis.y * vector.z - axis.z * vector.y) * sine +
      axis.x * dot * (1 - cosine),
    y:
      vector.y * cosine +
      (axis.z * vector.x - axis.x * vector.z) * sine +
      axis.y * dot * (1 - cosine),
    z:
      vector.z * cosine +
      (axis.x * vector.y - axis.y * vector.x) * sine +
      axis.z * dot * (1 - cosine),
  };
}

function globeSpinAxis(settings: Settings): Vector3 {
  const tilt = (settings.globeSpinAxisTilt * Math.PI) / 180;
  const heading = (settings.globeSpinAxisHeading * Math.PI) / 180;
  return normalizeVector({
    x: Math.sin(tilt) * Math.cos(heading),
    y: Math.cos(tilt),
    z: Math.sin(tilt) * Math.sin(heading),
  });
}

function projectGlobeVertices(settings: Settings, spinAngle = 0) {
  const { width, height } = canvasSize(settings);
  const centerX = width / 2;
  const centerY = height / 2;
  const axis = globeSpinAxis(settings);
  return globeGeometry(settings.globeDetail).vertices.map((vertex) => {
    const spun = rotateAroundAxis(vertex, axis, spinAngle);
    const rotated = rotateVector(
      spun,
      settings.globeYaw,
      settings.globeTilt,
      settings.globeRoll,
    );
    return {
      x: centerX + rotated.x * settings.globeRadius,
      y: centerY - rotated.y * settings.globeRadius,
      z: rotated.z,
    };
  });
}

function selectedGlobeNodeIndices(vertexCount: number, amount: number) {
  const nodeCount = Math.round(vertexCount * (amount / 100));
  return Array.from({ length: vertexCount }, (_, index) => ({
    index,
    order: Math.imul(index + 1, -1640531527) >>> 0,
  }))
    .sort((left, right) => left.order - right.order)
    .slice(0, nodeCount)
    .map(({ index }) => index);
}

function roundedPolygonPath(
  points: Array<{ x: number; y: number }>,
  rounding: number,
) {
  const corners = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(previous.x - point.x, previous.y - point.y);
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y);
    const inset = Math.min(rounding, previousLength * 0.42, nextLength * 0.42);
    return {
      point,
      entry: {
        x: point.x + ((previous.x - point.x) / previousLength) * inset,
        y: point.y + ((previous.y - point.y) / previousLength) * inset,
      },
      exit: {
        x: point.x + ((next.x - point.x) / nextLength) * inset,
        y: point.y + ((next.y - point.y) / nextLength) * inset,
      },
    };
  });
  return `${corners
    .map(
      (corner, index) =>
        `${index ? "L" : "M"}${precise(corner.entry.x)} ${precise(corner.entry.y)}Q${precise(corner.point.x)} ${precise(corner.point.y)} ${precise(corner.exit.x)} ${precise(corner.exit.y)}`,
    )
    .join("")}L${precise(corners[0].entry.x)} ${precise(corners[0].entry.y)}Z`;
}

function globeNodePath(
  x: number,
  y: number,
  size: number,
  shape: GlobeNodeShape,
) {
  const radius = size / 2;
  if (shape === "circle") {
    return `M${precise(x - radius)} ${precise(y)}A${precise(radius)} ${precise(radius)} 0 1 0 ${precise(x + radius)} ${precise(y)}A${precise(radius)} ${precise(radius)} 0 1 0 ${precise(x - radius)} ${precise(y)}Z`;
  }
  if (shape === "triangle") {
    return roundedPolygonPath(
      [
        { x, y: y - radius },
        { x: x + radius * 0.92, y: y + radius * 0.68 },
        { x: x - radius * 0.92, y: y + radius * 0.68 },
      ],
      size * 0.18,
    );
  }
  return roundedPolygonPath(
    [
      { x, y: y - radius },
      { x: x + radius, y },
      { x, y: y + radius },
      { x: x - radius, y },
    ],
    size * 0.2,
  );
}

function globePaths(settings: Settings, spinAngle = 0): RenderPath[] {
  const {
    globeRadius,
    globeBackOpacity,
    globeNodeAmount,
    globeNodeSize,
    globeNodeStyle,
    globeNodeShape,
    globeNodeFill,
    globeNodeStroke,
  } = settings;
  const { width, height } = canvasSize(settings);
  const centerX = width / 2;
  const centerY = height / 2;
  const { edges } = globeGeometry(settings.globeDetail);
  const projectedVertices = projectGlobeVertices(settings, spinAngle);
  const sideOpacity = (depth: number) =>
    depth >= 0 ? 1 : globeBackOpacity;
  const globeLayer = {
    rearEdge: 0,
    rearNode: 1,
    frontEdge: 2,
    outline: 3,
    frontNode: 4,
  } as const;
  type GlobeRenderItem = {
    depth: number;
    layer: number;
    path: RenderPath;
  };

  const selectedNodeIndices = selectedGlobeNodeIndices(
    projectedVertices.length,
    globeNodeAmount,
  );
  const selectedNodeSet = new Set(selectedNodeIndices);
  const nodeClearance = globeNodeSize / 2 + settings.lineWeight / 2;

  const edgeRenderItem = (
    start: Vector3,
    end: Vector3,
    colorIndex: number,
  ): GlobeRenderItem => {
    const depth = (start.z + end.z) / 2;
    return {
      depth,
      layer: depth >= 0 ? globeLayer.frontEdge : globeLayer.rearEdge,
      path: {
        d: `M${precise(start.x)} ${precise(start.y)}L${precise(end.x)} ${precise(end.y)}`,
        colorIndex,
        opacity: sideOpacity(depth),
        weight: 1,
      },
    };
  };

  const edgeItems = edges.flatMap(
    ([startIndex, endIndex], edgeIndex) => {
      const start = projectedVertices[startIndex];
      const end = projectedVertices[endIndex];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dz = end.z - start.z;
      const projectedLength = Math.hypot(dx, dy);
      let startInset = selectedNodeSet.has(startIndex)
        ? Math.min(nodeClearance / projectedLength, 0.42)
        : 0;
      let endInset = selectedNodeSet.has(endIndex)
        ? Math.min(nodeClearance / projectedLength, 0.42)
        : 0;
      const insetTotal = startInset + endInset;
      if (insetTotal > 0.84) {
        const insetScale = 0.84 / insetTotal;
        startInset *= insetScale;
        endInset *= insetScale;
      }
      const trimmedStart = {
        x: start.x + dx * startInset,
        y: start.y + dy * startInset,
        z: start.z + dz * startInset,
      };
      const trimmedEnd = {
        x: end.x - dx * endInset,
        y: end.y - dy * endInset,
        z: end.z - dz * endInset,
      };

      if (trimmedStart.z * trimmedEnd.z < 0) {
        const horizonRatio =
          -trimmedStart.z / (trimmedEnd.z - trimmedStart.z);
        const horizon = {
          x: trimmedStart.x + (trimmedEnd.x - trimmedStart.x) * horizonRatio,
          y: trimmedStart.y + (trimmedEnd.y - trimmedStart.y) * horizonRatio,
          z: 0,
        };
        return [
          edgeRenderItem(trimmedStart, horizon, edgeIndex),
          edgeRenderItem(horizon, trimmedEnd, edgeIndex),
        ];
      }

      return [edgeRenderItem(trimmedStart, trimmedEnd, edgeIndex)];
    },
  );
  const renderItems: GlobeRenderItem[] = [...edgeItems];

  for (const vertexIndex of selectedNodeIndices) {
    const point = projectedVertices[vertexIndex];
    renderItems.push({
      depth: point.z,
      layer:
        point.z >= 0 ? globeLayer.frontNode : globeLayer.rearNode,
      path: {
        d: globeNodePath(
          point.x,
          point.y,
          globeNodeSize,
          globeNodeShape,
        ),
        colorIndex: vertexIndex,
        opacity: sideOpacity(point.z),
        weight: 1,
        fill: true,
        stroke: globeNodeStyle === "stroked",
        fillColor: globeNodeFill,
        strokeColor: globeNodeStroke,
      },
    });
  }

  const outline = `M${precise(centerX - globeRadius)} ${precise(centerY)}A${precise(globeRadius)} ${precise(globeRadius)} 0 1 0 ${precise(centerX + globeRadius)} ${precise(centerY)}A${precise(globeRadius)} ${precise(globeRadius)} 0 1 0 ${precise(centerX - globeRadius)} ${precise(centerY)}`;
  renderItems.push({
    depth: 0,
    layer: globeLayer.outline,
    path: { d: outline, colorIndex: 0, opacity: 1, weight: 1.08 },
  });
  renderItems.sort(
    (left, right) => left.layer - right.layer || left.depth - right.depth,
  );

  return renderItems.map(({ path }) => path);
}

function torusPaths(settings: Settings): RenderPath[] {
  const {
    torusMajorRadius,
    torusMinorRadius,
    torusMajorSegments,
    torusMinorSegments,
    torusYaw,
    torusTilt,
    torusRoll,
    globeBackOpacity,
    globeNodeAmount,
    globeNodeSize,
    globeNodeStyle,
    globeNodeShape,
    globeNodeFill,
    globeNodeStroke,
  } = settings;
  const { width, height } = canvasSize(settings);
  const centerX = width / 2;
  const centerY = height / 2;
  const vertices: Vector3[] = [];
  const vertexIndex = (major: number, minor: number) =>
    ((major + torusMajorSegments) % torusMajorSegments) *
      torusMinorSegments +
    ((minor + torusMinorSegments) % torusMinorSegments);

  for (let major = 0; major < torusMajorSegments; major += 1) {
    const u = (Math.PI * 2 * major) / torusMajorSegments;
    for (let minor = 0; minor < torusMinorSegments; minor += 1) {
      const v = (Math.PI * 2 * minor) / torusMinorSegments;
      const ringRadius = torusMajorRadius + torusMinorRadius * Math.cos(v);
      vertices.push({
        x: ringRadius * Math.cos(u),
        y: torusMinorRadius * Math.sin(v),
        z: ringRadius * Math.sin(u),
      });
    }
  }

  const projectedVertices = vertices.map((vertex) => {
    const rotated = rotateVector(vertex, torusYaw, torusTilt, torusRoll);
    return {
      x: centerX + rotated.x,
      y: centerY - rotated.y,
      z: rotated.z,
    };
  });
  const edges: Array<[number, number, number]> = [];
  for (let major = 0; major < torusMajorSegments; major += 1) {
    for (let minor = 0; minor < torusMinorSegments; minor += 1) {
      const start = vertexIndex(major, minor);
      edges.push(
        [start, vertexIndex(major + 1, minor), 0],
        [start, vertexIndex(major, minor + 1), 1],
      );
    }
  }

  const nodeCount = Math.round(
    projectedVertices.length * (globeNodeAmount / 100),
  );
  const selectedNodeIndices = projectedVertices
    .map((_, index) => ({
      index,
      order: Math.imul(index + 1, -1640531527) >>> 0,
    }))
    .sort((left, right) => left.order - right.order)
    .slice(0, nodeCount)
    .map(({ index }) => index);
  const selectedNodeSet = new Set(selectedNodeIndices);
  const nodeClearance = globeNodeSize / 2 + settings.lineWeight / 2;
  const sideOpacity = (depth: number) =>
    depth >= 0 ? 1 : globeBackOpacity;
  const torusLayer = {
    rearEdge: 0,
    rearNode: 1,
    frontEdge: 2,
    frontNode: 3,
  } as const;
  type TorusRenderItem = {
    depth: number;
    layer: number;
    path: RenderPath;
  };

  const edgeRenderItem = (
    start: Vector3,
    end: Vector3,
    colorIndex: number,
  ): TorusRenderItem => {
    const depth = (start.z + end.z) / 2;
    return {
      depth,
      layer: depth >= 0 ? torusLayer.frontEdge : torusLayer.rearEdge,
      path: {
        d: `M${precise(start.x)} ${precise(start.y)}L${precise(end.x)} ${precise(end.y)}`,
        colorIndex,
        opacity: sideOpacity(depth),
        weight: 1,
      },
    };
  };

  const renderItems: TorusRenderItem[] = edges.flatMap(
    ([startIndex, endIndex, family]) => {
      const start = projectedVertices[startIndex];
      const end = projectedVertices[endIndex];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dz = end.z - start.z;
      const projectedLength = Math.hypot(dx, dy) || 1;
      let startInset = selectedNodeSet.has(startIndex)
        ? Math.min(nodeClearance / projectedLength, 0.42)
        : 0;
      let endInset = selectedNodeSet.has(endIndex)
        ? Math.min(nodeClearance / projectedLength, 0.42)
        : 0;
      const insetTotal = startInset + endInset;
      if (insetTotal > 0.84) {
        const insetScale = 0.84 / insetTotal;
        startInset *= insetScale;
        endInset *= insetScale;
      }
      const trimmedStart = {
        x: start.x + dx * startInset,
        y: start.y + dy * startInset,
        z: start.z + dz * startInset,
      };
      const trimmedEnd = {
        x: end.x - dx * endInset,
        y: end.y - dy * endInset,
        z: end.z - dz * endInset,
      };

      if (trimmedStart.z * trimmedEnd.z < 0) {
        const horizonRatio =
          -trimmedStart.z / (trimmedEnd.z - trimmedStart.z);
        const horizon = {
          x: trimmedStart.x + (trimmedEnd.x - trimmedStart.x) * horizonRatio,
          y: trimmedStart.y + (trimmedEnd.y - trimmedStart.y) * horizonRatio,
          z: 0,
        };
        return [
          edgeRenderItem(trimmedStart, horizon, family),
          edgeRenderItem(horizon, trimmedEnd, family),
        ];
      }
      return [edgeRenderItem(trimmedStart, trimmedEnd, family)];
    },
  );

  for (const index of selectedNodeIndices) {
    const point = projectedVertices[index];
    renderItems.push({
      depth: point.z,
      layer: point.z >= 0 ? torusLayer.frontNode : torusLayer.rearNode,
      path: {
        d: globeNodePath(
          point.x,
          point.y,
          globeNodeSize,
          globeNodeShape,
        ),
        colorIndex: index,
        opacity: sideOpacity(point.z),
        weight: 1,
        fill: true,
        stroke: globeNodeStyle === "stroked",
        fillColor: globeNodeFill,
        strokeColor: globeNodeStroke,
      },
    });
  }

  renderItems.sort(
    (left, right) => left.layer - right.layer || left.depth - right.depth,
  );
  return renderItems.map(({ path }) => path);
}

function generatePaths(settings: Settings, globeSpinAngle = 0) {
  if (settings.mode === "spirograph") return spirographPaths(settings);
  if (settings.mode === "border") return borderPaths(settings);
  if (settings.mode === "ribbon") return ribbonPaths(settings);
  if (settings.mode === "field") return fieldPaths(settings);
  if (settings.mode === "moire") return moirePaths(settings);
  if (settings.mode === "hatch") return hatchPaths(settings);
  if (settings.mode === "globe") return globePaths(settings, globeSpinAngle);
  if (settings.mode === "torus") return torusPaths(settings);
  return radialPaths(settings);
}

function pathStroke(
  settings: Settings,
  path: RenderPath,
  colors: string[],
) {
  if (settings.mode === "globe") return settings.globeStroke;
  return settings.colorMode === "single"
    ? settings.ink
    : colors[path.colorIndex % colors.length];
}

function pathFill(settings: Settings, path: RenderPath, colors: string[]) {
  return path.fill
    ? path.fillColor ?? pathStroke(settings, path, colors)
    : "none";
}

function pathOutline(settings: Settings, path: RenderPath, colors: string[]) {
  return (path.stroke ?? !path.fill)
    ? path.strokeColor ?? pathStroke(settings, path, colors)
    : "none";
}

function pathOpacity(settings: Settings, path: RenderPath) {
  const localOpacity = path.opacity ?? 1;
  return settings.mode === "globe" || settings.mode === "torus"
    ? localOpacity
    : settings.opacity * localOpacity;
}

function svgMarkup(settings: Settings, paths: RenderPath[]) {
  const colors = palettes[settings.palette] ?? palettes.Treasury;
  const { width, height } = canvasSize(settings);
  const clipInset = settings.mode === "hatch" ? settings.hatchMargin : 0;
  const clipWidth = width - clipInset * 2;
  const clipHeight = height - clipInset * 2;
  const linecap = settings.mode === "hatch" ? "butt" : "round";
  const pathMarkup = paths
    .map((path) => {
      const fill = pathFill(settings, path, colors);
      const stroke = pathOutline(settings, path, colors);
      const elementOpacity = pathOpacity(settings, path);
      return `<path d="${path.d}" fill="${fill}" fill-opacity="${elementOpacity}" stroke="${stroke}" stroke-width="${settings.lineWeight * (path.weight ?? 1)}" stroke-opacity="${elementOpacity}" stroke-linecap="${linecap}" stroke-linejoin="round"/>`;
    })
    .join("");
  const paper = settings.transparent
    ? ""
    : `<rect width="100%" height="100%" fill="${settings.paper}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="geometricPrecision">
  <title>${settings.mode} guilloché pattern</title>
  <metadata>Generated with Rouletté Guilloché Studio · ${settings.canvasRatio}</metadata>
  <defs><clipPath id="guilloche-plate"><rect x="${clipInset}" y="${clipInset}" width="${clipWidth}" height="${clipHeight}"/></clipPath></defs>
  ${paper}
  <g clip-path="url(#guilloche-plate)">${pathMarkup}</g>
</svg>`;
}

function drawCanvasFrame(
  canvas: HTMLCanvasElement,
  settings: Settings,
  globeSpinAngle: number,
) {
  const { width, height } = canvasSize(settings);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable.");
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  if (!settings.transparent) {
    context.fillStyle = settings.paper;
    context.fillRect(0, 0, width, height);
  }

  const colors = palettes[settings.palette] ?? palettes.Treasury;
  const paths = generatePaths(settings, globeSpinAngle);
  context.lineCap = settings.mode === "hatch" ? "butt" : "round";
  context.lineJoin = "round";
  for (const path of paths) {
    const geometry = new Path2D(path.d);
    const opacity = pathOpacity(settings, path);
    const fill = pathFill(settings, path, colors);
    const stroke = pathOutline(settings, path, colors);
    context.globalAlpha = opacity;
    if (fill !== "none") {
      context.fillStyle = fill;
      context.fill(geometry);
    }
    if (stroke !== "none") {
      context.strokeStyle = stroke;
      context.lineWidth = settings.lineWeight * (path.weight ?? 1);
      context.stroke(geometry);
    }
  }
  context.globalAlpha = 1;
}

type RecordedVideoFormat = {
  mimeType: string;
  extension: "mp4" | "webm";
  label: "MP4" | "WebM";
};

function preferredVideoFormat(): RecordedVideoFormat | null {
  if (typeof MediaRecorder === "undefined") return null;
  const formats: RecordedVideoFormat[] = [
    {
      mimeType: "video/mp4;codecs=avc1.42E01E",
      extension: "mp4",
      label: "MP4",
    },
    { mimeType: "video/mp4", extension: "mp4", label: "MP4" },
    {
      mimeType: "video/webm;codecs=vp9",
      extension: "webm",
      label: "WebM",
    },
    {
      mimeType: "video/webm;codecs=vp8",
      extension: "webm",
      label: "WebM",
    },
    { mimeType: "video/webm", extension: "webm", label: "WebM" },
  ];
  return (
    formats.find((format) => MediaRecorder.isTypeSupported(format.mimeType)) ??
    null
  );
}

type LottieShape = Record<string, unknown>;
type LottieLayer = Record<string, unknown>;

function lottieColor(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  return [0, 2, 4].map((offset) =>
    Number((Number.parseInt(value.slice(offset, offset + 2), 16) / 255).toFixed(6)),
  );
}

function lottieTransform(
  position: [number, number, number] = [0, 0, 0],
) {
  return {
    o: { a: 0, k: 100 },
    r: { a: 0, k: 0 },
    p: { a: 0, k: position },
    a: { a: 0, k: [0, 0, 0] },
    s: { a: 0, k: [100, 100, 100] },
  };
}

function lottieLineShape(start: Vector3, end: Vector3) {
  return {
    c: false,
    v: [
      [precise(start.x), precise(start.y)],
      [precise(end.x), precise(end.y)],
    ],
    i: [
      [0, 0],
      [0, 0],
    ],
    o: [
      [0, 0],
      [0, 0],
    ],
  };
}

function hemisphereSegment(start: Vector3, end: Vector3, front: boolean) {
  const startIsFront = start.z >= 0;
  const endIsFront = end.z >= 0;
  if (startIsFront === endIsFront) {
    if (startIsFront === front) return [start, end] as const;
    const collapsed = start.z >= end.z ? start : end;
    return [collapsed, collapsed] as const;
  }
  const ratio = -start.z / (end.z - start.z);
  const horizon = {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
    z: 0,
  };
  return startIsFront === front
    ? ([start, horizon] as const)
    : ([horizon, end] as const);
}

function lottieShapeKeyframes(
  values: Array<{ c: boolean; v: number[][]; i: number[][]; o: number[][] }>,
  totalFrames: number,
) {
  return values.map((value, index) => {
    const frame = Number(
      ((index / (values.length - 1)) * totalFrames).toFixed(3),
    );
    return index === values.length - 1
      ? { t: frame, s: [value] }
      : {
          t: frame,
          s: [value],
          o: { x: 0, y: 0 },
          i: { x: 1, y: 1 },
        };
  });
}

function lottiePositionKeyframes(
  values: Vector3[],
  totalFrames: number,
) {
  return values.map((value, index) => {
    const frame = Number(
      ((index / (values.length - 1)) * totalFrames).toFixed(3),
    );
    const position = [precise(value.x), precise(value.y), 0];
    return index === values.length - 1
      ? { t: frame, s: position }
      : {
          t: frame,
          s: position,
          o: { x: 0, y: 0 },
          i: { x: 1, y: 1 },
        };
  });
}

function lottieOpacityKeyframes(
  values: number[],
  totalFrames: number,
) {
  return values.map((value, index) => {
    const frame = Number(
      ((index / (values.length - 1)) * totalFrames).toFixed(3),
    );
    return index === values.length - 1
      ? { t: frame, s: [value] }
      : { t: frame, s: [value], h: 1 };
  });
}

function lottieNodeShapes(settings: Settings): LottieShape[] {
  const radius = settings.globeNodeSize / 2;
  const geometry: LottieShape =
    settings.globeNodeShape === "circle"
      ? {
          ty: "el",
          d: 1,
          p: { a: 0, k: [0, 0] },
          s: {
            a: 0,
            k: [settings.globeNodeSize, settings.globeNodeSize],
          },
          nm: "Circle node",
        }
      : {
          ty: "sr",
          sy: 2,
          d: 1,
          pt: {
            a: 0,
            k: settings.globeNodeShape === "triangle" ? 3 : 4,
          },
          p: { a: 0, k: [0, 0] },
          r: {
            a: 0,
            k: settings.globeNodeShape === "triangle" ? 0 : 45,
          },
          or: { a: 0, k: radius },
          os: { a: 0, k: 0 },
          ir: { a: 0, k: 0 },
          is: { a: 0, k: 0 },
          nm:
            settings.globeNodeShape === "triangle"
              ? "Rounded triangle node"
              : "Rounded diamond node",
        };
  const shapes: LottieShape[] = [geometry];
  if (settings.globeNodeShape !== "circle") {
    shapes.push({
      ty: "rd",
      r: { a: 0, k: settings.globeNodeSize * 0.18 },
      nm: "Node rounding",
    });
  }
  shapes.push({
    ty: "fl",
    c: { a: 0, k: lottieColor(settings.globeNodeFill) },
    o: { a: 0, k: 100 },
    r: 1,
    nm: "Node fill",
  });
  if (settings.globeNodeStyle === "stroked") {
    shapes.push({
      ty: "st",
      c: { a: 0, k: lottieColor(settings.globeNodeStroke) },
      o: { a: 0, k: 100 },
      w: { a: 0, k: settings.lineWeight },
      lc: 2,
      lj: 2,
      ml: 4,
      nm: "Node stroke",
    });
  }
  return shapes;
}

function globeLottieMarkup(settings: Settings, startingAngle: number) {
  const frameRate = settings.globeFrameRate;
  const totalFrames = Math.max(
    1,
    Math.round((60 / settings.globeSpinSpeed) * frameRate),
  );
  const sampleCount = settings.globeDetail === 3 ? 48 : 72;
  const direction = settings.globeSpinDirection;
  const samples = Array.from({ length: sampleCount + 1 }, (_, index) =>
    projectGlobeVertices(
      settings,
      startingAngle + direction * (index / sampleCount) * 360,
    ),
  );
  const { width, height } = canvasSize(settings);
  const { edges, vertices } = globeGeometry(settings.globeDetail);
  const edgeColorCount = 1;
  const selectedNodeIndices = selectedGlobeNodeIndices(
    vertices.length,
    settings.globeNodeAmount,
  );
  let layerIndex = 1;
  const layers: LottieLayer[] = [];

  const nodeLayer = (vertexIndex: number, front: boolean): LottieLayer => {
    const positions = samples.map((sample) => sample[vertexIndex]);
    const opacities = positions.map((point) => {
      const visible = front ? point.z >= 0 : point.z < 0;
      return visible ? (front ? 100 : settings.globeBackOpacity * 100) : 0;
    });
    return {
      ddd: 0,
      ind: layerIndex++,
      ty: 4,
      nm: `${front ? "Front" : "Rear"} node ${vertexIndex}`,
      sr: 1,
      ks: {
        ...lottieTransform(),
        o: { a: 1, k: lottieOpacityKeyframes(opacities, totalFrames) },
        p: { a: 1, k: lottiePositionKeyframes(positions, totalFrames) },
      },
      ao: 0,
      shapes: lottieNodeShapes(settings),
      ip: 0,
      op: totalFrames,
      st: 0,
      bm: 0,
    };
  };

  for (const vertexIndex of selectedNodeIndices) {
    layers.push(nodeLayer(vertexIndex, true));
  }

  const outlineColor = settings.globeStroke;
  layers.push({
    ddd: 0,
    ind: layerIndex++,
    ty: 4,
    nm: "Sphere outline",
    sr: 1,
    ks: lottieTransform(),
    ao: 0,
    shapes: [
      {
        ty: "el",
        d: 1,
        p: { a: 0, k: [width / 2, height / 2] },
        s: { a: 0, k: [settings.globeRadius * 2, settings.globeRadius * 2] },
        nm: "Sphere boundary",
      },
      {
        ty: "st",
        c: { a: 0, k: lottieColor(outlineColor) },
        o: { a: 0, k: 100 },
        w: { a: 0, k: settings.lineWeight * 1.08 },
        lc: 2,
        lj: 2,
        ml: 4,
        nm: "Outline stroke",
      },
    ],
    ip: 0,
    op: totalFrames,
    st: 0,
    bm: 0,
  });

  const edgeLayers = (front: boolean) => {
    for (let colorIndex = 0; colorIndex < edgeColorCount; colorIndex += 1) {
      const edgeShapes: LottieShape[] = [];
      edges.forEach(([startIndex, endIndex], edgeIndex) => {
        if (edgeIndex % edgeColorCount !== colorIndex) return;
        const values = samples.map((sample) => {
          const [start, end] = hemisphereSegment(
            sample[startIndex],
            sample[endIndex],
            front,
          );
          return lottieLineShape(start, end);
        });
        edgeShapes.push({
          ty: "sh",
          ks: { a: 1, k: lottieShapeKeyframes(values, totalFrames) },
          nm: `Edge ${edgeIndex}`,
        });
      });
      const color = settings.globeStroke;
      edgeShapes.push({
        ty: "st",
        c: { a: 0, k: lottieColor(color) },
        o: {
          a: 0,
          k: front ? 100 : settings.globeBackOpacity * 100,
        },
        w: { a: 0, k: settings.lineWeight },
        lc: 1,
        lj: 2,
        ml: 4,
        nm: `${front ? "Front" : "Rear"} mesh stroke`,
      });
      layers.push({
        ddd: 0,
        ind: layerIndex++,
        ty: 4,
        nm: `${front ? "Front" : "Rear"} mesh ${colorIndex + 1}`,
        sr: 1,
        ks: lottieTransform(),
        ao: 0,
        shapes: edgeShapes,
        ip: 0,
        op: totalFrames,
        st: 0,
        bm: 0,
      });
    }
  };

  edgeLayers(true);
  for (const vertexIndex of selectedNodeIndices) {
    layers.push(nodeLayer(vertexIndex, false));
  }
  edgeLayers(false);

  if (!settings.transparent) {
    layers.push({
      ddd: 0,
      ind: layerIndex++,
      ty: 4,
      nm: "Paper",
      sr: 1,
      ks: lottieTransform(),
      ao: 0,
      shapes: [
        {
          ty: "rc",
          d: 1,
          p: { a: 0, k: [width / 2, height / 2] },
          s: { a: 0, k: [width, height] },
          r: { a: 0, k: 0 },
          nm: "Canvas",
        },
        {
          ty: "fl",
          c: { a: 0, k: lottieColor(settings.paper) },
          o: { a: 0, k: 100 },
          r: 1,
          nm: "Paper fill",
        },
      ],
      ip: 0,
      op: totalFrames,
      st: 0,
      bm: 0,
    });
  }

  return JSON.stringify({
    v: "5.12.2",
    fr: frameRate,
    ip: 0,
    op: totalFrames,
    w: width,
    h: height,
    nm: "Rouletté rotating geodesic globe",
    ddd: 0,
    assets: [],
    layers,
    markers: [],
  });
}

function compactLottieArchive(animation: string) {
  const manifest = JSON.stringify({
    version: "1",
    generator: "Rouletté Guilloché Studio",
    animations: [
      {
        id: "globe",
        autoplay: true,
        loop: true,
        speed: 1,
        direction: 1,
        playMode: "normal",
      },
    ],
  });

  return new Promise<Uint8Array>((resolve, reject) => {
    zip(
      {
        "manifest.json": strToU8(manifest),
        "animations/globe.json": strToU8(animation),
      },
      { level: 9 },
      (error, archive) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(archive);
      },
    );
  });
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

function ModeIcon({ mode }: { mode: PatternMode }) {
  const iconProps = { size: 20, weight: "regular" as const };
  if (mode === "medallion") return <CirclesThree {...iconProps} />;
  if (mode === "spirograph") return <Flower {...iconProps} />;
  if (mode === "border") return <CornersOut {...iconProps} />;
  if (mode === "ribbon") return <Waves {...iconProps} />;
  if (mode === "field") return <GridFour {...iconProps} />;
  if (mode === "moire") return <IntersectThree {...iconProps} />;
  if (mode === "hatch") return <WaveSine {...iconProps} />;
  if (mode === "globe") return <GlobeHemisphereWest {...iconProps} />;
  return <Lifebuoy {...iconProps} />;
}

function randomizedSettings(current: Settings): Settings {
  const divisors = [17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67];
  const divisor = divisors[Math.floor(Math.random() * divisors.length)];
  let nodes = 80 + Math.floor(Math.random() * 151);
  while (gcd(nodes, divisor) !== 1) nodes += 1;
  const paletteNames = Object.keys(palettes);

  return {
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
    spiroType: Math.random() > 0.5 ? "hypotrochoid" : "epitrochoid",
    spiroFixedRadius: 58 + Math.floor(Math.random() * 83),
    spiroRollingRadius: 17 + Math.floor(Math.random() * 46),
    spiroPenOffset: 24 + Math.floor(Math.random() * 101),
    spiroScale: 230 + Math.floor(Math.random() * 141),
    spiroLayers: 1 + Math.floor(Math.random() * 4),
    spiroLayerRotation: fixed(Math.random() * 12),
    borderLayers: 4 + Math.floor(Math.random() * 11),
    borderMargin: 46 + Math.floor(Math.random() * 91),
    borderSpacing: fixed(3 + Math.random() * 10),
    borderAmplitude: 2 + Math.floor(Math.random() * 19),
    borderFrequency: 12 + Math.floor(Math.random() * 41),
    borderRoundness: fixed(2 + Math.random() * 8),
    tubeWidth: 180 + Math.floor(Math.random() * 151),
    tubeThreads: 10 + Math.floor(Math.random() * 11),
    tubeTwist: fixed(3 + Math.random() * 5),
    tubeBends: fixed(0.8 + Math.random() * 2.7),
    tubeDepth: 55 + Math.floor(Math.random() * 111),
    tubeTaper: fixed(Math.random() * 0.62),
    fieldDensity: 20 + Math.floor(Math.random() * 37),
    fieldScale: fixed(0.55 + Math.random() * 1.25),
    fieldDrift: fixed(0.12 + Math.random() * 0.62),
    moireType: Math.random() > 0.5 ? "linear" : "radial",
    moireSpacing: fixed(5 + Math.random() * 17),
    moireAngle: fixed(1 + Math.random() * 24),
    moireOffset: fixed(Math.random() * 121),
    moirePhase: fixed(Math.random()),
    hatchHeight: 24 + Math.floor(Math.random() * 117),
    hatchLength: 110 + Math.floor(Math.random() * 331),
    hatchSpacing: fixed(4 + Math.random() * 13),
    hatchMargin: Math.floor(Math.random() * 101),
    globeDetail: 1 + Math.floor(Math.random() * 3),
    globeRadius: 260 + Math.floor(Math.random() * 151),
    globeYaw: Math.floor(-180 + Math.random() * 361),
    globeTilt: Math.floor(-60 + Math.random() * 121),
    globeRoll: Math.floor(-30 + Math.random() * 61),
    globeSpinAxisTilt: Math.floor(Math.random() * 91),
    globeSpinAxisHeading: Math.floor(-180 + Math.random() * 361),
    globeSpinSpeed: 4 + Math.floor(Math.random() * 21),
    globeSpinDirection: Math.random() > 0.5 ? 1 : -1,
    globeBackOpacity: fixed(0.03 + Math.random() * 0.25),
    globeNodeAmount: Math.floor(Math.random() * 101),
    globeNodeSize: fixed(2 + Math.random() * 8),
    globeNodeStyle: Math.random() > 0.5 ? "filled" : "stroked",
    globeNodeShape: ["circle", "triangle", "diamond"][
      Math.floor(Math.random() * 3)
    ] as GlobeNodeShape,
    torusMajorRadius: 175 + Math.floor(Math.random() * 111),
    torusMinorRadius: 48 + Math.floor(Math.random() * 93),
    torusMajorSegments: 18 + Math.floor(Math.random() * 31),
    torusMinorSegments: 8 + Math.floor(Math.random() * 15),
    torusYaw: Math.floor(-180 + Math.random() * 361),
    torusTilt: Math.floor(-70 + Math.random() * 141),
    torusRoll: Math.floor(-90 + Math.random() * 181),
    lineWeight:
      current.mode === "hatch"
        ? fixed(Math.round((0.35 + Math.random() * 5.65) * 20) / 20)
        : current.lineWeight,
    palette: paletteNames[Math.floor(Math.random() * paletteNames.length)],
  };
}

export default function Home() {
  const [settings, setSettings] = useState<Settings>(baseSettings);
  const [activePreset, setActivePreset] = useState("Treasury");
  const [notice, setNotice] = useState("");
  const [isGlobeSpinning, setIsGlobeSpinning] = useState(false);
  const [globeSpinAngle, setGlobeSpinAngle] = useState(0);
  const [isRecordingGlobe, setIsRecordingGlobe] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isExportingLottie, setIsExportingLottie] = useState(false);
  const noticeTimer = useRef<number | null>(null);
  const globeSpinAngleRef = useRef(0);
  const renderSettings = useDeferredValue(settings);
  const previewSettings = useMemo(
    () => ({
      ...renderSettings,
      quality: Math.min(renderSettings.quality, PREVIEW_QUALITY),
    }),
    [renderSettings],
  );
  const paths = useMemo(
    () =>
      generatePaths(
        previewSettings,
        previewSettings.mode === "globe" ? globeSpinAngle : 0,
      ),
    [globeSpinAngle, previewSettings],
  );
  const colors =
    palettes[renderSettings.palette] ?? palettes[baseSettings.palette];
  const complexity = gcd(settings.nodes, settings.divisor);
  const activePresets = presets.filter(
    (preset) => preset.settings.mode === settings.mode,
  );
  const activeModeOption = modeOptions.find(
    (option) => option.mode === settings.mode,
  );
  const { width: canvasWidth, height: canvasHeight } =
    canvasSize(renderSettings);
  const pngWidth = Math.round(
    2400 * (canvasSizes[settings.canvasRatio].width / CANVAS_HEIGHT),
  );
  const hatchThicknessLimit = safeHatchThickness(settings);
  const globeEdgeCount = 30 * 4 ** settings.globeDetail;
  const globeVertexCount = 10 * 4 ** settings.globeDetail + 2;
  const globeVisibleNodeCount = Math.round(
    globeVertexCount * (settings.globeNodeAmount / 100),
  );
  const torusVertexCount =
    settings.torusMajorSegments * settings.torusMinorSegments;
  const torusEdgeCount = torusVertexCount * 2;
  const torusVisibleNodeCount = Math.round(
    torusVertexCount * (settings.globeNodeAmount / 100),
  );
  const spiroClosureTurns =
    settings.spiroRollingRadius /
    gcd(settings.spiroFixedRadius, settings.spiroRollingRadius);
  const globeTurnDuration = 60 / settings.globeSpinSpeed;

  useEffect(() => {
    if (
      !isGlobeSpinning ||
      isRecordingGlobe ||
      settings.mode !== "globe"
    ) {
      return;
    }
    let animationFrame = 0;
    let lastFrame: number | null = null;
    const frameInterval = 1000 / settings.globeFrameRate;
    const tick = (timestamp: number) => {
      if (lastFrame === null) lastFrame = timestamp;
      const elapsed = timestamp - lastFrame;
      if (elapsed >= frameInterval - 1) {
        const boundedElapsed = Math.min(elapsed, 100);
        const nextAngle =
          (globeSpinAngleRef.current +
            (boundedElapsed / 1000) *
              settings.globeSpinSpeed *
              6 *
              settings.globeSpinDirection +
            360) %
          360;
        globeSpinAngleRef.current = nextAngle;
        setGlobeSpinAngle(nextAngle);
        lastFrame = timestamp;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };
    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    isGlobeSpinning,
    isRecordingGlobe,
    settings.globeSpinDirection,
    settings.globeFrameRate,
    settings.globeSpinSpeed,
    settings.mode,
  ]);

  const flash = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2200);
  };

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setActivePreset("Custom");
    setSettings((current) =>
      withSafeHatchThickness({ ...current, [key]: value }),
    );
  };

  const resetGlobeSpin = () => {
    globeSpinAngleRef.current = 0;
    setGlobeSpinAngle(0);
    setIsGlobeSpinning(false);
  };

  const choosePreset = (preset: Preset) => {
    resetGlobeSpin();
    setSettings((current) =>
      withSafeHatchThickness({
        ...baseSettings,
        ...preset.settings,
        canvasRatio: current.canvasRatio,
      }),
    );
    setActivePreset(preset.name);
  };

  const chooseMode = (mode: PatternMode) => {
    resetGlobeSpin();
    const startingPlate = presets.find(
      (preset) => preset.settings.mode === mode,
    );
    setActivePreset(startingPlate?.name ?? "Custom");
    setSettings((current) =>
      withSafeHatchThickness({
        ...baseSettings,
        ...startingPlate?.settings,
        canvasRatio: current.canvasRatio,
        mode,
      }),
    );
  };

  const randomize = () => {
    resetGlobeSpin();
    setSettings((current) =>
      withSafeHatchThickness(randomizedSettings(current)),
    );
    setActivePreset("Custom");
    flash("A new pattern is on the press.");
  };

  const downloadSvg = () => {
    const exportSvg = svgMarkup(
      settings,
      generatePaths(
        settings,
        settings.mode === "globe" ? globeSpinAngleRef.current : 0,
      ),
    );
    const geometryCode =
      settings.mode === "hatch"
        ? `${settings.hatchHeight}x${settings.hatchLength}`
        : settings.mode === "globe"
          ? `detail-${settings.globeDetail}`
          : settings.mode === "torus"
            ? `${settings.torusMajorSegments}x${settings.torusMinorSegments}`
            : settings.mode === "spirograph"
              ? `${settings.spiroFixedRadius}-${settings.spiroRollingRadius}`
              : settings.mode === "border"
                ? `${settings.borderLayers}-${settings.borderFrequency}`
                : settings.mode === "moire"
                  ? `${settings.moireType}-${settings.moireSpacing}`
                  : `${settings.nodes}-${settings.divisor}`;
    downloadBlob(
      new Blob([exportSvg], { type: "image/svg+xml;charset=utf-8" }),
      `guilloche-${settings.mode}-${geometryCode}-${settings.canvasRatio.replace(":", "x")}.svg`,
    );
    flash("Vector SVG exported.");
  };

  const copySvg = async () => {
    try {
      await navigator.clipboard.writeText(
        svgMarkup(
          settings,
          generatePaths(
            settings,
            settings.mode === "globe" ? globeSpinAngleRef.current : 0,
          ),
        ),
      );
      flash("SVG copied to clipboard.");
    } catch {
      flash("Clipboard access was unavailable.");
    }
  };

  const downloadPng = () => {
    const exportSvg = svgMarkup(
      settings,
      generatePaths(
        settings,
        settings.mode === "globe" ? globeSpinAngleRef.current : 0,
      ),
    );
    const source = new Blob([exportSvg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pngWidth;
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
            `guilloche-${settings.mode}-${settings.canvasRatio.replace(":", "x")}.png`,
          );
          flash("High-resolution PNG exported.");
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.src = url;
  };

  const downloadGlobeLottie = async () => {
    if (settings.mode !== "globe" || isExportingLottie) return;
    setIsExportingLottie(true);
    flash("Building vector Lottie loop…");
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    try {
      const lottie = globeLottieMarkup(settings, globeSpinAngleRef.current);
      const archive = await compactLottieArchive(lottie);
      const reduction = Math.round(
        (1 - archive.byteLength / new Blob([lottie]).size) * 100,
      );
      const blobData = new Uint8Array(archive.byteLength);
      blobData.set(archive);
      downloadBlob(
        new Blob([blobData], { type: "application/zip+dotlottie" }),
        `guilloche-globe-${settings.globeSpinSpeed}rpm-${settings.globeFrameRate}fps-${settings.canvasRatio.replace(":", "x")}.lottie`,
      );
      flash(`Compact .lottie exported · ${reduction}% smaller.`);
    } catch {
      flash("The Lottie loop could not be generated.");
    } finally {
      setIsExportingLottie(false);
    }
  };

  const recordGlobeVideo = async () => {
    if (settings.mode !== "globe" || isRecordingGlobe) return;
    const format = preferredVideoFormat();
    const canvas = document.createElement("canvas");
    if (!format || typeof canvas.captureStream !== "function") {
      flash("Video recording is not supported in this browser.");
      return;
    }

    const wasSpinning = isGlobeSpinning;
    const startingAngle = globeSpinAngleRef.current;
    const durationMs = globeTurnDuration * 1000;
    const frameRate = settings.globeFrameRate;
    setIsGlobeSpinning(false);
    setIsRecordingGlobe(true);
    setRecordingProgress(0);
    flash(`Recording one ${format.label} turn…`);

    let stream: MediaStream | null = null;
    try {
      drawCanvasFrame(canvas, settings, startingAngle);
      stream = canvas.captureStream(frameRate);
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: format.mimeType,
        videoBitsPerSecond: frameRate === 60 ? 20_000_000 : 12_000_000,
      });
      const recordingComplete = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = () => reject(new Error("Video encoder failed."));
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: format.mimeType }));
      });

      recorder.start(250);
      await new Promise<void>((resolve) => {
        const startedAt = performance.now();
        let lastProgressUpdate = startedAt;
        const renderFrame = (timestamp: number) => {
          const progress = Math.min((timestamp - startedAt) / durationMs, 1);
          const angle =
            startingAngle + settings.globeSpinDirection * progress * 360;
          drawCanvasFrame(canvas, settings, angle);
          if (timestamp - lastProgressUpdate >= 100 || progress === 1) {
            setRecordingProgress(progress);
            lastProgressUpdate = timestamp;
          }
          if (progress < 1) {
            window.requestAnimationFrame(renderFrame);
          } else {
            window.setTimeout(() => recorder.stop(), 1000 / frameRate);
            resolve();
          }
        };
        window.requestAnimationFrame(renderFrame);
      });

      const blob = await recordingComplete;
      downloadBlob(
        blob,
        `guilloche-globe-${settings.globeSpinSpeed}rpm-${settings.globeFrameRate}fps-${settings.canvasRatio.replace(":", "x")}.${format.extension}`,
      );
      flash(`${format.label} rotation exported.`);
    } catch {
      flash("The rotation clip could not be recorded.");
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      globeSpinAngleRef.current = startingAngle;
      setGlobeSpinAngle(startingAngle);
      setRecordingProgress(0);
      setIsRecordingGlobe(false);
      setIsGlobeSpinning(wasSpinning);
    }
  };

  const modeCode =
    ({
      medallion: "R",
      spirograph: "S",
      border: "B",
      ribbon: "T",
      field: "F",
      moire: "M",
      hatch: "H",
      globe: "G",
      torus: "O",
    } satisfies Record<PatternMode, string>)[settings.mode];
  const structureLabel =
    settings.mode === "spirograph"
      ? `${settings.spiroLayers} CLOSED CURVES · ${spiroClosureTurns} TURNS`
      : settings.mode === "border"
        ? `${settings.borderLayers} WOVEN FRAMES`
        : settings.mode === "field"
          ? `${paths.length.toLocaleString()} ENGRAVED LINES`
          : settings.mode === "ribbon"
            ? `${settings.tubeThreads} × 2 HELICAL THREADS`
            : settings.mode === "moire"
              ? `${paths.length.toLocaleString()} INTERFERENCE LINES`
              : settings.mode === "hatch"
                ? `${paths.length.toLocaleString()} PARALLEL WAVES`
                : settings.mode === "globe"
                  ? `${globeEdgeCount.toLocaleString()} EDGES · ${globeVisibleNodeCount.toLocaleString()} NODES`
                  : settings.mode === "torus"
                    ? `${torusEdgeCount.toLocaleString()} EDGES · ${torusVisibleNodeCount.toLocaleString()} NODES`
                    : `${settings.bands} ${settings.bands === 1 ? "STRAND" : "STRANDS"}`;
  const formula =
    ({
      medallion: {
        symbol: "r(t)",
        expression: "mid + sin(t × nodes ÷ divisor) × range",
      },
      spirograph: {
        symbol: "p(t)",
        expression: "trochoid(R, r, d), closed at 2πr ÷ gcd(R,r)",
      },
      border: {
        symbol: "s(t)",
        expression: "superellipse(t) + normal(t) × sin(kt + phase)",
      },
      ribbon: {
        symbol: "p(u)",
        expression: "centerline(u) + normal(u) × weave(u)",
      },
      field: {
        symbol: "yᵢ(x)",
        expression: "rowᵢ + wave₁(x) + wave₂(x) + driftᵢ",
      },
      moire: {
        symbol: "M",
        expression: "family₁(θ,s) ∪ family₂(θ+Δ,s+phase)",
      },
      hatch: {
        symbol: "yᵢ(x)",
        expression: "i·spacing + (height ÷ 2) sin(2πx ÷ length + phase)",
      },
      globe: {
        symbol: "p̂",
        expression: "project(shared icosphere vertices) → edges + nodes",
      },
      torus: {
        symbol: "p(u,v)",
        expression: "((R+r cos v) cos u, r sin v, (R+r cos v) sin u)",
      },
    } satisfies Record<PatternMode, { symbol: string; expression: string }>)[
      settings.mode
    ];
  const previewAriaLabel =
    ({
      medallion: `medallion guilloché pattern with ${settings.nodes} nodes and divisor ${settings.divisor}`,
      spirograph: `${settings.spiroType} spirograph with ${settings.spiroLayers} closed curve layers`,
      border: `guilloché border with ${settings.borderLayers} woven frames and ${settings.borderFrequency} waves per frame`,
      ribbon: `${settings.tubeStyle} guilloché with ${settings.tubeThreads} helical threads and ${settings.tubeTwist} turns`,
      field: `background guilloché field with ${paths.length} engraved lines`,
      moire: `${settings.moireType} moiré interference pattern with ${settings.moireSpacing} pixel spacing`,
      hatch: `wave hatch with ${settings.hatchHeight} pixel height and ${settings.hatchLength} pixel wavelength`,
      globe: `geodesic globe with subdivision detail ${settings.globeDetail} and ${globeVisibleNodeCount} marked nodes`,
      torus: `parametric torus mesh with ${torusEdgeCount} edges and ${torusVisibleNodeCount} marked nodes`,
    } satisfies Record<PatternMode, string>)[settings.mode];
  const plateGeometry =
    ({
      medallion: `${settings.nodes}.${settings.divisor}`,
      spirograph: `${settings.spiroFixedRadius}.${settings.spiroRollingRadius}`,
      border: `${settings.borderLayers}.${settings.borderFrequency}`,
      ribbon: `${settings.tubeThreads}.${settings.tubeTwist}`,
      field: `${settings.fieldDensity}.${settings.nodes}`,
      moire: `${settings.moireSpacing}.${settings.moireAngle}`,
      hatch: `${settings.hatchHeight}.${settings.hatchLength}`,
      globe: `D${settings.globeDetail}.${settings.globeRadius}`,
      torus: `${settings.torusMajorSegments}.${settings.torusMinorSegments}`,
    } satisfies Record<PatternMode, string>)[settings.mode];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Rouletté home">
          <NextImage
            className="brand-logo"
            src="/roulette-logo.svg"
            alt=""
            width={112}
            height={30}
            priority
            aria-hidden="true"
          />
        </a>
        <div className="topbar-context" aria-live="polite">
          <span>{activeModeOption?.label}</span>
          <strong>
            {activePreset === "Custom" ? "Custom study" : activePreset}
          </strong>
        </div>
        <div className="topbar-actions">
          <button
            className="secondary-button icon-label-button"
            type="button"
            onClick={copySvg}
          >
            <CopySimple size={16} weight="regular" aria-hidden="true" />
            Copy
          </button>
          <button
            className="primary-button icon-label-button"
            type="button"
            onClick={downloadSvg}
          >
            <DownloadSimple size={16} weight="bold" aria-hidden="true" />
            Export SVG
          </button>
        </div>
      </header>

      <div className="studio-grid" id="top">
        <aside className="controls-panel" aria-label="Pattern controls">
          <header className="inspector-header">
            <div>
              <span>Properties</span>
              <h2>{activeModeOption?.label}</h2>
            </div>
            <button
              className="inspector-action"
              type="button"
              onClick={randomize}
              aria-label="Randomize pattern"
              title="Randomize"
            >
              <ArrowsClockwise size={17} weight="regular" aria-hidden="true" />
            </button>
          </header>

          <nav className="preset-section" aria-label="Starting plate">
            <div className="section-heading">
              <h3>Starting plate</h3>
            </div>
            <div className="preset-grid">
              {activePresets.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  className={`preset-card ${
                    activePreset === preset.name ? "is-active" : ""
                  }`}
                  onClick={() => choosePreset(preset)}
                  aria-pressed={activePreset === preset.name}
                >
                  <span>
                    <strong>{preset.name}</strong>
                    <small>{preset.note}</small>
                  </span>
                  {activePreset === preset.name && (
                    <Check size={14} weight="bold" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          <details className="control-section" open>
            <summary>
              <span>Structure</span>
              <span className="summary-mark" aria-hidden="true">
                <CaretDown size={13} weight="bold" />
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

              {settings.mode === "spirograph" && (
                <>
                  <div className="segmented" aria-label="Spirograph type">
                    <button
                      type="button"
                      className={
                        settings.spiroType === "hypotrochoid" ? "is-active" : ""
                      }
                      onClick={() => update("spiroType", "hypotrochoid")}
                    >
                      Inner roll
                    </button>
                    <button
                      type="button"
                      className={
                        settings.spiroType === "epitrochoid" ? "is-active" : ""
                      }
                      onClick={() => update("spiroType", "epitrochoid")}
                    >
                      Outer roll
                    </button>
                  </div>
                  <RangeControl
                    label="Fixed radius"
                    value={settings.spiroFixedRadius}
                    min={30}
                    max={160}
                    onChange={(value) => update("spiroFixedRadius", value)}
                  />
                  <RangeControl
                    label="Rolling radius"
                    value={settings.spiroRollingRadius}
                    min={8}
                    max={90}
                    onChange={(value) => update("spiroRollingRadius", value)}
                  />
                  <RangeControl
                    label="Pen offset"
                    value={settings.spiroPenOffset}
                    min={0}
                    max={160}
                    onChange={(value) => update("spiroPenOffset", value)}
                  />
                  <RangeControl
                    label="Pattern size"
                    value={settings.spiroScale}
                    min={120}
                    max={410}
                    unit=" px"
                    onChange={(value) => update("spiroScale", value)}
                  />
                  <RangeControl
                    label="Curve layers"
                    value={settings.spiroLayers}
                    min={1}
                    max={6}
                    onChange={(value) => update("spiroLayers", value)}
                  />
                </>
              )}

              {settings.mode === "border" && (
                <>
                  <RangeControl
                    label="Frame layers"
                    value={settings.borderLayers}
                    min={2}
                    max={18}
                    onChange={(value) => update("borderLayers", value)}
                  />
                  <RangeControl
                    label="Canvas margin"
                    value={settings.borderMargin}
                    min={24}
                    max={180}
                    unit=" px"
                    onChange={(value) => update("borderMargin", value)}
                  />
                  <RangeControl
                    label="Layer spacing"
                    value={settings.borderSpacing}
                    min={2}
                    max={18}
                    step={0.5}
                    unit=" px"
                    onChange={(value) => update("borderSpacing", value)}
                  />
                  <RangeControl
                    label="Corner roundness"
                    value={settings.borderRoundness}
                    min={2}
                    max={12}
                    step={0.1}
                    onChange={(value) => update("borderRoundness", value)}
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

              {settings.mode === "moire" && (
                <>
                  <div className="segmented" aria-label="Moiré family">
                    <button
                      type="button"
                      className={
                        settings.moireType === "linear" ? "is-active" : ""
                      }
                      onClick={() => update("moireType", "linear")}
                    >
                      Parallel lines
                    </button>
                    <button
                      type="button"
                      className={
                        settings.moireType === "radial" ? "is-active" : ""
                      }
                      onClick={() => update("moireType", "radial")}
                    >
                      Concentric rings
                    </button>
                  </div>
                  <RangeControl
                    label="Family spacing"
                    value={settings.moireSpacing}
                    min={4}
                    max={30}
                    step={0.25}
                    unit=" px"
                    onChange={(value) => update("moireSpacing", value)}
                  />
                  {settings.moireType === "linear" && (
                    <RangeControl
                      label="Angle difference"
                      value={settings.moireAngle}
                      min={0.25}
                      max={35}
                      step={0.25}
                      unit="°"
                      onChange={(value) => update("moireAngle", value)}
                    />
                  )}
                  <RangeControl
                    label={
                      settings.moireType === "linear"
                        ? "Family offset"
                        : "Center offset"
                    }
                    value={settings.moireOffset}
                    min={0}
                    max={180}
                    step={0.5}
                    unit=" px"
                    onChange={(value) => update("moireOffset", value)}
                  />
                  <RangeControl
                    label="Spacing phase"
                    value={settings.moirePhase}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(value) => update("moirePhase", value)}
                  />
                </>
              )}

              {settings.mode === "hatch" && (
                <>
                  <RangeControl
                    label="Wave height"
                    value={settings.hatchHeight}
                    min={0}
                    max={220}
                    unit=" px"
                    onChange={(value) => update("hatchHeight", value)}
                  />
                  <RangeControl
                    label="Wavelength"
                    value={settings.hatchLength}
                    min={60}
                    max={720}
                    unit=" px"
                    onChange={(value) => update("hatchLength", value)}
                  />
                  <RangeControl
                    label="Line spacing"
                    value={settings.hatchSpacing}
                    min={4}
                    max={30}
                    step={0.05}
                    unit=" px"
                    onChange={(value) => update("hatchSpacing", value)}
                  />
                  <RangeControl
                    label="Line thickness"
                    value={settings.lineWeight}
                    min={0.25}
                    max={hatchThicknessLimit}
                    step={0.05}
                    unit=" px"
                    onChange={(value) => update("lineWeight", value)}
                  />
                  <div className="math-note is-good">
                    <span>No-overlap limit</span>
                    <small>
                      Up to {hatchThicknessLimit.toFixed(2)} px for this slope
                    </small>
                  </div>
                  <RangeControl
                    label="Edge margin"
                    value={settings.hatchMargin}
                    min={0}
                    max={180}
                    unit=" px"
                    onChange={(value) => update("hatchMargin", value)}
                  />
                </>
              )}

              {settings.mode === "globe" && (
                <>
                  <RangeControl
                    label="Mesh detail"
                    value={settings.globeDetail}
                    min={1}
                    max={3}
                    onChange={(value) => update("globeDetail", value)}
                  />
                  <RangeControl
                    label="Globe size"
                    value={settings.globeRadius}
                    min={160}
                    max={410}
                    unit=" px"
                    onChange={(value) => update("globeRadius", value)}
                  />
                  <div className="math-note is-good">
                    <span>True icosphere</span>
                    <small>Every triangular vertex is normalized to a sphere</small>
                  </div>
                </>
              )}

              {settings.mode === "torus" && (
                <>
                  <RangeControl
                    label="Major radius"
                    value={settings.torusMajorRadius}
                    min={120}
                    max={300}
                    unit=" px"
                    onChange={(value) => update("torusMajorRadius", value)}
                  />
                  <RangeControl
                    label="Tube radius"
                    value={settings.torusMinorRadius}
                    min={30}
                    max={160}
                    unit=" px"
                    onChange={(value) => update("torusMinorRadius", value)}
                  />
                  <RangeControl
                    label="Ring segments"
                    value={settings.torusMajorSegments}
                    min={12}
                    max={64}
                    onChange={(value) => update("torusMajorSegments", value)}
                  />
                  <RangeControl
                    label="Tube segments"
                    value={settings.torusMinorSegments}
                    min={6}
                    max={32}
                    onChange={(value) => update("torusMinorSegments", value)}
                  />
                  <div className="math-note is-good">
                    <span>Exact parametric torus</span>
                    <small>Every seam wraps to the same shared vertex</small>
                  </div>
                </>
              )}

              {settings.mode !== "globe" && settings.mode !== "torus" && (
                <RangeControl
                  label="Rotation"
                  value={settings.rotation}
                  min={-90}
                  max={90}
                  unit="°"
                  onChange={(value) => update("rotation", value)}
                />
              )}
            </div>
          </details>

          <details className="control-section" open>
            <summary>
              <span>
                {settings.mode === "globe" || settings.mode === "torus"
                  ? "Projection"
                  : settings.mode === "spirograph"
                    ? "Closure"
                    : settings.mode === "border"
                      ? "Wave"
                      : settings.mode === "moire"
                        ? "Interference"
                        : "Weave"}
              </span>
              <span className="summary-mark" aria-hidden="true">
                <CaretDown size={13} weight="bold" />
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
              ) : settings.mode === "hatch" ? (
                <div className="math-note is-good">
                  <span>Congruent sine rows</span>
                  <small>
                    Identical curves, smooth tangents, constant stroke
                  </small>
                </div>
              ) : settings.mode === "globe" ? (
                <>
                  <RangeControl
                    label="Starting angle"
                    value={settings.globeYaw}
                    min={-180}
                    max={180}
                    unit="°"
                    onChange={(value) => update("globeYaw", value)}
                  />
                  <RangeControl
                    label="View tilt"
                    value={settings.globeTilt}
                    min={-90}
                    max={90}
                    unit="°"
                    onChange={(value) => update("globeTilt", value)}
                  />
                  <RangeControl
                    label="View roll"
                    value={settings.globeRoll}
                    min={-180}
                    max={180}
                    unit="°"
                    onChange={(value) => update("globeRoll", value)}
                  />
                  <RangeControl
                    label="Rear mesh opacity"
                    value={settings.globeBackOpacity}
                    min={0}
                    max={0.6}
                    step={0.01}
                    onChange={(value) => update("globeBackOpacity", value)}
                  />
                  <div className="math-note is-good">
                    <span>Two opacity groups</span>
                    <small>Front is solid; rear uses one shared opacity</small>
                  </div>
                </>
              ) : settings.mode === "torus" ? (
                <>
                  <RangeControl
                    label="Yaw"
                    value={settings.torusYaw}
                    min={-180}
                    max={180}
                    unit="°"
                    onChange={(value) => update("torusYaw", value)}
                  />
                  <RangeControl
                    label="Tilt"
                    value={settings.torusTilt}
                    min={-90}
                    max={90}
                    unit="°"
                    onChange={(value) => update("torusTilt", value)}
                  />
                  <RangeControl
                    label="Roll"
                    value={settings.torusRoll}
                    min={-180}
                    max={180}
                    unit="°"
                    onChange={(value) => update("torusRoll", value)}
                  />
                  <RangeControl
                    label="Rear mesh opacity"
                    value={settings.globeBackOpacity}
                    min={0}
                    max={0.6}
                    step={0.01}
                    onChange={(value) => update("globeBackOpacity", value)}
                  />
                  <div className="math-note is-good">
                    <span>Two opacity groups</span>
                    <small>Front is solid; rear uses one shared opacity</small>
                  </div>
                </>
              ) : settings.mode === "spirograph" ? (
                <>
                  <RangeControl
                    label="Layer rotation"
                    value={settings.spiroLayerRotation}
                    min={0}
                    max={30}
                    step={0.25}
                    unit="°"
                    onChange={(value) => update("spiroLayerRotation", value)}
                  />
                  <div className="math-note is-good">
                    <span>{spiroClosureTurns} exact turns</span>
                    <small>
                      Radius ratio closes every curve without a seam
                    </small>
                  </div>
                </>
              ) : settings.mode === "border" ? (
                <>
                  <RangeControl
                    label="Wave amplitude"
                    value={settings.borderAmplitude}
                    min={0}
                    max={32}
                    unit=" px"
                    onChange={(value) => update("borderAmplitude", value)}
                  />
                  <RangeControl
                    label="Waves per frame"
                    value={settings.borderFrequency}
                    min={4}
                    max={72}
                    onChange={(value) => update("borderFrequency", value)}
                  />
                  <div className="math-note is-good">
                    <span>Normal-offset weave</span>
                    <small>Amplitude stays perpendicular around every corner</small>
                  </div>
                </>
              ) : settings.mode === "moire" ? (
                <div className="math-note is-good">
                  <span>Two exact families</span>
                  <small>
                    {settings.moireType === "linear"
                      ? "Parallel vectors differ only by angle and phase"
                      : "Every ring shares constant radial spacing"}
                  </small>
                </div>
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
              {settings.mode !== "globe" &&
                settings.mode !== "torus" &&
                settings.mode !== "moire" && (
                <RangeControl
                  label="Global phase"
                  value={settings.phase}
                  min={0}
                  max={6.28}
                  step={0.01}
                  onChange={(value) => update("phase", value)}
                />
              )}
              {settings.mode !== "hatch" &&
                settings.mode !== "globe" &&
                settings.mode !== "torus" &&
                settings.mode !== "moire" &&
                settings.mode !== "spirograph" && (
                <RangeControl
                  label="Strand offset"
                  value={settings.bandPhase}
                  min={0}
                  max={2}
                  step={0.01}
                  onChange={(value) => update("bandPhase", value)}
                />
              )}
            </div>
          </details>

          {settings.mode === "globe" && (
            <details className="control-section" open>
              <summary>
                <span>Appearance</span>
                <span className="summary-mark" aria-hidden="true">
                  <CaretDown size={13} weight="bold" />
                </span>
              </summary>
              <div className="control-stack">
                <div className="color-row">
                  <label>
                    <span>Mesh stroke</span>
                    <span className="color-field">
                      <input
                        type="color"
                        value={settings.globeStroke}
                        aria-label="Globe mesh stroke color"
                        onChange={(event) =>
                          update("globeStroke", event.target.value)
                        }
                      />
                      <code>{settings.globeStroke}</code>
                    </span>
                  </label>
                  <label>
                    <span>Background</span>
                    <span className="color-field">
                      <input
                        type="color"
                        value={settings.paper}
                        aria-label="Globe background color"
                        disabled={settings.transparent}
                        onChange={(event) =>
                          update("paper", event.target.value)
                        }
                      />
                      <code>{settings.paper}</code>
                    </span>
                  </label>
                </div>
                <div className="segmented" aria-label="Globe background">
                  <button
                    type="button"
                    className={!settings.transparent ? "is-active" : ""}
                    onClick={() => update("transparent", false)}
                  >
                    Color
                  </button>
                  <button
                    type="button"
                    className={settings.transparent ? "is-active" : ""}
                    onClick={() => update("transparent", true)}
                  >
                    Transparent
                  </button>
                </div>
                <RangeControl
                  label="Line weight"
                  value={settings.lineWeight}
                  min={0.25}
                  max={2.5}
                  step={0.05}
                  unit=" px"
                  onChange={(value) => update("lineWeight", value)}
                />
              </div>
            </details>
          )}

          {settings.mode === "globe" && (
            <details className="control-section" open>
              <summary>
                <span>Motion</span>
                <span className="summary-mark" aria-hidden="true">
                  <CaretDown size={13} weight="bold" />
                </span>
              </summary>
              <div className="control-stack">
                <RangeControl
                  label="Axis tilt"
                  value={settings.globeSpinAxisTilt}
                  min={0}
                  max={90}
                  unit="°"
                  onChange={(value) => update("globeSpinAxisTilt", value)}
                />
                <RangeControl
                  label="Axis heading"
                  value={settings.globeSpinAxisHeading}
                  min={-180}
                  max={180}
                  unit="°"
                  onChange={(value) => update("globeSpinAxisHeading", value)}
                />
                <RangeControl
                  label="Rotation speed"
                  value={settings.globeSpinSpeed}
                  min={4}
                  max={24}
                  unit=" rpm"
                  onChange={(value) => update("globeSpinSpeed", value)}
                />
                <div className="range-control">
                  <span className="control-label">
                    <span>Frame rate</span>
                    <output>{settings.globeFrameRate} fps</output>
                  </span>
                  <div className="segmented" aria-label="Frame rate">
                    <button
                      type="button"
                      className={
                        settings.globeFrameRate === 30 ? "is-active" : ""
                      }
                      onClick={() => update("globeFrameRate", 30)}
                    >
                      30 fps
                    </button>
                    <button
                      type="button"
                      className={
                        settings.globeFrameRate === 60 ? "is-active" : ""
                      }
                      onClick={() => update("globeFrameRate", 60)}
                    >
                      60 fps
                    </button>
                  </div>
                </div>
                <div className="segmented" aria-label="Rotation direction">
                  <button
                    type="button"
                    className={
                      settings.globeSpinDirection === 1 ? "is-active" : ""
                    }
                    onClick={() => update("globeSpinDirection", 1)}
                  >
                    Clockwise
                  </button>
                  <button
                    type="button"
                    className={
                      settings.globeSpinDirection === -1 ? "is-active" : ""
                    }
                    onClick={() => update("globeSpinDirection", -1)}
                  >
                    Counterclockwise
                  </button>
                </div>
                <button
                  className={`motion-toggle ${
                    isGlobeSpinning ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => setIsGlobeSpinning((current) => !current)}
                  aria-pressed={isGlobeSpinning}
                  disabled={isRecordingGlobe}
                >
                  {isGlobeSpinning ? (
                    <Pause size={15} weight="fill" aria-hidden="true" />
                  ) : (
                    <Play size={15} weight="fill" aria-hidden="true" />
                  )}
                  {isGlobeSpinning ? "Pause rotation" : "Preview rotation"}
                </button>
                <div className="motion-export-grid">
                  <button
                    className="motion-export-button"
                    type="button"
                    onClick={recordGlobeVideo}
                    disabled={isRecordingGlobe || isExportingLottie}
                  >
                    <Record size={15} weight="fill" aria-hidden="true" />
                    {isRecordingGlobe
                      ? `${Math.round(recordingProgress * 100)}%`
                      : "Record video"}
                  </button>
                  <button
                    className="motion-export-button"
                    type="button"
                    onClick={downloadGlobeLottie}
                    disabled={isRecordingGlobe || isExportingLottie}
                  >
                    <FileJs size={15} weight="regular" aria-hidden="true" />
                    {isExportingLottie ? "Compressing…" : "Export .lottie"}
                  </button>
                </div>
                {isRecordingGlobe && (
                  <div
                    className="recording-progress"
                    role="progressbar"
                    aria-label="Recording rotation"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(recordingProgress * 100)}
                  >
                    <span
                      style={{
                        transform: `scaleX(${recordingProgress})`,
                      }}
                    />
                  </div>
                )}
                <div className="math-note is-good">
                  <span>{globeTurnDuration.toFixed(1)} s loop</span>
                  <small>
                    Exact 360° turn · {settings.globeFrameRate} fps vector or
                    video
                  </small>
                </div>
              </div>
            </details>
          )}

          {(settings.mode === "globe" || settings.mode === "torus") && (
            <details className="control-section" open>
              <summary>
                <span>Nodes</span>
                <span className="summary-mark" aria-hidden="true">
                  <CaretDown size={13} weight="bold" />
                </span>
              </summary>
              <div className="control-stack">
                <RangeControl
                  label="Node amount"
                  value={settings.globeNodeAmount}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(value) => update("globeNodeAmount", value)}
                />
                <RangeControl
                  label="Node size"
                  value={settings.globeNodeSize}
                  min={1}
                  max={18}
                  step={0.25}
                  unit=" px"
                  onChange={(value) => update("globeNodeSize", value)}
                />
                <div className="segmented" aria-label="Node treatment">
                  <button
                    type="button"
                    className={
                      settings.globeNodeStyle === "filled" ? "is-active" : ""
                    }
                    onClick={() => update("globeNodeStyle", "filled")}
                  >
                    Filled
                  </button>
                  <button
                    type="button"
                    className={
                      settings.globeNodeStyle === "stroked" ? "is-active" : ""
                    }
                    onClick={() => update("globeNodeStyle", "stroked")}
                  >
                    Fill + stroke
                  </button>
                </div>
                <div
                  className={`color-row ${
                    settings.globeNodeStyle === "filled" ? "is-single" : ""
                  }`}
                >
                  <label>
                    <span>Node fill</span>
                    <span className="color-field">
                      <input
                        type="color"
                        value={settings.globeNodeFill}
                        aria-label="Node fill color"
                        onChange={(event) =>
                          update("globeNodeFill", event.target.value)
                        }
                      />
                      <code>{settings.globeNodeFill}</code>
                    </span>
                  </label>
                  {settings.globeNodeStyle === "stroked" && (
                    <label>
                      <span>Node stroke</span>
                      <span className="color-field">
                        <input
                          type="color"
                          value={settings.globeNodeStroke}
                          aria-label="Node stroke color"
                          onChange={(event) =>
                            update("globeNodeStroke", event.target.value)
                          }
                        />
                        <code>{settings.globeNodeStroke}</code>
                      </span>
                    </label>
                  )}
                </div>
                <div className="segmented three-up" aria-label="Node shape">
                  <button
                    type="button"
                    className={
                      settings.globeNodeShape === "circle" ? "is-active" : ""
                    }
                    onClick={() => update("globeNodeShape", "circle")}
                  >
                    Circle
                  </button>
                  <button
                    type="button"
                    className={
                      settings.globeNodeShape === "triangle" ? "is-active" : ""
                    }
                    onClick={() => update("globeNodeShape", "triangle")}
                  >
                    Rounded triangle
                  </button>
                  <button
                    type="button"
                    className={
                      settings.globeNodeShape === "diamond" ? "is-active" : ""
                    }
                    onClick={() => update("globeNodeShape", "diamond")}
                  >
                    Rounded diamond
                  </button>
                </div>
                <div className="math-note is-good">
                  <span>
                    {settings.mode === "globe"
                      ? globeVisibleNodeCount
                      : torusVisibleNodeCount}{" "}
                    marked vertices
                  </span>
                  <small>
                    Selected deterministically from{" "}
                    {settings.mode === "globe"
                      ? globeVertexCount
                      : torusVertexCount}{" "}
                    shared corners
                  </small>
                </div>
              </div>
            </details>
          )}

          {(settings.mode === "medallion" ||
            settings.mode === "ribbon" ||
            settings.mode === "field") && (
            <details className="control-section">
              <summary>
                <span>
                  {settings.mode === "ribbon"
                    ? "Edge texture"
                    : settings.mode === "field"
                      ? "Wave blend"
                      : "Boundaries"}
                </span>
                <span className="summary-mark" aria-hidden="true">
                  <CaretDown size={13} weight="bold" />
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
          )}

          {settings.mode !== "globe" && (
            <details className="control-section">
              <summary>
              <span>Finish</span>
              <span className="summary-mark" aria-hidden="true">
                <CaretDown size={13} weight="bold" />
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
              {settings.mode !== "hatch" && (
                <RangeControl
                  label="Line weight"
                  value={settings.lineWeight}
                  min={0.25}
                  max={2.5}
                  step={0.05}
                  unit=" px"
                  onChange={(value) => update("lineWeight", value)}
                />
              )}
              {settings.mode !== "torus" && (
                <RangeControl
                  label="Ink opacity"
                  value={settings.opacity}
                  min={0.2}
                  max={1}
                  step={0.01}
                  onChange={(value) => update("opacity", value)}
                />
              )}
              {settings.mode !== "torus" && settings.mode !== "moire" && (
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
              )}
              </div>
            </details>
          )}
        </aside>

        <section className="preview-panel" aria-label="Guilloché preview">
          <div className="preview-toolbar">
            <div className="preview-title">
              <span>Live plate</span>
              <h2>
                {activePreset === "Custom" ? "Custom study" : activePreset}
              </h2>
            </div>
          </div>

          <nav className="tool-dock" aria-label="Pattern construction tools">
            {modeOptions.map((option) => (
              <button
                type="button"
                key={option.mode}
                className={`tool-button ${
                  settings.mode === option.mode ? "is-active" : ""
                }`}
                onClick={() => chooseMode(option.mode)}
                aria-pressed={settings.mode === option.mode}
                aria-label={option.label}
                data-tooltip={option.label}
              >
                <ModeIcon mode={option.mode} />
              </button>
            ))}
          </nav>

          <div className="artboard-frame">
            <div className="registration registration-top">
              <span />
              <span>
                {canvasSizes[settings.canvasRatio].width} ×{" "}
                {canvasSizes[settings.canvasRatio].height} ·{" "}
                {settings.canvasRatio}
              </span>
              <span />
            </div>
            <div className="artboard-wrap">
              <svg
                className={`artboard ${
                  renderSettings.transparent ? "is-transparent" : ""
                }`}
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                width={canvasWidth}
                height={canvasHeight}
                shapeRendering="geometricPrecision"
                role="img"
                aria-label={previewAriaLabel}
              >
                <defs>
                  <clipPath id="preview-plate">
                    <rect
                      x={
                        renderSettings.mode === "hatch"
                          ? renderSettings.hatchMargin
                          : 0
                      }
                      y={
                        renderSettings.mode === "hatch"
                          ? renderSettings.hatchMargin
                          : 0
                      }
                      width={
                        canvasWidth -
                        (renderSettings.mode === "hatch"
                          ? renderSettings.hatchMargin * 2
                          : 0)
                      }
                      height={
                        canvasHeight -
                        (renderSettings.mode === "hatch"
                          ? renderSettings.hatchMargin * 2
                          : 0)
                      }
                    />
                  </clipPath>
                </defs>
                {!renderSettings.transparent && (
                  <rect width="100%" height="100%" fill={renderSettings.paper} />
                )}
                <g clipPath="url(#preview-plate)">
                  {paths.map((path, index) => {
                    const elementOpacity = pathOpacity(renderSettings, path);
                    return (
                      <path
                        key={`${index}-${renderSettings.mode}`}
                        d={path.d}
                        fill={pathFill(renderSettings, path, colors)}
                        fillOpacity={elementOpacity}
                        stroke={pathOutline(renderSettings, path, colors)}
                        strokeWidth={
                          renderSettings.lineWeight * (path.weight ?? 1)
                        }
                        strokeOpacity={elementOpacity}
                        strokeLinecap={
                          renderSettings.mode === "hatch" ? "butt" : "round"
                        }
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
            <div className="plate-caption">
              <span>
                PLATE {modeCode}-{plateGeometry}
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
            <button
              className="png-button icon-label-button"
              type="button"
              onClick={downloadPng}
            >
              <DownloadSimple size={15} weight="regular" aria-hidden="true" />
              PNG {pngWidth} × 2400
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
