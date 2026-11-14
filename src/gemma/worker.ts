/// <reference lib="webworker" />
/**
 * Gemma runs here, inside the browser tab. Weights are downloaded once from Hugging Face
 * and cached by the browser; the patient's text never leaves this computer.
 */
import { pipeline, env, TextGenerationPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;

export const MODEL_ID = 'onnx-community/gemma-3-1b-it-ONNX';

let gen: TextGenerationPipeline | null = null;
let device: 'webgpu' | 'wasm' = 'wasm';

async function load() {
  if (gen) return;
  const hasGpu = typeof navigator !== 'undefined' && 'gpu' in navigator && !!(await (navigator as any).gpu?.requestAdapter?.());
  device = hasGpu ? 'webgpu' : 'wasm';
  const files: Record<string, { loaded: number; total: number }> = {};
  gen = (await pipeline('text-generation', MODEL_ID, {
    dtype: hasGpu ? 'q4f16' : 'q4',
    device,
    progress_callback: (p: any) => {
      if (p.status === 'progress' && p.file) {
        files[p.file] = { loaded: p.loaded ?? 0, total: p.total ?? 0 };
        const loaded = Object.values(files).reduce((s, f) => s + f.loaded, 0);
        const total = Object.values(files).reduce((s, f) => s + f.total, 0);
        self.postMessage({ type: 'progress', loaded, total });
      }
    },
  })) as TextGenerationPipeline;
  self.postMessage({ type: 'ready', device });
}

self.onmessage = async (e: MessageEvent) => {
  const { id, kind, messages, maxTokens } = e.data;
  try {
    if (kind === 'load') { await load(); self.postMessage({ id, type: 'done', text: '' }); return; }
    await load();
    const t0 = performance.now();
    const out: any = await gen!(messages, { max_new_tokens: maxTokens ?? 400, do_sample: false });
    const last = out[0].generated_text.at(-1);
    const text = typeof last === 'string' ? last : last.content;
    self.postMessage({ id, type: 'done', text, ms: Math.round(performance.now() - t0), device });
  } catch (err: any) {
    self.postMessage({ id, type: 'error', error: String(err?.message ?? err) });
  }
};
