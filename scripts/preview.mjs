import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('www');
const port = Number(process.env.HERMES_PREVIEW_PORT || 4210);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let path = resolve(root, '.' + pathname);
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    try { if (!(await stat(path)).isFile()) path = resolve(root, 'index.html'); }
    catch { if (extname(pathname)) { response.writeHead(404); response.end(); return; } path = resolve(root, 'index.html'); }
    response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(await readFile(path));
  } catch { response.writeHead(500); response.end('No fue posible servir el archivo.'); }
}).listen(port, '127.0.0.1', () => console.log(`HERMES preview: http://127.0.0.1:${port}`));
