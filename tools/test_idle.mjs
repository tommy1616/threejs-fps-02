import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 8095;
const chrome = process.env.CHROME ?? 'google-chrome';
const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], { cwd: root, stdio: 'ignore' });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      // server starting
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error('server did not start');
}

let failed = false;
try {
  await waitForServer();
  for (const carrier of [1, 0]) {
    const result = spawnSync(chrome, [
      '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--window-size=1280,720', '--virtual-time-budget=30000', '--dump-dom',
      `http://127.0.0.1:${port}/?idle=1&carrier=${carrier}&seed=3`,
    ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const title = (result.stdout ?? '').match(/<title>(.*?)<\/title>/s)?.[1] ?? '';
    const match = title.match(/^IDLE (.*)$/s);
    if (!match) throw new Error(`summary missing for carrier=${carrier}: ${title}`);
    const summary = JSON.parse(match[1]);
    console.log(`carrier=${carrier}: ${JSON.stringify(summary)}`);
    if (summary.contact === null || summary.contact > 70) {
      console.error(`FAIL: no contact within 70s (carrier=${carrier})`);
      failed = true;
    }
    if (summary.kills < 1) {
      console.error(`FAIL: no kills (carrier=${carrier})`);
      failed = true;
    }
  }
} catch (error) {
  console.error(error.message);
  failed = true;
} finally {
  server.kill('SIGTERM');
}

if (failed) process.exitCode = 1;
