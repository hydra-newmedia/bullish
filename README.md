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
    validate: {
      input: joi.number(),
    }
  }
}, next);
```


### `bullish.inject(jobName, [options])`

can be used for testing or simulation. Returns a promise.

Has the following options:
* `data` – the data passed to the handler in `job.data`.
* `pre` – an optional array of precalculated results to use instead of the defined
  job `pre` middleware.
* `validation` – disables input validation inside the job

```js
bullish.inject(jobName, {
  data: 22,
  pre: [ 5 ],
  validation: false,
})
```
