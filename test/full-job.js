const test = require('ava');
const hapi = require('hapi');

test.beforeEach(async t => {
  t.context.server = new hapi.Server();
  await t.context.server.register(require('../bullish'));
});

test('throw with missing options', t => {
  const server = t.context.server;
  t.plan(2);

  const sum = (job) => job.data.a + job.data.b;
  server.bullish.job({ name: 'testFullInvalid1', handler: sum });

  t.throws(() => server.bullish.add(), /name parameter is required/, 'no parameters');
  t.throws(() => server.bullish.add('notThere'), /job was never defined/, 'invalid queue');

});

test.cb('work with correct options', t => {
  const server = t.context.server;
  t.plan(1);

  server.events.on('bullish complete', (res) => {
    t.true(res === 15, 'can add numbers');
    t.end();
  });

  const sum = (job) => job.data.a + job.data.b;
  server.bullish.job({ name: 'testFull1', handler: sum });
  server.bullish.add('testFull1', { a: 5, b: 10 });
});

test.cb('emit an error if there is one', t => {
  const server = t.context.server;
  t.plan(4);

  server.events.on('bullish failed', (err) => {
    t.true(err.bullish !== undefined, 'error has bullish metadata');
    t.true(err.bullish.queueName !== undefined, 'error has queueName');
    t.true(err.bullish.job !== undefined, 'error has job');
    t.true(err.bullish.job.id !== undefined, 'job has id');
    t.end();
  });

  const sum = () => {
    throw new Error('I am broken');
  };
  server.bullish.job({ name: 'testBrokenFull1', handler: sum });
  server.bullish.add('testBrokenFull1', { a: 5, b: 10 });
});
