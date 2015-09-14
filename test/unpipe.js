var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('unpipe', function (t) {
    t.plan(4)

    var service1 = argosy(),
        service2 = argosy(),
        league   = hansa(),
        port1    = league.port(),
        port2    = league.port()

    service1.pipe(port1).pipe(service1)
    service2.pipe(port2).pipe(service2)

    service1.accept({ help: argosy.pattern.match.defined })
    service2.accept({ help: argosy.pattern.match.defined })
    league.ready(function () {
        t.equal(league.services.length, 1, 'league exposes 1 service before unpipe')
        t.equal(league.services[0].providers.length, 2, 'with 2 providers before unpipe')
        service1.unpipe(port1)

        league.ready(function () {
            t.equal(league.services[0].providers.length, 1, 'with 1 provider after 1st unpipe')
            service2.unpipe(port2)

            league.ready(function () {
                t.equal(league.services.length, 0, 'with 0 services after 2nd unpipe')
            })
        })
    })
})
