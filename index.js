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
    createRegistry = require('./lib/registry'),
    hasRemote      = require('./lib/stream-has-remote')

module.exports = function createLeague () {
    var registry    = createRegistry(),
        connections = []

    var league = Object.defineProperties({}, {
        id                 : { value: uuid(), enumerable: true },
        connections        : { get: getConnections, enumerable: true },
        patterns           : { get: registry.patterns, enumerable: true },
        connect            : { value: connect, configurable: true },
        disconnect         : { value: disconnect, configurable: true },
        createStream       : { value: createStream, configurable: true },
        providersForMessage: { value: registry.providersForMessage, configurable: true },
        providersOfPattern : { value: registry.providersOfPattern, configurable: true },
        error              : { value: eventuate({ requireConsumption: true }), configurable: true },
        connectionOpened   : { value: eventuate(), configurable: true },
        connectionFailed   : { value: eventuate(), configurable: true },
        connectionClosed   : { value: eventuate(), configurable: true },
        patternAdded       : { value: registry.patternAdded, configurable: true },
        patternRemoved     : { value: registry.patternRemoved, configurable: true }
    })

    return league

    function connect (remote, cb) {
        if (Array.isArray(remote)) return after(Promise.all(remote.map(function eachRemote (remote) {
            return connect(remote)
        })), cb)

        var existingMember = find(connections, hasRemote(remote))
        if (existingMember) return after(Promise.resolve(existingMember), cb)
        remote.pipe(league.createStream()).pipe(remote)

        var done = new Promise(function onConnectionResult (resolve, reject) {
            once.match(league.connectionOpened, hasRemote(remote), resolve)
            once.match(league.connectionFailed, hasRemote(remote), reject)
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
        return after(once.match(league.connectionClosed, hasRemote(remote)), cb)
    }

    function createStream () {
        var stream = argosy({ id: league.id })

        function routePattern (pattern) {
            stream.accept(pattern).process(route)
        }
        registry.patterns().forEach(routePattern)
        registry.patternAdded(routePattern)

        stream.on('pipe', function (remote) {
            assign(stream, { remote: remote })
            connections.push(stream)
            stream.subscribeRemote(['services']).then(function () {
                setImmediate(league.connectionOpened.produce, stream)
            }).catch(function (err) {
                connections.splice(connections.indexOf(stream), 1)
                setImmediate(league.connectionFailed.produce, assign(err, { stream: stream }))
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
            setImmediate(league.connectionClosed.produce, stream)
        }

        function onRemoteService (svc) {
            registry.add(svc, stream)
        }

        return stream
    }

    function route (msg, cb) {
        registry.nextProviderForMessage(msg).invoke.remote(msg, cb)
    }

    function getConnections () {
        return copy(connections)
    }
}
