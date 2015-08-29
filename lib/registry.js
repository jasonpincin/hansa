var hash         = require('object-hash').sha1,
    find         = require('array-find'),
    eventuate    = require('eventuate')

module.exports = function mkRegistry () {
    var services = {}
    var hashptr = {}
    var registry = {
        add: function (svc, port) {
            var h = hash(svc.pattern)
            if (!services[h]) {
                services[h] = { pattern: svc.pattern, providers: [] }
                port.remoteId = svc.provider.id
                registry.patternAdded.produce(svc.pattern)
            }
            services[h].providers.push(port)
        },
        remove: function (svc, port) {
            var h = hash(svc.pattern)
            if (services[h]) services[h].providers.splice(services[h].indexOf(port), 1)
            if (services[h].providers.length === 0) delete services[h]
        },
        // get single provider using simple round-robin strategy
        getProvider: function (msg) {
            var hash = find(Object.keys(services), function (h) {
                return services[h].pattern.matches(msg)
            })
            var providers = services[hash].providers
            if (hash && providers.length) {
                hashptr[hash]++
                hashptr[hash] = hashptr[hash] < providers.length ? hashptr[hash] : 0
                return providers[hashptr[hash]]
            }
        },
        getProviders: function (msg) {
            var hash = find(Object.keys(services), function (h) {
                return services[h].pattern.matches(msg)
            })
            if (hash) return services[hash].providers
            return []
        },
        patternAdded: eventuate()
    }
    Object.defineProperties(registry, {
        services: { enumerable: true, get: function () {
            return Object.keys(services).map(function (h) {
                return services[h]
            })
        }},
        patterns: { enumerable: true, get: function () {
            return registry.services.map(function (svc) {
                return svc.pattern
            })
        }}
    })
    return registry
}
