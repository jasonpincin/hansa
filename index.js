var argosy         = require('argosy'),
    uuid           = require('uuid').v4,
    eventuate      = require('eventuate'),
    once           = require('eventuate-once'),
    after          = require('afterward'),
    Promise        = require('promise-polyfill'),
    find           = require('array-find'),
    assign         = require('object-assign'),
    copy           = require('shallow-copy'),
    setImmediate   = require('timers').setImmediate,
    createRegistry = require('./lib/registry')

module.exports = function createLeague () {
    var registry    = createRegistry(),
        connections = []

    var league = Object.defineProperties({}, {
        id                 : { value: uuid(), enumerable: true },
        connections        : { get: getConnections, enumerable: true },
        patterns           : { get: getPatterns, enumerable: true },
        services           : { get: getServices, enumerable: true },
        connect            : { value: connect, configurable: true },
        disconnect         : { value: disconnect, configurable: true },
        createStream       : { value: createStream, configurable: true },
        errorEvent         : { value: eventuate({ requireConsumption: true }), configurable: true },
        connectEvent       : { value: eventuate(), configurable: true },
        connectFailureEvent: { value: eventuate(), configurable: true },
        disconnectEvent    : { value: eventuate(), configurable: true }
    })

    return league

    // hansa league terminology - a member is a remote (same process or different) argosy-like endpoint
    // connected to the league. These remote argosy endpoints are paired with local argosy endpoints created
    // via createStream. All local argosy endpoints have the same ID and expose all service patterns that the
    // league as a whole can satisfy

    function connect (remote, cb) {
        if (Array.isArray(remote)) return after(Promise.all(remote.map(function eachRemote (remote) {
            return connect(remote)
        })), cb)

        var existingMember = find(connections, hasRemote(remote))
        if (existingMember) return after(Promise.resolve(existingMember), cb)
        remote.pipe(league.createStream()).pipe(remote)

        var done = new Promise(function onConnectionResult (resolve, reject) {
            once.match(league.connectEvent, hasRemote(remote), resolve)
            once.match(league.connectFailureEvent, hasRemote(remote), reject)
        })
        return after(done, cb)
    }

    function disconnect (remote, cb) {
        if (Array.isArray(remote)) return after(Promise.all(remote.map(function eachRemote (remote) {
            return disconnect(remote)
        })), cb)

        var existingMember = find(connections, hasRemote(remote))
        if (!existingMember) return after(Promise.resolve(), cb)
        connections.filter(hasRemote(remote)).forEach(function (member) {
            member.remote.unpipe(member)
        })
        return after(once.match(league.disconnectEvent, hasRemote(remote)), cb)
    }

    function createStream () {
        var stream = argosy({ id: league.id })

        function routePattern (pattern) {
            stream.accept(pattern).process(route)
        }
        registry.patterns.forEach(routePattern)
        registry.patternAdded(routePattern)

        stream.on('pipe', function (remote) {
            assign(stream, { remote: remote })
            connections.push(stream)
            stream.subscribeRemote(['services']).then(function () {
                setImmediate(league.connectEvent.produce, stream)
            }).catch(function (err) {
                connections.splice(connections.indexOf(stream), 1)
                setImmediate(league.connectFailureEvent.produce, assign(err, { stream: stream }))
            })
        })
        stream.on('unpipe', clean)
        stream.remoteServiceAdded(onRemoteService)

        function clean (remote) {
            var stream = find(connections, hasRemote(remote))
            stream.unpipe()
            stream.removeAllListeners()
            stream.remoteServiceAdded.removeAllConsumers()
            var remoteServices = stream.services.filter(function (svc) {
                return svc.remote
            })
            remoteServices.forEach(function (svc) {
                registry.remove(svc, stream)
            })
            connections = connections.filter(function filterUnpiped (stream) {
                return stream.remote !== remote
            })
            setImmediate(league.disconnectEvent.produce, stream)
        }

        function onRemoteService (svc) {
            registry.add(svc, stream)
        }

        return stream
    }

    function route (msg, cb) {
        registry.getProvider(msg).invoke.remote(msg, cb)
    }

    function getConnections () {
        return copy(connections)
    }

    function getServices () {
        return registry.services
    }

    function getPatterns () {
        return registry.patterns
    }
}

function hasRemote (remote) {
    return function hasRemote (member) {
        return member.remote === remote
    }
}
