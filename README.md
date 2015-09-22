# hansa

[![NPM version](https://badge.fury.io/js/hansa.png)](http://badge.fury.io/js/hansa)
[![Build Status](https://travis-ci.org/jasonpincin/hansa.svg?branch=master)](https://travis-ci.org/jasonpincin/hansa)
[![Coverage Status](https://coveralls.io/repos/jasonpincin/hansa/badge.png?branch=master)](https://coveralls.io/r/jasonpincin/hansa?branch=master)

Create leagues of [Argosy](https://github.com/jasonpincin/argosy) micro-service endpoints, connected via streams.

## example

```javascript
var argosy = require('argosy'),
    hansa  = require('hansa')

var service1 = argosy(),
    service2 = argosy(),
    client   = argosy(),
    league   = hansa()

service1.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
    cb(null, 'Greetings ' + msg.greet)
})

service2.accept({ max: argosy.pattern.match.array }).process(function (msg, cb) {
    cb(null, Math.max.apply(null, msg.max))
})

league.connect([service1, service2, client], function () {
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

### league.connect(argosyEndpoint)

Connect an Argosy endpoint to the `league`. This is a convenience function that does for you:

```javascript
var port = league.port()
argosyEndpoint.pipe(port).pipe(argosyEndpoint)
```

In addition it maintains relationship between endpoint and port to make disconnection easier. Attempting to connect the same endpoint twice will have no effect.

### league.disconnect(argosyEndpoint)

Disconnect an Argosy endpoint from the `league`. This is a convenience function that does for you:

```javascript
argosyEndpoint.unpipe(port)
```

... where the league knows the port, so that you do not need to maintain a reference to it. 

### var port = league.port()

Add an unpaired Argosy endpoint (aka port) to the league, to be connected to another Argosy endpoint or hansa league. This behaves just like any other Argosy endpoint, except it appears to provide all services that are provided by any Argosy endpoint piped to a league port. It's possible to connect two `league` objects this way, by creating a `port` on each, and piping them together. 

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
    syncComplete: Number,
    error: Error
}
```

where `syncPending` is the number of Argosy endpoints the `league` is waiting for info from, and `syncComplete` is the number of times the `league` has been fully informed by an endpoint (this could occur multiple times for a single endpoint if services are added to that endpoint after the endpoint initially fully informs the `league`). The `error` property will only exist as an `Error` object if the state change resulted from an error during the `league`'s request for information from a remote Argosy endpoint.

### league.error(cb)

An eventuate representing an error condition within the `league`. Handler functions associated with this eventuate receive the `Error` object as the payload. This eventuate requires consumption, i.e. if no handler is associated with this eventuate when an `Error` is produced, the `Error` will be thrown.

### league.ready(cb)

Invoke the `cb` function when all connected argosy endpoint connections have fully informed the `league` of their available services. If the `league` is already fully informed by all connected endpoints, `cb` is invoked immediately. The `cb` function is gauranteed to only be executed once. This function also returns a `Promise`.

### league.id

The unique ID (UUID) of the `league`.

### league.ports

An array containing all ports created via `league.port()`.

### league.patterns

An array of all service patterns (represented by Argosy pattern objects) offered by the `league`. 

### league.services

An array representing all services offerd by the `league`. The array contains objects in the format:

```javascript
{
    pattern: argosyPattern,
    providers: [port, port, port]
}
```

where `pattern` contains an [Argosy pattern](https://github.com/jasonpincin/argosy-pattern) representing the service, and `providers` contains an array of `port` objects which are connected to remote Argosy endpoints that offer the service.

## testing

`npm test [--dot | --spec] [--grep=pattern]`

Specifying `--dot` or `--spec` will change the output from the default TAP style. 
Specifying `--grep` will only run the test files that match the given pattern.

## coverage

`npm run coverage [--html]`

This will output a textual coverage report. Including `--html` will also open 
an HTML coverage report in the default browser.
