const test = require('ava');
const hapi = require('hapi');
const joi = require('joi');

test.beforeEach(async t => {
  t.context.server = new hapi.Server();
  await t.context.server.register(require('../bullish'));
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

  t.throws(() => server.bullish.inject('notFound'), 'notFound job was never defined');

});

test('inject should work', async t => {
  const server = t.context.server;
  t.plan(2);

  const work = (data) => {
    t.true(data.id !== undefined, 'has a id');
    return 1;
  };
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

  const res = await server.bullish.inject('testSimpleIsSimulated1', 'nothing', {
    simulated: true,
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

  const res = await server.bullish.inject('testSimpleIsSimulated1', 'nothing');
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
      validate:  joi.number().required(),
    }
  });

  t.throws(
    server.bullish.inject('testValid1'),
    '"value" is required',
    'throw – no value'
  );

  t.throws(
    server.bullish.inject('testValid1', 'no'),
    '"value" must be a number',
    'throw – invalid value'
  );

  const res = await server.bullish.inject('testValid1', 5);
  t.true(res === 5, 'returns data for valid input');
});

test('jobs can have complex validation', async t => {
  const server = t.context.server;
  t.plan(4);

  const handler = (job) => {
    return job.data;
  };
  server.bullish.job({
    name: 'testValid2',
    handler,
    config: {
      validate: joi.object({
        a: joi.number().required(),
        b: joi.object().default({ ok: true }),
        c: {
          d: joi.array()
        }
      }).required()
    }
  });

  t.throws(server.bullish.inject('testValid2'));

  const res = await server.bullish.inject('testValid2', {
    a: 5
  });
  t.true(res.a === 5, 'returns valid a');
  t.true(res.b.ok === true, 'returns valid b');
  t.true(res.c === undefined, 'returns no c');
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
      validate: joi.number().required(),
    }
  });

  const res = await server.bullish.inject('testValid1', 'invalid', {
    validate: false,
  });
  t.true(res === 'invalid', 'returns the value (100)');
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

  const res = await server.bullish.inject('testValid1', 100);
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

  const res = await server.bullish.inject('testPre1', 'hello');
  t.true(res === 42, 'returns the first precondition result');
});
