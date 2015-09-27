var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('connect/disconnect', function (t) {
    t.plan(8)

    var service1 = argosy(),
        service2 = argosy(),
        service3 = argosy(),
        league   = hansa()

    var svcPattern = { help: argosy.pattern.match.defined }

    service1.accept(svcPattern)
    service2.accept(svcPattern)
    service3.accept(svcPattern)

    league.connect([service1, service2, service3], function (err) {
        t.false(err, 'should not supply err')
        t.equal(league.patterns.length, 1, 'league exposes 1 pattern before disconnect')
        t.equal(league.providersOfPattern(svcPattern).length, 3, 'with 3 providers before disconnect')

        league.connect(service1, function () {
            t.equal(league.patterns.length, 1, 'league exposes 1 pattern after attempting double-connect')
            t.equal(league.providersOfPattern(svcPattern).length, 3, 'with 3 providers after attempting double-connect')

            league.disconnect(service1, function () {
                t.equal(league.providersOfPattern(svcPattern).length, 2, 'with 2 providers after 1st disconnect')
                league.disconnect([service2, service3], function () {
                    t.equal(league.patterns.length, 0, 'with 0 patterns after 2nd and 3rd disconnect')

                    league.disconnect(service3, function (value) {
                        t.equal(value, null, 'disconnecting a second time resolves with null value')
                    })
                })
            })
        })
    })
})
