// PCM -> WAV kódoló segédfüggvények hangalapú vásárláshoz.
// 16 kHz mono, 16-bit signed little-endian – kompatibilis az összes STT modellel.

export async function recordWav(maxSeconds = 15): Promise<{ blob: Blob; durationMs: number }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor deprecated de kompatibilis; alternatíva: AudioWorklet – itt gyors megoldás elég
  const node = (ctx as any).createScriptProcessor(4096, 1, 1);
  const buffers: Float32Array[] = [];
  const startedAt = performance.now();

  return new Promise((resolve, reject) => {
    let stopped = false;
    const timer = setTimeout(() => stopRecording(), maxSeconds * 1000);

    (globalThis as any).__voiceStop = () => stopRecording();

    node.onaudioprocess = (e: any) => {
      if (stopped) return;
      buffers.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(node);
    node.connect(ctx.destination);

    async function stopRecording() {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      try {
        stream.getTracks().forEach((t) => t.stop());
        node.disconnect();
        source.disconnect();
        const sampleRate = ctx.sampleRate;
        await ctx.close();
        const pcm = mergeFloat32(buffers);
        const downsampled = downsampleBuffer(pcm, sampleRate, 16000);
        const wav = encodeWav(downsampled, 16000);
        resolve({ blob: wav, durationMs: Math.round(performance.now() - startedAt) });
      } catch (e) { reject(e); }
    }
  });
}

export function stopRecordingNow() {
  const fn = (globalThis as any).__voiceStop;
  if (typeof fn === "function") fn();
}

function mergeFloat32(chunks: Float32Array[]) {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function downsampleBuffer(buf: Float32Array, from: number, to: number) {
  if (from === to) return buf;
  const ratio = from / to;
  const newLen = Math.round(buf.length / ratio);
  const out = new Float32Array(newLen);
  let offBuf = 0;
  for (let i = 0; i < newLen; i++) {
    const nextOff = Math.round((i + 1) * ratio);
    let sum = 0, count = 0;
    for (let j = offBuf; j < nextOff && j < buf.length; j++) { sum += buf[j]; count++; }
    out[i] = count ? sum / count : 0;
    offBuf = nextOff;
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
