import { validateInquiry, projectTypes } from '../shared/inquiries.js';

const MAX_BODY = 24 * 1024;
function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
async function readJson(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new RangeError(); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function validEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' && !url.username && !url.password && !url.port && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) && !url.search && !url.hash;
  } catch { return false; }
}

export async function handleInquiry(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin) return json({ error: 'Please submit the form from the Planck website.' }, 403);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ error: 'Please submit the project form.' }, 415);
  let input;
  try { input = await readJson(request); }
  catch (error) { return json({ error: error instanceof RangeError ? 'This inquiry is too large.' : 'Please check your form and try again.' }, error instanceof RangeError ? 413 : 400); }
  const { data, errors } = validateInquiry(input);
  if (errors) return json({ error: 'Please check the highlighted fields.', fields: errors }, 422);
  if (!validEndpoint(env.GOOGLE_APPS_SCRIPT_URL) || typeof env.LEAD_WEBHOOK_SECRET !== 'string' || env.LEAD_WEBHOOK_SECRET.length < 32) {
    return json({ error: 'The inquiry service is temporarily unavailable. Please try again or contact us by email.' }, 503);
  }
  if (env.INQUIRY_RATE_LIMITER) {
    const key = request.headers.get('cf-connecting-ip');
    if (key && !(await env.INQUIRY_RATE_LIMITER.limit({ key })).success) return json({ error: 'Please wait a moment before trying again.' }, 429);
  }
  try {
    const response = await fetcher(env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, projectLabel: projectTypes[data.projectType].label, receivedAt: new Date().toISOString(), secret: env.LEAD_WEBHOOK_SECRET }),
      signal: AbortSignal.timeout(12000), redirect: 'follow',
    });
    if (!response.ok) return json({ error: 'We couldn’t save your inquiry. Please try again.' }, 502);
    const result = await response.json();
    if (result.ok !== true || result.id !== data.id) return json({ error: 'We couldn’t confirm your inquiry was saved. Please try again.' }, 502);
    return json({ ok: true, id: data.id });
  } catch (error) {
    return json({ error: 'We couldn’t confirm your inquiry was saved. Please try again. Your details are still in the form.' }, error.name === 'TimeoutError' ? 504 : 502);
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/inquiries') return handleInquiry(request, env);
    if (new URL(request.url).pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
