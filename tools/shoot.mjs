import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './cdp.mjs';
import { runRecipe } from './recipes.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const screenshotDir = join(root, 'screenshots');
const port = 8095;
const limit = 256 * 1024;
const work = mkdtempSync(join(tmpdir(), 'saltworks-shots-'));

mkdirSync(screenshotDir, { recursive: true });
for (const name of readdirSync(screenshotDir)) rmSync(join(screenshotDir, name), { force: true, recursive: true });

function exists(command, args) {
	return spawnSync(command, args, { stdio: 'ignore' }).status === 0;
}
const converter = exists('convert', ['-version']) ? 'convert'
	: exists('magick', ['-version']) ? 'magick'
		: exists('ffmpeg', ['-version']) ? 'ffmpeg' : null;

function convert(png, jpg) {
	if (converter === 'convert') return spawnSync('convert', [png, '-quality', '85', jpg], { stdio: 'ignore' }).status === 0;
	if (converter === 'magick') return spawnSync('magick', [png, '-quality', '85', jpg], { stdio: 'ignore' }).status === 0;
	if (converter === 'ffmpeg') return spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', jpg], { stdio: 'ignore' }).status === 0;
	return false;
}

const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], { cwd: root, stdio: 'ignore' });
let page = null;
let failed = false;
try {
	for (let attempt = 0; attempt < 50; attempt += 1) {
		try {
			if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break;
		} catch {
			// server starting
		}
		await new Promise((done) => setTimeout(done, 100));
	}
	for (const shot of shots) {
		const url = `http://127.0.0.1:${port}/${shot.query}&dev=1`;
		if (!page) page = await openPage(url);
		else await page.navigate(url);
		const shotName = new URL(`http://x/${shot.query}`).searchParams.get('shot');
		await page.evaluate(`(${runRecipe.toString()})(${JSON.stringify(shotName)})`);
		await new Promise((done) => setTimeout(done, 300));
		const pngBuffer = await page.screenshot();
		const png = join(work, shot.name.replace(/\.(jpg|jpeg|png)$/i, '.png'));
		const jpg = join(screenshotDir, shot.name);
		writeFileSync(png, pngBuffer);
		if (converter) {
			if (!convert(png, jpg)) throw new Error(`conversion failed for ${shot.name}`);
			if (statSync(jpg).size > limit) throw new Error(`${shot.name} exceeds 256 KiB`);
			console.log(`${shot.name}  ${Math.round(statSync(jpg).size / 1024)} KiB`);
		} else {
			if (statSync(png).size > limit) throw new Error(`no JPEG converter and ${shot.name} exceeds 256 KiB`);
			writeFileSync(join(screenshotDir, shot.name.replace(/\.jpg$/, '.png')), pngBuffer);
			console.warn(`no JPEG converter; kept PNG for ${shot.name}`);
		}
	}
} catch (error) {
	console.error(error.message);
	failed = true;
} finally {
	page?.close();
	server.kill('SIGTERM');
	rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
