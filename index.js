var argosy    = require('argosy'),
    uuid      = require('uuid').v4,
    eventuate = require('eventuate')

module.exports = function hansa () {
    var registry     = [],
        ports        = [],
        syncPending  = 0,
        syncComplete = 0

    var league = {}
    Object.defineProperties(league, {
        id: { value: uuid(), enumerable: true },
        port: { get: function () {
            var stream = createPort()
            return stream
        }},
        services: { enumerable: true, get: function () {
            return registry.map(function (record) {
                return record.service
            })
        }},
        ports: { enumerable: true, get: function () {
            return ports
        }},
        error: { value: eventuate({ requireConsumption: true }) },
        syncStateChange: { value: eventuate() },
        endpointAdded: { value: eventuate() }
    })

    function createPort () {
        var port         = argosy({ id: league.id }),
            portServices = []
        ports.push(port)

        // clean up ports that were created but never piped to
        var cleanCountdown = setTimeout(clean, 5000)

        port.on('pipe', function () {
            clearTimeout(cleanCountdown)
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
            ports.splice(ports.indexOf(port), 1)
            // remove entries from registry
        }
        function onServcieAdded (svc) {
            portServices.push(svc)
            registry.push({ service: svc, port: port })
        }
        return port
    }

    return league
}
