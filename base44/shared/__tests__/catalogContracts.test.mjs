import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../functions/publicCatalog/entry.ts', import.meta.url), 'utf8');

test('catalog browsing uses real page offsets instead of slicing one capped result set', () => {
  assert.match(source, /filter\(query, 'order', pageSize \+ 1, start\)/);
  assert.doesNotMatch(source, /filter\(query, 'order', 500\)/);
});

test('catalog search scans bounded batches and reports incomplete scope honestly', () => {
  assert.match(source, /MAX_SEARCH_SCAN = 5000/);
  assert.match(source, /potentially_truncated: !exhausted/);
  assert.match(source, /search_scope_complete: exhausted/);
});
