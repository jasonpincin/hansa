var test    = require('tape'),
    argosy  = require('argosy'),
    hansa   = require('..')

test('league.patterns', function (t) {
    t.plan(1)

    var service1 = argosy(),
        service2 = argosy(),
        league   = hansa()

    service1.accept({ test: 123 })
    service2.accept({ test: 123 })

    league.connect([service1, service2], function () {
        t.deepEqual(league.patterns, [
            { test: 123 }
        ], 'should contain one pattern')
    })
})
