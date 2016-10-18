const test = require('ava');
const hapi = require('hapi');
const joi = require('joi');

test.beforeEach.cb(t => {
  const server = new hapi.Server();
  server.connection({ port: 9999 }); // never started
  server.register({
    register: require('../bullish')
  }, e => {
    t.true(e === undefined, 'no error');
    t.context.server = server;
    t.end();
  });
});

test('throw with missing options', t => {
  const server = t.context.server;

  t.plan(3);

  t.throws(() => {
    server.bullish.job();
  }, /need job options to work/, 'no config throws');

  t.throws(() => {
    server.bullish.job({
      name: 'test'
    });
  }, /handler/, 'no handler throws');

  t.throws(() => {
    server.bullish.job({
      handler: () => console.log('test')
    });
  }, /name/, 'no name throws');

});

test('throw with invalid handler', t => {
  const server = t.context.server;

  t.throws(() => {
    server.bullish.job({ name: 'test', handler: 'yes' });
  }, /"handler" must be a Function/, 'invalid handler throws');

});

test('register queue with valid options', t => {
  const server = t.context.server;

  const work = () => 1;

  server.bullish.job({ name: 'testSimple1', handler: work });
  t.true(server.bullish.queues.testSimple1 !== undefined, 'queue exists');
});

test('inject should reject with invalid name', t => {
  const server = t.context.server;

  t.throws(server.bullish.inject('notFound'), 'notFound job was never defined');

});

test('inject should work', async t => {
  const server = t.context.server;

  const work = () => 1;
  server.bullish.job({ name: 'testSimpleInject1', handler: work });
  t.true(await server.bullish.inject('testSimpleInject1') === 1, 'returns 1');

});

test('inject should set simulated if told to', async t => {
  const server = t.context.server;

  const handler = (job) => {
    if (job.simulated === true) return true;
    else return false;
  };
  server.bullish.job({ name: 'testSimpleIsSimulated1', handler });

  const res = await server.bullish.inject('testSimpleIsSimulated1', {
    simulated: true,
    data: 'nothing'
  });
  t.true(res === true, 'returns true');
});

test('inject should not set simulated if not told to', async t => {
  const server = t.context.server;

  const handler = (job) => {
    if (job.simulated === true) return true;
    else return false;
  };
  server.bullish.job({ name: 'testSimpleIsSimulated1', handler });

  const res = await server.bullish.inject('testSimpleIsSimulated1', {
    data: 'nothing'
  });
  t.true(res === false, 'returns true');
});

test('jobs can have validation that works', async t => {
  const server = t.context.server;
  t.plan(3);

  const handler = (job) => {
    return job.data;
  };
  server.bullish.job({
    name: 'testValid1',
    handler,
    config: {
      validate: {
        input: joi.number().required(),
      }
    }
  });

  t.throws(
    server.bullish.inject('testValid1'),
    '"value" must be a number',
    'throw – no value'
  );

  t.throws(
    server.bullish.inject('testValid1', { data: 'no' }),
    '"value" must be a number',
    'throw – invalid value'
  );

  const res = await server.bullish.inject('testValid1', { data: 5 });
  t.true(res === 5, 'returns data for valid input');
});

test('inject can skip validation', async t => {
  const server = t.context.server;

  const handler = (job) => {
    return job.data;
  };
  server.bullish.job({
    name: 'testValid1',
    handler,
    config: {
      validate: {
        input: joi.number().required(),
      }
    }
  });

  const res = await server.bullish.inject('testValid1', {
    data: 'wrong',
    validate: false,
  });
  t.true(res === 'wrong', 'returns the value (100)');
});

// TODO: is this testable ?
test('jobs can a concurrency option', async t => {
  const server = t.context.server;

  const handler = (job) => {
    return job.data;
  };
  server.bullish.job({
    name: 'testValid1',
    handler,
    config: {
      concurrency: 2,
    }
  });

  const res = await server.bullish.inject('testValid1', {
    data: 100,
  });
  t.true(res === 100, 'returns the value (100)');
});


test('jobs can have preconditions', async t => {
  const server = t.context.server;

  t.plan(4);

  const handler = (job) => {
    t.true(job.pre[0] === 42, 'pre was calculated when handler is called');
    t.true(job.pre[1] === 1, '2nd pre was calculated when handler is called');
    t.true(job.pre[2] === 999, 'last pre has the right value');
    return job.pre[0];
  };
  server.bullish.job({
    name: 'testPre1',
    handler,
    config: {
      pre: [
        () => Promise.resolve(42),
        () => 1,
        999,
      ]
    }
  });

  const res = await server.bullish.inject('testPre1', {
    data: 'hello',
  });
  t.true(res === 42, 'returns the first precondition result');
});
