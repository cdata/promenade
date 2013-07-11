define(['backbone'],
       function(Backbone) {
  'use strict';

  var Controller = function(options) {
    this.options = options;
    this.initialize(options);
  };

  Controller.extend = Backbone.View.extend;

  Controller.prototype.initialize = function(){};

  Controller.prototype.index = function(){};

  return Controller;
});
