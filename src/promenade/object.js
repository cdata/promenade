define(['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';

  var PromenadeObject = function(options) {
    this.options = options || {};
    this.initialize(options);
  };

  PromenadeObject.extend = Backbone.View.extend;

  PromenadeObject.prototype.initialize = function(){};

  _.extend(PromenadeObject.prototype, Backbone.Events);

  return PromenadeObject;
});
