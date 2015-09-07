var argosy         = require('argosy'),
    uuid           = require('uuid').v4,
    eventuate      = require('eventuate'),
    filter         = require('eventuate-filter'),
    once           = require('eventuate-once'),
    createRegistry = require('./lib/registry'),
    setImmediate   = require('timers').setImmediate

module.exports = function createLeague () {
    var registry     = createRegistry(),
        syncPending  = 0,
        syncComplete = 0

    var league = Object.defineProperties({}, {
        id             : { value: uuid(), enumerable: true },
        ports          : { value: [], enumerable: true },
        services       : { get: getServices, enumerable: true },
        port           : { value: createPort, configurable: true },
        ready          : { value: ready, configurable: true },
        error          : { value: eventuate({ requireConsumption: true }), configurable: true },
        syncStateChange: { value: eventuate(), configurable: true },
        endpointAdded  : { value: eventuate(), configurable: true },
        endpointRemoved: { value: eventuate(), configurable: true }
    })

    var leagueReady = filter(league.syncStateChange, function noSyncPending (state) {
        return !state.syncPending
    })

    leagueReady.consumerAdded(function () {
        if (!syncPending) setImmediate(leagueReady.produce, { syncPending: syncPending, syncComplete: syncComplete })
    })

    return league

    // hansa league terminology - a port is just a local argosy endpoint
    // each "port" will share it's id with the league so that all the remote
    // argosy endpoints (one connected to each port), see's the same id and services
    function createPort () {
        var port = argosy({ id: league.id })
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
        port.remoteServiceAdded(onRemoteService)

        function clean () {
            port.unpipe()
            port.removeAllListeners()
            port.serviceAdded.removeAllConsumers()
            var remoteServices = port.services.filter(function (svc) {
                return svc.remote
            })
            remoteServices.forEach(function (svc) {
                registry.remove(svc, port)
            })
            league.ports.splice(league.ports.indexOf(port), 1)
            setImmediate(league.endpointRemoved.produce, {
                id      : port.remoteId,
                services: remoteServices.length
            })
        }
        function onRemoteService (svc) {
            registry.add(svc, port)
        }
        return port
    }

    function ready (cb) {
        return once(leagueReady, cb)
    }

    function route (msg, cb) {
        registry.getProvider(msg).invoke.remote(msg, cb)
    }

    function getServices () {
        return registry.services
    }

}
