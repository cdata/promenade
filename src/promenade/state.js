

define(['backbone', 'underscore'],
       function(Backbone, _, $) {
  'use strict';
  // Promenade.StateMachine API
  // -------------------

  var StateMachine = {
    states: {},

    transitionTo: function (newState) {
      if (!this.isValidTransition(newState)) {
        return;
      }

      this._currentState = newState;

      if (_.isFunction(this.trigger)) {
        this.trigger('enter:' + this._currentState, this);
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
      this.transitionTo('initial');
    }
  };

  return StateMachine;
});


// states: [
//   { name: 'foo', transitionTo: ['bar', 'baz'] }
// ],