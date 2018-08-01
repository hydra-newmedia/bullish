'use strict';

const joi = require('joi');
const delay = require('delay');

const register = server => {
  server.bullish.job({
    name: 'add5',
    handler: (job) => delay(5000).then(() => {
      return Promise.resolve(job.data.input + 5);
    }),
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
      return job.data.input + job.pre[0];
    },
    config: {
      pre: [ (job) => job.data.input * 2 ],
      validate: {
        input: joi.number(),
      }
    }
  });

};

module.exports.plugin = {
  name: 'bullish-example-jobs',
  version: '1.0.0',
  register,
};
