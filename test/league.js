var test   = require('tape'),
    find   = require('array-find'),
    equal  = require('deep-equal'),
    argosy = require('argosy'),
    hansa  = require('..')

test('league', function (t) {
    t.plan(7)

    var service1 = argosy(),
        service2 = argosy(),
        client   = argosy(),
        league   = hansa()

    // .port is a getter that returns a unique stream, allowing league to route vs broadcast
    service1.pipe(league.port()).pipe(service1)
    service2.pipe(league.port()).pipe(service2)
    client.pipe(league.port()).pipe(client)

    service1.accept({ greet: argosy.pattern.match.string })
    service2.accept({ random: argosy.pattern.match.number })

    league.syncStateChange(function (state) {
        if (state.syncPending) return

        t.ok(find(league.services, function (svc) {
            return equal(svc.pattern, { greet: argosy.pattern.match.string }) && find(svc.providers, function (provider) {
                return provider.remoteId === service1.id
            })
        }), 'greet pattern exists')
        t.ok(find(league.services, function (svc) {
            return equal(svc.pattern, { random: argosy.pattern.match.number }) && find(svc.providers, function (provider) {
                return provider.remoteId === service2.id
            })
        }), 'number pattern exists')
        t.equal(league.services.length, 2, 'should contain two services')
        t.equal(league.ports.length, 3, 'ports should contain all active ports')
    })

    league.endpointAdded(function (endpoint) {
        switch (endpoint.id) {
            case client.id:
                t.equals(endpoint.services, 0, 'client exposes no services')
                break
            default:
                t.equals(endpoint.services, 1, 'server expose 1 service')
                break
        }
    })
})
