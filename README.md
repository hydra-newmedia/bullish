bullish
=======

## Usage

```js
server.bullish.job({
  name: 'add5',
  handler: (job) => {
    // do job logic here, return a promise!
    return Promise.resolve(job.data + 5);
  },
  config: {
    validate: joi.number(),
  }
}, next);
```

### `bullish.job(options, [callback])`

Defines a new job queue.

Has the following parameters:
* `options`
  * `name` – the queue name
  * `handler` – the handler that will be called
  * `config` – a optional config object containing:
    * `validate` – a joi schema, used for input validation
    * `concurrency` – the max. concurrency for the handler (on a single process)
    * `pre` – **Experimental**: an array of functions that will be called before the handler.
      Have to return Promises or be synchronous.
    * `routes` – configure auto generated routes, can be one of
      * `Boolean`: `false` – disable auto route generation
      * `Array`: `['create', 'status', 'simulate']` – Toggle specific routes to be generated
* `callback` – a optional function called, when the queue is ready to be used.

```js
server.bullish.job({
  name: 'squareAll',
  handler: (job) =>  job.data.map(num => num * num + job.pre[0]),
  config: {
    concurrency: 5,
    pre: [ () => 0 ],
    validate: joi.array().items(joi.number()).required(),
  }
});
```

### `bullish.add(jobName, [data], [options])`

Adds a new job to the queue. Analog to bulls `queue.add`, but with validation.

Has the following options:
* `data` – the data passed to the handler in `job.data`.
* `options` – all `bull` options and an extra `validate` option, to toggle validation.
  * `validate` – `Boolean`: toggles input validation

```js
server.bullish.add('sum', { a: 5, b: 10 }, { validation: false });
```


### `bullish.inject(jobName, [data], [options])`

can be used for testing or simulation. Returns a promise.

Has the following parameters:
* `data` – the data passed to the handler in `job.data`.
* `options` – object of options:
  * `pre` – an optional array of precalculated results to use instead of the defined
    job `pre` middleware.
  * `validation` – disables input validation inside the job

```js
bullish.inject(jobName, { name: 'Max', email: 'max@example.com' }, {
  pre: [ 5 ],
  validation: false,
});
```
