'use strict';
export default function(app) {
  app.controller('SignupCtrl', ['$scope', '$location', 'authService', '$http', 'config',
    function($scope, $location, authService, $http, config) {

      $scope.auth = authService;

      $scope.signup = {
        email: '',
        password: ''
      };

      $scope.hasError = function(field) {
        const form = $scope.signupForm;
        return (form.$submitted || form[field].$touched) &&
          form[field].$invalid;
      };

      $scope.hasErrorPassword = function() {
        const form = $scope.signupForm;
        return (form.$submitted || form['password'].$touched
          || !form['password'].$pristine) && form['password'].$invalid;
      };

      $scope.$watch('email', function() {
        $scope.emailError = undefined;
        $scope.responseError = undefined;
      });

      $scope.$watch('password', function() {
        $scope.passwordError = undefined;
        $scope.responseError = undefined;
      });

      $scope.signup = function() {
        $scope.subscribing = true;
        $scope.passwordError = undefined;
        $scope.emailError = undefined;
        $scope.responseError = undefined;

        authService
          .signupEmail(
            $scope.signup.email, $scope.signup.password,
            authService.getReturnUrl()
          )
          .then(function(response) {
            $scope.subscribing = false;
            $scope.subscribed = true;
          }, function(response) {
            $scope.subscribing = false;
            $scope.responseError = response.data && response.data.message ||
              'Unknown error';
          });
      };

    }
  ]);
};