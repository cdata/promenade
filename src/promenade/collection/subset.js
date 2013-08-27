define(['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Container.Subset API
  // ------------------------------

  var SubsetApi = {

    configure: function(options) {
      this._prototype = this.constructor.prototype;

      this.superset = options.superset;
      this.iterator = options.iterator;
      this.alwaysRefresh = options.alwaysRefresh === true;

      this._connection = null;
      this._connectionStack = [];
      this._connectionMap = {};

      this.cid = _.uniqueId();
    },

    connect: function() {
      var connection = this._makeConnection();

      this._connectionMap[connection.id] = connection;
      this._connectionStack.push(connection.id);

      this._connectToSuperset();

      return connection;
    },

    release: function(connection) {
      connection = connection && this._connectionMap[connection.id];

      if (!connection) {
        return;
      }

      this._connectionMap[connection.id] = null;
      this._connectionStack.pop();

      if (!this._connectionStack.length) {
        this._disconnectFromSuperset();
      }
    },

    hasRootSuperset: function() {
      return !!(this.superset && !this.superset.superset);
    },

    isConnected: function() {
      return !!this._connection;
    },

    connectionCount: function() {
      return this._connectionStack.length;
    },

    refresh: function() {
      var index = 0;
      var model;

      while (index < this.length) {
        model = this.at(index);

        if (!this.iterator(model, index)) {
          this._prototype.remove.call(this, model, {
            operateOnSubset: true
          });
          continue;
        }

        ++index;
      }

      this._prototype.add.call(this, this.superset.filter(this.iterator), {
        operateOnSubset: true
      });
    },

    _connectToSuperset: function() {
      // The ``'add'``, ``'remove'`` and ``'reset'`` events are listened to by
      // the ``subset`` on the superset ``Collection`` instance so that changes
      // to the superset are reflected automatically in the ``subset``.
      // When a ``subset`` is no longer being used, ``stopListening`` should
      // be called on it so that the automatically created listeners are cleaned
      // up.
      if (this.superset && !this.isConnected()) {
        this.listenTo(this.superset, 'add', this._onSupersetAdd);
        this.listenTo(this.superset, 'remove', this._onSupersetRemove);
        this.listenTo(this.superset, 'reset', this._onSupersetReset);
        this.listenTo(this.superset, 'change', this._onSupersetChange);
        this.listenTo(this.superset, 'sort', this._onSupersetSort);

        this.refresh();

        this._connection = true;

        if (!this.hasRootSuperset()) {
          this._connection = this.retains(this.superset);
        }
      }

      return this;
    },

    _disconnectFromSuperset: function() {
      if (this.superset && this.isConnected()) {
        this.stopListening(this.superset);

        this.reset(null, { silent: true });


        if (_.isObject(this._connection)) {
          this._connection.release();
        }

        this._connection = false;
      }

      return this;
    },

    _makeConnection: function() {
      var subset = this;
      var connection = {
        id: _.uniqueId(),
        release: function() {
          subset.release(connection);
        }
      };

      return connection;
    },

    _onSupersetAdd: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      if (!this.iterator(model)) {
        return;
      }

      this._prototype.add.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetRemove: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      this._prototype.remove.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetReset: function() {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      this._prototype.reset.call(this, null, {
        operateOnSubset: true
      });
    },

    _onSupersetChange: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      if (!this.iterator(model)) {
        return this._onSupersetRemove(model);
      }

      this._prototype.add.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetSort: function(superset, options) {
      if (options && options.sortSubsets === false) {
        return;
      }

      this.sort(options);
    },

    set: function(models, options) {
      if (options && options.operateOnSubset) {
        return this._prototype.set.apply(this, arguments);
      }

      return this.superset.set.call(this.superset, arguments);
    }
  };

  _.each(['toJSON', 'toArray'], function(method) {
    SubsetApi[method] = function() {
      var result;

      if (this.isConnected()) {
        return this._prototype[method].apply(this, arguments);
      }

      this._connectToSuperset();

      result = this._prototype[method].apply(this, arguments);

      this._disconnectFromSuperset();

      return result;
    };
  });

  // When a ``superset`` is assigned to a ``SubsetCollection`` instance, any
  // in-place manipulation of the ``SubsetCollection`` instance is redirected to
  // the ``superset``. Changes will automatically reflect in the
  // ``SubsetCollection`` as events propagate.
  _.each(['add', 'remove', 'create', 'fetch'], function(method) {
    SubsetApi[method] = function() {
      if (this.superset && this.isConnected()) {
        return this.superset[method].apply(this.superset, arguments);
      }
    };
  });


  return SubsetApi;
});
