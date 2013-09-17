define(['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';
  // Promenade.Queue API
  // -------------------

  var QueueApi = {
    promiseProvider: $,
    defer: function() {
      return new this.promiseProvider.Deferred();
    },
    promise: function(value) {
      return _.result(this.defer().resolve(value), 'promise');
    },
    when: function() {
      return this.promiseProvider.when.apply(this.promiseProvider, arguments);
    },
    tick: function(fn) {
      var tick = this.defer();
      var tock = _.bind(function() {
        var result = _.isFunction(fn) ? fn.call(this) : fn;
        this.when(result).then(function() {
          tick.resolve();
        });
      }, this);

      if (_.isFunction(window.requestAnimationFrame)) {
        window.requestAnimationFrame(tock);
      } else {
        window.setTimeout(tock, 0);
      }

      return _.result(tick, 'promise');
    },
    getQueue: function(id) {
      id = this._queueId(id);

      this._queueOperations = this._queueOperations || {};
      this._queueOperations[id] = this._queueOperations[id] || [];
      this._queueWorkers[id] = this._queueWorkers[id] || null;

      return this._queueOperations[id];
    },
    pushQueue: function(operation, id) {
      var queue = this.getQueue(id);

      queue.push(operation);
      this._startQueue(id);

      return queue.length;
    },
    queueCompletes: function(id) {
      return this._queueWorkers[this._queueId(id)] || this.promise();
    },
    _startQueue: function(id) {
      var self = this;
      var workCompletes;
      var queue;
      var operation;

      id = this._queueId(id);

      if (this._queueWorkers[id] !== null) {
        return;
      }

      workCompletes = this.defer();
      queue = this.getQueue(id);

      self._queueWorkers[id] = _.result(workCompletes, 'promise');

      (function work() {
        if (queue.length === 0) {
          workCompletes.resolve();
          self._queueWorkers[id] = null;
          return;
        }

        operation = queue.shift();
        operation = _.isFunction(operation) ?
            operation.apply(this, arguments) : operation;

        // TODO: Evaluate need for failure tolerance here:
        self.when(operation).then(work, work);
      })();
    },
    _queueId: function(id) {
      return id || 'default';
    }
  };

  return QueueApi;
});
