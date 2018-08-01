'use strict';

const boom = require('boom');
const hoek = require('hoek');
const _ = require('lodash');

const register = server => {
  server.decorate('handler', 'bullishStatus', (route, options) => {
    return async req => {

      // get queue from bullish if options.job is set
      if (options.job !== undefined && options.queue === undefined) {
        options.queue = server.bullish.queues[options.job];
      }
      const job = await options.queue.getJob(req.params.id);

      if (job === null) return boom.notFound();
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
      return res;
    };
  });

  server.decorate('handler', 'bullishCreate', (route, options) => {
    return async (req, h) => {
      const qOpts = req.payload.options || {};
      qOpts._bullishValidation = false; // data was already validated by hapi

      const job = await options.queue.add(req.payload.data, qOpts);

      // reply what was sent. add created header to status endpoint
      req.payload.id = job.id;
      const response = options.stripData ? _.omit(req.payload, 'data') : req.payload;
      return h.response(response).created(`/jobs/${options.queue.name}/${job.id}`);
    };
  });

  server.decorate('handler', 'bullishList', (route, options) => {
    return () => {
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

      return res;
    };
  });

  server.decorate('handler', 'bullishSimulate', (route, options) => {
    return async req => {
      req.payload.simulated = true;
      return server.bullish.inject(options.queue.name, req.payload).then(result => {
        return {
          simulated: true,
          result,
        };
      }).catch((e) => {
        if (e.isJoi) return boom.badRequest(e);
        else return e;
      });
    };
  });
};

module.exports.plugin = {
  name: 'bullish-handlers',
  register,
};
