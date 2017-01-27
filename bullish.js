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
  isWorker: joi.boolean().default(true),
});

// bullish.job options schema
const jobOptionsSchema = joi.object({
  name: joi.string().required(),
  // pipeline: joi.array().items(joi.func()).min(1).required(), // maybe soon
  handler: joi.func().required(),
  config: joi.object({
    routes: joi.alternatives().try(
      joi.boolean().only(false),
      joi.array().allow(['create', 'status', 'simulate', 'list'])
    ).default(['create', 'status', 'list']),
    concurrency: joi.number().positive().default(1),
    pre: joi.array().min(1),
    validate: joi.object(),
  }).default(),
});

module.exports = (server, opts, next) => {
  opts = joi.attempt(opts, pluginOptionsSchema); // validate register options

  const queues = {};

  // event types
  server.event('bullish complete');
  server.event('bullish error');
  server.event('bullish failed');

  // bullish.job functionality. adds a new queue
  const setupJob = (mod, cb) => {

    hoek.assert(mod !== undefined, 'need job options to work');
    mod = joi.attempt(mod, jobOptionsSchema);
    const { config, handler } = mod;
    const queue = new Queue(mod.name, opts.redis.port, opts.redis.host);

    // performes input validation first
    const wrappedHandler = (job) => {
      // execution
      if (config.pre && job.pre === undefined) {
        const preCalculations = config.pre.map(f => {
          if (typeof f === 'function') return f(job);
          else return f;
        });
        return Promise.all(preCalculations).then((res) => {
          job.pre = res;
          return handler(job); // with pre
        });
      } else return handler(job); // just the handler
    };

    queue._bullishConfig = config;
    queue._bullishHandler = wrappedHandler;

    // start queue if process is worker
    if (opts.isWorker !== false) {
      queue.process(config.concurrency, queue._bullishHandler);
    }

    // logging
    require('./lib/queueLogging.js')(queue, server);

    // TODO: make route generation optional!
    // TODO: allow auth
    if (config.routes === false) {
      config.routes = [];
    }

    const stripData = config.stripData;

    if (config.routes.some(r => r === 'status')) {
      // status route
      server.route({
        path: `${opts.routes.basePath}/${mod.name}/{id}`,
        method: 'GET',
        handler: { bullishStatus: { queue, stripData } }, // formatted job
        config: {
          tags: opts.routes.tags,
          // auth: { mode: 'optional' },
          description: 'Gets the current job status of the specified job',
          validate: {
            params: { id: joi.number().min(1).required() },
          }
        }
      });
    }

    if (config.routes.some(r => r === 'create')) {
      // create route
      server.route({
        path: `${opts.routes.basePath}/${mod.name}`,
        method: 'POST',
        handler: { bullishCreate: { queue, stripData } },
        config: {
          tags: opts.routes.tags,
          // auth: { mode: 'optional' },
          description: 'Creates a new job',
          validate: {
            payload: {
              options: require('./lib/jobOptions'),
              data: hoek.reach(config, 'validate') || joi.any(),
            }
          }
        }
      });
    }

    if (config.routes.some(r => r === 'simulate')) {
      server.route({
        path: `${opts.routes.basePath}/${mod.name}/simulate`,
        method: 'POST',
        handler: { bullishSimulate: { queue, stripData } },
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
    }

    if (config.routes.some(r => r === 'latestId')) {
      server.route({
        path: `${opts.routes.basePath}/${mod.name}/latestId`,
        method: 'GET',
        handler: { bullishLatestId: { queue } },
        config: {
          tags: opts.routes.tags,
          // auth: { mode: 'optional' },
          description: 'Gets the last used jobId',
        }
      });
    }

    if (config.routes.some(r => r === 'list')) {
      server.route({
        path: `${opts.routes.basePath}/${mod.name}`,
        method: 'GET',
        handler: { bullishList: { queue } },
        config: {
          tags: opts.routes.tags,
          // auth: { mode: 'optional' },
          description: 'Gets all jobs',
        }
      });
    }

    queues[mod.name] = queue;

    const onReady = cb || function noop() {};
    if (queue.client.ready && queue.bclient.ready && queue.eclient.ready) onReady();
    else queue.once('ready', onReady);
  };

  const validate = (queue, data) => {
    return new Promise((accept, reject) => {
      // validation first
      if (hoek.reach(queue._bullishConfig, 'validate')) {
        // sync
        joi.validate(data, queue._bullishConfig.validate, (err, val) => {
          if (err) return reject(err);
          data = val;
        });
      }
      return accept(data);
    });
  };

  // injects a job into a handler, without creating a new job
  const inject = (name, data, opts = {}) => {
    const q = queues[name];

    if (q === undefined) {
      return Promise.reject(new Error(`${name} job was never defined`));
    }

    const validationEnabled = (opts.validate !== false && hoek.reach(q, '_bullishConfig.validate'));
    const pre = validationEnabled ? validate(q, data) : Promise.resolve(data);

    return pre.then((data) => {
      return q._bullishHandler({
        jobId: `bullish-injected-${Date.now()}`,
        data,
        pre: opts.pre,
        simulated: opts.simulated || false,
      });
    });
  };

  const add = (name, data, opts = {}) => {
    const q = queues[name];

    if (q === undefined) {
      return Promise.reject(new Error(`${name} job was never defined`));
    }

    const pre = (opts.validation !== false) ? validate(q, data) : Promise.resolve(data);
    return pre.then((data) =>  q.add(data, opts)); // queue the job
  };

  // server.bullish
  server.decorate('server', 'bullish', {
    job: setupJob,
    inject,
    queues,
    add,
    jobOptions: require('./lib/jobOptions')
  });

  // server.plugins.bullish.queues
  server.expose('queues', queues);

  server.register(require('./lib/handlers.js'), next);
};

module.exports.attributes = {
  pkg: require('./package.json'),
};
