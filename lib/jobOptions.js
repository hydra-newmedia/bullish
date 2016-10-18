'use strict';

const joi = require('joi');

const jobOptions = joi.object({
  timeout: joi.number().default(10000).min(0).max(1000 * 120),
  delay: joi.number().default(0).min(0).max(1000 * 60 * 60),
  attempts: joi.number().default(5).min(0).max(100),
  backoff: {
    type: joi.string().only(['exponential', 'fixed']).default('exponential'),
    delay: joi.number().default(5000).min(0).max(1000 * 120),
  },
}).label('options');

module.exports = jobOptions;
