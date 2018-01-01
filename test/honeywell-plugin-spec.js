var rewire = require('rewire');
var util = require('util');

describe('honeywell-plugin', function() {

    beforeEach(function() {
    });

    afterEach(function() {
    });

    it('load config should return error if issue with TCAPI', function(done) {
        var plugin = rewire('../index.js');
        //mock out TotalConnectAPI
        var mock = {
            loadDevices: function(username, password) {
                var promise = new Promise(function(resolve, reject) {
                    reject("Error");
                });
                return promise;
            }
        };
        
        plugin.__set__("tcAPI", mock);
        plugin.loadConfig({username: 'a', password: 'a'}, function(res) {
            expect(res.configErrors.length).toBe(1);
            expect(res.configErrors[0]).toBe('Error');
            done();
        });
    });


    it('load config should return thermostats if no issue with TCAPI', function(done) {
        var plugin = rewire('../index.js');
        //mock out TotalConnectAPI
        var mock = {
            loadDevices: function(username, password) {
                var promise = new Promise(function(resolve, reject) {
                    resolve([
                        {id: 't1'}
                    ]);
                });
                return promise;
            }
        };

        plugin.__set__("tcAPI", mock);
        plugin.loadConfig({username: 'a', password: 'a'}, function(res) {
            expect(res.loggedIn).toBe(true);
            expect(res.availableThermostats.length).toBe(1);
            expect(res.availableThermostats[0].id).toBe('t1');
            done();
        });
    });


    it('createInstance should return an instance', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
                thermostat: {
                    hasOutdoorTemperature: false,
                    hasOutdoorHumidity: false
                }
            }, {
                resolve: function() {
                return {};
            }
        });
        expect(instance).not.toBe(null);
        done();
    });

    it('createInstance should set the id', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
            thermostat: {
                hasOutdoorTemperature: false,
                hasOutdoorHumidity: false
            }
        }, {
            resolve: function() {
                return {};
            }
        });
        expect(instance.id).toBe(123);
        done();
    });

    it('createInstance should set create indoor temperature sensor', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
            thermostat: {
                hasOutdoorTemperature: false,
                hasOutdoorHumidity: false
            }
        }, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.INDOOR_TEMPERATURE.controlType).toBe('value');
        expect(instance._metadata.sensors.INDOOR_TEMPERATURE.deviceType).toBe('thermostat');
        expect(instance._metadata.sensors.INDOOR_TEMPERATURE.units).toBe('temperature');
        expect(instance._metadata.sensors.INDOOR_TEMPERATURE.monitor).toBe(true);
        done();
    });

    it('createInstance should set create system mode sensor', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
            thermostat: {
                hasOutdoorTemperature: false,
                hasOutdoorHumidity: false,
                systemModes: [
                    'a',
                    'b'
                ]
            }
        }, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.CURRENT_SYTEM_MODE.controlType).toBe('selection');
        expect(instance._metadata.sensors.CURRENT_SYTEM_MODE.deviceType).toBe('other');
        expect(instance._metadata.sensors.CURRENT_SYTEM_MODE.monitor).toBe(true);
        expect(instance._metadata.sensors.CURRENT_SYTEM_MODE.values.length).toBe(2);
        done();
    });

    it('createInstance should set create fan sensor', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
            thermostat: {
                hasOutdoorTemperature: false,
                hasOutdoorHumidity: false,
                systemModes: [
                    'a',
                    'b'
                ]
            }
        }, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.FAN_ON.controlType).toBe('boolean');
        expect(instance._metadata.sensors.FAN_ON.deviceType).toBe('fan');
        expect(instance._metadata.sensors.FAN_ON.monitor).toBe(true);
        done();
    });


    it('createInstance should set create heat point control', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
            thermostat: {
                hasOutdoorTemperature: false,
                hasOutdoorHumidity: false,
                minHeat: 50,
                maxHeat: 75
            }
        }, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.controls.HEAT_SETPOINT.controlType).toBe('range');
        expect(instance._metadata.controls.HEAT_SETPOINT.deviceType).toBe('other');
        expect(instance._metadata.controls.HEAT_SETPOINT.min).toBe(50);
        expect(instance._metadata.controls.HEAT_SETPOINT.max).toBe(75);

        expect(instance._metadata.controls.HEAT_SETPOINT.monitor).toBe(true);
        done();
    });

    it('createInstance should set create cool point control', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
            thermostat: {
                hasOutdoorTemperature: false,
                hasOutdoorHumidity: false,
                minCool: 50,
                maxCool: 75
            }
        }, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.controls.COOL_SETPOINT.controlType).toBe('range');
        expect(instance._metadata.controls.COOL_SETPOINT.deviceType).toBe('other');
        expect(instance._metadata.controls.COOL_SETPOINT.min).toBe(50);
        expect(instance._metadata.controls.COOL_SETPOINT.max).toBe(75);

        expect(instance._metadata.controls.COOL_SETPOINT.monitor).toBe(true);
        done();
    });


    it('createInstance should set create fan modes control', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
            thermostat: {
                hasOutdoorTemperature: false,
                hasOutdoorHumidity: false,
                fanModes: [
                    'a', 'b'
                ]
            }
        }, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.controls.FAN_MODE.controlType).toBe('selection');
        expect(instance._metadata.controls.FAN_MODE.deviceType).toBe('fan');
        expect(instance._metadata.controls.FAN_MODE.values.length).toBe(2);

        expect(instance._metadata.controls.FAN_MODE.monitor).toBe(true);
        done();
    });


    it('createInstance should set create system modes control', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {
            thermostat: {
                hasOutdoorTemperature: false,
                hasOutdoorHumidity: false,
                systemModes: [
                    'a', 'b'
                ]
            }
        }, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.controls.SYSTEM_MODE.controlType).toBe('selection');
        expect(instance._metadata.controls.SYSTEM_MODE.deviceType).toBe('other');
        expect(instance._metadata.controls.SYSTEM_MODE.values.length).toBe(2);

        expect(instance._metadata.controls.SYSTEM_MODE.monitor).toBe(true);
        done();
    });

});
