var test   = require('tape'),
    find   = require('array-find'),
    equal  = require('deep-equal'),
    argosy = require('argosy'),
    hansa  = require('..')

test('league', function (t) {
    t.plan(8)

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
        t.ok(find(league.services, function (svc) {
            return equal(svc.pattern, { greet: argosy.pattern.match.string }) && find(svc.providers, function (provider) {
                return provider.remoteId === service1.id
            })
        }), 'greet pattern exists')
        t.ok(find(league.services, function (svc) {
            return equal(svc.pattern, { max: argosy.pattern.match.array }) && find(svc.providers, function (provider) {
                return provider.remoteId === service2.id
            })
        }), 'number pattern exists')
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
