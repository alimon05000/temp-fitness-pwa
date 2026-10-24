import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const base = process.env.VITE_BASE_PATH || "/";
if (!base.startsWith("/") || !base.endsWith("/"))
  throw new Error("VITE_BASE_PATH must start and end with /");
await writeFile(
  "dist/manifest.webmanifest",
  JSON.stringify(
    {
      id: base,
      name: "ТЕМП — дневник тренировок",
      short_name: "ТЕМП",
      lang: "ru",
      description: "Бег, сила и личный прогресс. В своём ритме.",
      start_url: base,
      scope: base,
      display: "standalone",
      theme_color: "#f6f6f8",
      background_color: "#f6f6f8",
      icons: [
        {
          src: "icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "icons/maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    null,
    2,
  ),
);
async function files(dir) {
  const list = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      list.map((e) =>
        e.isDirectory()
          ? files(path.join(dir, e.name))
          : path.join(dir, e.name),
      ),
    )
  ).flat();
}
const assets = (await files("dist")).filter((f) => !f.endsWith("sw.js"));
const hash = createHash("sha256");
for (const f of assets) hash.update(await readFile(f));
const version = hash.digest("hex").slice(0, 12);
const prefix = `temp-${createHash("sha256").update(base).digest("hex").slice(0, 8)}-`;
const urls = assets.map(
  (f) => base + path.relative("dist", f).replaceAll("\\", "/"),
);
urls.push(base);
await writeFile(
  "dist/sw.js",
  `/* Generated app shell, build ${version}. No training data or API requests cached. */
const PREFIX=${JSON.stringify(prefix)};const CACHE=PREFIX+'${version}';const BASE=${JSON.stringify(base)};const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{clients.filter(c=>new URL(c.url).pathname.startsWith(BASE)).forEach(c=>c.postMessage('RELOAD_TEMP'));return self.skipWaiting()}))});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE)||url.pathname.includes('/api/'))return;
if(req.mode==='navigate'){event.respondWith(fetch(req).then(r=>r.ok?r:caches.match(BASE)).catch(()=>caches.match(BASE)));return}
if(ASSETS.includes(url.pathname)){event.respondWith(caches.open(CACHE).then(cache=>cache.match(req,{ignoreVary:true}).then(r=>r||fetch(req))))}
});
`,
);
console.log(
  `PWA: ${assets.length} assets precached, scope ${base}, version ${version}`,
);
