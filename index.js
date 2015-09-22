var argosy         = require('argosy'),
    uuid           = require('uuid').v4,
    eventuate      = require('eventuate'),
    once           = require('eventuate-once'),
    after          = require('afterward'),
    Promise        = require('promise-polyfill'),
    find           = require('array-find'),
    assign         = require('object-assign'),
    createRegistry = require('./lib/registry'),
    setImmediate   = require('timers').setImmediate

module.exports = function createLeague () {
    var registry     = createRegistry()

    var league = Object.defineProperties({}, {
        id           : { value: uuid(), enumerable: true },
        members      : { value: [], enumerable: true, writable: true },
        patterns     : { get: getPatterns, enumerable: true },
        services     : { get: getServices, enumerable: true },
        connect      : { value: connect, configurable: true },
        disconnect   : { value: disconnect, configurable: true },
        createStream : { value: createStream, configurable: true },
        error        : { value: eventuate({ requireConsumption: true }), configurable: true },
        connected    : { value: eventuate(), configurable: true },
        connectFailed: { value: eventuate(), configurable: true },
        disconnected : { value: eventuate(), configurable: true }
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

        var existingMember = find(league.members, hasRemote(remote))
        if (existingMember) return after(Promise.resolve(existingMember), cb)
        remote.pipe(league.createStream()).pipe(remote)

        var done = new Promise(function onConnectionResult (resolve, reject) {
            once.match(league.connected, hasRemote(remote), resolve)
            once.match(league.connectFailed, hasRemote(remote), reject)
        })
        return after(done, cb)
    }

    function disconnect (remote, cb) {
        if (Array.isArray(remote)) return after(Promise.all(remote.map(function eachRemote (remote) {
            return disconnect(remote)
        })), cb)

        var existingMember = find(league.members, hasRemote(remote))
        if (!existingMember) return after(Promise.resolve(), cb)
        league.members.filter(hasRemote(remote)).forEach(function (member) {
            member.remote.unpipe(member)
        })
        return after(once.match(league.disconnected, hasRemote(remote)), cb)
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
            league.members.push(stream)
            stream.subscribeRemote(['services']).then(function () {
                setImmediate(league.connected.produce, stream)
            }).catch(function (err) {
                league.members.splice(league.members.indexOf(stream), 1)
                setImmediate(league.connectFailed.produce, assign(err, { stream: stream }))
            })
        })
        stream.on('unpipe', clean)
        stream.remoteServiceAdded(onRemoteService)

        function clean (remote) {
            var stream = find(league.members, hasRemote(remote))
            stream.unpipe()
            stream.removeAllListeners()
            stream.remoteServiceAdded.removeAllConsumers()
            var remoteServices = stream.services.filter(function (svc) {
                return svc.remote
            })
            remoteServices.forEach(function (svc) {
                registry.remove(svc, stream)
            })
            league.members = league.members.filter(function filterUnpiped (stream) {
                return stream.remote !== remote
            })
            setImmediate(league.disconnected.produce, stream)
        }

        function onRemoteService (svc) {
            registry.add(svc, stream)
        }

        return stream
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

function hasRemote (remote) {
    return function hasRemote (member) {
        return member.remote === remote
    }
}
