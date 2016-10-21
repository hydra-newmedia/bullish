'use strict';

module.exports = (queue, server) => {

  queue.on('completed', (job, result) => {
    server.emit('bullish complete', result);
    server.log(['bullish', queue.name, 'completed'], result);
  });

  queue.on('error', (err) => {
    server.emit('bullish error', err);
    server.log(['bullish', queue.name, 'error'], err);
  });

  queue.on('failed', (job, e) => {
    server.emit('bullish failed', e);
    server.log(['bullish', queue.name, 'error'], e);
    console.error(e);
  });
};
