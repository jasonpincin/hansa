var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('connect/disconnect', function (t) {
    t.plan(6)

    var service1 = argosy(),
        service2 = argosy(),
        league   = hansa()

    league.connect(service1)
    league.connect(service2)

    service1.accept({ help: argosy.pattern.match.defined })
    service2.accept({ help: argosy.pattern.match.defined })
    league.ready(function () {
        t.equal(league.services.length, 1, 'league exposes 1 service before disconnect')
        t.equal(league.services[0].providers.length, 2, 'with 2 providers before disconnect')

        league.connect(service1)
        league.ready(function () {
            t.equal(league.services.length, 1, 'league exposes 1 service after attempting double-connect')
            t.equal(league.services[0].providers.length, 2, 'with 2 providers after attempting double-connect')

            league.disconnect(service1)

            league.ready(function () {
                t.equal(league.services[0].providers.length, 1, 'with 1 provider after 1st disconnect')
                league.disconnect(service2)

                league.ready(function () {
                    t.equal(league.services.length, 0, 'with 0 services after 2nd disconnect')
                })
            })
        })
    })
})
