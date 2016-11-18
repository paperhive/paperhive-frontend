'use strict';
import { cloneDeep } from 'lodash';

import template from './margin-discussion-draft.html';

export default function(app) {
  app.component(
    'marginDiscussionDraft', {
    bindings: {
      selectors: '<',
      onSubmit: '&',
      onDiscard: '&',
    },
    template,
    controller: [
      '$scope', '$q', 'authService', 'channelService',
      function($scope, $q, authService, channelService) {
        const ctrl = this;
        $scope.auth = authService;
        $scope.comment = {};
        this.channelService = channelService;

        ctrl.submit = function() {

          const channel = channelService.selectedChannel &&
            channelService.selectedChannel.id;
          const discussion = {
            target: {selectors: cloneDeep(ctrl.selectors)},
            title: $scope.comment.title,
            body: $scope.comment.body,
            channel,
          };
          delete discussion.target.selectors.isBackwards;
          ctrl.submitting = true;

          $q.when(ctrl.onSubmit({discussion}))
            .then(data => ctrl.onDiscard())
            .finally(() => ctrl.submitting = false);
        };
      }],
    });
};
