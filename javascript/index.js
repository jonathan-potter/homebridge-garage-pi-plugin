const fetch = require('node-fetch')

const OPEN = 0
const CLOSED = 1

let Service, Characteristic;

module.exports = function (homebridge) {
    /*
        API.registerAccessory(PluginIdentifier,
            AccessoryName, AccessoryPluginConstructor)
    */

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('4-leds-test',
        '4-leds-test', Leds);
};

function Leds (log, config, api) {
    this.log = log
    this.targetDoorState = CLOSED // change this to get the value on start
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
}

Leds.prototype = {
    getServices() {
        this.log('LEDS getServices')
        if (!this.service) return [];

        const infoService = new Service.AccessoryInformation()
        infoService.setCharacteristic(Characteristic.Manufacturer, 'Potter')

        return [infoService, this.service]
    },

    getCurrentDoorState(callback) {
        this.log('LEDS getCurrentDoorState')

        fetch('http://192.168.0.184:3000/read_0')
            .then(response => response.json())
            .then(({ error, garage_status }) => {
                if (error) {
                    this.log('LEDS RESPONSE STOPPED - ERROR')
                    // using STOPPED as an error code
                    callback(Characteristic.CurrentDoorState.STOPPED)
                }

                this.log('GARAGE_STATUS', garage_status)
                const callbackSpy = value => {
                    this.log('LEDS SPY', value)
                    callback(value)
                }

                switch(garage_status) {
                    case 'open':
                        this.log('LEDS RESPONSE OPEN')
                        return callbackSpy(Characteristic.CurrentDoorState.OPEN) // OPEN
                    case 'closed':
                        this.log('LEDS RESPONSE CLOSED')
                        return callbackSpy(Characteristic.CurrentDoorState.CLOSED) // CLOSED
                    default:
                        switch (this.targetDoorState) {
                            case OPEN:
                                this.log('LEDS RESPONSE OPENING')
                                return callbackSpy(Characteristic.CurrentDoorState.OPENING) // OPENING
                            case CLOSED:
                                this.log('LEDS RESPONSE CLOSING')
                                return callbackSpy(Characteristic.CurrentDoorState.CLOSING) // CLOSING
                        }
                }

                this.log('LEDS SOMETHING WEIRD HAPPENED')
                callbackSpy(Characteristic.CurrentDoorState.STOPPED)
            })
    },

    setCurrentDoorState(callback) {
        this.log('LEDS setCurrentDoorState')
        callback(false)
    },
    getTargetDoorState(callback) {
        this.log('LEDS getTargetDoorState', this.targetDoorState)
        callback(this.targetDoorState)
    },
    getObstructionDetected(callback) {
        this.log('LEDS getObstructionDetected')
        callback(false)
    },
    setObstructionDetected(callback) {
        this.log('LEDS setObstructionDetected')
        callback(false)
    },

    setTargetDoorState(open, callback) {
        this.log('LEDS setTargetDoorState', open)
        this.targetDoorState = open

        fetch('http://192.168.0.184:3000/click_0', {
            method: 'POST'
        }).then(() => fetch('http://192.168.0.184:3000/click_1', {
            method: 'POST'
        })).then(() => fetch('http://192.168.0.184:3000/click_2', {
            method: 'POST'
        })).then(() => fetch('http://192.168.0.184:3000/click_3', {
            method: 'POST'
        })).then(() => {
            callback()
        }).catch((error) => {
            this.log('LEDS FETCH FAIL :', error)
            callback()
        })
    }
}
