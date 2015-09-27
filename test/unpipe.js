var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('unpipe', function (t) {
    t.plan(3)

    var service1 = argosy(),
        league   = hansa(),
        stream1  = league.createStream()

    service1.pipe(stream1).pipe(service1)

    service1.accept({ help: argosy.pattern.match.defined })
    league.connectionOpened(function () {
        t.equal(league.patterns.length, 1, 'league exposes 1 pattern before unpipe')
        t.equal(league.providersOfPattern({ help: argosy.pattern.match.defined }).length, 1, 'with 1 provider before unpipe')
        service1.unpipe(stream1)

        league.connectionClosed(function () {
            t.equal(league.patterns.length, 0, 'with 0 patterns after unpipe')
        })
    })
})
