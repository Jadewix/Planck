import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { handleInquiry } from '../worker/index.js';
import worker from '../worker/index.js';
import { validateInquiry } from '../shared/inquiries.js';

const id = 'ed4b0940-64b1-4c47-8827-565275a38ec8';
const secret = 'test-only-secret-32-characters-long-for-receiver';
const env = { GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', LEAD_WEBHOOK_SECRET: secret };
const lead = (overrides = {}) => ({ id, name: 'Sam Client', email: 'sam@example.com', company: 'Example Company', projectType: 'mobile', description: 'We need a mobile application for our booking customers.', budget: 'USD 5,000–10,000', timeline: 'Flexible, around three months', consent: true, answers: { platform: 'Both iOS and Android', stage: 'A new idea' }, ...overrides });
const request = (body = lead(), headers = {}, method = 'POST') => new Request('https://planck.example/api/inquiries', { method, headers: { Origin: 'https://planck.example', 'Content-Type': 'application/json', ...headers }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });

function receiver() {
  const state = { rows: [], failAppend: false, failFlush: false, locked: false };
  const properties = new Map([['LEAD_WEBHOOK_SECRET', secret], ['SPREADSHEET_ID', 'test-sheet']]);
  const sheet = {
    getLastRow: () => state.rows.length,
    appendRow(row) { if (state.failAppend) throw new Error('Write failed'); state.rows.push([...row]); },
    setFrozenRows() {},
    getRange(start, column, count, columns) {
      return {
        getValues: () => state.rows.slice(start - 1, start - 1 + count).map((row) => row.slice(column - 1, column - 1 + columns)),
        createTextFinder(value) { return { matchEntireCell() { return this; }, findNext: () => state.rows.slice(start - 1, start - 1 + count).some((row) => row[column - 1] === value) ? {} : null }; },
      };
    },
  };
  const spreadsheet = { getId: () => 'test-sheet', getSheetByName: () => sheet };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => properties.get(key), setProperty: (key, value) => properties.set(key, value) }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, openById: () => spreadsheet, flush() { if (state.failFlush) throw new Error('Flush failed'); } },
    LockService: { getScriptLock: () => ({ tryLock() { if (state.locked) return false; state.locked = true; return true; }, releaseLock() { state.locked = false; } }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput(text) { return { text, setMimeType() { return this; } }; } },
  });
  vm.runInContext(readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
  context.setupLeadSheet();
  state.deliver = (body) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  state.fetch = async (_url, options) => Response.json(state.deliver(JSON.parse(options.body)));
  return state;
}

test('real Apps Script receiver saves common and mobile answers in the correct columns', async () => {
  const sheet = receiver();
  const response = await handleInquiry(request(), env, sheet.fetch);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, id });
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[1][2], 'Sam Client');
  assert.equal(sheet.rows[1][5], 'Mobile application');
  assert.equal(sheet.rows[1][9], 'Both iOS and Android');
  assert.equal(sheet.rows[1][10], 'A new idea');
  assert.equal(sheet.rows[1][17], 'Yes');
  assert.equal(sheet.locked, false);
});

test('web and design inquiries preserve their conditional answers without stale fields', async () => {
  for (const input of [
    lead({ projectType: 'web', answers: { websiteType: 'An online store', integrations: 'Payments and inventory', platform: 'stale mobile answer' } }),
    lead({ projectType: 'design', answers: { designTarget: 'A website', designScope: 'Design only', existingUrl: 'https://example.com' } }),
  ]) {
    const sheet = receiver();
    assert.equal((await handleInquiry(request(input), env, sheet.fetch)).status, 200);
    assert.equal(sheet.rows[1][9], '');
    if (input.projectType === 'web') { assert.equal(sheet.rows[1][11], 'An online store'); assert.equal(sheet.rows[1][12], 'Payments and inventory'); }
    else { assert.equal(sheet.rows[1][13], 'A website'); assert.equal(sheet.rows[1][15], 'https://example.com'); }
  }
});

test('a lost response followed by a retry produces one row, not two', async () => {
  const sheet = receiver();
  const lostResponse = async (url, options) => { await sheet.fetch(url, options); throw new Error('Connection lost after save'); };
  assert.equal((await handleInquiry(request(), env, lostResponse)).status, 502);
  assert.equal((await handleInquiry(request(), env, sheet.fetch)).status, 200);
  assert.equal(sheet.rows.length, 2);
});

test('spreadsheet formula text is escaped before insertion', async () => {
  const sheet = receiver();
  await handleInquiry(request(lead({ company: '=IMPORTXML("https://example.com", "//x")', budget: ' +1+2', description: '@SUM(1+1) is the description provided by the visitor.' })), env, sheet.fetch);
  assert.equal(sheet.rows[1][4][0], "'");
  assert.equal(sheet.rows[1][7][0], "'");
  assert.equal(sheet.rows[1][6][0], "'");
});

test('invalid input and missing branch answers never reach Google', async () => {
  for (const input of [lead({ email: 'invalid' }), lead({ consent: false }), lead({ description: 'short' }), lead({ answers: {} }), lead({ projectType: '__proto__' }), lead({ companyWebsiteConfirmation: 'spam' }), lead({ id: 'not-a-uuid' }), lead({ projectType: 'design', answers: { designTarget: 'A website', designScope: 'Design only', existingUrl: 'javascript:alert(1)' } })]) {
    let called = false;
    const response = await handleInquiry(request(input), env, async () => { called = true; });
    assert.equal(response.status, 422);
    assert.equal(called, false);
  }
});

test('same-origin checks, methods, content types, and actual body size are enforced', async () => {
  assert.equal((await handleInquiry(request(lead(), { Origin: 'https://elsewhere.example' }), env)).status, 403);
  assert.equal((await handleInquiry(request(lead(), {}, 'GET'), env)).status, 405);
  assert.equal((await handleInquiry(request(lead(), { 'Content-Type': 'text/plain' }), env)).status, 415);
  assert.equal((await handleInquiry(request(lead({ description: 'x'.repeat(26000) })), env)).status, 413);
  const malformed = new Request('https://planck.example/api/inquiries', { method: 'POST', headers: { Origin: 'https://planck.example', 'Content-Type': 'application/json' }, body: '{' });
  assert.equal((await handleInquiry(malformed, env)).status, 400);
});

test('missing configuration and invalid destinations fail closed without leaking secrets', async () => {
  for (const config of [{}, { ...env, GOOGLE_APPS_SCRIPT_URL: 'https://elsewhere.example/exec' }, { ...env, LEAD_WEBHOOK_SECRET: 'short' }]) {
    const response = await handleInquiry(request(), config);
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes(secret), false);
  }
});

test('Google failures and mismatched acknowledgments never show success', async () => {
  const sheet = receiver(); sheet.failAppend = true;
  assert.equal((await handleInquiry(request(), env, sheet.fetch)).status, 502);
  assert.equal(sheet.rows.length, 1);
  assert.equal(sheet.locked, false);
  for (const reply of [Response.json({ ok: false }), Response.json({ ok: true, id: 'wrong' }), new Response('Google login page', { status: 200 }), new Response('', { status: 500 })]) {
    assert.equal((await handleInquiry(request(), env, async () => reply)).status, 502);
  }
  assert.equal((await handleInquiry(request(), env, async () => { throw new DOMException('Timeout', 'TimeoutError'); })).status, 504);
});

test('Apps Script rejects bad secrets and a busy write lock', () => {
  const sheet = receiver();
  assert.equal(sheet.deliver({ ...lead(), secret: 'wrong' }).ok, false);
  sheet.locked = true;
  assert.equal(sheet.deliver({ ...lead(), secret }).ok, false);
  assert.equal(sheet.rows.length, 1);
});

test('unknown API paths cannot be served as site HTML', async () => {
  const response = await worker.fetch(new Request('https://planck.example/api/other'), { ASSETS: { fetch() { throw new Error('Unexpected assets fallback'); } } });
  assert.equal(response.status, 404);
});

test('the optional rate-limit binding can reject a burst without forwarding', async () => {
  const response = await handleInquiry(request(lead(), { 'CF-Connecting-IP': '192.0.2.1' }), { ...env, INQUIRY_RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(response.status, 429);
});

test('unsure project type is supported and only accepted schema fields survive', () => {
  const result = validateInquiry(lead({ projectType: 'unsure', answers: { guidance: 'Defining the features and scope', platform: 'stale' }, arbitrary: 'discard me' }));
  assert.equal(result.errors, undefined);
  assert.deepEqual(result.data.answers, { guidance: 'Defining the features and scope' });
  assert.equal(result.data.arbitrary, undefined);
});
