import angular from 'angular';
import { clone, compact, map, sortBy, sum } from 'lodash';
const rangy = require('rangy');

require('./margin.less');

export default function(app) {
  app.component('margin', {
    bindings: {
      availableChannels: '<',
      discussions: '<',
      filteredDiscussions: '<',
      draftSelectors: '<',
      emphasizedDiscussions: '<',
      pageCoordinates: '<',
      viewportOffsetTop: '<',
      viewportOffsetBottom: '<',
      scrollToAnchor: '<',

      onDraftOpenUpdate: '&',
      onDraftUnsavedContentUpdate: '&',
      onDiscussionSubmit: '&',
      onDiscussionUpdate: '&',
      onDiscussionDelete: '&',
      onReplySubmit: '&',
      onReplyUpdate: '&',
      onReplyDelete: '&',
      onDiscussionHover: '&',
    },
    controller: [
      '$document', '$element', '$q', '$scope', '$timeout', '$uibModal', '$window', 'scroll',
      'channelService', 'distangleService',
      function($document, $element, $q, $scope, $timeout, $uibModal, $window, scroll, channelService,
               distangleService) {
        const $ctrl = this;
        const clusterHeight = 135;

        $ctrl.channelService = channelService;

        $ctrl.noop = angular.noop;

        $scope.$watch(
          '$ctrl.draftPaneOpen',
          opened => $ctrl.onDraftOpenUpdate({opened}),
        );

        $scope.$watch(
          '$ctrl.draftPaneUnsavedContent',
          unsavedContent => $ctrl.onDraftUnsavedContentUpdate({unsavedContent}),
        );

        $ctrl.closeDraftPaneUnsafe = function () {
          $ctrl.draftPaneOpen = false;
          $ctrl.draftPaneUnsavedContent = false;
          rangy.getSelection().removeAllRanges();
        };

        $ctrl.updateDraftPane = function () {
          if (!$ctrl.draftSelectors) return $ctrl.closeDraftPaneUnsafe();

          if ($ctrl.currentCluster) {
            $ctrl.closeClusterPane().then(
              () => $ctrl.draftPaneOpen = true,
              () => $ctrl.closeDraftPaneUnsafe(),
            );
          } else {
            $ctrl.draftPaneOpen = true;
          }
        };
        $scope.$watch('$ctrl.draftSelectors', $ctrl.updateDraftPane);

        $ctrl.closeDraftPane = function() {
          if (!$ctrl.draftPaneOpen || !$ctrl.draftPaneUnsavedContent) {
            $ctrl.closeDraftPaneUnsafe();
            return $q.resolve();
          }
          return $uibModal.open({
              template: `
                <div class="modal-header">
                  <h3 class="modal-title">Discard draft?</h3>
                </div>
                <div class="modal-body">
                  Your discussion is not yet submitted. Do you want to discard it?
                </div>
                <div class="modal-footer">
                  <button class="btn btn-danger" type="button" ng-click="$close()">Discard</button>
                  <button class="btn btn-default" type="button" ng-click="$dismiss()">Cancel</button>
                </div>
              `,
            })
            .result.then(() => $ctrl.closeDraftPaneUnsafe());
        };

        $ctrl.closeClusterPane = function() {
          if (!$ctrl.currentCluster || !$ctrl.clusterPaneUnsavedContent) {
            $ctrl.currentCluster = undefined;
            $ctrl.currentDiscussion = undefined;
            return $q.resolve();
          }

          return $uibModal
            .open({
              template: `
                <div class="modal-header">
                  <h3 class="modal-title">Discard draft?</h3>
                </div>
                <div class="modal-body">
                  There is an unsent draft. Do you want to discard it?
                </div>
                <div class="modal-footer">
                  <button class="btn btn-danger" type="button" ng-click="$close()">Discard</button>
                  <button class="btn btn-default" type="button" ng-click="$dismiss()">Cancel</button>
                </div>
              `,
            })
            .result.then(() => {
              $ctrl.currentCluster = undefined;
              $ctrl.currentDiscussion = undefined;
            });
        };

        // get clusters that are visible
        function getVisibleClusters(clusters) {
          const parentTop = $element[0].getBoundingClientRect().top;
          const viewportHeight = angular.element($window).height();
          return clusters.filter(cluster => {
            const position = cluster.top;
            return position !== undefined
              && parentTop + position + clusterHeight > - viewportHeight
              && parentTop + position < 2 * viewportHeight;
          });
        }

        // viewport tracking for deciding which clusters actually need to be rendered
        // note: unrendered clusters will be rendered with a placeholder
        let updateClusterVisibilitiesPromise;
        function updateClusterVisibilities() {
          if (updateClusterVisibilities) {
            $timeout.cancel(updateClusterVisibilitiesPromise);
            updateClusterVisibilitiesPromise = undefined;
          }

          if (!$ctrl.discussionClusters) return;

          const visibleClusters = getVisibleClusters($ctrl.discussionClusters);

          // reevaluate after a short delay
          updateClusterVisibilitiesPromise = $timeout(() => $scope.$evalAsync(() => {
            // only make discussions visible that still pass the visibility test
            const stillVisibleClusters = getVisibleClusters(visibleClusters);

            $ctrl.discussionClusters.forEach(cluster => cluster.visible = false);
            stillVisibleClusters.forEach(cluster => cluster.visible = true);
          }), 250, false);
        }
        // update cluster visibilities on scroll and resize event
        angular.element($window).on('scroll', updateClusterVisibilities);
        $element.on('$destroy', () =>
          angular.element($window).off('scroll', updateClusterVisibilities),
        );

        // show popover with share message?
        function resetShowShareMessageId() {
          $ctrl.showShareMessageId = undefined;
        }
        $document.on('click', resetShowShareMessageId);
        $scope.$on('$destroy', () => $document.off('click', resetShowShareMessageId));

        $ctrl.submitDiscussion = discussion => {
          const promise = $ctrl.onDiscussionSubmit({discussion});
          promise.then(newDiscussion => {
            $ctrl.showShareMessageId = newDiscussion.id;
            $ctrl.prioritizedDiscussionIds.unshift(newDiscussion.id);
            $ctrl.draftPaneOpen = false;
            $ctrl.draftPaneUnsavedContent = false;
          });
          return promise;
        };

        // sizes of discussions by discussion id
        $ctrl.discussionSizes = {};

        // top positions of discussions by discussion id
        // (computed from pageCoordinates, selectors and marginDiscussionSizes
        // with distangleService)
        $ctrl.discussionPositions = {};
        $ctrl.draftPosition = undefined;

        // collect discussionIds that are prioritized, e.g., because of a
        // discussion link or because the discussion has just been created
        $ctrl.prioritizedDiscussionIds = [];

        // get raw top position of provided selectors (relative to offsetParent)
        function getRawPosition(selectors) {
          if (!selectors || !selectors.pdfRectangles) return;

          // get top rect of selection
          const rects = clone(selectors.pdfRectangles);
          const topRect = rects.sort((rectA, rectB) => {
            if (rectA.pageNumber < rectB.pageNumber) return -1;
            if (rectA.pageNumber > rectB.pageNumber) return 1;
            if (rectA.top < rectB.top) return -1;
            if (rectA.top > rectB.top) return 1;
            return 0;
          })[0];

          // get page offset
          const pageCoord = $ctrl.pageCoordinates[topRect.pageNumber];
          if (!pageCoord) return;

          // compute position
          return Math.floor(pageCoord.offset.top + pageCoord.size.height * topRect.top);
        }

        function updateScroll() {
          // do not scroll if already scrolled to this anchor
          if ($ctrl.scrollToAnchor === $ctrl.currentScrollAnchor) return;

          // reset scrolledAnchor (possibly updated below)
          $ctrl.currentScrollAnchor = undefined;

          // test if the anchor is a discussion anchor
          const match = /^d:(.*)$/.exec($ctrl.scrollToAnchor);
          if (!match) return;
          const id = match[1];

          const cluster = $ctrl.discussionToCluster && $ctrl.discussionToCluster[id];
          if (!cluster) return;

          $ctrl.prioritizedDiscussionIds.unshift(id);

          $ctrl.scrollToCluster(cluster);

          $ctrl.currentScrollAnchor = $ctrl.scrollToAnchor;
        }

        $scope.$watch('$ctrl.scrollToAnchor', updateScroll);
        $scope.$watchCollection('$ctrl.discussionToCluster', updateScroll);

        $ctrl.scrollToCluster = function(cluster) {
          if ($ctrl.scrolling) return;
          $ctrl.scrolling = true;
          return scroll.scrollTo(cluster.top, {
            duration: 500,
            offset: 60,
          }).then(() => $ctrl.scrolling = false);
        };

        // compute positionedDiscussions and discussionClusters
        function updateClusters() {
          $ctrl.discussionClusters = undefined;
          $ctrl.positionedDiscussions = undefined;
          $ctrl.discussionToCluster = undefined;

          if (!$ctrl.filteredDiscussions || !$ctrl.controlsSize) return;
          const topMin = $ctrl.controlsSize.height + 15;

          // get position and sort by position
          const positionedDiscussions = $ctrl.filteredDiscussions
            .map(discussion => ({
              discussion,
              top: getRawPosition(discussion.target.selectors),
            }))
            .filter(positionedDiscussion => positionedDiscussion.top !== undefined)
            .sort((a, b) => a.top < b.top ? -1 : 1);

          // group into clusters
          const clusters = [];
          positionedDiscussions.forEach(positionedDiscussion => {
            const lastCluster = clusters.length > 0 && clusters[clusters.length - 1];
            if (!lastCluster || lastCluster.top + clusterHeight < positionedDiscussion.top) {
              const top = positionedDiscussion.top < topMin ? topMin : positionedDiscussion.top;
              clusters.push({
                top,
                discussions: [positionedDiscussion.discussion],
              });
              return;
            }

            lastCluster.discussions.push(positionedDiscussion.discussion);
          });

          // generate cluster ids and sort into discussionToCluster
          const discussionToCluster = {};
          clusters.forEach(cluster => {
            // pull first matching prioritized discussion to the front (if any)
            const discussionIds = cluster.discussions.map(discussion => discussion.id);
            for (const prioritizedDiscussionId of $ctrl.prioritizedDiscussionIds) {
              const index = discussionIds.indexOf(prioritizedDiscussionId);
              if (index === -1) continue;
              const removed = cluster.discussions.splice(index, 1);
              cluster.discussions.unshift(removed[0]);
              break;
            }

            // fill discussionToCluster
            cluster.discussions.forEach(discussion => {
              discussionToCluster[discussion.id] = cluster;
            });
          });

          getVisibleClusters(clusters).forEach(cluster => cluster.visible = true);

          // TODO: angular.copy
          $ctrl.positionedDiscussions = positionedDiscussions;
          $ctrl.discussionClusters = clusters;
          $ctrl.discussionToCluster = discussionToCluster;
        }

        $ctrl.discussionDelete = function (discussion) {
          return $ctrl.onDiscussionDelete({discussion})
            .then(() => {
              const idx = $ctrl.currentCluster.discussions.indexOf(discussion);
              if (idx === -1) return;
              $ctrl.currentCluster.discussions.splice(idx, 1);
              if ($ctrl.currentCluster.discussions.length === 0) {
                $ctrl.currentCluster = undefined;
                $ctrl.currentDiscussion = undefined;
              }
            });
        };

        $ctrl.highlightCluster = function(cluster, hovered) {
          cluster.discussions.forEach(discussion => $ctrl.onDiscussionHover({discussion, hovered}));
        };

        // update positions if discussions, or page coords changed
        $scope.$watchCollection('$ctrl.filteredDiscussions', updateClusters);
        $scope.$watchCollection('$ctrl.pageCoordinates', updateClusters);
        $scope.$watchCollection('$ctrl.prioritizedDiscussionIds', updateClusters);
        $scope.$watch('$ctrl.controlsSize', updateClusters);
      },
    ],
    template: require('./margin.html'),
  });
}
