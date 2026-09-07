#!/usr/bin/env node
// Local preview server for the Digitalverse static site.
// Zero dependencies. Serves the repo root and live-reloads the browser on file changes.
//   node tools/dev-server.mjs [--port 4321]

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join, extname, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const portArg = process.argv.indexOf('--port');
const PORT = portArg !== -1 ? Number(process.argv[portArg + 1]) : 4321;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

// Injected into every HTML page: reconnecting SSE client that reloads on change.
const LIVERELOAD = `
<script>
(function () {
  var es, retry = 0;
  function connect() {
    es = new EventSource('/__livereload');
    es.onopen = function () { retry = 0; };
    es.onmessage = function (e) { if (e.data === 'reload') location.reload(); };
    es.onerror = function () {
      es.close();
      retry = Math.min(retry + 1, 10);
      setTimeout(connect, 200 * retry);
    };
  }
  connect();
})();
</script>
`;

const clients = new Set();
let debounce = null;

function broadcastReload() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    for (const res of clients) res.write('data: reload\n\n');
    process.stdout.write(`[reload] ${clients.size} client(s)\n`);
  }, 60);
}

// Recursive watch; ignore VCS/system noise so macOS "Icon\r" files don't spam reloads.
watch(ROOT, { recursive: true }, (_evt, filename) => {
  if (!filename) return;
  if (/(^|[\\/])(\.git|node_modules|\.DS_Store|Icon\r?$)/.test(filename)) return;
  broadcastReload();
});

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 500\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // Resolve path, refusing anything that escapes the repo root.
  let pathname = decodeURIComponent(url.pathname);
  let filePath = join(ROOT, normalize(pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath).catch(() => null);
    }
    // Allow extensionless URLs (/privacy -> /privacy.html), matching GitHub Pages.
    if (!info && !extname(filePath)) {
      const withExt = `${filePath}.html`;
      if (await stat(withExt).catch(() => null)) {
        filePath = withExt;
        info = await stat(filePath);
      }
    }
    if (!info) throw new Error('ENOENT');

    const ext = extname(filePath).toLowerCase();
    const type = MIME[ext] ?? 'application/octet-stream';
    let body = await readFile(filePath);

    if (ext === '.html') {
      const html = body.toString('utf8');
      body = html.includes('</body>')
        ? html.replace(/<\/body>/i, `${LIVERELOAD}</body>`)
        : html + LIVERELOAD;
    }

    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>404</h1><p>Not found: ${pathname}</p>${LIVERELOAD}`);
  }
}).listen(PORT, () => {
  process.stdout.write(`Digitalverse site: http://localhost:${PORT}\nServing ${ROOT}\n`);
});
