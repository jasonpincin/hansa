var argosy         = require('argosy'),
    uuid           = require('uuid').v4,
    eventuate      = require('eventuate'),
    once           = require('eventuate-once'),
    after          = require('afterward'),
    Promise        = require('promise-polyfill'),
    find           = require('array-find'),
    createRegistry = require('./lib/registry'),
    setImmediate   = require('timers').setImmediate

module.exports = function createLeague () {
    var registry     = createRegistry(),
        members      = []

    var league = Object.defineProperties({}, {
        id             : { value: uuid(), enumerable: true },
        ports          : { value: [], enumerable: true },
        patterns       : { get: getPatterns, enumerable: true },
        services       : { get: getServices, enumerable: true },
        connect        : { value: connect, configurable: true },
        disconnect     : { value: disconnect, configurable: true },
        port           : { value: createPort, configurable: true },
        error          : { value: eventuate({ requireConsumption: true }), configurable: true },
        endpointAdded  : { value: eventuate(), configurable: true },
        endpointRemoved: { value: eventuate(), configurable: true }
    })

    return league

    // hansa league terminology - a port is just a local argosy endpoint
    // each "port" will share it's id with the league so that all the remote
    // argosy endpoints (one connected to each port), see's the same id and services

    function connect (endpoint, cb) {
        if (Array.isArray(endpoint)) return after(Promise.all(endpoint.map(function (singleEndpoint) {
            return connect(singleEndpoint)
        })), cb)
        var existingMember = find(members, connectedVia(endpoint))
        if (existingMember) return after(Promise.resolve(existingMember), cb)
        var port = createPort()
        endpoint.pipe(port).pipe(endpoint)
        return after(once(league.endpointAdded, function (member) {
            return member.endpoint === endpoint
        }), cb)
    }

    function disconnect (endpoint, cb) {
        var existingMember = find(members, connectedVia(endpoint))
        if (!existingMember) return after(Promise.resolve(), cb)
        members.filter(connectedVia(endpoint)).forEach(function (member) {
            member.endpoint.unpipe(member.port)
        })
        return after(once(league.endpointRemoved, function (member) {
            return member.endpoint === endpoint
        }), cb)
    }

    function createPort () {
        var port = argosy({ id: league.id })
        league.ports.push(port)

        function routePattern (pattern) {
            port.accept(pattern).process(route)
        }
        registry.patterns.forEach(routePattern)
        registry.patternAdded(routePattern)

        port.on('pipe', function (endpoint) {
            port.subscribeRemote(['services']).then(function () {
                var member = { endpoint: endpoint, port: port }
                members.push(member)
                league.endpointAdded.produce(member)
            }).catch(function (err) {
                league.error.produce(err)
            })
        })
        port.on('unpipe', clean)
        port.remoteServiceAdded(onRemoteService)

        function clean (endpoint) {
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
            members = members.filter(function filterUnpipedPort (member) {
                return member.port !== port
            })
            setImmediate(league.endpointRemoved.produce, {
                endpoint: endpoint,
                port    : port
            })
        }
        function onRemoteService (svc) {
            registry.add(svc, port)
        }
        return port
    }

    function route (msg, cb) {
        registry.getProvider(msg).invoke.remote(msg, cb)
    }

    function getServices () {
        return registry.services
    }

    function getPatterns () {
        return registry.patterns
    }
}

function connectedVia (endpoint) {
    return function memberConnectedVia (member) {
        return member.endpoint === endpoint
    }
}
