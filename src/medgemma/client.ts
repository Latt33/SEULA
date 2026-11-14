import cache from '../data/generated/medgemma_cache.json';

export interface MedGemmaResult {
  model: string;
  report: string;
  comparison: string | null;
  boxes: { label: string; box_2d: [number, number, number, number] }[];
  boxes_raw?: string;
  ct_within_2_weeks: boolean;
  seconds: number;
  recorded?: string; // ISO date when this came from the recorded cache
}

const KEY = 'seula-medgemma-url';
/** Endpoint: ?medgemma=<url> (remembered), else build-time VITE_MEDGEMMA_URL. */
export function medgemmaUrl(): string {
  const q = new URLSearchParams(window.location.search + '&' + (window.location.hash.split('?')[1] ?? ''));
  const fromQuery = q.get('medgemma');
  try {
    if (fromQuery) localStorage.setItem(KEY, fromQuery);
    const saved = localStorage.getItem(KEY);
    if (saved) return saved.replace(/\/$/, '');
  } catch { /* storage unavailable */ }
  return ((import.meta as any).env?.VITE_MEDGEMMA_URL ?? '').replace(/\/$/, '');
}

export const recorded = (id: string): MedGemmaResult | undefined => (cache as Record<string, MedGemmaResult>)[id];

async function toB64(src: string) {
  const blob = await (await fetch(src)).blob();
  return await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob); });
}

export const cxrSrc = (id: string) => `${import.meta.env.BASE_URL}cxr/${id}.jpg`;

export async function warmup() {
  const u = medgemmaUrl();
  if (u) fetch(`${u}/warmup`, { method: 'POST' }).catch(() => {});
}

export async function preRead(current: string, prior: string | undefined, context: string): Promise<MedGemmaResult> {
  const u = medgemmaUrl();
  if (!u) throw new Error('no-endpoint');
  const body = { image_b64: await toB64(cxrSrc(current)), prior_b64: prior ? await toB64(cxrSrc(prior)) : null, context };
  const r = await fetch(`${u}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`MedGemma server answered ${r.status}`);
  return r.json();
}
