
define('promenade/object',['backbone', 'underscore'],
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

define('promenade/region',['promenade/object', 'promenade/view'],
       function(PromenadeObject) {

  var Region = PromenadeObject.extend({


    initialize: function(options) {
      this.superview = options.superview;
      this.selector = options.selector;
      this.subview = null;

      this.$container = this.superview.$(this.selector);

      this.listenTo(this.superview, 'before:render', this._detachSubview);
      this.listenTo(this.superview, 'render', this._attachSubview);
    },


    show: function(view) {
      var PromenadeView = require('promenade/view');

      if (this.subview) {
        if (this.subview instanceof PromenadeView) {
          this.subview.detach();
        } else {
          this.subview.remove();
        }
      }

      this.subview = view;

      if (this.subview) {
        if (this.subview instanceof PromenadeView) {
          this.subview.attachTo(this.$container);
        } else {
          this.$container.append(view.el);
        }
      }
    },


    renderSubview: function(recursive) {
      var PromenadeView = require('promenade/view');

      if (this.subview) {
        if (recursive && this.subview instanceof PromenadeView) {
          this.subview.deepRender();
        } else {
          this.subview.render();
        }
      }
    },


    _detachSubview: function() {
      if (this.subview) {
        this.subview.$el.detach();
      }
    },


    _attachSubview: function() {
      this.$container = this.superview.$(this.selector);

      if (this.subview) {
        this.$container.append(this.subview.$el);
      }
    }
  });

  return Region;
});

define('promenade/view',['backbone', 'templates', 'underscore', 'promenade/region'],
       function(Backbone, templates, _, Region) {
  'use strict';

  var View = Backbone.View.extend({


    initialize: function(options) {
      var model;
      var region;

      Backbone.View.prototype.initialize.apply(this, arguments);

      options = options || {};

      this.collection = options.collection;
      this.template = options.template || this.template;

      if (this.template) {
        this.templateFactory = templates[this.template];
      }

      this.layout = options.layout || this.layout || {};

      for (region in this.layout) {
        this[this.getRegionProperty(region)] = new Region({
          superview: this,
          selector: this.layout[region]
        });
      }
    },


    delegateEvents: function() {
      var model;

      Backbone.View.prototype.delegateEvents.apply(this, arguments);

      if (this.hasModel()) {
        model = this.getModel();

        for (var eventName in this.modelEvents) {
          this.listenTo(model, eventName, this[this.modelEvents[eventName]]);
        }
      }

      return this;
    },


    undelegateEvents: function() {
      var model;

      Backbone.View.prototype.undelegateEvents.apply(this, arguments);

      if(this.hasModel()) {
        model = this.getModel();

        for (var eventName in this.modelEvents) {
          this.stopListening(model, eventName, this[this.modelEvents[eventName]]);
        }
      }

      return this;
    },


    render: function(recursive) {
      var data;
      var html;
      var region;

      this.trigger('before:render');

      if (this.templateFactory) {
        data = this.serializeModelData();
        html = this.templateFactory(data);

        this.$el.html(html);
      }

      if (recursive) {
        for (region in this.layout) {
          this.getRegion(region).renderSubview(recursive);
        }
      }

      this.trigger('render');

      return this;
    },


    remove: function() {
      this.undelegateEvents();
      Backbone.View.prototype.remove.apply(this, arguments);
      return this;
    },


    template: '',


    modelEvents: {
      'add': 'render',
      'remove': 'render',
      'reset': 'render',
      'change': 'render'
    },


    detach: function() {
      this.undelegateEvents();
      this.$el.detach();
      return this;
    },


    attachTo: function($parent) {
      this.$el.appendTo($parent);
      this.delegateEvents();
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


    getRegion: function(region) {
      return this[this.getRegionProperty(region)];
    },


    getRegionProperty: function(region) {
      return region + 'Region';
    },


    serializeModelData: function() {
      if (!this.hasModel()) {
        return {};
      }

      return this.getModel().toJSON();
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
      var type;

      for (type in this.types) {
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
      var current;

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
          current = this.get(attr);

          if (current && current instanceof Type) {
            current.set(value);
            delete attrs[attr];
          } else {
            attrs[attr] = new Type(value);
          }
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

define('promenade/controller',['underscore', 'promenade/object'],
       function(_, PromenadeObject) {
  'use strict';

  var Controller = PromenadeObject.extend({


    initialize: function(app) {
      this.app = app;
      this.routes = {};
      this.defineRoutes.call(this._getDefinitionContext());
    },


    defineRoutes: function() {},


    _handle: function(fragment, handler, subdefine) {
      if (!subdefine && _.isFunction(handler)) {
        subdefine = handler;
        handler = null;
      }

      if (handler) {
        this.routes[fragment] = handler;
      }

      if (subdefine) {
        subdefine.call(this._getDefinitionContext(fragment));
      }
    },


    _canonicalizeRoot: function(fragment) {
      return fragment ? fragment + '/' : '';
    },


    _createDefinitionContext: function(root) {

      return {
        handle: _.bind(function(_fragment, handler, subdefine) {
          this._handle(root + _fragment, handler, subdefine);
        }, this),
        resource: _.bind(function(_fragment, handler, subdefine) {
          this._handle(root + _fragment + '/:' + _.uniqueId(),
                       handler, subdefine);
        }, this),
        any: _.bind(function(handler) {
          this._handle(root + '*' + _.uniqueId(), handler);
        }, this)
      };
    },


    _getDefinitionContext: function(fragment) {
      return this._createDefinitionContext(this._canonicalizeRoot(fragment));
    }
  });

  return Controller;
});

define('promenade/application',['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';

  var Application = Backbone.Router.extend({


    root: 'body',


    controllers: [],


    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);
    },


    _bindRoutes: function() {
      Backbone.Router.prototype._bindRoutes.apply(this, arguments);

      this.controllers = _.map(this.controllers, function(Controller) {

        var controller = new Controller(this);

        _.each(controller.routes, function(handler, route) {
          this.route(route, handler, function() {
            controller[handler].apply(controller, arguments);
          });
        }, this);

        return controller;
      }, this);
    }
  });

  return Application;
});

(function() {
  'use strict';

  define('promenade',['promenade/view', 'promenade/view/collection', 'promenade/model',
          'promenade/controller', 'promenade/application', 'promenade/region',
          'promenade/object'],
         function(View, CollectionView, Model,  Controller, Application,
                  Region, PromenadeObject) {
    return {
      Model: Model,
      View: View,
      CollectionView: CollectionView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      'Object': PromenadeObject
    };
  });
})();
