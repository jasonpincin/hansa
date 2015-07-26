var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('league', function (t) {
    t.plan(5)

    var service1 = argosy(),
        service2 = argosy(),
        client   = argosy(),
        league   = hansa()

    // .port is a getter that returns a unique stream, allowing league to route vs broadcast
    service1.pipe(league.port).pipe(service1)
    service2.pipe(league.port).pipe(service2)
    client.pipe(league.port).pipe(client)

    service1.accept({ greet: argosy.pattern.match.string })
    service2.accept({ random: argosy.pattern.match.number })

    league.sync(function (state) {
        if (state.syncPending) return

        t.deepEqual(league.services, [
            { provider: { id: service1.id }, pattern: { greet: argosy.pattern.match.string }, remote: true },
            { provider: { id: service2.id }, pattern: { random: argosy.pattern.match.number }, remote: true }
        ], 'after sync, league.services should contain both argosy endpoint services')
        t.equal(league.ports.length, 3, 'ports should contain all active ports')
    })

    league.endpointAdded(function (provider) {
        switch (provider.id) {
            case client.id:
                t.equals(provider.services, 0, 'client exposes no services')
                break
            default:
                t.equals(provider.services, 1, 'server expose 1 service')
                break
        }
    })
})
