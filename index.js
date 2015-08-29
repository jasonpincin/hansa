var argosy       = require('argosy'),
    uuid         = require('uuid').v4,
    eventuate    = require('eventuate'),
    mkRegistry   = require('./lib/registry'),
    setImmediate = require('timers').setImmediate

module.exports = function hansa () {
    var ports        = [],
        syncPending  = 0,
        syncComplete = 0,
        registry     = mkRegistry()

    var league = {}
    Object.defineProperties(league, {
        id: { value: uuid(), enumerable: true },
        port: { value: function () {
            var stream = createPort()
            return stream
        }},
        services: { enumerable: true, get: function () {
            return registry.services
        }},
        ports: { enumerable: true, get: function () {
            return ports
        }},
        error: { value: eventuate({ requireConsumption: true }) },
        syncStateChange: { value: eventuate() },
        endpointAdded: { value: eventuate() }
    })

    function route (msg, cb) {
        var provider = registry.getProvider(msg)
        if (!provider) return setImmediate(cb, new Error('not implemented: ' + JSON.stringify(msg)))
        provider.invoke(msg, cb)
    }

    function createPort () {
        var port         = argosy({ id: league.id }),
            portServices = []
        ports.push(port)

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
            portServices.forEach(function (svc) {
                registry.remove(svc, port)
            })
            ports.splice(ports.indexOf(port), 1)
        }
        function onServcieAdded (svc) {
            portServices.push(svc)
            registry.add(svc, port)
        }
        return port
    }

    return league
}
