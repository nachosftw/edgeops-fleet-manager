// Unit tests for frontend helpers. Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterDevices, formatUptime, isValidIPv4, levelOf, parseRoute, timeAgo,
  validateDevice, validateStatusChange,
} from '../src/lib/utils.js';

const fleet = [
  { id: 'DEV-001', name: 'Rover-Alpha', type: 'Rover', ip_address: '192.168.1.10', status: 'Online' },
  { id: 'DEV-002', name: 'Drone-Beta', type: 'Drone', ip_address: '192.168.1.12', status: 'Offline' },
];

test('isValidIPv4 accepts dotted quads and rejects malformed input', () => {
  for (const ip of ['192.168.1.10', '0.0.0.0', '255.255.255.255']) assert.ok(isValidIPv4(ip), ip);
  for (const ip of ['256.0.0.1', '1.2.3', '01.2.3.4', 'a.b.c.d', '']) assert.ok(!isValidIPv4(ip), ip);
});

test('validateDevice reports each invalid field', () => {
  assert.deepEqual(validateDevice({ name: 'Rover-Theta', type: 'Rover', ip_address: '10.0.0.5', status: 'Online' }), {});
  const errors = validateDevice({ name: ' x ', type: 'Boat', ip_address: '999.1.1.1', status: 'Asleep' });
  assert.deepEqual(Object.keys(errors).sort(), ['ip_address', 'name', 'status', 'type']);
});

test('validateStatusChange mirrors the backend rules', () => {
  assert.equal(validateStatusChange('Online', 'Offline', ''), null);
  assert.match(validateStatusChange('Online', 'Online', ''), /already Online/);
  assert.match(validateStatusChange('Online', 'Maintenance', '  '), /reason is required/);
  assert.equal(validateStatusChange('Online', 'Maintenance', 'Firmware'), null);
});

test('formatUptime picks the two most significant units', () => {
  assert.equal(formatUptime(0), '0m');
  assert.equal(formatUptime(59), '0m');
  assert.equal(formatUptime(125), '2m');
  assert.equal(formatUptime(3 * 3600 + 15 * 60), '3h 15m');
  assert.equal(formatUptime(14 * 86400 + 2 * 3600), '14d 2h');
});

test('timeAgo treats naive API timestamps as UTC', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  assert.equal(timeAgo('2026-10-14T11:59:30', now), 'just now');
  assert.equal(timeAgo('2026-10-14T11:15:00', now), '45 min ago');
  assert.equal(timeAgo('2026-10-14T09:00:00Z', now), '3 h ago');
  assert.equal(timeAgo('2026-10-10T12:00:00', now), '4 d ago');
  assert.equal(timeAgo(null, now), '—');
});

test('levelOf classifies battery and signal levels at the thresholds', () => {
  assert.equal(levelOf(10), 'critical');
  assert.equal(levelOf(11), 'low');
  assert.equal(levelOf(19), 'low');
  assert.equal(levelOf(20), 'medium');
  assert.equal(levelOf(50), 'good');
});

test('filterDevices combines search, status and type', () => {
  assert.equal(filterDevices(fleet).length, 2);
  assert.deepEqual(filterDevices(fleet, { search: 'alpha' }).map((d) => d.id), ['DEV-001']);
  assert.deepEqual(filterDevices(fleet, { search: '1.12' }).map((d) => d.id), ['DEV-002']);
  assert.deepEqual(filterDevices(fleet, { status: 'Offline' }).map((d) => d.id), ['DEV-002']);
  assert.deepEqual(filterDevices(fleet, { type: 'Drone', status: 'Online' }), []);
});

test('parseRoute maps hash URLs to pages', () => {
  assert.deepEqual(parseRoute(''), { page: 'dashboard' });
  assert.deepEqual(parseRoute('#/devices'), { page: 'devices' });
  assert.deepEqual(parseRoute('#/devices/DEV-003'), { page: 'device', id: 'DEV-003' });
  assert.deepEqual(parseRoute('#/settings'), { page: 'settings' });
  assert.deepEqual(parseRoute('#/nope'), { page: 'dashboard' });
});
