var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('round-robin strategy', function (t) {
    t.plan(1)

    var service1 = argosy(),
        service2 = argosy(),
        client   = argosy(),
        league   = hansa()

    service1.pipe(league.port()).pipe(service1)
    service2.pipe(league.port()).pipe(service2)
    client.pipe(league.port()).pipe(client)

    var servicesCalled = []
    service1.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
        servicesCalled.push(service1.id)
        cb(null, 'Greetings ' + msg.greet)
    })
    service2.accept({ greet: argosy.pattern.match.string }).process(function (msg, cb) {
        servicesCalled.push(service2.id)
        cb(null, 'Greetings ' + msg.greet)
    })

    league.ready(function () {
        client.invoke({ greet: 'Gege' }).then(function (msg) {
            client.invoke({ greet: 'Jason' }).then(function (msg) {
                t.ok(~servicesCalled.indexOf(service1.id) && ~servicesCalled.indexOf(service2.id), 'called both service providers')
            })
        })
    })
})
