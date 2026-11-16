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
	page = await openPage(`http://127.0.0.1:${port}/?dev=1&seed=1`);
	const summary = await page.evaluate(`(${runRecipe.toString()})('bots')`);
	const sanity = await page.evaluate(`(${runRecipe.toString()})('sanity')`);
	const rounds = summary.rounds ?? [];
	for (const round of rounds) {
		const site = round.planted ? `planted ${round.site}` : 'no plant';
		console.log(`round ${round.round}: ${round.winner} — ${round.reason} (live ${round.liveTime}s, first contact ${round.contact}s, kills ${round.kills}, alive ${round.alive}, ${site})`);
	}
	const average = rounds.reduce((sum, round) => sum + round.liveTime, 0) / (rounds.length || 1);
	const reasons = { elimination: 0, detonation: 0, defuse: 0, time: 0 };
	const winners = {};
	for (const round of rounds) {
		if (/detonated/.test(round.reason)) reasons.detonation += 1;
		else if (/defused/.test(round.reason)) reasons.defuse += 1;
		else if (/Time expired/.test(round.reason)) reasons.time += 1;
		else reasons.elimination += 1;
		winners[round.winner] = (winners[round.winner] || 0) + 1;
	}
	console.log(`average live=${average.toFixed(1)}s reasons=${JSON.stringify(reasons)} winners=${JSON.stringify(winners)}`);
	console.log(`sanity=${JSON.stringify(sanity)}`);
	console.log(`moved=${summary.moved} autoNext=${summary.autoNext} respawnFull=${summary.respawnFull}`);
	if (rounds.length < 6) { console.error('FAIL: fewer than 6 rounds'); failed = true; }
	if (average < 50 || average > 110) { console.error('FAIL: average outside 50-110s'); failed = true; }
	if (!rounds.some((round) => round.planted)) { console.error('FAIL: no plant'); failed = true; }
	if (Object.keys(winners).length < 2) { console.error('FAIL: both teams did not win'); failed = true; }
	if (Object.values(reasons).filter((count) => count > 0).length < 2) { console.error('FAIL: reasons did not vary'); failed = true; }
	if (sanity.playerTeam !== 'syndicate') { console.error('FAIL: side swap did not move player to Syndicate'); failed = true; }
	if (sanity.elimWinner !== 'vanguard' || !/eliminated/.test(sanity.elimReason)) {
		console.error('FAIL: elimination round attribution');
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
