'use strict';

const hapi = require('hapi');

const server = new hapi.Server({
  port: 8080,
  debug: {
    log: ['*'],
    request: ['*'],
  }
});

const plugins = [
  require('../bullish'),
  require('./exampleJobs'),
  // bullish does not require hapi-swagger
  require('vision'),
  require('inert'), {
    plugin: require('hapi-swagger'),
    options: {
      info: {
        title: 'bullish test API',
        version: '1.0.0'
      }
    }
  },
];

server.register(plugins).then(async () => {
  console.log('Bullish registered');
  await server.start();
  console.log(`example server started @ ${server.info.uri}`);
});
