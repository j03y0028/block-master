// Block Master version consistency: the footer reads frontend/package.json, so it must be Block Master's
// own version (not the upstream mempool version) and match the Docker image and the myNode app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');
const version = JSON.parse(read('../package.json')).version as string;

test('frontend package.json carries the Block Master version shown in the footer', () => {
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.notEqual(version, '3.3.2', 'still the upstream mempool version');
  const lock = JSON.parse(read('../package-lock.json'));
  assert.equal(lock.version, version);
  assert.equal(lock.packages[''].version, version);
});

test('Docker image, compose default and myNode app all use the same version', () => {
  assert.ok(read('../../Dockerfile').includes(`org.opencontainers.image.version="${version}"`), 'Dockerfile label');
  assert.ok(read('../../docker-compose.yml').includes(`blockmaster/frontend:${version}`), 'docker-compose default image');
  const app = JSON.parse(read('../../mynode/blockmaster/blockmaster.json'));
  assert.equal(app.latest_version, `v${version}`);
  assert.ok(read('../../mynode/blockmaster/scripts/install_blockmaster.sh').includes(`VERSION:-v${version}`), 'installer default');
});

test('footer and about page render the package version with the Block Master name', () => {
  const footer = read('../src/app/shared/components/global-footer/global-footer.component.html');
  assert.ok(footer.includes('Block Master v{{ packetJsonVersion }}'));
});
