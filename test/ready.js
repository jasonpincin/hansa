var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('league.ready', function (t) {
    t.plan(3)

    var service1 = argosy(),
        league   = hansa()

    service1.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
        cb(null, 'Greetings ' + msg.greet)
    })
    service1.pipe(league.port()).pipe(service1)

    league.ready(function (outerState) {
        t.false(outerState.syncPending, 'should resolve once league has been informed of remote argosy services')

        var bool = false
        league.ready(function (innerState) {
            t.deepEqual(outerState, innerState, 'should resolve immediately if no sync pending')
            t.ok(bool, 'should resole immediately as in setImmediate')
        })
        bool = true

    })
})
