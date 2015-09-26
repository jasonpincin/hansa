var test    = require('tape'),
    Promise = require('promise-polyfill'),
    argosy  = require('argosy'),
    hansa   = require('..')

test('league stream subscribe error', function (t) {
    t.plan(1)

    var service1 = argosy(),
        league   = hansa(),
        stream   = league.createStream()

    var error = new Error('stubbed error')
    stream.subscribeRemote = function () {
        return Promise.reject(error)
    }

    service1.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
        cb(null, 'Greetings ' + msg.greet)
    })
    service1.pipe(stream).pipe(service1)

    league.connectFailureEvent(function (err) {
        t.equal(err, error, 'should produce error on league.error')
    })
})
