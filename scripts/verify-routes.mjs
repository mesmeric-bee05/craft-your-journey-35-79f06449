import { readFile } from "node:fs/promises";

const files = ["public/manus-routes.json", "dist/manus-routes.json"];
const source = JSON.parse(await readFile(files[0], "utf8"));

if (!Array.isArray(source.routes) || source.routes.length === 0) {
  throw new Error("public/manus-routes.json must contain a non-empty routes array");
}
if (source.routes.length > 1000) throw new Error("route manifest exceeds 1000 routes");

const seen = new Set();
for (const route of source.routes) {
  if (!route || typeof route.path !== "string") throw new Error("every route needs a path");
  if (!route.path.startsWith("/") || route.path.startsWith("//")) throw new Error(`invalid route path: ${route.path}`);
  if (/\s|[\u0000-\u001f]/.test(route.path)) throw new Error(`route path contains whitespace/control characters: ${route.path}`);
  if (route.path.length > 2048) throw new Error(`route path is too long: ${route.path}`);
  if (seen.has(route.path)) throw new Error(`duplicate route path: ${route.path}`);
  seen.add(route.path);
  if (route.title !== undefined && (typeof route.title !== "string" || route.title.length > 256)) {
    throw new Error(`invalid route title for ${route.path}`);
  }
}

try {
  const built = JSON.parse(await readFile(files[1], "utf8"));
  if (JSON.stringify(built) !== JSON.stringify(source)) throw new Error("dist route manifest differs from source");
} catch (error) {
  if (error.code === "ENOENT") throw new Error("run the production build before validating dist/manus-routes.json");
  throw error;
}

console.log(`Route manifest valid: ${source.routes.length} routes`);
