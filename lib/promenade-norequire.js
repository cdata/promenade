(function(global) {
/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("support/almond", function(){});

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

    insertAt: function(views, index) {
      var PromenadeView = require('promenade/view');
      var sibling = this.subviews[index];

      if (!_.isArray(views)) {
        views = [views];
      }

      if (!sibling) {
        this.add(views);
        return;
      }

      _.each(views, function(view) {
        sibling.$el.before(view.$el);
      }, this);

      this.subviews.splice(index, 0, views);
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
      var eventName;

      Backbone.View.prototype.delegateEvents.apply(this, arguments);

      if (this.hasModel()) {
        model = this.getModel();

        for (eventName in this.modelEvents) {
          this.listenTo(model, eventName, this[this.modelEvents[eventName]]);
        }
      }

      for (eventName in this.selfEvents) {
        this.listenTo(this, eventName, this[this.selfEvents[eventName]]);
      }

      return this;
    },


    undelegateEvents: function() {
      var model;
      var eventName;

      Backbone.View.prototype.undelegateEvents.apply(this, arguments);

      if(this.hasModel()) {
        model = this.getModel();

        for (eventName in this.modelEvents) {
          this.stopListening(model, eventName, this[this.modelEvents[eventName]]);
        }
      }

      for (eventName in this.selfEvents) {
        this.stopListening(this, eventName, this[this.selfEvents[eventName]]);
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


    selfEvents: {},


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
    itemView: View,
    tagName: 'ul',
    initialize: function() {
      this.layout = _.defaults(this.layout || {}, {
        outlet: ''
      });
      this.items = {};

      View.prototype.initialize.apply(this, arguments);
    },
    selfEvents: {
      'render': 'resetItems'
    },
    modelEvents: {
      'add': '_addItemByModel',
      'remove': '_removeItemByModel',
      'reset': '_removeAllItems',
      'sort': 'resetItems'
    },
    _addItemByModel: function(model) {
      var region = this.getRegion('outlet');
      var index = this.collection.indexOf(model);
      var view = new this.itemView({
        model: model
      }).render();

      this.items[model.cid] = view;

      region.insertAt(view, index);
    },
    _removeItemByModel: function(model) {
      var view = this.items[model.cid];
      var region = this.getRegion('outlet');

      if (!view) {
        return;
      }

      this.items[model.cid] = null;

      region.remove(view);
      view.undelegateEvents();
    },
    _removeAllItems: function() {
      var region = this.getRegion('outlet');

      _.each(this.items, function(view) {
        region.remove(view);
        view.undelegateEvents();
      }, this);

      this.items = {};
    },
    resetItems: function() {
      this._removeAllItems();
      this.collection.each(function(model) {
        this._addItemByModel(model);
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

define('templates', function() {
  return window.templates || window.JST || {};
});
define('jquery', function() {
  return $;
});
define('underscore', function() {
  return _;
});
define('backbone', ['jquery', 'underscore'], function() {
  return Backbone;
});

define("support/shim", function(){});
global.Promenade = require('promenade');
})(this);