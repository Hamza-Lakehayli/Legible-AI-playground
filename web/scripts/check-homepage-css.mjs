import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const cssRoot = path.resolve(".next/static");
const motionComponentPath = path.resolve("components/marketing/homepage-motion.tsx");
const glitchStagePath = path.resolve("components/marketing/glitch-stage.tsx");
const cubeHoverPath = path.resolve("components/marketing/cube-hover.ts");

async function findCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findCssFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".css")
        ? [entryPath]
        : [];
    }),
  );

  return nested.flat();
}

let cssFiles;
try {
  cssFiles = await findCssFiles(cssRoot);
} catch {
  throw new Error(
    "No built CSS found. Run this check after `next build` from the web directory.",
  );
}

if (cssFiles.length === 0) {
  throw new Error("The Next.js build emitted no CSS files in .next/static.");
}

const builtCss = (
  await Promise.all(cssFiles.map((file) => readFile(file, "utf8")))
).join("\n");

const requiredRules = [
  ["homepage chapter layout", /\.home-chapter\s*\{/],
  ["raised homepage surfaces", /\.home-sheet\s*\{/],
  ["homepage backdrop host", /\.home-backdrop\s*\{/],
  ["3D cube bodies", /\.home-space-cube__body\s*\{/],
  ["3D face depth", /translateZ\(/],
  ["pause control", /\.home-motion-control\s*\{/],
  ["projected cube tear strips", /\.home-cube-tear-strip(?:__content)?[,\s{]/],
  ["stable responsive cube identity", /\[data-cube-index=/],
  ["rim rendering", /\.home-space-cube__face\s*\{/],
  ["canvas image viewport limit", /--canvas-preview-height/],
];

const missing = requiredRules
  .filter(([, pattern]) => !pattern.test(builtCss))
  .map(([label]) => label);

if (missing.length > 0) {
  throw new Error(`Built homepage CSS is missing: ${missing.join(", ")}.`);
}

const motionComponent = await readFile(motionComponentPath, "utf8");
if (
  !motionComponent.includes("CUBE_FACES.map") ||
  !motionComponent.includes('vectorEffect="non-scaling-stroke"') ||
  !motionComponent.includes("data-home-cube-group") ||
  !motionComponent.includes("data-cube-index={index}") ||
  !motionComponent.includes("disconnectClosingObserver") ||
  !motionComponent.includes("hostIsActive") ||
  !motionComponent.includes('aria-hidden="true"')
) {
  throw new Error("The homepage 3D cube scene or its decorative semantics are missing.");
}

const [glitchStage, cubeHover] = await Promise.all([
  readFile(glitchStagePath, "utf8"),
  readFile(cubeHoverPath, "utf8"),
]);
if (
  !glitchStage.includes("wraps.unshift(buildWrap(cubeBackdrop, true))") ||
  !glitchStage.includes("cloneNode.style.transform = computed.transform") ||
  !glitchStage.includes('reduced.addEventListener("change", onReducedMotionChange)') ||
  !glitchStage.includes("reducedDuringTransition || isReduced()") ||
  !cubeHover.includes("cubeTearSlices") ||
  !cubeHover.includes("strip.style.clipPath")
) {
  throw new Error("The synchronized cube entrance or complementary hover tears are missing.");
}

console.log(`Homepage CSS and 3D scene verified in ${cssFiles.length} built stylesheet(s).`);
