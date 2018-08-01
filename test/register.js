const test = require('ava');
const hapi = require('hapi');

test('register without errors (no opts)', async t => {
  const server = new hapi.Server();
  await server.register(require('../bullish'));

  t.true(server.bullish !== undefined, 'server object has been decorated');
  t.true(server.bullish.job !== undefined, 'bullish object has .job');
  t.true(server.bullish.inject !== undefined, 'bullish object has .inject');
  t.true(server.bullish.queues !== undefined, 'bullish object has .queues');
  t.pass();
});
