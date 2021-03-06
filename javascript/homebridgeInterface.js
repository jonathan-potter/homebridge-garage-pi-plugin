const HardwareInterface = require('./hardwareInterface.js')

const REFRESH_INTERVAL = 10000 // 10 seconds

HardwareInterface.init()

module.exports = (Service, Characteristic, CurrentDoorState) => class Garage {
    constructor (log, config) {
        this.index = config.index
        this.log = log
        this.targetDoorState = CurrentDoorState.CLOSED // change this to get the value on start
        this.refreshInterval = config.refreshInterval || REFRESH_INTERVAL
        this.transitioning = false

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

    getServices () {
        this.log('Garage getServices', this.index)
        if (!this.service) return []

        const infoService = new Service.AccessoryInformation()
        infoService.setCharacteristic(Characteristic.Manufacturer, 'Potter')

        return [infoService, this.service]
    }

    async getCurrentDoorState (callback) {
        this.log('Garage getCurrentDoorState', this.index)

        const status = await HardwareInterface.garageStatus(this.index)

        this.log('Garage GARAGE_STATUS', status, this.index)

        const { CLOSED, CLOSING, OPEN, OPENING, STOPPED } = CurrentDoorState

        switch(status) {
            case 'open':
                this.log('Garage RESPONSE OPEN', this.index)
                return callback(undefined, OPEN) // OPEN
            case 'closed':
                this.log('Garage RESPONSE CLOSED', this.index)
                return callback(undefined, CLOSED) // CLOSED
        }

        if (status === 'transition') {
            this.transitioning = true

            switch (this.targetDoorState) {
                case OPEN:
                    this.log('Garage RESPONSE OPENING', this.index)
                    return callback(undefined, OPENING) // OPENING
                case CLOSED:
                    this.log('Garage RESPONSE CLOSING', this.index)
                    return callback(undefined, CLOSING) // CLOSING
            }
        }

        this.log('Garage SOMETHING WEIRD HAPPENED', this.index)
        return callback(undefined, STOPPED)
    }

    // IT WOULD BE SURPRISING IF THESE EVER GET CALLED
    setCurrentDoorState (callback) {
        this.log('Garage setCurrentDoorState', this.index)
        callback(undefined, false)
    }
    getTargetDoorState (callback) {
        this.log('Garage getTargetDoorState', this.targetDoorState, this.index)
        callback(undefined, this.targetDoorState)
    }
    // THIS CODE DOESN'T HANDLE OBSTRUCTED
    getObstructionDetected (callback) {
        this.log('Garage getObstructionDetected', this.index)
        callback(undefined, false)
    }
    setObstructionDetected (callback) {
        this.log('Garage setObstructionDetected', this.index)
        callback(undefined, false)
    }

    setTargetDoorState (targetDoorState, callback) {
        this.log('Garage setTargetDoorState', targetDoorState, this.index)

        this.targetDoorState = targetDoorState
        this.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(targetDoorState)

        this.openOrCloseGarageDoor(targetDoorState)
            .then(() => {
                this.log('Garage FETCH SUCCESS')
                return this.getCurrentDoorState((error, doorState) => {
                    this.updateUI(error, doorState)
                    callback()
                })
            }).catch((error) => {
                this.log('Garage FETCH FAIL :', error)
                callback()
            })
    }

    openOrCloseGarageDoor (targetDoorState) {
        switch (targetDoorState) {
            case CurrentDoorState.OPEN:
                return this.openGarageDoor()
            case CurrentDoorState.CLOSED:
                return this.closeGarageDoor()
        }
    }

    closeGarageDoor () {
        this.log('CLOSE_GARAGE_DOOR', this.index)

        return HardwareInterface.closeGarage(this.index)
    }

    openGarageDoor () {
        this.log('OPEN_GARAGE_DOOR', this.index)

        return HardwareInterface.openGarage(this.index)
    }

    updateUI (error, doorState) {
        this.log('UPDATE UI', this.index)

        const { CLOSED, OPEN } = CurrentDoorState

        // when the door arrives at open or closed it should change the targetDoorState once
        // this ensures that the targetDoorState gets changed for hardware button initiated transitions
        if (this.transitioning && [OPEN, CLOSED].includes(doorState)) {
            this.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(doorState)
            this.transitioning = false
        }

        this.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(doorState)
    }

    poll () {
        this.log('POLL', this.index)
        if(this.timer) { clearTimeout(this.timer) }

        this.getCurrentDoorState((error, doorState) => {
            this.updateUI(error, doorState)
        })

        this.timer = setTimeout(this.poll.bind(this), this.refreshInterval)
    }
}
