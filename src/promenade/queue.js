define(['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';
  // Promenade.Queue API
  // -------------------

  var QueueApi = {
    promiseProvider: $,
    defaultSleep: 0,
    defer: function() {
      return new this.promiseProvider.Deferred();
    },
    promise: function(value) {
      // wrap around the value with a promise that resolves the same
      // time the value resolves.
      var deferred = this.defer();
      this.when(value).then(deferred.resolve);
      return _.result(deferred, 'promise');
    },
    when: function() {
      return this.promiseProvider.when.apply(this.promiseProvider, arguments);
    },
    tick: function(fn, sleep) {
      return _.bind(function() {
        var tick = this.defer();
        var args = arguments;

        var tock = _.bind(function() {
          var result = _.isFunction(fn) ? fn.apply(this, args) : fn;
          var that = this;
          // wrap the fn in a promise and tie
          // tick's resolution upon result's completion
          this.when(result).then(function() {
            tick.resolve();
          });
        }, this);
        var factory;

        sleep = sleep || this.defaultSleep || 0;

        if (sleep < 20 && _.isFunction(window.requestAnimationFrame)) {
          window.requestAnimationFrame(tock);
        } else {
          window.setTimeout(tock, sleep);
        }

        return _.result(tick, 'promise');
      }, this);
    },
    getQueue: function(id) {
      id = this._queueId(id);

      this._queueOperations = this._queueOperations || {};
      this._queueOperations[id] = this._queueOperations[id] || [];
      this._queueWorkers = this._queueWorkers || {};
      this._queueWorkers[id] = this._queueWorkers[id] || null;
      this._queueSteps = this._queueSteps || {};
      this._queueSteps[id] = this._queueSteps[id] || [];

      return this._queueOperations[id];
    },
    queueTailCompletes: function(id) {
      var queue = this.getQueue(id);
      var steps = this._queueSteps[this._queueId(id)];

      return steps[steps.length - 1] || this.promise();
    },
    pushQueue: function(operation, id) {
      var queue = this.getQueue(id);
      var steps = this._queueSteps[this._queueId(id)];

      var stepCompletion = this.defer();
      var step = _.bind(function() {
        var complete = function() {
          stepCompletion.resolve();
          steps.shift();
        };
        var result = _.isFunction(operation) ?
            operation.apply(this, arguments) : operation;

        return this.when(result).then(complete, complete);
      }, this);

      steps.push(_.result(stepCompletion, 'promise'));
      queue.push(step);

      this._startQueue(id);

      return queue.length;
    },
    hasEmptyQueue: function(id) {
      return !this.getQueue(id).length;
    },
    queueCompletes: function(id) {
      var queueWorker;

      id = this._queueId(id);
      queueWorker = this._queueWorkers && this._queueWorkers[id];

      return queueWorker || this.promise();
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
        var next;

        if (queue.length === 0) {
          self._queueWorkers[id] = null;
          workCompletes.resolve();
          return;
        }

        self.when(queue.shift()()).then(work, work);
        // TODO: Evaluate need for failure tolerance here:
      })();
    },
    _queueId: function(id) {
      return id || 'default';
    }
  };

  return QueueApi;
});
