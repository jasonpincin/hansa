var test    = require('tape'),
    Promise = require('promise-polyfill'),
    argosy  = require('argosy'),
    hansa   = require('..')

test('league port subscribe error', function (t) {
    t.plan(2)

    var service1 = argosy(),
        league   = hansa(),
        port     = league.port()

    var error = new Error('stubbed error')
    port.subscribeRemote = function () {
        return Promise.reject(error)
    }

    service1.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
        cb(null, 'Greetings ' + msg.greet)
    })
    service1.pipe(port).pipe(service1)

    league.error(function (err) {
        t.equal(err, error, 'should produce error on league.error')
    })

    league.syncStateChange(function (state) {
        t.deepEqual(state, {syncPending: 0, syncComplete: 0, error: error}, 'syncStateChange should include error')
    })
})
