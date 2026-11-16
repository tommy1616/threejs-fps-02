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
    '--virtual-time-budget=30000',
    '--dump-dom',
    `http://127.0.0.1:${port}/?test=1&seed=1`,
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

  const html = result.stdout ?? '';
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '';
  const match = title.match(/^BOTS (.*)$/s);
  if (!match) throw new Error(`summary missing from title: ${title}`);
  const summary = JSON.parse(match[1]);
  const rounds = summary.rounds ?? [];
  for (const round of rounds) {
    const site = round.planted ? `planted ${round.site}` : 'no plant';
    console.log(`round ${round.round}: ${round.winner} — ${round.reason} (live ${round.liveTime}s, kills ${round.kills}, alive ${round.alive}, ${site})`);
    console.log(`  V: ${round.v} | S: ${round.s}`);
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
  console.log(`moved=${summary.moved} autoNext=${summary.autoNext} respawnFull=${summary.respawnFull}`);
  if (rounds.length < 6) {
    console.error(`FAIL: only ${rounds.length} rounds simulated`);
    failed = true;
  }
  if (average < 50 || average > 110) {
    console.error(`FAIL: average live time ${average.toFixed(1)}s outside 50-110s`);
    failed = true;
  }
  if (!rounds.some((round) => round.planted)) {
    console.error('FAIL: no charge was planted');
    failed = true;
  }
  if (Object.keys(winners).length < 2) {
    console.error('FAIL: both teams did not win a round');
    failed = true;
  }
  if (Object.values(reasons).filter((count) => count > 0).length < 2) {
    console.error('FAIL: win reasons did not vary');
    failed = true;
  }
  if (!rounds.some((round) => /detonated|defused/.test(round.reason))) {
    console.error('FAIL: no round ended by detonation or defuse');
    failed = true;
  }
  if (!summary.moved) {
    console.error('FAIL: bots did not move');
    failed = true;
  }
  if (!summary.autoNext) {
    console.error('FAIL: next round did not start automatically');
    failed = true;
  }
  if (!summary.respawnFull) {
    console.error('FAIL: respawns were not at full health');
    failed = true;
  }
  for (const round of rounds) {
    const alive = String(round.alive).split('-').map(Number);
    if (String(round.reason).startsWith('Time expired') && alive[0] >= 2 && alive[1] >= 2) {
      console.error(`FAIL: round ${round.round} timed out with both teams still alive (${round.alive})`);
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
