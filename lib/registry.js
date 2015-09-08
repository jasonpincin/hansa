var hash      = require('object-hash').sha1,
    find      = require('array-find'),
    eventuate = require('eventuate')

module.exports = function createRegistry () {
    var services = {},
        hashptr  = {}

    var registry = Object.defineProperties({}, {
        services    : { get: getServices, enumerable: true },
        patterns    : { get: getPatterns, enumerable: true },
        add         : { value: add, configurable: true },
        remove      : { value: remove, configurable: true },
        getProvider : { value: getProvider, configurable: true },
        patternAdded: { value: eventuate(), configurable: true }
    })

    return registry

    function add (svc, port) {
        var h = hash(svc.pattern)
        if (!services[h]) {
            services[h] = { pattern: svc.pattern, providers: [] }
            port.remoteId = svc.provider.id
            registry.patternAdded.produce(svc.pattern)
        }
        services[h].providers.push(port)
    }

    function remove (svc, port) {
        var h = hash(svc.pattern)
        if (services[h]) services[h].providers.splice(services[h].providers.indexOf(port), 1)
        if (services[h].providers.length === 0) delete services[h]
    }

    // get single provider using simple round-robin strategy
    function getProvider (msg) {
        var hash = find(Object.keys(services), function (h) {
            return services[h].pattern.matches(msg)
        })
        var providers = services[hash].providers
        if (hash && providers.length) {
            hashptr[hash]++
            hashptr[hash] = hashptr[hash] < providers.length ? hashptr[hash] : 0
            return providers[hashptr[hash]]
        }
    }

    function getServices () {
        return Object.keys(services).map(function (h) {
            return services[h]
        })
    }

    function getPatterns () {
        return registry.services.map(function (svc) {
            return svc.pattern
        })
    }
}
