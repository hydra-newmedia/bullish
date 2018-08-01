'use strict';

const reformatJob = (job) => {
  return {
    id: job.id,
    timestamp: job.timestamp,
    deplay: job.delay,
    data: job.data,
    progress: job._progress,
    attempts: job.attempts,
    attemptsMade: job.attemptsMade
  };
};

module.exports = (queue, server) => {
  queue.on('completed', (job, result) => {
    server.events.emit('bullish complete', result);
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
    server.events.emit('bullish error', err);
  });

  queue.on('failed', (job, err) => {
    err.bullish = {
      queueName: queue.name,
      job: reformatJob(job),
    };

    server.log(['bullish', queue.name, 'error'], err);
    server.events.emit('bullish failed', err);
  });

  queue.on('active', (job) => {
    const logObj = {
      queueName: queue.name,
      job: reformatJob(job),
    };
    server.log(['bullish', queue.name, 'active'], logObj);
  });

  queue.on('stalled', (job) => {
    const logObj = {
      queueName: queue.name,
      job: reformatJob(job),
    };
    server.events.emit('bullish stalled', logObj);
    server.log(['bullish', queue.name, 'stalled'], logObj);
  });

  queue.on('progress', (job, progress) =>{
    server.log(['bullish', queue.name, 'progress'], `Job '${job.jobId}' Progress: ${progress}`);
  });

  queue.on('paused', () => {
    server.log(['bullish', queue.name, 'paused'], `${queue.name} paused`);
  });

  queue.on('resumed', (job) => {
    server.log(['bullish', queue.name, 'resumed'], `${queue.name} resumed: ${job.jobId}`);
  });

  queue.on('cleaned', (jobs) => {
    server.log(['bullish', queue.name, 'cleaned'], `${jobs.length} Jobs cleaned`);
    // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
    // jobs, and `type` is the type of jobs cleaned.
  });

  queue.on('drained', () => {
    server.log(['bullish', queue.name, 'drained'], `${queue.name} drained`);
    // events.Emitted every time the queue has processed all the waiting jobs
    // (even if there can be some delayed jobs not yet processed)
  });
};
