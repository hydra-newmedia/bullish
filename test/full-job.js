const test = require('ava');
const hapi = require('hapi');

test.beforeEach.cb(t => {
  const server = new hapi.Server();
  server.connection({ port: 9999 }); // never started
  server.register({
    register: require('../bullish')
  }, e => {
    // server.on('bullish complete', () => console.log('HELLOO!!!!'));
    t.true(e === undefined, 'no error');
    t.context.server = server;
    t.end();
  });
});

test.cb('throw with missing options', t => {
  const server = t.context.server;
  t.plan(3);

  const sum = (job) => job.data.a + job.data.b;
  server.bullish.job({ name: 'testFullInvalid1', handler: sum }, (e) => {
    t.true(e === undefined, 'no error');
    t.throws(server.bullish.add(), /job was never defined/, 'no parameters');
    t.throws(server.bullish.add('notThere'), /notThere job was never defined/, 'invalid queue');
    t.end();
  });

});

test.cb('work with correct options', t => {
  const server = t.context.server;
  t.plan(2);

  server.on('bullish complete', (res) => {
    t.true(res === 15, 'can add numbers');
    t.end();
  });

  const sum = (job) => job.data.a + job.data.b;
  server.bullish.job({ name: 'testFull1', handler: sum }, (e) => {
    t.true(e === undefined, 'no error');
    server.bullish.add('testFull1', { a: 5, b: 10 });
  });
});

test.cb('emit an error if there is one', t => {
  const server = t.context.server;
  t.plan(5);

  server.on('bullish failed', (err) => {
    t.true(err.bullish !== undefined, 'error has bullish metadata');
    t.true(err.bullish.queueName !== undefined, 'error has queueName');
    t.true(err.bullish.job !== undefined, 'error has job');
    t.true(err.bullish.job.jobId !== undefined, 'job has id');
    t.end();
  });

  const sum = () => {
    throw new Error('I am broken');
  };
  server.bullish.job({ name: 'testBrokenFull1', handler: sum }, (e) => {
    t.true(e === undefined, 'no error');
    server.bullish.add('testBrokenFull1', { a: 5, b: 10 });
  });
});
