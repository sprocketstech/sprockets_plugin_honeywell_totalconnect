angular.module('sprockets.plugin.honeywell.totalconnect', ['sprockets', 'ui.bootstrap']);

angular.module('sprockets.plugin.honeywell.totalconnect').controller('honeywellTotalConnectConfigController', function($scope, pluginService) {
    $scope.validation.add('config.username', 'username', $scope.services.required);
    $scope.validation.add('config.password', 'password', $scope.services.required);
    $scope.validation.add('config.thermostat', 'thermostat', $scope.services.required);
    $scope.loggedIn = false;
    $scope.configErrors = [];
    $scope.availableThermostats = [];
    
    $scope.login = function() {
        pluginService.getConfigData($scope.plugin, {
            username: $scope.config.username,
            password: $scope.config.password
        }).then(function (response) {
            $scope.loggedIn = response.loggedIn;
            if ($scope.loggedIn) {
                $scope.availableThermostats = response.availableThermostats;
                if ($scope.availableThermostats.length > 0) {
                    $scope.config.thermostat = $scope.availableThermostats[0];
                }
                $scope.configErrors.length = 0;
            } else {
                $scope.configErrors = response.configErrors;
            }
        });
    };
});
