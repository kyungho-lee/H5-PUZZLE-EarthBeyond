'use strict';
const test = require('node:test');
const assert = require('node:assert');
const zlib = require('zlib');
const { writeZip, listZip } = require('../scripts/zip-writer.js');

test('nested names are stored with forward slashes and read back', () => {
  const buf = writeZip([
    { name: 'index.html', data: Buffer.from('<html></html>') },
    { name: 'themes/solar-system/step-01.webp', data: Buffer.from([1, 2, 3, 4]) },
  ]);
  assert.deepStrictEqual(listZip(buf), ['index.html', 'themes/solar-system/step-01.webp']);
  assert.ok(!buf.includes(Buffer.from('themes\\')));
});

test('backslash names are rejected', () => {
  assert.throws(() => writeZip([{ name: 'themes\\a.webp', data: Buffer.from('x') }]), /backslash/);
});

test('stored data round-trips (deflate)', () => {
  const data = Buffer.from('hello hello hello hello');
  const buf = writeZip([{ name: 'a.txt', data }]);
  // local header: 30 bytes + name; compressed payload follows
  const nameLen = buf.readUInt16LE(26), extraLen = buf.readUInt16LE(28);
  const csize = buf.readUInt32LE(18);
  const payload = buf.subarray(30 + nameLen + extraLen, 30 + nameLen + extraLen + csize);
  assert.deepStrictEqual(zlib.inflateRawSync(payload), data);
  assert.strictEqual(buf.readUInt32LE(14), zlib.crc32(data));
});
