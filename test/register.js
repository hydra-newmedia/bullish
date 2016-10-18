const test = require('ava');
const hapi = require('hapi');

test.cb('register without errors (no opts)', (t) => {
  const server = new hapi.Server();
  server.register({
    register: require('../bullish')
  }, e => {
    t.true(e === undefined, 'no error');

    t.true(server.bullish !== undefined, 'server object has been decorated');
    t.true(server.bullish.job !== undefined, 'bullish object has .job');
    t.true(server.bullish.inject !== undefined, 'bullish object has .inject');
    t.true(server.bullish.queues !== undefined, 'bullish object has .queues');

    t.end();
  });

});
