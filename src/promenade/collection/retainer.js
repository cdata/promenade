define(['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Container.Retainer API
  // ================================

  var RetainerApi = {
    _verifySubsetApi: function(collection) {
      return collection && _.isFunction(collection.connect) && collection.cid;
    },
    retains: function(collection) {
      var connection;

      if (!this._verifySubsetApi(collection)) {
        return;
      }

      this._connections = this._connections || {};

      if (this._connections[collection.cid]) {
        return;
      }

      connection = collection.connect();

      this._connections[collection.cid] = connection;

      return collection;
    },
    releaseConnections: function() {
      for (var id in this._connections) {
        this._connections[id].release();
      }
    }
  };

  return RetainerApi;
});
