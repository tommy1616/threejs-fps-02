import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const screenshotDir = join(root, 'screenshots');
const chrome = process.env.CHROME ?? 'google-chrome';
const port = 8095;
const limit = 256 * 1024;

mkdirSync(screenshotDir, { recursive: true });
for (const name of readdirSync(screenshotDir)) {
  rmSync(join(screenshotDir, name), { force: true, recursive: true });
}

function toolExists(command, args) {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return result.status === 0;
}

const converter = toolExists('convert', ['-version'])
  ? 'convert'
  : toolExists('magick', ['-version'])
    ? 'magick'
    : toolExists('ffmpeg', ['-version'])
      ? 'ffmpeg'
      : null;

function convertPng(png, jpg) {
  if (converter === 'convert') {
    return spawnSync('convert', [png, '-quality', '85', jpg], { stdio: 'ignore' }).status === 0;
  }
  if (converter === 'magick') {
    return spawnSync('magick', [png, '-quality', '85', jpg], { stdio: 'ignore' }).status === 0;
  }
  if (converter === 'ffmpeg') {
    return spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', jpg], { stdio: 'ignore' }).status === 0;
  }
  return false;
}

const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
  cwd: root,
  stdio: 'ignore',
});
const work = mkdtempSync(join(tmpdir(), 'saltworks-shots-'));
let failed = false;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      // wait for the static server
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error('serve.ts did not start');
}

try {
  await waitForServer();
  for (const shot of shots) {
    const png = join(work, shot.name.replace(/\.(jpg|jpeg|png)$/i, '.png'));
    const jpg = join(screenshotDir, shot.name);
    const url = `http://127.0.0.1:${port}/${shot.query}`;
    const result = spawnSync(chrome, [
      '--headless=new',
      '--no-sandbox',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=1280,720',
      '--virtual-time-budget=9000',
      `--screenshot=${png}`,
      url,
    ], { stdio: 'ignore' });

    if (result.status !== 0 || !existsSync(png) || statSync(png).size === 0) {
      throw new Error(`Chrome failed for ${shot.name}`);
    }

    if (converter) {
      if (!convertPng(png, jpg)) throw new Error(`conversion failed for ${shot.name}`);
      if (statSync(jpg).size > limit && converter === 'ffmpeg') {
        spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '6', jpg], { stdio: 'ignore' });
      }
      if (statSync(jpg).size > limit) throw new Error(`${shot.name} exceeds 256 KiB`);
    } else {
      if (statSync(png).size > limit) throw new Error(`no JPEG converter and ${shot.name} PNG exceeds 256 KiB`);
      const fallback = join(screenshotDir, shot.name.replace(/\.jpg$/, '.png'));
      copyFileSync(png, fallback);
      console.warn(`no JPEG converter; kept ${fallback}`);
      continue;
    }

    const size = statSync(jpg).size;
    console.log(`${shot.name}  ${Math.round(size / 1024)} KiB`);
  }
} catch (error) {
  console.error(error.message);
  failed = true;
} finally {
  server.kill('SIGTERM');
  rmSync(work, { recursive: true, force: true });
}

if (failed) process.exitCode = 1;
