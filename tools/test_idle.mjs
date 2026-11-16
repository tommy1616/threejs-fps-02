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
	for (const carrier of [1, 0]) {
		page = await openPage(`http://127.0.0.1:${port}/?dev=1&idle=1&carrier=${carrier}&seed=3`);
		const summary = await page.evaluate(`(${runRecipe.toString()})('idle')`);
		console.log(`carrier=${carrier}: ${JSON.stringify(summary)}`);
		if (summary.contact === null || summary.contact > 70) {
			console.error(`FAIL: no contact within 70s (carrier=${carrier})`);
			failed = true;
		}
		if (summary.kills < 1) {
			console.error(`FAIL: no kills (carrier=${carrier})`);
			failed = true;
		}
		page.close();
		page = null;
	}
} catch (error) {
	console.error(error.message);
	failed = true;
} finally {
	page?.close();
	server.kill('SIGTERM');
}
process.exit(failed ? 1 : 0);
