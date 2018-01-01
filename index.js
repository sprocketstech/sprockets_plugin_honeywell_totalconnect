"use strict";

var SDK = require('sprockets-sdk');
var util = require('util');
var tcAPI = require('./TotalConnectAPI.js');

var INDOOR_TEMPERATURE = 'INDOOR_TEMPERATURE';
var OUTDOOR_TEMPERATURE = 'OUTDOOR_TEMPERATURE';
var OUTDOOR_HUMIDITY = 'OUTDOOR_HUMIDITY';
var CURRENT_SYSTEM_MODE = 'CURRENT_SYTEM_MODE';
var FAN_ON = 'FAN_ON';

var HEAT_SETPOINT = 'HEAT_SETPOINT';
var COOL_SETPOINT = 'COOL_SETPOINT';
var FAN_MODE = 'FAN_MODE';
var SYSTEM_MODE = 'SYSTEM_MODE';


var ThermostatInstance = function(id, config, services) {
    SDK.Devices.DeviceInstance.call(this, id);
    this.scheduler = services.resolve('scheduler');
    this.config = config;
    this.job = null;
    this.loggingService = services.resolve('loggingService');

    //setup the metadata
    this.addSensor(new SDK.Devices.DeviceValueComponent(INDOOR_TEMPERATURE, 'Indoor Temperature', SDK.ValueType.TEMPERATURE, SDK.DeviceType.THERMOSTAT));
    this.addSensor(new SDK.Devices.DeviceSelectionComponent(CURRENT_SYSTEM_MODE, 'System Mode', config.thermostat.systemModes, SDK.DeviceType.OTHER));
    this.addSensor(new SDK.Devices.DeviceBooleanComponent(FAN_ON, 'Fan', SDK.DeviceType.FAN));

    this.addControl(new SDK.Devices.DeviceRangeComponent(HEAT_SETPOINT, 'Heat Setpoint', SDK.ValueType.TEMPERATURE, config.thermostat.minHeat, config.thermostat.maxHeat, SDK.DeviceType.OTHER));
    this.addControl(new SDK.Devices.DeviceRangeComponent(COOL_SETPOINT, 'Cool Setpoint', SDK.ValueType.TEMPERATURE, config.thermostat.minCool, config.thermostat.maxCool, SDK.DeviceType.OTHER));
    this.addControl(new SDK.Devices.DeviceSelectionComponent(FAN_MODE, 'Fan Mode', config.thermostat.fanModes, SDK.DeviceType.FAN));
    this.addControl(new SDK.Devices.DeviceSelectionComponent(SYSTEM_MODE, 'System Mode', config.thermostat.systemModes, SDK.DeviceType.OTHER));

    if (config.thermostat.hasOutdoorTemperature) {
        this.addSensor(new SDK.Devices.DeviceValueComponent(OUTDOOR_TEMPERATURE, 'Outdoor Temperature', SDK.ValueType.TEMPERATURE, SDK.DeviceType.THERMOSTAT));

    }
    if (config.thermostat.hasOutdoorHumidity) {
        this.addSensor(new SDK.Devices.DeviceValueComponent(OUTDOOR_HUMIDITY, 'Outdoor Humidity', SDK.ValueType.HUMIDITY, SDK.DeviceType.OTHER));
    }
    //TODO: Humidifier, Dehumidifier (not sure what the data looks like)
};

util.inherits(ThermostatInstance, SDK.Devices.DeviceInstance);

/*Overrides of Device Instance */

ThermostatInstance.prototype.start = function() {
    //create a scheduled job to poll the device every 5 minutes
    var schedule = {seconds: 5*60};
    this.job = this.scheduler.scheduleJob("PollHoneywellTotalConnect_" + this.id, schedule, function(time, obj) {
        obj._updateValues();
    }, this);
    //grab the current values
    this._updateValues();
};

ThermostatInstance.prototype.shutdown = function() {
    //on shutdown, cancel the scheduled job
    if (this.job) {
        this.scheduler.cancel(this.job);
    }
};


ThermostatInstance.prototype.setComponentValues = function(newVals) {
    var control = {
        "DeviceID": this.config.thermostat.id,
        "SystemSwitch": null,
        "HeatSetpoint": null,
        "CoolSetpoint": null,
        "HeatNextPeriod": null,
        "CoolNextPeriod": null,
        "StatusHeat": null,
        "StatusCool": null,
        "FanMode": null
    };
    var changes = false;
    var val;
    if (newVals.controls.hasOwnProperty(HEAT_SETPOINT)) {
        val = newVals.controls[HEAT_SETPOINT].value;
        //set the val
        this.updateControlValue(HEAT_SETPOINT, val);
        control.HeatSetpoint = val;
        changes = true;
    }
    if (newVals.controls.hasOwnProperty(COOL_SETPOINT)) {
        val = newVals.controls[COOL_SETPOINT].value;
        //set the val
        this.updateControlValue(COOL_SETPOINT, val);
        control.CoolSetpoint = val;
        changes = true;
    }
    if (newVals.controls.hasOwnProperty(FAN_MODE)) {
        val = newVals.controls[FAN_MODE].value;
        //set the val
        this.updateControlValue(FAN_MODE, val);
        control.FanMode = val;
        changes = true;
    }
    if (newVals.controls.hasOwnProperty(SYSTEM_MODE)) {
        val = newVals.controls[SYSTEM_MODE].value;
        //set the val
        this.updateControlValue(SYSTEM_MODE, val);
        control.SystemSwitch = val;
        changes = true;
    }

    if (changes) {
        tcAPI.submitChanges(this.config.username, this.config.password, control);
    }
};

/* Internal methods for control of the device */


ThermostatInstance.prototype._updateValues = function() {
    var that = this;
    tcAPI.getDevice(this.config.username, this.config.password, this.config.thermostat.id).then(function (results) {
        that.updateSensorValue(INDOOR_TEMPERATURE, results.indoorTemperature);
        that.updateSensorValue(FAN_ON, results.fanOn);
        that.updateSensorValue(CURRENT_SYSTEM_MODE, results.currentMode);

        if (that.config.thermostat.hasOutdoorTemperature) {
            that.updateSensorValue(OUTDOOR_TEMPERATURE, results.outdoorTemperature);
        }

        if (that.config.thermostat.hasOutdoorHumidity) {
            that.updateSensorValue(OUTDOOR_HUMIDITY, results.OutdoorHumidity);
        }

        that.updateControlValue(HEAT_SETPOINT, results.heatSetpoint);
        that.updateControlValue(COOL_SETPOINT, results.coolSetpoint);
        that.updateControlValue(SYSTEM_MODE, results.currentMode);
        that.updateControlValue(FAN_MODE, results.fanMode);
    }).catch(function(err) {
        that.loggingService.error('Could not query total connect ' + that.id() + ', message ' + err.message, err.stack);
    });
};

var ThermostatPlugin = function() {
    SDK.Devices.DevicePlugin.call(this, 'Honeywell® Total Connect Thermostat');
    this.setUIModule('sprockets.plugin.honeywell.totalconnect', 'thermostatUI.js');
    this.setUIConfigHTML('thermostatConfig.html');
};

util.inherits(ThermostatPlugin, SDK.Devices.DevicePlugin);


ThermostatPlugin.prototype.createInstance = function(id, config, services) {
    return new ThermostatInstance(id, config, services);
};


ThermostatPlugin.prototype.loadConfig = function(config, callback) {
    var retVal = {
        loggedIn: false,
        availableThermostats: [],
        configErrors: []
    };
    tcAPI.loadDevices(config.username, config.password).then(function (results) {
        retVal.loggedIn = true;
        retVal.availableThermostats = results;
        callback(retVal);
    }).catch(function(err) {
        retVal.configErrors.push(err);
        callback(retVal);
    });
};


module.exports = new ThermostatPlugin();