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
    league.connectEvent(function () {
        t.equal(league.services.length, 1, 'league exposes 1 service before unpipe')
        t.equal(league.services[0].providers.length, 1, 'with 1 provider before unpipe')
        service1.unpipe(stream1)

        league.disconnectEvent(function () {
            t.equal(league.services.length, 0, 'with 0 providers after unpipe')
        })
    })
})
