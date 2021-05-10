const fetch = require('node-fetch')

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
    this.service = new Service.Lightbulb(config.name)

    this.service.getCharacteristic(Characteristic.On)
        .on("get", this.getOn.bind(this))
        .on("set", this.setOn.bind(this))
}

Leds.prototype = {
    getServices() {
        this.log('LEDS getServices')
        if (!this.service) return [];

        const infoService = new Service.AccessoryInformation()
        infoService.setCharacteristic(Characteristic.Manufacturer, 'Potter')

        return [infoService, this.service]
    },

    getOn(callback) {
        this.log('LEDS getOn')

        fetch('http://192.168.0.184:3000/read_0')
            .then(response => response.json())
            .then(data => {
                console.log(data)
                callback(data)
            })
    },

    setOn(on, callback) {
        this.log('LEDS setOn', on)

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
