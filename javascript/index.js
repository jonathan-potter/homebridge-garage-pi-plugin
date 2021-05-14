const fetch = require('node-fetch')

const NOOP = () => {}

let Service, Characteristic, CurrentDoorState;

module.exports = function (homebridge) {
    /*
        API.registerAccessory(PluginIdentifier,
            AccessoryName, AccessoryPluginConstructor)
    */

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    CurrentDoorState = Characteristic.CurrentDoorState
    homebridge.registerAccessory('4-leds-test',
        '4-leds-test', Leds);
};

function Leds (log, config, api) {
    this.log = log
    this.targetDoorState = CurrentDoorState.CLOSED // change this to get the value on start
    this.refreshInterval = config.refreshInterval || 30000 // 30 seconds

    this.service = new Service.GarageDoorOpener(config.name)

    this.service.getCharacteristic(Characteristic.CurrentDoorState)
        .on("get", this.getCurrentDoorState.bind(this))
        .on("set", this.setCurrentDoorState.bind(this))

    this.service.getCharacteristic(Characteristic.TargetDoorState)
        .on("get", this.getTargetDoorState.bind(this))
        .on("set", this.setTargetDoorState.bind(this))

    this.service.getCharacteristic(Characteristic.ObstructionDetected)
        .on("get", this.getObstructionDetected.bind(this))
        .on("set", this.setObstructionDetected.bind(this))

    // polling
    this.timer = setTimeout(this.poll.bind(this), this.refreshInterval)
}

Leds.prototype = {
    getServices() {
        this.log('LEDS getServices')
        if (!this.service) return [];

        const infoService = new Service.AccessoryInformation()
        infoService.setCharacteristic(Characteristic.Manufacturer, 'Potter')

        return [infoService, this.service]
    },

    getCurrentDoorState(callback = NOOP) {
        this.log('LEDS getCurrentDoorState')

        fetch('http://192.168.0.184:3000/read_0')
            .then(response => response.json())
            .then(({ garage_status }) => {

                this.log('GARAGE_STATUS', garage_status)

                switch(garage_status) {
                    case 'open':
                        this.log('LEDS RESPONSE OPEN')
                        return CurrentDoorState.OPEN // OPEN
                    case 'closed':
                        this.log('LEDS RESPONSE CLOSED')
                        return CurrentDoorState.CLOSED // CLOSED
                }

                switch (this.targetDoorState) {
                    case CurrentDoorState.OPEN:
                        this.log('LEDS RESPONSE OPENING')
                        return CurrentDoorState.OPENING // OPENING
                    case CurrentDoorState.CLOSED:
                        this.log('LEDS RESPONSE CLOSING')
                        return CurrentDoorState.CLOSING // CLOSING
                }

                this.log('LEDS SOMETHING WEIRD HAPPENED')
                return CurrentDoorState.STOPPED
            }).then(doorState => callback(undefined, doorState))
    },

    setCurrentDoorState(callback) {
        this.log('LEDS setCurrentDoorState')
        callback(undefined, false)
    },
    getTargetDoorState(callback) {
        this.log('LEDS getTargetDoorState', this.targetDoorState)
        callback(undefined, this.targetDoorState)
    },
    getObstructionDetected(callback) {
        this.log('LEDS getObstructionDetected')
        callback(undefined, false)
    },
    setObstructionDetected(callback) {
        this.log('LEDS setObstructionDetected')
        callback(undefined, false)
    },

    setTargetDoorState(targetDoorState, callback) {
        this.log('LEDS setTargetDoorState', targetDoorState)

        if (targetDoorState === CurrentDoorState.OPEN) {
            this.openGarageDoor(callback)
        }

        if (targetDoorState === CurrentDoorState.CLOSED) {
            this.closeGarageDoor(callback)
        }
    },

    closeGarageDoor(callback) {
        this.targetDoorState = CurrentDoorState.CLOSED

        return postFetch('/turn_on_0')
            .then(() => postFetch('/turn_on_1'))
            .then(() => postFetch('/turn_on_2'))
            .then(() => postFetch('/turn_on_3'))
            .then(() => {
                callback()
            }).catch((error) => {
                this.log('LEDS FETCH FAIL :', error)
                callback()
            })
    },

    openGarageDoor(callback) {
        this.targetDoorState = CurrentDoorState.OPEN

        return postFetch('/turn_off_3')
            .then(() => postFetch('/turn_off_2'))
            .then(() => postFetch('/turn_off_1'))
            .then(() => postFetch('/turn_off_0'))
            .then(() => {
                callback()
            }).catch((error) => {
                this.log('LEDS FETCH FAIL :', error)
                callback()
            })
    },

    updateUI(error, doorState) {
        this.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(doorState);
    },

    poll() {
        if(this.timer) { clearTimeout(this.timer) }

        this.timer = undefined;

        this.getCurrentDoorState((error, doorState) => {
            this.updateUI(error, doorState);
        });

        this.timer = setTimeout(this.poll.bind(this), this.refreshInterval)
    }
}

function postFetch (pathName) {
    return fetch(`http://192.168.0.184:3000${pathName}`, {
        method: 'POST'
    })
}
