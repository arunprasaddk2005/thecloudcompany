import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { io as connect } from 'socket.io-client';
import { initSocket } from './socket.js';
import { emitAuction, emitUser, emitBrowse } from './services/realtime.js';
import { config } from './config.js';

const AUCTION = '64b7f0f0f0f0f0f0f0f0f0f0';
const USER_A = '64b7f0f0f0f0f0f0f0f0f0a1';
const USER_B = '64b7f0f0f0f0f0f0f0f0f0b2';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));

test('realtime: auction rooms, private user rooms, browse room, bad tokens', async () => {
  const server = http.createServer();
  const io = initSocket(server);
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}`;
  const token = (id) => jwt.sign({ id }, config.jwtSecret);
  const open = (auth) => new Promise((resolve) => {
    const s = connect(url, { auth, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
  });

  const a = await open({ token: token(USER_A) });
  const b = await open({ token: token(USER_B) });
  const anon = await open({});
  const forged = await open({ token: jwt.sign({ id: USER_A }, 'wrong-secret') });

  const got = { a: [], b: [], anon: [], forged: [] };
  for (const [name, s] of Object.entries({ a, b, anon, forged })) {
    s.on('notification:new', (n) => got[name].push(['notification', n.message]));
    s.on('bid:new', (p) => got[name].push(['bid', p.price]));
    s.on('browse:changed', () => got[name].push(['browse']));
  }

  // a and anon watch the auction; b does not. Invalid ids are ignored.
  a.emit('auction:join', AUCTION);
  anon.emit('auction:join', AUCTION);
  anon.emit('auction:join', 'not-an-id');
  forged.emit('browse:join');
  await wait(100);

  emitAuction(AUCTION, 'bid:new', { price: 1250 });
  emitUser(USER_A, 'notification:new', { message: 'for A only' });
  emitBrowse();
  await wait(150);

  assert.deepEqual(got.a, [['bid', 1250], ['notification', 'for A only']], 'A sees the bid and its own private alert');
  assert.deepEqual(got.b, [], 'B is not watching and gets nothing, especially not A\'s alert');
  assert.deepEqual(got.anon, [['bid', 1250]], 'an anonymous viewer sees public bid updates only');
  assert.deepEqual(got.forged, [['browse']], 'a forged token is anonymous: no private alerts');

  a.emit('auction:leave', AUCTION);
  await wait(100);
  emitAuction(AUCTION, 'bid:new', { price: 1300 });
  await wait(100);
  assert.equal(got.a.filter((e) => e[0] === 'bid').length, 1, 'after leaving, no more updates');

  [a, b, anon, forged].forEach((s) => s.close());
  io.close();
});

test('realtime helpers are safe no-ops with no server running', async () => {
  const { setIO } = await import('./services/realtime.js');
  setIO(null);
  assert.doesNotThrow(() => {
    emitAuction('x', 'e', {});
    emitUser('x', 'e', {});
    emitBrowse();
  });
});
