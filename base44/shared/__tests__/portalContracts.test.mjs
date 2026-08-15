import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../functions/customerPortalData/entry.ts', import.meta.url), 'utf8');

test('customer portal data failures do not masquerade as empty customer records', () => {
  assert.doesNotMatch(source, /\.filter\([^\n]+\)\.catch\(\(\) => \[\]\)/);
});

test('bounded customer job details disclose possible truncation', () => {
  assert.match(source, /potentially_truncated: invoices\.length === 20 \|\| notes\.length === 200 \|\| audits\.length === 200/);
});
