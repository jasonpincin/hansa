var argosy         = require('argosy'),
    uuid           = require('uuid').v4,
    eventuate      = require('eventuate'),
    createRegistry = require('./lib/registry'),
    setImmediate   = require('timers').setImmediate

module.exports = function createLeague () {
    var league = {
        port           : createPort,
        ports          : [],
        error          : eventuate({ requireConsumption: true }),
        syncStateChange: eventuate(),
        endpointAdded  : eventuate()
    }
    Object.defineProperties(league, {
        id      : { enumerable: true, value: uuid() },
        services: { enumerable: true, get: function () { return registry.services }}
    })

    var registry     = createRegistry(),
        syncPending  = 0,
        syncComplete = 0

    function route (msg, cb) {
        var provider = registry.getProvider(msg)
        if (!provider) return setImmediate(cb, new Error('not implemented: ' + JSON.stringify(msg)))
        provider.invoke(msg, cb)
    }

    // hansa league terminology - a port is just a local argosy endpoint
    // each "port" will share it's id with the league so that all the remote
    // argosy endpoints (one connected to each port), see's the same id
    // and services
    function createPort () {
        var port = argosy({ id: league.id })
        port.services = []
        league.ports.push(port)

        function routePattern (pattern) {
            port.accept(pattern).process(route)
        }
        registry.patterns.forEach(routePattern)
        registry.patternAdded(routePattern)

        port.on('pipe', function () {
            league.syncStateChange.produce({ syncPending: ++syncPending, syncComplete: syncComplete })
            port.subscribeRemote(['services']).then(function (syncMessage) {
                league.syncStateChange.produce({ syncPending: --syncPending, syncComplete: ++syncComplete })
                league.endpointAdded.produce(syncMessage)
            }).catch(function (err) {
                league.error.produce(err)
                league.syncStateChange.produce({ syncPending: --syncPending, syncComplete: syncComplete })
            })
        })
        port.on('unpipe', clean)
        port.serviceAdded(onServcieAdded)

        function clean () {
            port.removeAllListeners()
            port.serviceAdded.remove(onServcieAdded)
            port.services.forEach(function (svc) {
                registry.remove(svc, port)
            })
            league.ports.splice(league.ports.indexOf(port), 1)
        }
        function onServcieAdded (svc) {
            port.services.push(svc)
            registry.add(svc, port)
        }
        return port
    }

    return league
}
