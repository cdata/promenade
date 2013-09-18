define(['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Delegation API
  // -------------------

  var DelegationApi = {

    isDelegationActive: function() {
      return this._delegationActive === true;
    },

    activateDelegation: function() {
      this.deactivateDelegation();
      this._toggleDelegation(true);
    },

    deactivateDelegation: function() {
      if (!this.isDelegationActive()) {
        return;
      }

      this._toggleDelegation(false);
    },

    delegate: function(target, event, handler) {
      this.listenTo(target, event, handler);
    },

    undelegate: function(target, event, handler) {
      this.stopListening(target, event, handler);
    },

    getSelf: function() {
      return this;
    },

    _toggleDelegation: function(enabled) {
      var types;
      var type;
      var index;
      var target;
      var maps;

      this._ensureDelegation();

      types = this.delegationTargets;

      for (index = 0; index < types.length; ++index) {
        type = types[index];
        target = type[0].toUpperCase() + type.slice(1);

        target = 'get' + target;
        target = _.result(this, target);

        if (!target) {
          target = _.result(this, type);
        }

        maps = ['_' + type + 'Events', type + 'Events'];

        this._setEventMapsForTarget(
            maps, target, enabled);
      }

      this._delegationActive = enabled;
    },

    _setEventMapsForTarget: function(maps, target, enabled) {
      var operation = enabled ? 'delegate' : 'undelegate';
      var eventName;
      var index;
      var map;
      var handler;
      var _index;

      if (!maps || !target || !operation) {
        return;
      }

      for (index = 0; index < maps.length; ++index) {
        if (!(maps[index] in this)) {
          continue;
        }

        map = _.result(this, maps[index]);

        for (eventName in map) {
          handler = map[eventName];

          if (_.isArray(handler)) {
            for (_index = 0; _index < handler.length; ++_index) {
              this[operation](target, eventName, this[handler[_index]]);
            }
          } else if (_.isString(handler)) {
            this[operation](target, eventName, this[handler]);
          }
        }
      }
    },

    _ensureDelegation: function() {
      var events = _.result(this, 'events');
      var event;
      var tokens;
      var handler;
      var map;

      if (!events && !this.defaultDelegationTargets) {
        this.delegationTargets = [];
      }

      if (this.delegationTargets) {
        return;
      }

      this.delegationTargets = this.delegationTargets ||
          (this.defaultDelegationTargets &&
           this.defaultDelegationTargets.slice()) || [];

      this.events = {};

      for (event in events) {
        tokens = this._parseEventString(event);

        if (!tokens) {
          continue;
        }

        map = tokens[0];
        handler = events[event];

        if (map !== 'events') {
          if (!_.contains(this.delegationTargets, map)) {
            this.delegationTargets.push(map);
          }
          map = map + 'Events';
        }

        event = tokens[1];

        this[map] = _.result(this, map) || {};
        this[map][event] = handler;
      }
    },

    _parseEventString: function(event) {
      var tokens = event.match(this._splitEventString);
      var target = 'events';

      if (!_.isArray(tokens)) {
        return [];
      }

      if (tokens[1] === this._delegationIdentifier) {
        target = tokens[2];
        event = tokens[3];
      }

      return [target, event];
    },

    _delegationIdentifier: '#',

    _splitEventString: /^\s*(#)?\s*([\w^]*)\s*(.*)$/i,

    _trim: /^([\s]*)|([\s]*)$/gi
  };

  return DelegationApi;
});
