var requestify = require('requestify');

var baseURL = 'https://mytotalconnectcomfort.com/portal/';

var SystemSwitch = { EMHEAT: 0, HEAT: 1, OFF: 2, COOL: 3, AUTOHEAT: 4, AUTOCOOL: 5, SOUTHERN_AWAY: 6, UNKNOWN: 7 };
var FanMode = { Auto: 0, On: 1, Circulate: 2, FollowSchedule: 3, Unknown: 4 };
var SetpointStatus = { SCHEDULED: 0, TEMPORARY: 1, HOLD: 2, VACATION_HOLD: 3 };

var loginToHoneywell = function(username, password) {
    var promise = new Promise(function(resolve, reject) {
        requestify.post(baseURL, {timeOffset:300, UserName:username, Password: password, RememberMe: false}, {
            dataType: 'form-url-encoded',
            headers: {
                'Referer': 'https://mytotalconnectcomfort.com/portal/Locations',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            var retVal = {
                success: false,
                cookies: {}
            };
            var body = response.getBody();
            var success = body.Redirect;
            if (success) {
                retVal.success = true;
                var cookies = response.getHeader('set-cookie');
                var cookieValues = {
                    TrueHomeCheckCookie: '',
                    checkCookie: 'checkValue'
                };
                for (var i=0; i < cookies.length; ++i) {
                    var parts = cookies[i].split(';');
                    //first part is the cookie, split into key/value
                    var keyval = parts[0].split('=');
                    var key = keyval[0];
                    var value = parts[0].substring(key.length + 1);
                    cookieValues[key] = value;
                }
                retVal.cookies = cookieValues;
            }
            resolve(retVal);
        }).catch(function(err) {
            reject(err);
        });
    });
    return promise;
};

var getFanMode = function(fanMode) {
    switch (fanMode) {
        case FanMode.Auto:
            return 'Auto';
        case FanMode.On:
            return 'On';
    }
    return '';
};

var getSystemMode = function(mode) {
    switch (mode) {
        case SystemSwitch.EMHEAT:
            return 'EM Heat';
        case SystemSwitch.HEAT:
            return 'Heat';
        case SystemSwitch.OFF:
            return 'Off';
        case SystemSwitch.COOL:
            return 'Cool';
        case SystemSwitch.AUTOHEAT:
            return 'Auto Heat';
        case SystemSwitch.AUTOCOOL:
            return 'Auto Cool';
        case SystemSwitch.SOUTHERN_AWAY:
            return 'Southern Away';
    }
    return '';
};


var getFanModeValue = function(fanMode) {
    switch (fanMode) {
        case 'Auto':
            return FanMode.Auto;
        case 'On':
            return FanMode.On;
    }
    return null;
};

var getSystemModeValue = function(mode) {
    switch (mode) {
        case 'EM Heat':
            return SystemSwitch.EMHEAT;
        case 'Heat':
            return SystemSwitch.HEAT;
        case 'Off':
            return SystemSwitch.OFF;
        case 'Cool':
            return SystemSwitch.COOL;
        case 'Auto Heat':
            return SystemSwitch.AUTOHEAT;
        case 'Auto Cool':
            return SystemSwitch.AUTOCOOL;
        case 'Southern Away':
            return SystemSwitch.SOUTHERN_AWAY;
    }
    return null;
};

var loadDevices = function(username, password) {
    var promise = new Promise(function(resolve, reject) {
        loginToHoneywell(username, password).then(function (result) {
            if (result.success) {
                try {
                    //load the devices
                    requestify.post(baseURL + 'Location/GetLocationListData?page=1&filter=', {}, {
                        dataType: 'json',
                        cookies: result.cookies,
                        headers: {
                            'Referer': 'https://mytotalconnectcomfort.com/portal/Locations',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    }).then(function (response) {
                        // get the response body
                        var data = response.getBody();
                        var devices = [];
                        for (var i=0; i < data.length; ++i) {
                            var locationId = data[i].LocationID;
                            //get the devices for the location
                            for (var j=0; j < data[i].Devices.length; ++j) {
                                var dev = data[i].Devices[j];

                                var allowedModes = [];
                                for (var k=0; k < dev.ThermostatData.AllowedModes.length; ++k) {
                                    allowedModes.push(getSystemMode(dev.ThermostatData.AllowedModes[k]));
                                }
                                //NOTE: For some reason, fan available is always false here; even though the fan is available
                                //not sure why -- so for now, we fake it
                                devices.push({
                                    id: dev.DeviceID,
                                    name: dev.Name,
                                    hasHumidifier: dev.HasHumidifier,
                                    hasDehumidifier: dev.HasDehumidifier,
                                    hasOutdoorTemperature: dev.ThermostatData.OutdoorTemperatureAvailable,
                                    hasOutdoorHumidity: dev.ThermostatData.OutdoorHumidityAvailable,
                                    systemModes: allowedModes,
                                    fanModes: ['Auto', 'On'],
                                    minHeat:  dev.ThermostatData.MinHeatSetpoint,
                                    maxHeat:  dev.ThermostatData.MaxHeatSetpoint,
                                    minCool:  dev.ThermostatData.MinCoolSetpoint,
                                    maxCool:  dev.ThermostatData.MaxCoolSetpoint
                                });
                            }
                        }
                        resolve(devices);
                    }).fail(function(response) {
                        response.getCode(); // Some error code such as, for example, 404
                    });
                } catch (e) {
                    reject(e);
                }

            } else {
                reject('Invalid username or password');
            }
        }).catch(function (err) {
            reject(err);
        });
    });
    return promise;
};

var getDevice = function(username, password, deviceId) {
    var promise = new Promise(function(resolve, reject) {
        loginToHoneywell(username, password).then(function (result) {
            if (result.success) {
                try {
                    //load the devices
                    requestify.get(baseURL + 'Device/CheckDataSession/' + deviceId + '?_= ' + new Date().getTime(), {
                        dataType: 'json',
                        cookies: result.cookies,
                        headers: {
                            'Referer': 'https://mytotalconnectcomfort.com/portal/Locations',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    }).then(function (response) {
                        // get the response body
                        var data = response.getBody();
                        var fanMode = getFanMode(data.latestData.fanData.fanMode);
                        var systemMode = getSystemMode(data.latestData.uiData.SystemSwitchPosition);

                        var retVal = {
                            indoorTemperature: data.latestData.uiData.DispTemperature,
                            heatSetpoint: data.latestData.uiData.HeatSetpoint,
                            coolSetpoint: data.latestData.uiData.CoolSetpoint,
                            currentMode: systemMode,
                            indoorHumidity: data.latestData.uiData.IndoorHumidity,
                            outdoorTemperature: data.latestData.uiData.OutdoorTemperature,
                            outdoorHumidity: data.latestData.uiData.OutdoorHumidity,
                            fanMode: fanMode,
                            fanOn: data.latestData.fanData.fanIsRunning
                        };

                        resolve(retVal);
                    }).fail(function(response) {
                        response.getCode(); // Some error code such as, for example, 404
                    });
                } catch (e) {
                    reject(e);
                }

            } else {
                reject('Invalid username or password');
            }
        }).catch(function (err) {
            reject(err);
        });
    });
    return promise;
};

var submitChanges = function(username, password, changes) {
    //SystemSwitch and FanMode are strings, we need to switch them to enum values
    if (changes.SystemSwitch) {
        changes.SystemSwitch = getSystemModeValue(changes.SystemSwitch);
    }
    if (changes.FanMode) {
        changes.FanMode = getFanModeValue(changes.FanMode);
    }

    //send the update
    var promise = new Promise(function(resolve, reject) {
        loginToHoneywell(username, password).then(function (result) {
            if (result.success) {
                try {
                    //load the devices
                    requestify.post(baseURL + 'Device/SubmitControlScreenChanges', changes, {
                        dataType: 'json',
                        cookies: result.cookies,
                        headers: {
                            'Referer': 'https://mytotalconnectcomfort.com/portal/Locations',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    }).then(function (response) {
                        //TODO: Log any error
                        resolve(response);
                    }).fail(function(response) {
                        response.getCode(); // Some error code such as, for example, 404
                    });
                } catch (e) {
                    reject(e);
                }

            } else {
                reject('Invalid username or password');
            }
        }).catch(function (err) {
            reject(err);
        });
    });
    return promise;
};

module.exports = {
    loadDevices: loadDevices,
    getDevice: getDevice,
    submitChanges: submitChanges
};