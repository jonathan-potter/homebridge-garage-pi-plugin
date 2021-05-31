const HardwareInterface = require('./hardwareInterface.js')

const REFRESH_INTERVAL = 10000 // 10 seconds

let Service, Characteristic, CurrentDoorState

HardwareInterface.init()

module.exports = function (homebridge) {
    Service = homebridge.hap.Service
    Characteristic = homebridge.hap.Characteristic
    CurrentDoorState = Characteristic.CurrentDoorState

    // API.registerAccessory(PluginIdentifier, AccessoryName, AccessoryPluginConstructor)
    homebridge.registerAccessory('garage_controller_plugin', 'garage_controller', Leds)
}

function Leds (log, config) {
    this.index = config.index
    this.log = log
    this.targetDoorState = CurrentDoorState.CLOSED // change this to get the value on start
    this.refreshInterval = config.refreshInterval || REFRESH_INTERVAL

    this.service = new Service.GarageDoorOpener(config.name)

    this.service.getCharacteristic(Characteristic.CurrentDoorState)
        .on('get', this.getCurrentDoorState.bind(this))
        .on('set', this.setCurrentDoorState.bind(this))

    this.service.getCharacteristic(Characteristic.TargetDoorState)
        .on('get', this.getTargetDoorState.bind(this))
        .on('set', this.setTargetDoorState.bind(this))

    this.service.getCharacteristic(Characteristic.ObstructionDetected)
        .on('get', this.getObstructionDetected.bind(this))
        .on('set', this.setObstructionDetected.bind(this))

    // polling
    this.timer = setTimeout(this.poll.bind(this), this.refreshInterval)
}

Leds.prototype = {
    getServices () {
        this.log('LEDS getServices')
        if (!this.service) return []

        const infoService = new Service.AccessoryInformation()
        infoService.setCharacteristic(Characteristic.Manufacturer, 'Potter')

        return [infoService, this.service]
    },

    async getCurrentDoorState (callback) {
        this.log('LEDS getCurrentDoorState')

        const status = await HardwareInterface.garageStatus(this.index)

        this.log('LEDS GARAGE_STATUS', status)

        const { CLOSED, CLOSING, OPEN, OPENING, STOPPED } = CurrentDoorState

        switch(status) {
            case 'open':
                this.log('LEDS RESPONSE OPEN')
                return callback(undefined, OPEN) // OPEN
            case 'closed':
                this.log('LEDS RESPONSE CLOSED')
                return callback(undefined, CLOSED) // CLOSED
        }

        switch (status === 'transition' && this.targetDoorState) {
            case OPEN:
                this.log('LEDS RESPONSE OPENING')
                return callback(undefined, OPENING) // OPENING
            case CLOSED:
                this.log('LEDS RESPONSE CLOSING')
                return callback(undefined, CLOSING) // CLOSING
        }

        this.log('LEDS SOMETHING WEIRD HAPPENED')
        return callback(undefined, STOPPED)
    },

    setCurrentDoorState (callback) {
        this.log('LEDS setCurrentDoorState')
        callback(undefined, false)
    },
    getTargetDoorState (callback) {
        this.log('LEDS getTargetDoorState', this.targetDoorState)
        callback(undefined, this.targetDoorState)
    },
    getObstructionDetected (callback) {
        this.log('LEDS getObstructionDetected')
        callback(undefined, false)
    },
    setObstructionDetected (callback) {
        this.log('LEDS setObstructionDetected')
        callback(undefined, false)
    },

    setTargetDoorState (targetDoorState, callback) {
        this.log('LEDS setTargetDoorState', targetDoorState)

        let doorPromise

        switch (targetDoorState) {
            case CurrentDoorState.OPEN:
                doorPromise = this.openGarageDoor()
                break
            case CurrentDoorState.CLOSED:
                doorPromise = this.closeGarageDoor()
                break
        }

        doorPromise
            .then(() => {
                this.log('LEDS FETCH SUCCESS')
                callback()
                this.getCurrentDoorState((error, doorState) => {
                    this.updateUI(error, doorState)
                })
            }).catch((error) => {
                this.log('LEDS FETCH FAIL :', error)
                callback()
            })
    },

    closeGarageDoor () {
        this.log('CLOSE_GARAGE_DOOR')

        this.targetDoorState = CurrentDoorState.CLOSED

        return HardwareInterface.closeGarage(this.index)
    },

    openGarageDoor () {
        this.log('OPEN_GARAGE_DOOR')

        this.targetDoorState = CurrentDoorState.OPEN

        return HardwareInterface.openGarage(this.index)
    },

    updateUI (error, doorState) {
        this.log('UPDATE UI')
        this.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(doorState)
    },

    poll () {
        this.log('POLL')
        if(this.timer) { clearTimeout(this.timer) }

        this.getCurrentDoorState((error, doorState) => {
            this.updateUI(error, doorState)
        })

        this.timer = setTimeout(this.poll.bind(this), this.refreshInterval)
    },
}
