var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('two services connected to league', function (t) {
    var service1 = argosy(),
        service2 = argosy(),
        client   = argosy(),
        league   = hansa()

    // .port is a getter that returns a unique stream
    // thus allowing the league to route requests instead of
    // broadcasting them
    service1.pipe(league.port).pipe(service1)
    service2.pipe(league.port).pipe(service2)
    client.pipe(league.port).pipe(client)
    t.end()
})
