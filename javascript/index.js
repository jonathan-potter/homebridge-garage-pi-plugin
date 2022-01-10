const Garage = require('./homebridgeInterface.js')

module.exports = function (homebridge) {
    const Service = homebridge.hap.Service
    const Characteristic = homebridge.hap.Characteristic
    const CurrentDoorState = homebridge.hap.Characteristic.CurrentDoorState

    // API.registerAccessory(
    //     PluginIdentifier,
    //     AccessoryName,
    //     AccessoryPluginConstructor
    // )
    homebridge.registerAccessory(
        'garage_controller_plugin',
        'garage_controller',
        Garage(
            Service,
            Characteristic,
            CurrentDoorState,
        ),
    )
}
