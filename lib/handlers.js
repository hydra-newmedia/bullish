'use strict';

const boom = require('boom');
const hoek = require('hoek');
const _ = require('lodash');

module.exports = (server, pluginOpts, next) => {
  server.handler('bullishStatus', (route, options) => {
    return (req, reply) => {

      // get queue from bullish if options.job is set
      if (options.job !== undefined && options.queue === undefined) {
        options.queue = server.bullish.queues[options.job];
      }
      options.queue.getJob(req.params.id).then((job) => {

        if (job === null) return reply(boom.notFound());
        let status = 'queued';
        if (job._progress && job._progress > 0) status = 'running';
        if (job.finishedOn) status = 'completed';
        else if (job.stacktrace.length !== 0) status = 'errored';
        const res = {
          data: options.stripData ? undefined : job.data,
          progress: job._progress,
          delay: job.delay,
          timestamp: job.timestamp,
          attempts: job.attempts,
          result: job.returnvalue,
          attemptsMade: job.attemptsMade,
          id: job.id,
          status,
        };
        if (req.auth.isAuthenticated) {
          res.stacktrace = job.stacktrace;
        }
        reply(res);
      }).catch(reply);
    };
  });

  server.handler('bullishCreate', (route, options) => {
    return (req, reply) => {
      const qOpts = req.payload.options || {};
      qOpts._bullishValidation = false; // data was already validated by hapi

      options.queue.add(req.payload.data, qOpts).then((job) => {

        // reply what was sent. add created header to status endpoint
        req.payload.id = job.id;
        const response = options.stripData ? _.omit(req.payload, 'data') : req.payload;
        reply(response).created(`/jobs/${options.queue.name}/${job.id}`);
      });
    };
  });

  server.handler('bullishList', (route, options) => {
    return (req, reply) => {
      const q = options.queue;
      let res = Promise.all([
        q.getActive(),
        q.getDelayed(),
        q.getWaiting(),
        q.getCompleted(),
        q.getFailed(),
      ]).then(hoek.flatten);

      if (options.stripData) {
        res = res.then(jobs => _.omit(jobs, 'data'));
      }
      res = res.then(jobs => _.sortBy(jobs, 'id'));

      reply(res);
    };
  });

  server.handler('bullishSimulate', (route, options) => {
    return (req, reply) => {
      req.payload.simulated = true;
      server.bullish.inject(options.queue.name, req.payload).then(result => {
        reply({
          simulated: true,
          result,
        });
      }).catch((e) => {
        if (e.isJoi) reply(boom.badRequest(e));
        else reply(e);
      });
    };
  });
  next();
};

module.exports.attributes = {
  name: 'bullish-handlers',
  version: '0.0.1',
};
