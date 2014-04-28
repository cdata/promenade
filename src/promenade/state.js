

define(['backbone', 'underscore'],
       function(Backbone, _, $) {
  'use strict';
  // Promenade.StateMachine API
  // -------------------
  _.mixin({
    capitalize: function(string) {
      return string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
    },

    upperCaseFirstLetter: function(string) {
      return string.charAt(0).toUpperCase() + string.substring(1);
    }
  });

  var StateMachine = {
    states: null,

    transitionTo: function (newState) {
      var args = Array.prototype.slice.call(arguments, 1);

      if (!this.isValidTransition(newState)) {
        return;
      }

      this._currentState = newState;

      this._invokeEnterStateCallback('all', arguments);
      this._invokeEnterStateCallback(this._currentState, args);
    },

    _invokeEnterStateCallback: function (stateName, args) {
      var methodName = 'onEnterState' + (stateName !== 'all' ? _.upperCaseFirstLetter(stateName) : '');

      var method = this[methodName];

      if (_.isFunction(method)) {
        method.apply(this, args);
      }
    },

    isValidTransition: function (newState) {
      var transitionToStates = this._getValidTransitionsForState(this.getCurrentState());
      var length = transitionToStates.length;
      var index;

      for (index = 0; index < length; ++index) {
        if (transitionToStates[index] === newState) {
          return true;
        }
      }

      return false;
    },

    getCurrentState: function () {
      return this._currentState;
    },

    getInitialState: function () {
      return 'initial';
    },

    _getStateByName: function (stateName) {
      return this.states[stateName];
    },

    _getValidTransitionsForState: function (stateName) {
      if (!stateName) {
        return ['initial'];
      }

      return this.states[stateName].transitionTo || [];
    },

    _ensureState: function () {
      if (!this.states || !this.states[this.getInitialState()]) {
        throw new Error('State machine initialized, but no states were declared.');
      }

      this.transitionTo(this.getInitialState());
    }
  };

  return StateMachine;
});
