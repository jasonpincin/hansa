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
    service1.pipe(league.port()).pipe(service1)
    service2.pipe(league.port()).pipe(service2)

    league.ready(function () {
        t.deepEqual(league.patterns, [
            { test: 123 }
        ], 'should contain one pattern')
    })
})
