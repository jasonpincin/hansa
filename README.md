# hansa

[![NPM version](https://badge.fury.io/js/hansa.png)](http://badge.fury.io/js/hansa)
[![Build Status](https://travis-ci.org/jasonpincin/hansa.svg?branch=master)](https://travis-ci.org/jasonpincin/hansa)
[![Coverage Status](https://coveralls.io/repos/jasonpincin/hansa/badge.png?branch=master)](https://coveralls.io/r/jasonpincin/hansa?branch=master)

Create leagues of [Argosy](https://github.com/jasonpincin/argosy) micro-service endpoints.

## example

```javascript
var argosy = require('argosy'),
    hansa  = require('hansa')

var service1 = argosy(),
    service2 = argosy(),
    client   = argosy(),
    league   = hansa()

service1.pipe(league.port()).pipe(service1)
service2.pipe(league.port()).pipe(service2)
client.pipe(league.port()).pipe(client)

service1.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
    cb(null, 'Greetings ' + msg.greet)
})

service2.accept({ max: argosy.pattern.match.array }).process(function (msg, cb) {
    cb(null, Math.max.apply(null, msg.max))
})

league.ready(function () {
    client.invoke({ greet: 'Gege' }, function (err, message) {
        console.log(message)

        client.invoke({ max: [3, 9, 7] }, function (err, max) {
            console.log('The biggest number is: ' + max)
        })
    })
})
```

## api

TODO

## testing

`npm test [--dot | --spec] [--grep=pattern]`

Specifying `--dot` or `--spec` will change the output from the default TAP style. 
Specifying `--grep` will only run the test files that match the given pattern.

## coverage

`npm run coverage [--html]`

This will output a textual coverage report. Including `--html` will also open 
an HTML coverage report in the default browser.
