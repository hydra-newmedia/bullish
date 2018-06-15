'use strict';

module.exports = (queue, server) => {
  queue.on('completed', (job, result) => {
    server.emit('bullish complete', result);
    server.log(['bullish', queue.name, 'completed'], result);
  });

  queue.on('error', err => {
    const logErr = {
      message: err.message,
      stack: err.stack,
      bullish: {
        queueName: queue.name
      }
    };
    server.log(['bullish', queue.name, 'error'], logErr);
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
        attemptsMade: job.attemptsMade
      }
    };

    server.log(['bullish', queue.name, 'error'], err);
    server.emit('bullish failed', err);
  });

  queue.on('active', function(job /*jobPromise*/) {
    const logObj = {
      queueName: queue.name,
      job: {
        jobId: job.jobId,
        timestamp: job.timestamp,
        deplay: job.delay,
        data: job.data,
        progress: job._progress,
        attempts: job.attempts,
        attemptsMade: job.attemptsMade
      }
    };
    server.log(['bullish', queue.name, 'active'], logObj);
  });

  queue.on('stalled', function(job) {
    const logObj = {
      queueName: queue.name,
      job: {
        jobId: job.jobId,
        timestamp: job.timestamp,
        deplay: job.delay,
        data: job.data,
        progress: job._progress,
        attempts: job.attempts,
        attemptsMade: job.attemptsMade
      }
    };
    server.emit('bullish stalled', logObj);
    server.log(['bullish', queue.name, 'stalled'], logObj);
  });

  queue.on('progress', function(job, progress) {
    server.log(['bullish', queue.name, 'progress'], `Job '${job.jobId}' Progress: ${progress}`);
  });

  queue.on('paused', function() {
    server.log(['bullish', queue.name, 'paused'], `${queue.name} paused`);
  });

  queue.on('resumed', function(job) {
    server.log(['bullish', queue.name, 'resumed'], `${queue.name} resumed: ${job.jobId}`);
  });

  queue.on('cleaned', function(jobs /*, type*/) {
    server.log(['bullish', queue.name, 'cleaned'], `${jobs.length} Jobs cleaned`);
    // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
    // jobs, and `type` is the type of jobs cleaned.
  });

  queue.on('drained', function() {
    server.log(['bullish', queue.name, 'drained'], `${queue.name} drained`);
    // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
  });
};
