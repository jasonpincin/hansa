var hash         = require('object-hash').sha1,
    find         = require('array-find'),
    setImmediate = require('timers').setImmediate,
    eventuate    = require('eventuate'),
    copy         = require('shallow-copy')

module.exports = function createRegistry () {
    var services = {},
        hashptr  = {}

    var registry = Object.defineProperties({}, {
        add                   : { value: add, configurable: true },
        remove                : { value: remove, configurable: true },
        patterns              : { value: patterns, configurable: true },
        nextProviderForMessage: { value: nextProviderForMessage, configurable: true },
        providersForMessage   : { value: providersForMessage, configurable: true },
        providersOfPattern    : { value: providersOfPattern, configurable: true },
        patternAdded          : { value: eventuate(), configurable: true },
        patternRemoved        : { value: eventuate(), configurable: true }
    })

    return registry

    function add (svc, stream) {
        var h = hash(svc.pattern)
        if (!services[h]) {
            services[h] = { pattern: svc.pattern, providers: [] }
            setImmediate(registry.patternAdded.produce, svc.pattern)
        }
        services[h].providers.push(stream)
    }

    function remove (svc, stream) {
        var h = hash(svc.pattern)
        services[h].providers.splice(services[h].providers.indexOf(stream), 1)
        if (services[h].providers.length === 0) {
            delete services[h]
            setImmediate(registry.patternRemoved.produce, svc.pattern)
        }
    }

    function patterns () {
        return Object.keys(services).map(function (h) {
            return services[h].pattern
        })
    }

    // get single provider using simple round-robin strategy
    function nextProviderForMessage (msg) {
        var h = hashForMessage(msg)
        var providers = providersOfHash(h)
        hashptr[h]++
        hashptr[h] = hashptr[h] < providers.length ? hashptr[h] : 0
        return providers[hashptr[h]]
    }

    function providersForMessage (msg) {
        return providersOfHash(hashForMessage(msg))
    }

    function providersOfPattern (pattern) {
        return providersOfHash(hash(pattern))
    }

    function providersOfHash (h) {
        return services[h] ? copy(services[h].providers) : []
    }

    function hashForMessage (msg) {
        return find(Object.keys(services), function (h) {
            return services[h].pattern.matches(msg)
        })
    }
}
