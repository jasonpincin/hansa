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

```javascript
var league = hansa()
```

### var port = league.port()

Add an unpaired Argosy endpoint (aka port) to the league, to be connected to another Argosy endpoint or hansa league. This behaves just like any other Argosy endpoint, except it appears to provide all services that are provided by any Argosy endpoint piped to a league port.

### argosyService.pipe(port).pipe(argosyService)

Connect an Argosy endpoint to the league via the created port. Only one argosy endpoint should be connected to a given port. Upon connecting, the league will request to be notified of services offered by (now or in the future) the `argosyEndpoint`, and any Argosy endpoint connected to the league will see those services, as well as the services of all other connected endpoints.

### league.endpointAdded(cb)

An [eventuate](https://github.com/jasonpincin/eventuate) representing the addition of a new endpoint. This eventuate produces an event after the new endpoint has fully informed the `league` of it's services. Handler functions associated with this eventuate receive an event payload in the format of:

```javascript
{
    id: String,
    services: Number
}
```

Where `id` contains the UUID of the newly added remote Argosy endpoint, and `services` contains the count of services added.

### league.endpointRemoved(cb)

An eventuate representing the removal of an endpoint. This eventuate produces an event upon the complete cleanup of a disconnected Argosy endpoint. Handler functions associated with this eventuate will receive an event payload in the format of:

```javascript
{
    id: String,
    services: Number
}
```

Where `id` contains the UUID of the newly added remote Argosy endpoint, and `services` contains the count of services added.

### league.syncStateChange(cb)

An eventuate representing a change in the `league`'s "sync" status. This occurs when a new endpoint is connected. For each new Argosy endpoint connected, there is one "pending" sync operation. Once the endpoint sends information for all it's services, followed by a "sync" statement (signifying the `league` has been fully informed), pending is decremented by one, and "complete" sync operations is incremented. Handler functions associated with this eventuate receive a payload in the format of: 

```javascript
{
    syncPending: Number,
    syncComplete: Number
}
```

### league.error(cb)

An eventuate representing an error condition within the league. Handler functions associated with this eventuate receive the `Error` object as the payload. This eventuate requires consumption, i.e. if no handler is associated with this eventuate when an `Error` is produced, the `Error` will be thrown.

### league.ready(cb)

Invoke the `cb` function when all connected argosy endpoint connections have fully informed the league of their available services. If the `league` is already fully informed by all connected endpoints, `cb` is invoked immediately. This function also returns a `Promise`.

### league.id

To be completed.

### league.ports

To be completed.

### league.services

To be completed.

## testing

`npm test [--dot | --spec] [--grep=pattern]`

Specifying `--dot` or `--spec` will change the output from the default TAP style. 
Specifying `--grep` will only run the test files that match the given pattern.

## coverage

`npm run coverage [--html]`

This will output a textual coverage report. Including `--html` will also open 
an HTML coverage report in the default browser.
