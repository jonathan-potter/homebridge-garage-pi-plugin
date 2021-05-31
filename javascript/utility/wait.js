const WAIT_TIME = 1000 // ms

module.exports = function wait () {
    return new Promise(resolve => {
        setTimeout(resolve, WAIT_TIME)
    })
}
