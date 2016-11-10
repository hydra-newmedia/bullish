'use strict';

module.exports = (queue, server) => {

  queue.on('completed', (job, result) => {
    server.emit('bullish complete', result);
    server.log(['bullish', queue.name, 'completed'], result);
  });

  queue.on('error', (err) => {
    err.bullish = { queueName: queue.name };
    server.log(['bullish', queue.name, 'error'], err);
    server.emit('bullish error', err);
  });

  queue.on('failed', (job, err) => {
    err.bullish = {
      queueName: queue.name,
      job: {
        jobId: job.jobId,
        timestamp: job.timestamp,
        deplay: job.delay,
        data: job.data,
        progress: job._progress,
        attempts: job.attempts,
        attemptsMade: job.attemptsMade,
      },
    };

    server.log(['bullish', queue.name, 'error'], err);
    server.emit('bullish failed', err);
  });
};
