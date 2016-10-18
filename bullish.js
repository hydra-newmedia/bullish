'use strict';

const hoek = require('hoek');
const joi = require('joi');
const Queue = require('bull');

// register options schema
const pluginOptionsSchema = joi.object({
  redis: joi.object({
    host: joi.string().default('localhost'),
    port: joi.number().default(6379),
  }).default(),
  routes: joi.object({
    basePath: joi.string().default('/jobs'),
    tags: joi.array().items(joi.string()).default(['api']),
  }).default(),
});

// bullish.job options schema
const jobOptionsSchema = joi.object({
  name: joi.string().required(),
  // pipeline: joi.array().items(joi.func()).min(1).required(), // maybe soon
  handler: joi.func().required(),
  config: joi.object({
    concurrency: joi.number().positive().default(1),
    pre: joi.array().min(1),
    validate: {
      input: joi.object().type(joi.constructor),
    },
  }).default(),
});

module.exports = (server, opts, next) => {
  opts = joi.attempt(opts, pluginOptionsSchema); // validate register options

  const queues = {};

  // bullish.job functionality. adds a new queue
  const setupJob = (mod, cb) => {

    hoek.assert(mod !== undefined, 'need job options to work');
    mod = joi.attempt(mod, jobOptionsSchema);
    const { config, handler } = mod;
    const queue = new Queue(mod.name, 6379, opts.redis.host);

    // performes input validation first
    const wrappedHandler = (job) => {
      return new Promise((accept, reject) => {
        // validation first
        if (job._bullishValidation !== false && hoek.reach(config, 'validate.input')) {
          // sync
          joi.validate(job.data, config.validate.input, (err, val) => {
            if (err) return reject(err);
            job.data = val;
          });
        }
        accept(job); // continue
      }).then((job) => {
        // execution
        if (config.pre && job.pre === undefined) {
          console.log('there is pre');
          const preCalculations = config.pre.map(f => {
            if (typeof f === 'function') return f(job);
            else return f;
          });
          return Promise.all(preCalculations).then((res) => {
            job.pre = res;
            return handler(job); // with pre
          });
        } else return handler(job); // just the handler
      });
    };

    queue._bullHandler = wrappedHandler;

    // start queue if process is worker
    if (server.app.isWorker !== false) {
      queue.process(config.concurrency, queue._bullHandler);
    }

    // logging
    require('./lib/queueLogging.js')(queue, server);

    // TODO: make route generation optional!
    // TODO: allow auth

    // status route
    server.route({
      path: `${opts.routes.basePath}/${mod.name}/{id}`,
      method: 'GET',
      handler: { bullishStatus: { queue } }, // formatted job
      config: {
        tags: opts.routes.tags,
        // auth: { mode: 'optional' },
        description: 'Gets the current job status of the specified job',
        validate: {
          params: { id: joi.number().min(1).max(100).required() },
        }
      }
    });

    // create route
    server.route({
      path: `${opts.routes.basePath}/${mod.name}`,
      method: 'POST',
      handler: { bullishCreate: { queue } },
      config: {
        tags: opts.routes.tags,
        // auth: { mode: 'optional' },
        description: 'Creates a new job',
        validate: {
          payload: {
            options: require('./lib/jobOptions'),
            data: hoek.reach(config, 'validate.input') || joi.any(),
          }
        }
      }
    });

    server.route({
      path: `${opts.routes.basePath}/${mod.name}/simulate`,
      method: 'POST',
      handler: { bullishSimulate: { queue } },
      config: {
        tags: opts.routes.tags,
        // auth: { mode: 'optional' },
        description: 'Creates a new job',
        validate: {
          payload: {
            options: require('./lib/jobOptions').strip(),
            data: joi.any(),
            pre: joi.array(),
            validate: joi.boolean().default(true),
          }
        }
      }
    });

    queues[mod.name] = queue;

    const onReady = cb || function noop() {};
    if (queue.client.ready && queue.bclient.ready && queue.eclient.ready) onReady();
    else queue.once('ready', onReady);
  };

  // injects a job into a handler, without creating a new job
  const inject = (name, opts = {}) => {
    const data = opts.data || {};
    const q = queues[name];

    if (q === undefined) {
      return Promise.reject(new Error(`${name} job was never defined`));
    }

    if (opts.validate !== false) opts.validate = true;

    return q._bullHandler({
      data,
      pre: opts.pre,
      _bullishValidation: opts.validate,
      simulated: opts.simulated || false,
    });
  };

  // server.bullish
  server.decorate('server', 'bullish', {
    job: setupJob,
    inject,
    queues,
  });

  // server.plugins.bullish.queues
  server.expose('queues', queues);

  server.register(require('./lib/handlers.js'), next);
};

module.exports.attributes = {
  pkg: require('./package.json'),
};
