
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

define('promenade/region',['promenade/object', 'promenade/view', 'underscore'],
       function(PromenadeObject, View, _) {

  var Region = PromenadeObject.extend({


    initialize: function(options) {
      this.superview = options.superview;
      this.selector = options.selector;
      this.subviews = [];

      this._resetContainer();

      this.listenTo(this.superview, 'before:render', this._detachSubviews);
      this.listenTo(this.superview, 'render', this._attachSubviews);
    },

    _resetContainer: function() {
      if (this.selector) {
        this.$container = this.superview.$(this.selector);
      } else {
        this.$container = this.superview.$el;
      }
    },


    add: function(views) {
      var PromenadeView = require('promenade/view');

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        if (view instanceof PromenadeView) {
          view.attachTo(this.$container);
        } else {
          this.$container.append(view.el);
        }
      }, this);

      this.subviews = this.subviews.concat(views);
    },

    remove: function(views) {
      var PromenadeView = require('promenade/view');

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        if (view instanceof PromenadeView) {
          view.detach();
        } else {
          view.remove();
        }
      }, this);

      this.subviews = _.without(this.subviews, views);
    },

    show: function(views) {
      var PromenadeView = require('promenade/view');

      this.remove(this.subviews);

      this.add(views);
    },


    renderSubviews: function(recursive) {
      var PromenadeView = require('promenade/view');

      _.each(this.subviews, function(view) {
        if (recursive && view instanceof PromenadeView) {
          view.deepRender();
        } else {
          view.render();
        }
      }, this);
    },


    _detachSubviews: function() {
      _.each(this.subviews, function(view) {
        view.$el.detach();
      });
    },


    _attachSubviews: function() {
      this._resetContainer();

      _.each(this.subviews, function(view) {
        this.$container.append(view.$el);
      }, this);
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
          this.getRegion(region).renderSubviews(recursive);
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
    tagName: 'ul',
    initialize: function() {
      this.layout = _.defaults(this.layout || {}, {
        outlet: ''
      });
      this.items = {};
      this.on('render', this.resetItems, this);

      View.prototype.initialize.apply(this, arguments);
    },
    modelEvents: {
      'add': 'addItemByModel',
      'remove': 'removeItemByModel',
      'reset': 'removeAllItems',
      'sort': 'resetItems'
    },
    addItemByModel: function(model) {
      var $container = this.getRegion('outlet').$container;
      var siblings = $container.children(this.itemView.tagName);
      var index = this.collection.indexOf(model);
      var view = new this.itemView({
        model: model
      });

      this.items[model.cid] = view;

      if (siblings.length && siblings.length >= index) {
        siblings.eq(index).before(view.render().$el);
      } else {
        $container.append(view.render().$el);
      }
    },
    removeItemByModel: function(model) {
      var view = this.items[model.cid];

      if (!view) {
        return;
      }

      view.remove();
    },
    removeAllItems: function() {
      _.each(this.items, function(view, modelCid) {
        view.remove();
      });
    },
    resetItems: function() {
      this.removeAllItems();
      this.collection.each(function(model) {
        this.addItemByModel(model);
      }, this);
    }
  });

  return CollectionView;
});

define('promenade/model',['backbone', 'require'],
       function(Backbone, require) {
  'use strict';

  var Model = Backbone.Model.extend({


    namespace: '',

    types: {},

    parse: function(data) {
      var TypeClass;
      var type;

      if (this.namespace) {
        if (!(this.namespace in data)) {
          throw new Error('Response data namespaced to "' + this.namespace + '" does not exist.');
        }

        data = data[this.namespace];
      }

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



  /**
   * Promenade.Controller is a contruct that is used to handle responses to
   * navigation events in the application.
   *
   * @extends {Promenade.Object}
   * @constructor
   */
  var Controller = PromenadeObject.extend({


    /**
     * @param {Promenade.Application} app The promenade application that
     * created this controller'
     */
    initialize: function(app) {
      this.app = app;
      this.routes = {};
      this.defineRoutes.call(this._getDefinitionContext());
    },


    /**
     * This method defaults to a no-op. Override it to define the routes that
     * your inherited Controller can handle. Example:
     *
     * // ...
     * defineRoutes: function() {
     *   this.handle('foo', 'fooHandler');
     *   this.resource('bar', 'barHandler');
     *   this.handle('baz', function() {
     *     this.resource('vim', 'bazVimHandler');
     *   });
     * }
     * // ...
     *
     * Will define the following routes:
     *
     * {
     *   'foo': 'fooHandler',
     *   'bar': 'barHandler',
     *   'baz/vim/:param1': 'bazVimHandler'
     * }
     *
     * These routes will be consumed by the Application when the Controller is
     * instantiated.
     */
    defineRoutes: function() {},


    /**
     * @param {String} fragment A location fragment.
     * @param {String} handler A property name that refers to a handler on the
     * controller.
     * @param {Function} subdefine A function that contains definitions that
     * should be scoped to the provided fragment.
     * @param {Array} generators A list of generators that convert route params
     * to models where possible.
     * @private
     */
    _handle: function(fragment, handler, subdefine, generators) {
      if (!subdefine && _.isFunction(handler)) {
        subdefine = handler;
        handler = null;
      }

      if (handler) {
        this.routes[fragment] = _.bind(function() {
          var args = Array.prototype.slice.call(arguments);
          args = _.map(args, function(arg, index) {
            if (typeof arg !== 'undefined' && generators[index]) {
              return generators[index](arg);
            }
            return arg;
          });

          this[handler].apply(this, args);
        }, this);
      }

      if (subdefine) {
        subdefine.call(this._getDefinitionContext(fragment, generators));
      }
    },


    /**
     * @param {String} fragment A location fragment.
     * @return {String} A fragment formatted in a route-root-sensitive fashion.
     * @private
     */
    _canonicalizeRoot: function(fragment) {
      return fragment ? fragment + '/' : '';
    },


    /**
     * @param {String} root The fragment root to scope future definitions to.
     * @return {Object} A context for subdefinitions namespaced to the given
     * fragment to use.
     * @private
     */
    _createDefinitionContext: function(root, generators) {

      generators = generators || [];

      return {
        handle: _.bind(function(_fragment, handler, subdefine) {
          this._handle(root + _fragment, handler, subdefine,
                       generators.slice());
        }, this),
        resource: _.bind(function(_fragment, handler, subdefine) {
          var _generators = generators.slice();
          _generators.push(_.bind(function(id) {
            var model = this.app[_fragment];

            if (model instanceof Backbone.Model ||
                model instanceof Backbone.Collection) {
              return model.get(id);
            }

            return id;
          }, this));
          this._handle(root + _fragment + '/:' + _.uniqueId(),
                       handler, subdefine, _generators);
        }, this),
        any: _.bind(function(handler) {
          this._handle(root + '*' + _.uniqueId(), handler, null,
                       generators.slice());
        }, this)
      };
    },


    /**
     * @param {String} fragment The root to scope future definitions to.
     * @return {Object} A context for subdefinitions namespaces to the given
     * fragment to use.
     * @private
     */
    _getDefinitionContext: function(fragment, generators) {
      return this._createDefinitionContext(this._canonicalizeRoot(fragment),
                                           generators);
    }
  });

  return Controller;
});

define('promenade/application',['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';



  /**
   * An Application is the central entry point for a Promenade app.
   * It inherits from Backbone.Router.
   *
   * @extends {Backbone.Router}
   * @contructor
   */
  var Application = Backbone.Router.extend({


    /**
     * @type {String} A selector for the app's root element.
     */
    root: 'body',


    /**
     * @type {Array<Promenade.Controller>} An array of Controllers to
     * instantiate when routes are bound.
     */
    controllers: [],


    models: [],


    /** @inheritDoc */
    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this._initializeModels();

      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);
    },

    _initializeModels: function() {
      _.each(this.models, function(ModelClass) {
        var model = new ModelClass();

        this.listenTo(model, 'sync', this._onModelSync);
        this[model.namespace] = model;

      }, this);
    },

    _onModelSync: function(model, response, options) {
      _.each(response, function(data, key) {
        var otherModel = this[key];

        if (key !== model.namespace &&
            (otherModel instanceof Backbone.Model ||
             otherModel instanceof Backbone.Collection)) {
          otherModel.set(data);
        }
      }, this);
    },


    /** @inheritDoc */
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

define('promenade/collection',['backbone', 'underscore', 'promenade/model'],
       function(Backbone, _, Model) {
  var Collection = Backbone.Collection.extend({
    namespace: '',
    model: Model,
    get: function(id) {
      var model = Backbone.Collection.prototype.get.apply(this, arguments);

      if (model) {
        return model;
      }

      if (!_.isString(id) && !_.isNumber(id)) {
        return;
      }

      if (!this.url || !this.model) {
        return;
      }

      if (this.model) {
        model = new this.model({ id: id });

        this.add(model);
        model.fetch();

        return model;
      }
    },
    parse: function(data) {
      if (this.namespace) {
        if (!(this.namespace in data)) {
          throw new Error('Response data namespaced to "' + this.namespace + '" does not exist.');
        }

        data = data[this.namespace];
      }

      return data;
    }
  });

  return Collection;
});

(function() {
  'use strict';

  define('promenade',['promenade/view', 'promenade/view/collection', 'promenade/model',
          'promenade/controller', 'promenade/application', 'promenade/region',
          'promenade/object', 'promenade/collection'],
         function(View, CollectionView, Model,  Controller, Application,
                  Region, PromenadeObject, Collection) {
    return {
      Model: Model,
      Collection: Collection,
      View: View,
      CollectionView: CollectionView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      'Object': PromenadeObject
    };
  });
})();
