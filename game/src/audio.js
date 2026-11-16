// audio.js — synthesized audio.
export function emitNoise(state, x, z, team, actorId, ttl = 1.4, radius = 22) {
	const noise = state.noises.items[state.noises.head];
	noise.active = true;
	noise.x = x;
	noise.z = z;
	noise.team = team;
	noise.actorId = actorId;
	noise.ttl = ttl;
	noise.radius = radius;
	state.noises.head = (state.noises.head + 1) % state.noises.items.length;
}

export function emitSound(state, type, x, y, z, cls = null, volume = 1) {
	let event = null;
	for (let index = 0; index < state.sounds.length; index += 1) {
		if (!state.sounds[index].active) {
			event = state.sounds[index];
			break;
		}
	}
	if (!event) {
		event = state.sounds[state.soundHead % state.sounds.length];
		state.soundHead += 1;
	}
	event.active = true;
	event.played = false;
	event.type = type;
	event.x = x;
	event.y = y;
	event.z = z;
	event.cls = cls;
	event.volume = volume;
}

export function createAudio() {
	let ctx = null;
	let master = null;
	let noiseBuffer = null;
	let beepAt = 0;
	let tickAt = 0;

	function init() {
		if (ctx) return;
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtor) return;
		ctx = new AudioCtor();
		master = ctx.createGain();
		master.gain.value = 0.55;
		master.connect(ctx.destination);
		noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = noiseBuffer.getChannelData(0);
		for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
	}

	function voice(opts, pan, volume) {
		if (!ctx) return;
		const time = ctx.currentTime + (opts.delay || 0);
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.vol * volume), time + 0.006);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + opts.dur);
		const panner = ctx.createStereoPanner();
		panner.pan.value = pan;
		gain.connect(panner);
		panner.connect(master);
		if (opts.noise) {
			const source = ctx.createBufferSource();
			source.buffer = noiseBuffer;
			source.loop = true;
			const filter = ctx.createBiquadFilter();
			filter.type = opts.filterType || 'lowpass';
			filter.frequency.value = opts.filter || 1000;
			source.connect(filter);
			filter.connect(gain);
			source.start(time);
			source.stop(time + opts.dur);
		}
		if (opts.freq) {
			const osc = ctx.createOscillator();
			osc.type = opts.wave || 'sine';
			osc.frequency.setValueAtTime(opts.freq, time);
			if (opts.sweep) {
				osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.freq + opts.sweep), time + opts.dur);
			}
			osc.connect(gain);
			osc.start(time);
			osc.stop(time + opts.dur);
		}
	}

	function sfx(type, pan, volume, cls) {
		if (type === 'shot') {
			const marksman = cls === 'marksman';
			const bright = marksman ? 2600 : cls === 'rifle' ? 1800 : cls === 'smg' ? 1500 : 1100;
			voice({
				dur: marksman ? 0.24 : 0.16,
				vol: 0.32,
				noise: 1,
				filterType: 'bandpass',
				filter: bright,
				freq: marksman ? 90 : 150,
				wave: 'square',
				sweep: -70,
			}, pan, volume);
			if (marksman) {
				voice({ dur: 0.07, vol: 0.2, noise: 1, filterType: 'highpass', filter: 3800 }, pan, volume);
			}
			return;
		}
		if (type === 'reload' || type === 'reloadEnd' || type === 'empty' || type === 'bounce' || type === 'tick') {
			voice({
				dur: 0.035,
				vol: type === 'empty' ? 0.16 : 0.1,
				noise: 1,
				filterType: 'highpass',
				filter: type === 'bounce' ? 500 : 1200,
				freq: type === 'bounce' ? 220 : 900,
				wave: 'square',
			}, pan, volume);
		} else if (type === 'step') {
			voice({ dur: 0.055, vol: 0.06, noise: 1, filterType: 'lowpass', filter: 500, freq: 80 }, pan, volume);
		} else if (type === 'explosion') {
			voice({ dur: 0.5, vol: 0.45, noise: 1, filter: 420, freq: 55, wave: 'sawtooth', sweep: -25 }, pan, volume);
		} else if (type === 'smoke') {
			voice({ dur: 1.4, vol: 0.08, noise: 1, filterType: 'bandpass', filter: 900, freq: 0 }, pan, volume);
		} else if (type === 'plant' || type === 'beep') {
			voice({ dur: 0.07, vol: 0.12, freq: type === 'plant' ? 1500 : 1100 }, pan, volume);
		} else if (type === 'roundStart') {
			voice({ dur: 0.16, vol: 0.12, freq: 330 }, 0, volume);
			voice({ dur: 0.22, vol: 0.12, freq: 495, delay: 0.12 }, 0, volume);
		} else if (type === 'roundEnd') {
			voice({ dur: 0.28, vol: 0.12, freq: 300 }, 0, volume);
			voice({ dur: 0.34, vol: 0.12, freq: 200, delay: 0.12 }, 0, volume);
		}
	}

	function place(state, x, z) {
		const player = state.player;
		const dx = x - player.position.x;
		const dz = z - player.position.z;
		const distance = Math.hypot(dx, dz);
		const pan = Math.max(-1, Math.min(1, (dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw)) / (distance + 1)));
		return { pan: pan * 0.8, volume: Math.max(0, 1 - distance / 46) };
	}

	return {
		init,
		update(state) {
			if (!ctx) return;
			for (let index = 0; index < state.sounds.length; index += 1) {
				const event = state.sounds[index];
				if (!event.active || event.played) continue;
				event.active = false;
				const pos = place(state, event.x, event.z);
				sfx(event.type, pos.pan, pos.volume * event.volume, event.cls);
			}
			const objective = state.objective;
			if (objective.planted) {
				const interval = Math.max(0.18, 0.35 + objective.timer / 40);
				if (ctx.currentTime > beepAt) {
					beepAt = ctx.currentTime + interval;
					const pos = place(state, objective.x, objective.z);
					sfx('beep', pos.pan, pos.volume, null);
				}
			}
			if (objective.defuseProgress > 0 && ctx.currentTime > tickAt) {
				tickAt = ctx.currentTime + 0.28;
				sfx('tick', 0, 1, null);
			}
		},
	};
}
