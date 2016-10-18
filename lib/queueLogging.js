'use strict';

module.exports = (queue, server) => {
  queue.on('completed', (job, result) => {
    server.log(['bullish', queue.name, 'completed'], result);
  });

  queue.on('error', (err) => {
    server.log(['bullish', queue.name, 'error'], err);
  });

  queue.on('failed', (job, e) => {
    server.log(['bullish', queue.name, 'error'], e);
    console.error(e);
  });
};
