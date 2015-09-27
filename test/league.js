var test   = require('tape'),
    find   = require('array-find'),
    equal  = require('deep-equal'),
    argosy = require('argosy'),
    hansa  = require('..')

test('league', function (t) {
    t.plan(9)

    var service1 = argosy(),
        service2 = argosy(),
        client   = argosy(),
        league   = hansa()

    service1.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
        cb(null, 'Greetings ' + msg.greet)
    })
    service2.accept({ max: argosy.pattern.match.array }).process(function (msg, cb) {
        cb(null, Math.max.apply(null, msg.max))
    })

    league.connect([service1, service2, client], function () {
        t.equal(league.connections.length, 3, 'connections.length === 3')

        t.ok(find(league.patterns, function (pattern) {
            return equal(pattern, { greet: argosy.pattern.match.string }) && league.providersOfPattern({ greet: argosy.pattern.match.string }).length
        }), 'greet pattern exists')
        t.ok(find(league.patterns, function (pattern) {
            return equal(pattern, { max: argosy.pattern.match.array }) && league.providersOfPattern({ max: argosy.pattern.match.array }).length
        }), 'max pattern exists')
        t.equal(league.patterns.length, 2, 'should contain two service patterns')

        client.invoke({ greet: 'Gege' }, function (err, msg) {
            t.false(err, 'greet does not result in error')
            t.equal(msg, 'Greetings Gege', 'greet replies with expected message')
        })

        client.invoke({ max: [5, 1, 9, 7] }, function (err, max) {
            t.false(err, 'max does not result in error')
            t.equal(max, 9, 'max replies with highest number')
        })

        client.invoke({ help: 'me' }, function (err, help) {
            t.true(err, 'invoking unimplemented services results in error')
        })
    })
})
