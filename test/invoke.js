var test   = require('tape'),
    find   = require('array-find'),
    equal  = require('deep-equal'),
    argosy = require('argosy'),
    hansa  = require('..')

test('invoke', function (t) {
    t.plan(1)

    var service1 = argosy(),
        client   = argosy(),
        league   = hansa()

    service1.pipe(league.createStream()).pipe(service1)
    client.pipe(league.createStream()).pipe(client)

    service1.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
        cb(null, 'Greetings ' + msg.greet)
    })

    league.connectionOpened(function (member) {
        if (member.remote.id !== service1.id) return

        t.ok(find(league.patterns, function (pattern) {
            return equal(pattern, { greet: argosy.pattern.match.string }) && league.providersOfPattern({ greet: argosy.pattern.match.string }).length
        }), 'greet pattern exists')
    })
})
