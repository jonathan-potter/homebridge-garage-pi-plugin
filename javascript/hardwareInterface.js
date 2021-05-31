const wait = require('./utility/wait.js')
const gpio = require('rpi-gpio')

const gpiop = gpio.promise
gpiop.destroy()

/* eslint-disable no-unused-vars */
const UNUSED_PINS = [
    35, // GPIO 19
    36, // GPIO 16
    37, // GPIO 26
    38, // GPIO 20
    11, // GPIO 17
    13, // GPIO 27
    15, // GPIO 22
    16, // GPIO 23
]
/* eslint-enable */

const GARAGES = [
    {
        relay: 40, // GPIO 21
        sensors: {
            closed: 31, // GPIO 6
            open: 33, // GPIO 13
        },
    },
    {
        relay: 32, // GPIO 12
        sensors: {
            closed: 18, // GPIO 24
            open: 22, // GPIO 25
        },
    },
]


module.exports = class HardwareInterface {
    static init () {
        return Promise.all(
            /* eslint-disable comma-dangle */
            GARAGES.map(garage => ([
                gpiop.setup(garage.relay, gpiop.DIR_OUT),
                gpiop.setup(garage.sensors.open, gpiop.DIR_IN),
                gpiop.setup(garage.sensors.closed, gpiop.DIR_IN),
            ])).flat()
            /* eslint-enable comma-dangle */
        )
    }

    static async openGarage (garageIndex) {
        console.log(`openGarage ${garageIndex}`)

        const { relay, sensors } = GARAGES[garageIndex]

        const notOpen = await gpiop.read(sensors.open)

        if (!notOpen) { return }

        await gpiop.write(relay, true)
        await wait()
        await gpiop.write(relay, false)
    }

    static async closeGarage (garageIndex) {
        console.log(`closeGarage ${garageIndex}`)

        const { relay, sensors } = GARAGES[garageIndex]

        const notClosed = await gpiop.read(sensors.closed)

        if (!notClosed) { return }

        await gpiop.write(relay, true)
        await wait()
        await gpiop.write(relay, false)
    }

    static async garageStatus (garageIndex) {
        console.log(`garageStatus ${garageIndex}`)

        const { sensors } = GARAGES[garageIndex]

        return Promise.all([
            gpiop.read(sensors.open),
            gpiop.read(sensors.closed),
        ]).then(([ notOpen, notClosed ]) => {
            const open = Number(!notOpen).toString()
            const closed = Number(!notClosed).toString()

            return ({
                '00': 'transition',
                '01': 'closed',
                '10': 'open',
                '11': 'sensor malfunction',
            })[open + closed]
        }).then(status => {
            console.log({
                status,
            })

            return status
        })
    }
}
