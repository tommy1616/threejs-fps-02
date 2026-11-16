import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

export async function openPage(url, port = 9223) {
	const profile = mkdtempSync(join(tmpdir(), 'saltworks-chrome-'));
	const chrome = spawn(process.env.CHROME ?? 'google-chrome', [
		'--headless=new', '--no-sandbox', '--use-angle=swiftshader',
		'--enable-unsafe-swiftshader', '--window-size=1280,720',
		'--hide-scrollbars', '--disable-extensions',
		`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
		'about:blank',
	], { stdio: 'ignore' });

	let target = null;
	for (let attempt = 0; attempt < 100 && !target; attempt += 1) {
		await sleep(100);
		try {
			const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
			target = list.find((item) => item.type === 'page');
		} catch {
			// wait for Chrome
		}
	}
	if (!target) throw new Error('Chrome DevTools target did not start');

	const ws = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((resolve, reject) => {
		ws.addEventListener('open', resolve, { once: true });
		ws.addEventListener('error', reject, { once: true });
	});
	let nextId = 0;
	const pending = new Map();
	const events = [];
	ws.addEventListener('message', (event) => {
		const message = JSON.parse(event.data);
		if (!message.id) {
			if (message.method === 'Runtime.exceptionThrown' || message.method === 'Runtime.consoleAPICalled') events.push(message);
			return;
		}
		const job = pending.get(message.id);
		if (!job) return;
		pending.delete(message.id);
		if (message.error) job.reject(new Error(message.error.message));
		else job.resolve(message.result);
	});
	function send(method, params = {}) {
		const id = (nextId += 1);
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			ws.send(JSON.stringify({ id, method, params }));
			setTimeout(() => {
				if (!pending.has(id)) return;
				pending.delete(id);
				reject(new Error(`${method} timed out`));
			}, 120000);
		});
	}
	async function evaluate(expression) {
		const result = await send('Runtime.evaluate', {
			expression,
			awaitPromise: true,
			returnByValue: true,
		});
		if (result.exceptionDetails) {
			throw new Error(result.exceptionDetails.exception?.description ?? 'page evaluation failed');
		}
		return result.result?.value;
	}

	await send('Page.enable');
	await send('Runtime.enable');
	await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
	await send('Page.navigate', { url });
	for (let attempt = 0; attempt < 200; attempt += 1) {
		await sleep(100);
		try {
			if (await evaluate("document.body && document.body.dataset.ready === '1'")) break;
		} catch {
			// page is still loading
		}
	}

	return {
		send,
		evaluate,
		events,
		async screenshot() {
			const shot = await send('Page.captureScreenshot', { format: 'png' });
			return Buffer.from(shot.data, 'base64');
		},
		async navigate(nextUrl) {
			await send('Page.navigate', { url: nextUrl });
			for (let attempt = 0; attempt < 200; attempt += 1) {
				await sleep(100);
				try {
					if (await evaluate("document.body && document.body.dataset.ready === '1'")) return;
				} catch {
					// wait
				}
			}
			throw new Error(`page did not become ready: ${nextUrl}`);
		},
		close() {
			try { ws.close(); } catch { /* already closed */ }
			chrome.kill('SIGTERM');
			try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome still writing */ }
		},
	};
}
