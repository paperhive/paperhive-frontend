import angular from 'angular';
import { find, findIndex, map, merge, pick, remove } from 'lodash';

import { getHTMLMetadata } from '../utils/document-items';

class DiscussionsController {
  // data
  discussions: any[];
  documentUpdatesSubscription: any;

  constructor(public documentItem: any, public config: any, public $scope: any,
              public $http: any, public authService, public websocketService) {
    this.discussions = [];
  }

  async refresh() {
    const response = await this.$http({
      url: `${this.config.apiUrl}/discussions`,
      params: {documentRevision: this.documentItem.revision},
    });
    this.$scope.$apply(() => this.discussions = response.data.discussions);
    this.websocketDestroy();
    this.websocketInit();
  }

  async discussionSubmit(discussion) {
    const response = await this.$http({
      url: `${this.config.apiUrl}/discussions`,
      method: 'POST',
      data: discussion,
    });
    this.$scope.$apply(() => this._discussionCreate(response.data));
    return response.data;
  }

  async discussionUpdate(discussion) {
    const _discussion = pick(discussion, 'channel', 'authorOnly', 'title', 'body', 'target', 'tags');
    const response = await this.$http({
      url: `${this.config.apiUrl}/discussions/${discussion.id}`,
      method: 'PUT',
      headers: {'If-Match': `"${discussion.revision}"`},
      data: _discussion,
    });
    this.$scope.$apply(() => this._discussionUpdate(response.data));
    return response.data;
  }

  async discussionDelete(discussion) {
    await this.$http({
      url: `${this.config.apiUrl}/discussions/${discussion.id}`,
      method: 'DELETE',
      headers: {'If-Match': `"${discussion.revision}"`},
    });
    this.$scope.$apply(() => this._discussionDelete(discussion));
  }

  async replySubmit(reply) {
    const response = await this.$http({
      url: `${this.config.apiUrl}/replies`,
      method: 'POST',
      data: reply,
    });
    this.$scope.$apply(() => this._replyCreate(response.data));
    return response.data;
  }

  async replyUpdate(reply) {
    const _reply = pick(reply, 'body');
    const response = await this.$http({
      url: `${this.config.apiUrl}/replies/${reply.id}`,
      method: 'PUT',
      data: _reply,
      headers: {'If-Match': `"${reply.revision}"`},
    });
    this.$scope.$apply(() => this._replyUpdate(response.data));
    return response.data;
  }

  async replyDelete(reply) {
    const response = await this.$http({
      url: `${this.config.apiUrl}/replies/${reply.id}`,
      method: 'DELETE',
      headers: {'If-Match': `"${reply.revision}"`},
    });
    this.$scope.$apply(() => this._replyDelete(merge(
      {},
      reply,
      {discussionRevision: response.data.discussionRevision},
    )));
  }

  // subscribe to push notifications
  websocketInit() {
    const documentUpdates = this.websocketService.join('documents', {
      authToken: this.authService.token,
      documentId: this.documentItem.document,
    });
    this.documentUpdatesSubscription = documentUpdates.subscribe((update) => {
      const data = update.data;
      this.$scope.$apply(() => {
        switch (update.resource) {
          case 'discussion':
            switch (update.method) {
              case 'post': this._discussionCreate(data); break;
              case 'put': this._discussionUpdate(data); break;
              case 'delete': this._discussionDelete(data); break;
              default: throw new Error(`method ${update.method} unknown`);
            }
            break;
          case 'reply':
            switch (update.method) {
              case 'post': this._replyCreate(data); break;
              case 'put': this._replyUpdate(data); break;
              case 'delete': this._replyDelete(data); break;
              default: throw new Error(`method ${update.method} unknown`);
            }
            break;
          default: throw new Error(`resource ${update.resource} unknown`);
        }
      });
    });

    // dispose websocket subscription when scope is destroyed
    this.$scope.$on('$destroy', () => this.websocketDestroy());
  }

  websocketDestroy() {
    if (this.documentUpdatesSubscription) {
      this.documentUpdatesSubscription.dispose();
      this.documentUpdatesSubscription = undefined;
    }
  }

  _discussionGet(discussionId) {
    const discussion = find(this.discussions, {id: discussionId});
    if (!discussion) {
      throw new Error(`Could not find discussion ${discussionId}.`);
    }
    return discussion;
  }

  _discussionCreate(newDiscussion) {
    const existingDiscussion = find(this.discussions, {id: newDiscussion.id});
    if (existingDiscussion) {
      if (existingDiscussion.revision !== newDiscussion.revision) {
        throw new Error('Two discussions created with same id but different revision.');
      }
      return;
    }
    this.discussions.push(newDiscussion);
  }

  _discussionUpdate(updatedDiscussion) {
    const discussion = find(this.discussions, {id: updatedDiscussion.id});
    if (!discussion) {
      throw new Error('Could not find discussion for updating.');
    }
    const replies = discussion.replies;
    angular.copy(updatedDiscussion, discussion);
    discussion.replies = replies;
  }

  _discussionDelete(deletedDiscussion) {
    remove(this.discussions, {id: deletedDiscussion.id});
  }

  _replyCreate(newReply) {
    const discussion = this._discussionGet(newReply.discussion);
    const existingReply = find(discussion.replies, {id: newReply.id}) as any;
    if (existingReply) {
      if (existingReply.revision !== newReply.revision) {
        throw new Error('Two replies created with same id but different revision.');
      }
      return;
    }
    discussion.replies.push(newReply);
    discussion.revision = newReply.discussionRevision;
  }

  _replyUpdate(updatedReply) {
    const discussion = this._discussionGet(updatedReply.discussion);
    const replyIndex = findIndex(discussion.replies, {id: updatedReply.id});
    if (replyIndex === -1) {
      throw new Error('Could not find reply for updating.');
    }
    discussion.replies[replyIndex] = updatedReply;
    discussion.revision = updatedReply.discussionRevision;
  }

  _replyDelete(deletedReply) {
    const discussion = this._discussionGet(deletedReply.discussion);
    remove(discussion.replies, {id: deletedReply.id});
    discussion.revision = deletedReply.discussionRevision;
  }
}

export default function(app) {
  app.component('documentItem', {
    controller: class DocumentCtrl {
      subnavOpen = false;
      sidenavOpen = true;
      documentItem: any;
      documentItems: any[];
      documentSubscriptions: any[];
      availableChannels: any;
      discussionsCtrl: DiscussionsController;
      discussionsByRevision: any;
      filteredDiscussions: any[];

      // note: do *not* use $routeSegment.$routeParams because they still
      // use the old state in $routeChangeSuccess events
      static $inject = ['$http', '$routeParams', '$scope', 'authService', 'channelService', 'config',
        'documentItemsApi', 'documentSubscriptionsApi', 'metaService', 'notificationService', 'websocketService'];

      constructor(public $http, public $routeParams, public $scope, public authService,
                  public channelService, public config, public documentItemsApi,
                  public documentSubscriptionsApi, public metaService, notificationService,
                  public websocketService,
      ) {
        this.updateDocumentItem();

        // TODO: do we need this?
        $scope.$on('$routeChangeSuccess', this.updateDocumentItem.bind(this));

        $scope.$watch('$ctrl.documentItems', this.updateDocumentSubscriptions.bind(this));
        $scope.$watchCollection('$ctrl.documentItem.channelShares', this.updateAvailableChannels.bind(this));

        // update filtered discussions if discussions, channel or showAllChannels changed
        $scope.$watchCollection('$ctrl.discussionsCtrl.discussions', this.updateFilteredDiscussions.bind(this));
        $scope.$watch('$ctrl.channelService.onlyMe', this.updateFilteredDiscussions.bind(this));
        $scope.$watch('$ctrl.channelService.public', this.updateFilteredDiscussions.bind(this));
        $scope.$watch('$ctrl.channelService.selectedChannel', this.updateFilteredDiscussions.bind(this));
        $scope.$watch('$ctrl.channelService.showAllChannels', this.updateFilteredDiscussions.bind(this));
      }

      addBookmark(channel) {
        return this.documentItemsApi.bookmarkAdd(this.documentItem.id, channel)
          .then(bookmark => this.documentItem.channelBookmarks.push(bookmark));
      }

      removeBookmark(channel) {
        return this.documentItemsApi.bookmarkDelete(this.documentItem.id, channel)
          .then(() => {
            const index = this.documentItem.channelBookmarks
              .findIndex(bookmark => bookmark.channel === channel);
            this.documentItem.channelBookmarks.splice(index, 1);
          });
      }

      addShare(channel) {
        return this.documentItemsApi.shareAdd(this.documentItem.id, channel)
          .then(share => this.documentItem.channelShares.push(share));
      }

      removeShare(channel) {
        return this.documentItemsApi.shareDelete(this.documentItem.id, channel)
          .then(() => {
            const index = this.documentItem.channelShares
              .findIndex(share => share.channel === channel);
            this.documentItem.channelShares.splice(index, 1);
          });
      }

      setDocumentItem(documentItem) {
        this.documentItem = this.documentItem || {};
        angular.copy(documentItem, this.documentItem);
      }

      updateDocumentItem() {
        const documentItemId = this.$routeParams.documentItem;
        if (!documentItemId || this.documentItem && this.documentItem.id === documentItemId) return;
        this.documentItem = undefined;
        this.documentItems = undefined;
        this.documentItemsApi.get(documentItemId)
          .then(documentItem => {
            this.documentItem = documentItem;

            const metadata = getHTMLMetadata(documentItem);
            this.metaService.set({
              title: documentItem.metadata.title + ' · PaperHive',
              meta: metadata,
            });

            // instanciate and init controller for discussions
            this.discussionsCtrl = new DiscussionsController(
              documentItem, this.config, this.$scope, this.$http,
              this.authService, this.websocketService,
            );
            this.discussionsCtrl.refresh();

            return this.documentItemsApi.getByDocument(documentItem.document);
          })
          .then(({documentItems}) => {
            this.documentItems = documentItems;
            this.updateAvailableChannels();
          });
      }

      updateAvailableChannels() {
        this.availableChannels = undefined;
        if (!this.documentItem || !this.documentItems) return;
        const revisionItems = this.documentItems.filter(item => item.revision === this.documentItem.revision);
        const hasPublicRevisionItem = !!revisionItems.find(item => item.public);

        if (hasPublicRevisionItem) {
          this.availableChannels = {
            public: true,
            channels: this.channelService.channels && [...this.channelService.channels.map(channel => channel.id)],
          };
        } else {
          // get all channels that are valid for this revision
          const channels = [];
          [this.documentItem, this.documentItems.filter(item => item.id !== this.documentItem.id)]
            .forEach(item => item.channelShares && item.channelShares.forEach(({channel}) => {
              if (channels.indexOf(channel) === -1) {
                channels.push(channel);
              }
            }));

          this.availableChannels = {public: false, channels};
        }

        // update selected channel if necessary
        if (this.channelService.onlyMe) return;
        if (this.channelService.public && this.availableChannels.public) return;
        const {selectedChannel} = this.channelService;
        if (selectedChannel && this.availableChannels.channels.indexOf(selectedChannel.id) !== -1) return;
        this.channelService.selectOnlyMe();
      }

      updateDocumentSubscriptions() {
        this.documentSubscriptions = undefined;
        if (!this.documentItem || !this.documentItems) return;

        const hasPublicItem = !!this.documentItems.find(item => item.public);
        if (!hasPublicItem) return;

        this.documentSubscriptionsApi
          .getByDocument(this.documentItem.document)
          .then(({documentSubscriptions}) => {
            this.documentSubscriptions = documentSubscriptions;
          });
      }

      addDocumentSubscription() {
        return this.documentSubscriptionsApi.add(this.documentItem.document)
          .then(subscription => this.documentSubscriptions.push(subscription));
      }

      removeDocumentSubscription() {
        return this.documentSubscriptionsApi.remove(this.documentItem.document)
          .then(() => {
            const index = this.documentSubscriptions
              .findIndex(subscription => subscription.person === this.authService.user.id);
            this.documentSubscriptions.splice(index, 1);
          });
      }

      updateFilteredDiscussions() {
        if (this.filteredDiscussions === undefined) this.filteredDiscussions = [];

        let discussions = this.discussionsCtrl && this.discussionsCtrl.discussions || [];
        if (!discussions) {
          angular.copy([], this.filteredDiscussions);
          return;
        }

        // filter by channel if showAllChannels is false
        if (!this.channelService.showAllChannels) {
          discussions = discussions.filter(discussion => {
            const channelId = this.channelService.selectedChannel &&
              this.channelService.selectedChannel.id;
            if (channelId && discussion.channel === channelId) return true;
            if (this.channelService.onlyMe && discussion.authorOnly) return true;
            if (this.channelService.public && !discussion.authorOnly && !discussion.channel) return true;
            return false;
          });
        }

        this.filteredDiscussions.splice(0, this.filteredDiscussions.length);
        discussions.forEach(discussion => this.filteredDiscussions.push(discussion));
      }
    },
    template: require('./document-item.html'),
  });
}
