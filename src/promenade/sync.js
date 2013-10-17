define(['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Sync API
  // ------------------
  var SyncApi = {

    canRequestMore: function() {
      return this._paginationUpperIndex !== undefined &&
             this._paginationUpperIndex !== null;
    },

    canRequestUpdates: function() {
      return this._paginationLowerIndex !== undefined &&
             this._paginationLowerIndex !== null;
    },

    isSyncing: function() {
      return this._syncingStack > 0;
    },

    canSync: function() {
      return !!((this.collection && this.collection.url) ||
                _.isString(this.url) || this.urlRoot);
    },

    hasSynced: function() {
      return !this._needsSync || this._synced;
    },

    needsSync: function() {
      return this.canSync() && !this.hasSynced() && !this.isSyncing();
    },

    syncs: function() {
      return this._syncs;
    },

    // Sync is overridden at the ``Model`` and ``Collection`` level in order to
    // support a new ``'before:sync'`` event. This event is triggered on both
    // a ``Model`` or ``Collection`` and their associated ``Application`` (if
    // available. This event allows an ``Application`` to propagate extra
    // response data before the normal ``'sync'`` event triggers, and prior to
    // any network success callbacks being called.
    sync: function(method, model, options) {
      var success;
      var error;
      var beforeSend;

      options = options || {};
      success = options.success || function(){};
      error = options.error || function(){};
      beforeSend = options.beforeSend || function(){};

      this._resetSyncState();
      this._pushSync();

      options.success = _.bind(this._onSyncSuccess, this,
                               method, model, options, success);
      options.error = _.bind(this._onSyncError, this, error);
      options.beforeSend = _.bind(this._onBeforeSend, this, beforeSend);

      return Backbone.sync.call(this, method, model, options);
    },

    replay: function(method, model, options) {

    },

    _onSyncSuccess: function(method, model, options, success, resp, status, xhr) {
      var app = model.app;
      var upperIndex;
      var lowerIndex;

      if (xhr) {
        try {
          upperIndex = xhr.getResponseHeader('X-Upper-Index');
          lowerIndex = xhr.getResponseHeader('X-Lower-Index');
        } catch(e) {}
      }

      if (options.pipe && upperIndex && method === 'read' &&
          upperIndex !== this._paginationUpperIndex) {
        _.delay(_.bind(function() {
          this.sync(method, model, options);
        }, this), 0);
      }

      if (options.requestMore && upperIndex) {
        this._paginationUpperIndex = upperIndex;
        if (this._paginationLowerIndex === null ||
            this._paginationLowerIndex === undefined && lowerIndex) {
          this._paginationLowerIndex = lowerIndex;
        }
      } else if (options.requestUpdates && lowerIndex) {
        this._paginationLowerIndex = lowerIndex;
      }

      if (app) {
        app.trigger('before:sync', model, resp, options);
      }

      model.trigger('before:sync', model, resp, options);

      this._synced = true;
      this._popSync();

      success.call(options, resp, status, options);

      if (app) {
        app.trigger('sync', model, resp, options);
      }
    },

    _onSyncError: function(error, model, resp, options) {
      this._popSync();
      error.call(options, model, resp, options);
    },

    _onBeforeSend: function(beforeSend, xhr, options) {

      if (xhr) {
        if (options.requestMore && this.canRequestMore()) {
          try {
            xhr.setRequestHeader('X-Beyond-Index', this._paginationUpperIndex);
          } catch(e) {}
        } else if (options.requestUpdates && this.canRequestUpdates()) {
          try {
            xhr.setRequestHeader('X-Within-Index', this._paginationLowerIndex);
          } catch(e) {}
        }
      }

      beforeSend.call(options, xhr);
    },

    _pushSync: function() {
      ++this._syncingStack;
    },

    _popSync: function() {
      if (this._syncingStack) {
        --this._syncingStack;
      }
    },

    _resetSyncState: function() {
      var eventuallySyncs = new $.Deferred();

      this._synced = this._synced === true;
      this._syncingStack = this._syncingStack || 0;

      if (_.result(this, 'canSync') === false ||
          _.result(this, 'isSparse') === false) {
        eventuallySyncs.resolve(this);
      } else {
        this.once('sync', function() {
          eventuallySyncs.resolve(this);
        });
      }

      this._syncs = eventuallySyncs.promise();
    }
  };

  return SyncApi;
});
