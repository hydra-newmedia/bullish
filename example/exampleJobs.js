'use strict';

const joi = require('joi');

module.exports = (server, opts, next) => {
  server.bullish.job({
    name: 'add5',
    handler: (job) => Promise.resolve(job.data + 5),
    config: {
      validate: {
        input: joi.number(),
      }
    }
  });

  server.bullish.job({
    name: 'testPre',
    handler: (job) => {
      if (job.simulated === true) console.log('The cake is a lie');
      return job.data + job.pre[0];
    },
    config: {
      pre: [ (job) => job.data * 2 ],
      validate: {
        input: joi.number(),
      }
    }
  });

  next();
};

module.exports.attributes = {
  name: 'bullish-example-jobs',
  version: '1.0.0',
};
