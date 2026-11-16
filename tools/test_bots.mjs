import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 8095;
const chrome = process.env.CHROME ?? 'google-chrome';
const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
  cwd: root,
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error('server did not start');
}

let failed = false;
try {
  await waitForServer();
  const result = spawnSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--window-size=1280,720',
    '--virtual-time-budget=15000',
    '--dump-dom',
    `http://127.0.0.1:${port}/?test=1&seed=1`,
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

  const html = result.stdout ?? '';
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '';
  const match = title.match(/^BOTS (.*)$/s);
  if (!match) throw new Error(`summary missing from title: ${title}`);
  const summary = JSON.parse(match[1]);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.moved) {
    console.error('FAIL: bots did not move');
    failed = true;
  }
  if (summary.kills < 1) {
    console.error('FAIL: no kills were scored');
    failed = true;
  }
} catch (error) {
  console.error(error.message);
  failed = true;
} finally {
  server.kill('SIGTERM');
}

if (failed) process.exitCode = 1;
