module.exports = function hasRemote (remote) {
    return function hasRemote (stream) {
        return stream.remote === remote
    }
}
