'use strict';

const hapi = require('hapi');

const server = new hapi.Server({
  debug: {
    log: ['error'],
    request: ['error'],
  }
});
server.connection({ port: 8080 });

const plugins = [
  {
    register: require('../bullish'),
  },
  require('./exampleJobs'),
  // bullish does not require hapi-swagger
  require('vision'),
  require('inert'), {
    register: require('hapi-swagger'),
    options: {
      info: {
        title: 'bullish test API',
        version: '1.0.0'
      }
    }
  },
  require('blipp')
];

server.register(plugins, e => {
  if (e) console.error(e);
  else console.log('Bullish registered');
  server.start((err) => {
    if (err) throw err;
    console.log(`example server started @ ${server.info.uri}`);
  });
});
