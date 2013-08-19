define(['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Event API
  // -------------------

  var EventApi = {

    delegateEventMaps: function() {
      this._ensureEventMaps();
      this.undelegateEventMaps();
      this._toggleEventMaps(true);
    },

    undelegateEventMaps: function() {
      if (!this._eventMapsDelegated) {
        return;
      }

      this._toggleEventMaps(false);
    },

    getSelf: function() {
      return this;
    },

    // If a ``selfEvents`` map is defined, handlers will be bound that respond
    // to events dispatched by the ``View`` instance. This is useful in cases
    // where, for instance, something needs to be done before or after a
    // ``View`` is rendered.
    delegateSelfEvents: function() {
      this._toggleEventMapsForTarget(['_selfEvents', 'selfEvents'], this, 'listenTo');
    },

    undelegateSelfEvents: function() {
      this._toggleEventMapsForTarget(['_selfEvents', 'selfEvents'], this, 'stopListening');
    },

    _toggleEventMaps: function(enabled) {
      var types = this._getSupportedEventMaps();
      var key;
      var target;
      var maps;

      for (key in types) {
        key = key[0].toUpperCase() + key.slice(1);

        target = 'get' + key;
        target = _.result(this, target);

        key = key.toLowerCase();

        if (!target) {
          target = key;
          target = _.result(this, target);
        }

        maps = ['_' + key + 'Events', key + 'Events'];

        this._setEventMapsForTarget(
            maps, target, enabled ? 'listenTo' : 'stopListening');
      }

      this._eventMapsDelegated = enabled;
    },

    _setEventMapsForTarget: function(maps, target, operation) {
      var eventName;
      var index;
      var map;

      if (!maps || !target || !operation) {
        return;
      }

      for (index = 0; index < maps.length; ++index) {
        if (!(maps[index] in this)) {
          continue;
        }

        map = _.result(this, maps[index]);

        for (eventName in map) {
          this[operation](target, eventName, this[map[eventName]]);
        }
      }
    },

    _getSupportedEventMaps: function() {
      var supportedList;
      var supportedMap;
      var index;

      if (this._supportedEventMaps) {
        return this._supportedEventMaps;
      }

      supportedList = _.result(this, 'supportedEventMaps') || [];
      supportedMap = {};

      for (index = 0; index < supportedList.length; ++index) {
        supportedMap[supportedList[index].toLowerCase()] = true;
      }

      this._supportedEventMaps = supportedMap;

      return supportedMap;
    },

    _ensureEventMaps: function() {
      var events = _.result(this, 'events');
      var supportedMaps;
      var event;
      var tokens;
      var handler;
      var key;

      if (!events || this._eventMapsCreated) {
        return;
      }

      this._eventMapsCreated = true;
      this.events = {};

      supportedMaps = this._getSupportedEventMaps();

      for (event in events) {
        tokens = this._tokenizeEventString(event, supportedMaps);

        if (!tokens) {
          continue;
        }

        handler = events[event];
        key = tokens[0];
        event = tokens[1];

        this[key] = _.result(this, key) || {};
        this[key][event] = handler;
      }
    },

    _tokenizeEventString: function(event, supportedEventMaps) {
      var tokens = event.match(this._splitEventString);

      if (!(tokens && tokens.length)) {
        return;
      }

      supportedEventMaps = supportedEventMaps || {};
      tokens = tokens.slice(1, 3);

      if (tokens[0] in supportedEventMaps) {
        tokens[0] = tokens[0].toLowerCase() + 'Events';
        return tokens;
      }

      tokens[1] = tokens.join(' ').replace(this._trim, '');
      tokens[0] = 'events';

      return tokens;
    },

    _splitEventString: /^\s*([\w^]*)\s*(.*)$/i,

    _trim: /^([\s]*)|([\s]*)$/gi
  };

  return EventApi;
});
