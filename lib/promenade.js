
define('promenade/view',['backbone', 'templates', 'underscore'],
       function(Backbone, templates, _) {
  'use strict';

  var View = Backbone.View.extend({
    initialize: function(options) {
      var model;

      Backbone.View.prototype.initialize.apply(this, arguments);

      options = options || {};

      this.collection = options.collection;
      this.template = options.template || this.template;

      if (this.template) {
        this.templateFactory = templates[this.template];
      }

      this.layout = this.layout || {};
      this.regions = {};
      this.$regions = {};
      this.subViews = {};
      this.rendered = false;

      if(!this.hasModel()) {
        return;
      }

      model = this.getModel();

      for (var eventName in this.modelEvents) {
        this.listenTo(model, eventName, this[this.modelEvents[eventName]]);
      }
    },
    modelEvents: {
      'add': 'render',
      'remove': 'render',
      'reset': 'render',
      'change': 'render'
    },
    template: '',
    render: function(recursive) {
      var region;
      var subview;
      var data;
      var html;

      this.trigger('before:render');

      for (region in this.subViews) {
        this.subViews[region].$el.detach();
      }

      if (this.templateFactory) {
        data = this.serializeModelData();
        html = this.templateFactory(data);

        this.$el.html(html);
      }

      for (region in this.layout) {
        if (!this.layout[region]) {
          continue;
        }

        this.$regions[region] = this.$(this.layout[region]).eq(0);
        this.regions[region] = this.$regions[region].get(0);
      }

      this.$regions.self = this.$el;
      this.regions.self = this.el;

      for (region in this.subViews) {
        subview = this.subViews[region];

        if (recursive) {
          if (subview.deepRender) {
            subview.deepRender();
          } else {
            subview.render();
          }
        } else if (subview.rendered === false) {
          subview.render();
        }

        this.$regions[region].append(subview.$el);
      }

      this.rendered = true;
      this.trigger('render');

      return this;
    },
    deepRender: function() {
      return this.render(true);
    },
    hasModel: function() {
      return !!this.getModel();
    },
    getModel: function() {
      return this.model || this.collection;
    },
    serializeModelData: function() {
      if (!this.hasModel()) {
        return {};
      }

      return this.getModel().toJSON();
    },
    setSubview: function(region, view) {

      if (!_.isString(region)) {
        view = region;
        region = 'self';
      }

      if (this.subViews[region]) {
        this.subViews[region].detach();
      }

      if (view && this.$regions[region]) {
        this.$regions[region].append(view.render().$el);
      }

      this.subViews[region] = view;
    }
  });

  return View;
});

define('promenade/view/collection',['promenade/view'],
       function(View) {
  'use strict';

  var CollectionView = View.extend({
    itemView: null,
    initialize: function() {
      this.layout = _.defaults(this.layout || {}, {
        collectionContainer: this.tagName
      });
      this.items = {};

      View.prototype.initialize.apply(this, arguments);
    },
    modelEvents: {
      'add': 'addItemByModel',
      'remove': 'removeItemByModel',
      'reset': 'resetItems'
    },
    addItemByModel: function(model) {

    },
    removeItemByModel: function(model) {

    },
    resetItems: function() {

    },
    render: function() {

    }
  });

  return CollectionView;
});

define('promenade/model',['backbone', 'require'],
       function(Backbone, require) {
  'use strict';

  var Model = Backbone.Model.extend({
    types: {},
    parse: function(data) {
      var TypeClass;

      for (var type in this.types) {
        TypeClass = this.types[type];

        if (_.isString(TypeClass)) {
          TypeClass = require(TypeClass);
        }

        if (data[type]) {
          data[type] = new TypeClass(data[type], { parse: true });
        }
      }

      return data;
    },
    set: function(key, value, options) {
      var attrs;
      var attr;
      var Type;

      if (typeof key === 'object') {
        attrs = key;
        options = value;
      } else {
        (attrs = {})[key] = value;
      }

      for (attr in attrs) {
        Type = this.types[attr];
        value = attrs[attr];

        if (Type && value && !(value instanceof Type)) {
          attrs[attr] = new Type(value);
        }
      }

      return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    toJSON: function() {
      var data = Backbone.Model.prototype.toJSON.apply(this, arguments);

      for (var type in this.types) {
        if (data[type] && data[type].toJSON) {
          data[type] = data[type].toJSON();
        }
      }

      return data;
    }
  });

  return Model;
});

define('promenade/controller',['backbone'],
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

define('promenade/application',['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';

  var Application = Backbone.Router.extend({
    root: 'body',
    layout: null,
    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);

      Backbone.history.start();
    },
    setLayoutView: function(layoutView) {
      if (this.layoutView === layoutView) {
        return;
      }

      if (this.layoutView) {
        this.layoutView.$el.detach();
      }

      if (layoutView) {
        this.$rootElement.append(layoutView.render().$el);
      }

      this.layoutView = layoutView;
    },
    eachRoute: function(callback, context) {
      if (!this.routes) {
        return;
      }

      for (var route in this.routes) {
        callback.call(this, route, this.routes[route]);
      }
    },
    _bindRoutes: function() {
      this.eachRoute(function(route, handler) {
        var handlerParts = handler.split('#');
        var controller = handlerParts[0];
        var method = handlerParts[1] || 'index';

        this.route(route, handler, function() {
          var routeArguments = Array.prototype.slice.call(arguments);
          var controllerInstance = this.controllers[controller];

          if (_.isFunction(controllerInstance)) {
            controllerInstance = controllerInstance.apply(this, routeArguments);
          }

          if (!controllerInstance) {
            console.error('Controller ' + controller + ' is not available on this application.');
            return;
          }

          if (!(method in controllerInstance)) {
            console.error('Controller ' + controller + ' has no handler ' + method + '.');
            return;
          }

          routeArguments.unshift(this);

          controllerInstance[method].apply(controllerInstance, routeArguments);
        });
      });
    }
  });

  return Application;
});

(function() {
  'use strict';

  define('promenade',['promenade/view', 'promenade/view/collection', 'promenade/model',
          'promenade/controller', 'promenade/application'],
         function(View, CollectionView, Model,  Controller, Application) {
    return {
      Model: Model,
      View: View,
      CollectionView: CollectionView,
      Controller: Controller,
      Application: Application
    };
  });
})();
