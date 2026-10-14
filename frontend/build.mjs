// Build script for the FleetOps SPA.
//   node build.mjs          -> production bundle in dist/
//   node build.mjs --serve  -> dev server on :3000, proxies /api to the backend
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const serve = process.argv.includes('--serve');
const PORT = Number(process.env.PORT || 3000);
const API_TARGET = new URL(process.env.API_TARGET || 'http://localhost:5000');
const outdir = 'dist';

mkdirSync(outdir, { recursive: true });
const html = readFileSync('public/index.html', 'utf8');
writeFileSync(path.join(outdir, 'index.html'), html);
if (existsSync('public/favicon.svg')) copyFileSync('public/favicon.svg', path.join(outdir, 'favicon.svg'));

const options = {
  entryPoints: ['src/main.jsx'],
  bundle: true,
  outdir,
  entryNames: 'app',
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  sourcemap: serve,
  minify: !serve,
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': serve ? '"development"' : '"production"' },
  logLevel: 'info',
};

if (!serve) {
  const result = await esbuild.build({ ...options, metafile: true });
  const text = await esbuild.analyzeMetafile(result.metafile);
  console.log(text);
} else {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port: esPort } = await ctx.serve({ servedir: outdir, port: PORT + 1000 });
  http.createServer((req, res) => {
    const toApi = req.url.startsWith('/api/');
    const target = toApi
      ? { hostname: API_TARGET.hostname, port: API_TARGET.port }
      : { hostname: '127.0.0.1', port: esPort };
    // SPA fallback: unknown non-asset paths get index.html
    const url = !toApi && !path.extname(req.url.split('?')[0]) ? '/' : req.url;
    const proxy = http.request(
      { ...target, path: url, method: req.method, headers: req.headers },
      (upstream) => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxy.on('error', () => { res.writeHead(502); res.end('Upstream unavailable'); });
    req.pipe(proxy);
  }).listen(PORT, () => console.log(`FleetOps dev server on http://localhost:${PORT} (API -> ${API_TARGET.origin})`));
}
