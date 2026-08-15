import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the guilloche studio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Rouletté \| Guilloché Pattern Studio<\/title>/i);
  assert.match(html, /Rouletté/);
  assert.match(html, /Export SVG/);
  assert.match(html, /Pattern construction tools/);
  assert.match(html, /Properties/);
  assert.match(html, /Starting plate/);
  assert.match(html, /Live plate/);
  assert.match(html, /Ribbon \/ tube/);
  assert.match(html, /Wave hatch/);
  assert.match(html, /Globe/);
  assert.match(html, /Spirograph/);
  assert.match(html, /Guilloché border/);
  assert.match(html, /Moiré interference/);
  assert.match(html, /Torus mesh/);
  assert.match(html, /Treasury/);
  assert.match(html, /Rosette/);
  assert.doesNotMatch(html, /Reference Hatch/);
  assert.match(html, /1:1/);
  assert.match(html, /Background/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("uses a Figma-style floating tool dock and contextual left inspector", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(source, /@phosphor-icons\/react/);
  assert.match(source, /className="tool-dock"/);
  assert.match(source, /className="controls-panel"/);
  assert.doesNotMatch(source, /className="construction-panel"/);
  assert.doesNotMatch(source, /Canvas aspect ratio|chooseCanvasRatio/);
  assert.doesNotMatch(source, /geometry loaded|field loaded|hatch loaded|globe loaded/i);
  assert.match(styles, /\.tool-dock[\s\S]*position: absolute/);
  assert.match(styles, /\.tool-dock[\s\S]*overflow-x: auto/);
  assert.match(styles, /\.tool-dock::-webkit-scrollbar[\s\S]*display: none/);
  assert.match(styles, /\.tool-button\.is-active[\s\S]*background: #ededed/);
});

test("includes exact border, spirograph, and moire constructions", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /function borderPaths\(settings: Settings\)/);
  assert.match(source, /signedPower\(Math\.cos\(angle\), exponent\)/);
  assert.match(source, /tangentY \/ tangentLength/);
  assert.match(source, /function spirographPaths\(settings: Settings\)/);
  assert.match(source, /spiroRollingRadius \/ gcd\(/);
  assert.match(source, /totalAngle = Math\.PI \* 2 \* closureTurns/);
  assert.match(source, /function moirePaths\(settings: Settings\)/);
  assert.match(source, /normalX = -directionY/);
  assert.match(source, /function circlePath\(/);
});

test("builds a seamless parametric torus with layered nodes", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /function torusPaths\(settings: Settings\)/);
  assert.match(source, /torusMajorRadius \+ torusMinorRadius \* Math\.cos\(v\)/);
  assert.match(source, /vertexIndex\(major \+ 1, minor\)/);
  assert.match(source, /vertexIndex\(major, minor \+ 1\)/);
  assert.match(source, /rearEdge: 0[\s\S]*rearNode: 1[\s\S]*frontEdge: 2[\s\S]*frontNode: 3/);
  assert.match(source, /selectedNodeSet\.has\(startIndex\)/);
  assert.match(source, /selectedNodeSet\.has\(endIndex\)/);
  assert.match(source, /depth >= 0 \? 1 : globeBackOpacity/);
});

test("includes deterministic globe intersection controls", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Node amount/);
  assert.match(source, /Node treatment/);
  assert.match(source, /Fill \+ stroke/);
  assert.match(source, /Node fill color/);
  assert.match(source, /Node stroke color/);
  assert.match(source, /Rounded triangle/);
  assert.match(source, /Rounded diamond/);
  assert.match(source, /Selected deterministically/);
});

test("exports globe paths with exactly front and rear opacity groups", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /depth >= 0 \? 1 : globeBackOpacity/);
  assert.match(
    source,
    /settings\.mode === "globe" \|\| settings\.mode === "torus"/,
  );
  assert.match(source, /opacity: 1, weight: 1\.08/);
  assert.match(source, /fill: true/);
  assert.match(source, /fillColor: globeNodeFill/);
  assert.match(source, /strokeColor: globeNodeStroke/);
});

test("keeps globe nodes above their hemisphere mesh without line bleed", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /rearEdge: 0[\s\S]*rearNode: 1/);
  assert.match(source, /frontEdge: 2[\s\S]*outline: 3[\s\S]*frontNode: 4/);
  assert.match(source, /nodeClearance = globeNodeSize \/ 2 \+ settings\.lineWeight \/ 2/);
  assert.match(source, /selectedNodeSet\.has\(startIndex\)/);
  assert.match(source, /selectedNodeSet\.has\(endIndex\)/);
  assert.match(source, /horizonRatio/);
  assert.match(source, /left\.layer - right\.layer \|\| left\.depth - right\.depth/);
});
