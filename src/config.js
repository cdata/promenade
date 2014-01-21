requirejs.config({
  paths: {
    'jquery': 'support/jquery',
    'underscore': 'support/underscore',
    'backbone': 'support/backbone',
    'templates': 'support/templates',
    'promise': 'support/promise'
  },
  shim: {
    'underscore': {
      exports: '_'
    },
    'backbone': {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    }
  }
});
