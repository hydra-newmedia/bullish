'use strict';

const boom = require('boom');

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
        if (job.returnvalue !== null) status = 'completed';
        else if (job.stacktrace.length !== 0) status = 'errored';
        const res = {
          data: job.data,
          progress: job._progress,
          delay: job.delay,
          timestamp: job.timestamp,
          attempts: job.attempts,
          result: job.returnvalue,
          attemptsMade: job.attemptsMade,
          jobId: job.jobId,
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
        // server.statsd.increment('q.queued', 1, [
        //   'job:city-recalc', 'from:api', `cityName:${req.payload.cityName}`
        // ]);

        // reply what was sent. add created header to status endpoint
        req.payload.jobId = job.jobId;
        reply(req.payload).created(`/jobs/${options.queue.name}/${job.jobId}`);
      });
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
