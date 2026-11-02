const base = (process.argv[2] || process.env.STAGING_URL || "").replace(/\/+$/, "");
if (!base) {
  console.error("STAGING_URL is required");
  process.exit(2);
}

const checks = [
  { path: "/", expected: 200 },
  { path: "/manus-routes.json", expected: 200, json: true },
  { path: "/robots.txt", expected: 200 },
  { path: "/sitemap.xml", expected: 200 },
];

let failures = 0;
for (const check of checks) {
  const url = `${base}${check.path}`;
  try {
    const response = await fetch(url, { redirect: "manual", cache: "no-store" });
    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const statusOk = response.status === check.expected;
    const bodyOk = check.path === "/manus-routes.json"
      ? contentType.includes("application/json") && (() => {
          try {
            const parsed = JSON.parse(body);
            return Array.isArray(parsed.routes) && parsed.routes.length > 0;
          } catch {
            return false;
          }
        })()
      : body.length > 0;
    const ok = statusOk && bodyOk;
    console.log(`${ok ? "PASS" : "FAIL"} ${check.path} → ${response.status} ${contentType}`);
    if (!ok) failures++;
  } catch (error) {
    console.log(`FAIL ${check.path} → ${error.message}`);
    failures++;
  }
}

if (failures) {
  console.error(`${failures} staging smoke check(s) failed`);
  process.exit(1);
}
console.log(`Staging smoke checks passed for ${base}`);
