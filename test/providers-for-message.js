var test   = require('tape'),
    argosy = require('argosy'),
    hansa  = require('..')

test('league.providersForMessage', function (t) {
    t.plan(2)

    var service1 = argosy(),
        league   = hansa()

    service1.accept({ help: argosy.pattern.match.defined })
    league.connect(service1).then(function () {
        t.equal(league.providersForMessage({ help: 'with something' }).length, 1)
        t.equal(league.providersForMessage({ help: undefined }).length, 0)
    })
})
