const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tracker.js');

test('detects UPS, FedEx, DHL and BlueDart formats', () => {
  assert.equal(T.detectCarrier('1Z999AA10123456784'), 'UPS');
  assert.equal(T.detectCarrier('123456789012'), 'FedEx');
  assert.equal(T.detectCarrier('1234567890'), 'DHL');
  assert.equal(T.detectCarrier('12345678901'), 'BlueDart');
  assert.equal(T.detectCarrier('not-a-number'), null);
});

test('parses pipe-delimited event lines', () => {
  const e = T.parseEvent('2026-10-01 09:30 | In transit | Mumbai hub');
  assert.equal(e.status, 'In transit');
  assert.equal(e.location, 'Mumbai hub');
  assert.equal(T.parseEvent('garbage'), null);
});

test('flags out-of-order scans', () => {
  const events = [
    T.parseEvent('2026-10-02 10:00 | Arrived | Hub B'),
    T.parseEvent('2026-10-01 09:00 | Departed | Hub A'),
  ];
  const { findings } = T.analyze(events, '2026-10-03T00:00:00');
  assert.ok(findings.some((f) => f.code === 'OUT_OF_ORDER'));
});

test('flags scans after delivery and duplicate scans', () => {
  const events = [
    T.parseEvent('2026-10-01 09:00 | In transit | Hub A'),
    T.parseEvent('2026-10-01 09:00 | In transit | Hub A'),
    T.parseEvent('2026-10-02 15:00 | Delivered | Doorstep'),
    T.parseEvent('2026-10-03 08:00 | In transit | Hub B'),
  ];
  const { findings } = T.analyze(events, '2026-10-04T00:00:00');
  assert.ok(findings.some((f) => f.code === 'DUPLICATE'));
  assert.ok(findings.some((f) => f.code === 'SCAN_AFTER_DELIVERY'));
});

test('flags exceptions and stale transit', () => {
  const events = [
    T.parseEvent('2026-09-20 10:00 | Picked up | Origin'),
    T.parseEvent('2026-09-21 10:00 | Customs hold | Port'),
  ];
  const { findings, delivered } = T.analyze(events, '2026-10-02T00:00:00');
  assert.equal(delivered, false);
  assert.ok(findings.some((f) => f.code === 'EXCEPTION'));
});

test('flags stale in-transit after 5 days without delivery', () => {
  const events = [T.parseEvent('2026-09-20 10:00 | In transit | Hub A')];
  const { findings } = T.analyze(events, '2026-10-02T00:00:00');
  assert.ok(findings.some((f) => f.code === 'STALE_TRANSIT'));
});

test('clean delivered timeline has no error findings', () => {
  const events = [
    T.parseEvent('2026-10-01 08:00 | Picked up | Origin'),
    T.parseEvent('2026-10-01 18:00 | In transit | Hub A'),
    T.parseEvent('2026-10-02 09:00 | Out for delivery | Local'),
    T.parseEvent('2026-10-02 14:00 | Delivered | Doorstep'),
  ];
  const { findings, delivered } = T.analyze(events, '2026-10-03T00:00:00');
  assert.equal(delivered, true);
  assert.ok(!findings.some((f) => f.level === 'error'));
});
