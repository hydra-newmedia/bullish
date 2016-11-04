'use strict';

module.exports = (queue, server) => {

  queue.on('completed', (job, result) => {
    server.emit('bullish complete', result);
    server.log(['bullish', queue.name, 'completed'], result);
  });

  queue.on('error', (err) => {
    err.queueName = queue.name;
    server.emit('bullish error', err);
    server.log(['bullish', queue.name, 'error'], err);
  });

  queue.on('failed', (job, err) => {
    err.queueName = queue.name;
    err.job = {
      jobId: job.jobId,
      timestamp: job.timestamp,
      deplay: job.delay,
      data: job.data,
      progress: job._progress,
      attempts: job.attempts,
      attemptsMade: job.attemptsMade,
    };
    server.emit('bullish failed', err);
    server.log(['bullish', queue.name, 'error'], err);
  });
};
