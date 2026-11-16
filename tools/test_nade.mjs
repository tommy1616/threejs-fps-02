import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { openPage } from './cdp.mjs';
import { runRecipe } from './recipes.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 8095;
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
	page = await openPage(`http://127.0.0.1:${port}/?dev=1&test=nade&seed=1`);
	const summary = await page.evaluate(`(${runRecipe.toString()})('nade')`);
	console.log(JSON.stringify(summary));
	if (!summary.blastSeen) { console.error('FAIL: no blast appeared'); failed = true; }
	if (summary.activeFrags !== 0) { console.error('FAIL: frag still active after 3s'); failed = true; }
	if (summary.fuseTime === null || summary.fuseTime < 1.4 || summary.fuseTime > 1.8) {
		console.error(`FAIL: fuse timing ${summary.fuseTime}`);
		failed = true;
	}
} catch (error) {
	console.error(error.message);
	failed = true;
} finally {
	page?.close();
	server.kill('SIGTERM');
}
process.exit(failed ? 1 : 0);
