const S = {
	step: [80, 0.06, 0.06, 1, 500],
	reload: [900, 0.04, 0.1, 1, 1200],
	empty: [1500, 0.05, 0.14, 1, 1600],
	hit: [1300, 0.04, 0.09, 0, 1200],
	head: [1800, 0.05, 0.12, 0, 1800],
	kill: [700, 0.09, 0.12, 0, 900],
	beep: [1100, 0.07, 0.1, 0, 1200],
	defuse: [800, 0.05, 0.1, 0, 900],
	explosion: [55, 0.5, 0.42, 1, 420],
};

export function emitSound(state, type, x, y, z, cls = null) {
	const event = state.sounds.find((item) => !item.active) || state.sounds[state.soundHead++ % state.sounds.length];
	Object.assign(event, { active: true, type, x, y, z, cls });
}

export function createAudio() {
	let ctx = null;
	let master = null;
	let noise = null;
	let beepAt = 0;
	let tickAt = 0;

	function init() {
		if (ctx) return;
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtor) return;
		ctx = new AudioCtor();
		ctx.resume();
		master = ctx.createGain();
		master.gain.value = 0.5;
		master.connect(ctx.destination);
		noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = noise.getChannelData(0);
		for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
	}

	function voice(freq, dur, vol, useNoise, filter, pan, level) {
		if (!ctx) return;
		const time = ctx.currentTime;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * level), time + 0.006);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
		const panner = ctx.createStereoPanner();
		panner.pan.value = pan;
		gain.connect(panner);
		panner.connect(master);
		if (useNoise) {
			const source = ctx.createBufferSource();
			source.buffer = noise;
			source.loop = true;
			const band = ctx.createBiquadFilter();
			band.type = filter ? 'bandpass' : 'lowpass';
			band.frequency.value = filter || 900;
			source.connect(band);
			band.connect(gain);
			source.start(time);
			source.stop(time + dur);
		}
		if (freq > 0) {
			const osc = ctx.createOscillator();
			osc.frequency.value = freq;
			osc.connect(gain);
			osc.start(time);
			osc.stop(time + dur);
		}
	}

	function play(event, pan, level) {
		if (event.type === 'shot') {
			const mark = event.cls === 'marksman';
			const bright = mark ? 2600 : event.cls === 'rifle' ? 1800 : event.cls === 'smg' ? 1500 : 1100;
			voice(mark ? 90 : 150, mark ? 0.22 : 0.16, 0.3, 1, bright, pan, level);
			if (mark) voice(0, 0.07, 0.16, 1, 3600, pan, level);
			return;
		}
		if (event.type === 'roundStart' || event.type === 'roundEnd') {
			voice(event.type === 'roundStart' ? 440 : 220, 0.32, 0.12, 0, 0, 0, level);
			return;
		}
		const sound = S[event.type];
		if (sound) voice(sound[0], sound[1], sound[2], sound[3], sound[4], pan, level);
	}

	function place(state, x, z) {
		const player = state.player;
		const dx = x - player.position.x;
		const dz = z - player.position.z;
		const distance = Math.hypot(dx, dz);
		const pan = (dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw)) / (distance + 1);
		return { pan: Math.max(-0.8, Math.min(0.8, pan)), volume: Math.max(0, 1 - distance / 46) };
	}

	return {
		init,
		update(state) {
			if (!ctx) return;
			for (let index = 0; index < state.sounds.length; index += 1) {
				const event = state.sounds[index];
				if (!event.active) continue;
				event.active = false;
				const pos = place(state, event.x, event.z);
				play(event, pos.pan, pos.volume);
			}
			const objective = state.objective;
			if (objective.planted) {
				const interval = Math.max(0.18, 0.35 + objective.timer / 40);
				if (ctx.currentTime > beepAt) {
					beepAt = ctx.currentTime + interval;
					const pos = place(state, objective.x, objective.z);
					play({ type: 'beep', cls: null }, pos.pan, pos.volume);
				}
			}
			if (objective.defuseProgress > 0 && ctx.currentTime > tickAt) {
				tickAt = ctx.currentTime + 0.28;
				play({ type: 'defuse', cls: null }, 0, 1);
			}
		},
	};
}
