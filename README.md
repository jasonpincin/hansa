# hansa

[![NPM version](https://badge.fury.io/js/hansa.png)](http://badge.fury.io/js/hansa)
[![Build Status](https://travis-ci.org/jasonpincin/hansa.svg?branch=master)](https://travis-ci.org/jasonpincin/hansa)
[![Coverage Status](https://coveralls.io/repos/jasonpincin/hansa/badge.png?branch=master)](https://coveralls.io/r/jasonpincin/hansa?branch=master)

Create leagues of [Argosy](https://github.com/jasonpincin/argosy) micro-services; connected via pipes.

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

### var leagueStream = league.createStream()

Add an unpaired Argosy stream to the league, to be connected to another Argosy endpoint or hansa league. This behaves just like any other Argosy stream, except it appears to provide all services that are provided by any Argosy endpoint piped to a league port. It's possible to connect two `league` objects this way, by piping them together. 

### argosyStream.pipe(leagueStream).pipe(argosyStream)

Connect an Argosy stream to the league via the created port. Only one argosy stream should be connected to a given port. Upon connecting, the league will request to be notified of services offered by (now or in the future) the `argosyStream`, and any Argosy stream connected to the league will see those services, as well as the services of all other connected streams

### league.connectionOpened(cb)

An [eventuate](https://github.com/jasonpincin/eventuate) representing a 
new Argosy stream being connected to the league.  Handler functions, `cb`, 
associated with the eventuate receive the local (league-side) Argosy stream.

### league.connectionClosed(cb)

An eventuate representing an Argosy stream being disconnected from the league.
Handler functions, `cb`, associated with the eventuate receive the local
(league-side) Argosy stream.

### league.connectionFailed(cb)

An eventuate representing a failure while attempting to connect a new Argosy
stream to the league.  Handler functions, `cb`, associated with the eventuate 
receive the local (league-side) Argosy strean.

### league.patternAdded(cb)

An eventuate representing a new service pattern being defined by one of the
Argosy streams belonging to the league.  Handler functions, `cb`, associated 
with the eventuate receive the [Argosy
pattern](https://github.com/jasonpincin/argosy-pattern) object.

### league.patternRemoved(cb)

An eventuate representing the removal of a previously accepted service pattern.
Handler functions, `cb`, associated with the eventuate receive the [Argosy
pattern](https://github.com/jasonpincin/argosy-pattern) object.

### league.error(cb)

An eventuate representing an error condition within the `league`. Handler functions associated with this eventuate receive the `Error` object as the payload. This eventuate requires consumption, i.e. if no handler is associated with this eventuate when an `Error` is produced, the `Error` will be thrown.

### league.id

The unique ID (UUID) of the `league`.

### league.connections

An array containing all streams created via `league.createStream()`.

### league.patterns

An array of all service patterns (represented by Argosy pattern objects) offered by the `league`. 

## testing

`npm test [--dot | --spec] [--grep=pattern]`

Specifying `--dot` or `--spec` will change the output from the default TAP style. 
Specifying `--grep` will only run the test files that match the given pattern.

## coverage

`npm run coverage [--html]`

This will output a textual coverage report. Including `--html` will also open 
an HTML coverage report in the default browser.
