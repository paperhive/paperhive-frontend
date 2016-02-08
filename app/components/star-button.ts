'use strict';
import { findIndex, some } from 'lodash';

export default function(app) {
    app.component('starButton', {
      bindings: {
        documentId: '<',
        user: '<',
      },
      controller: [
        '$scope', '$element', '$attrs', '$http', 'config', 'notificationService',
        function($scope, $element, $attrs, $http, config, notificationService) {
          const ctrl = this;

          this.doesUserStar = false;

          // $watch on this?
          $scope.$watch('$ctrl.documentId', function(id) {
            if (!id) { return; }
            $http.get(
              config.apiUrl +
                '/documents/' + id + '/stars'
            )
            .success(function(ret) {
              ctrl.stars = ret.stars;
              $scope.$watch('$ctrl.user', function(user) {
                if (user && user.id) {
                  ctrl.doesUserStar = some(ctrl.stars, {'id': user.id});
                }
              });
            })
            .error(function(data) {
              notificationService.notifications.push({
                type: 'error',
                message: data.message ? data.message :
                  'could not fetch stars (unknown reason)'
              });
            });
          });

          ctrl.star = function() {
            ctrl.submitting = true;
            return $http.post(
              config.apiUrl +
                '/documents/' + ctrl.documentId + '/star'
            )
            .success(function() {
              ctrl.submitting = false;
              ctrl.stars.push(ctrl.user);
              ctrl.doesUserStar = true;
            })
            .error(function(data) {
              ctrl.submitting = false;
            })
            .error(notificationService.httpError('could not star document'));
          };

          ctrl.unstar = function() {
            ctrl.submitting = true;
            return $http.delete(
              config.apiUrl +
                '/documents/' + ctrl.documentId + '/star'
            )
            .success(function() {
              ctrl.submitting = false;
              const idx = findIndex(ctrl.stars, {id: ctrl.user.id});
              if (idx > -1) {
                ctrl.stars.splice(idx, 1);
              }
              ctrl.doesUserStar = false;
            })
            .error(function(data) {
              ctrl.submitting = false;
            })
            .error(notificationService.httpError('could not star document'));
          };
        }],
        template: ([
          '<div class="btn-group" role="group">',
          '  <button ng-if="$ctrl.doesUserStar" type="button" class="btn btn-default"',
          '    ng-disabled="!$ctrl.user" ng-click="$ctrl.unstar()">',
          '    <i class="fa fa-star"></i> Unstar',
          '  </button>',
          '  <button ng-if="!$ctrl.doesUserStar" type="button" class="btn btn-default"',
          '    ng-disabled="!$ctrl.user" ng-click="$ctrl.star()">',
          '    <i class="fa fa-star"></i> Star',
          '  </button>',
          '  <button type="button" class="btn btn-default" disabled>',
          '    {{$ctrl.stars.length}}',
          '  </button>',
          '</div>',
        ]).join(' '),
    });
};
