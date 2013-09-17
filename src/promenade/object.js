define(['backbone', 'underscore', 'promenade/queue'],
       function(Backbone, _, QueueApi) {
  'use strict';
  // Promenade.Object
  // ----------------

  // A ``Promenade.Object`` is a primitive class that is used by Promenade
  // types that do not inherit directly from a corresponding Backbone class.
  // It provides similar initialization behavior to that expected from the
  // base Backbone classes that most of Promenade inherit from. An options
  // argument provided to the ``Object`` constructor is passed on to an
  // ``initialize`` method, where a descendant class should put most of its
  // own contructor behavior.
  var PromenadeObject = function(options) {
    this.options = options || {};
    this.initialize(options);
  };

  // ``Promenade.Object`` re-purposes Backbone's ``extend`` static method to
  // mirror Backbone's inheritance semantics.
  PromenadeObject.extend = Backbone.View.extend;

  PromenadeObject.prototype.initialize = function(){};

  // All ``Promenade.Object`` instances have ``Backbone.Events`` mixed in to
  // their prototypes, and thus support Backbone's events API.
  _.extend(PromenadeObject.prototype, Backbone.Events);
  _.extend(PromenadeObject.prototype, QueueApi);

  return PromenadeObject;
});
