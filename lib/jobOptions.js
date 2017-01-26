'use strict';

const joi = require('joi');

const jobOptions = joi.object({
  timeout: joi.number().default(10000).min(0).integer(),
  delay: joi.number().default(0).min(0).integer(),
  attempts: joi.number().default(5).min(0).integer(),
  backoff: {
    type: joi.string().only(['exponential', 'fixed']).default('exponential'),
    delay: joi.number().default(5000).min(0).integer(),
  },
}).label('options');

module.exports = jobOptions;
