var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('connect/disconnect', function (t) {
    t.plan(8)

    var service1 = argosy(),
        service2 = argosy(),
        service3 = argosy(),
        league   = hansa()

    service1.accept({ help: argosy.pattern.match.defined })
    service2.accept({ help: argosy.pattern.match.defined })
    service3.accept({ help: argosy.pattern.match.defined })

    league.connect([service1, service2, service3], function (err) {
        t.false(err, 'should not supply err')
        t.equal(league.services.length, 1, 'league exposes 1 service before disconnect')
        t.equal(league.services[0].providers.length, 3, 'with 3 providers before disconnect')

        league.connect(service1, function () {
            t.equal(league.services.length, 1, 'league exposes 1 service after attempting double-connect')
            t.equal(league.services[0].providers.length, 3, 'with 3 providers after attempting double-connect')

            league.disconnect(service1, function () {
                t.equal(league.services[0].providers.length, 2, 'with 2 provider after 1st disconnect')
                league.disconnect([service2, service3], function () {
                    t.equal(league.services.length, 0, 'with 0 services after 2nd and 3rd disconnect')

                    league.disconnect(service3, function (value) {
                        t.equal(value, null, 'disconnecting a second time resolves with null value')
                    })
                })
            })
        })
    })
})
