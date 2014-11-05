/*! promenade v0.0.11 04-11-2014 */
(function(global) {/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
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
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

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
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
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
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

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
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
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

            ret = callback ? callback.apply(defined[name], args) : undefined;

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
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

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
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

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

define('promenade/queue',['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';
  // Promenade.Queue API
  // -------------------

  var QueueApi = {
    promiseProvider: $,
    defaultSleep: 0,
    defer: function() {
      return new this.promiseProvider.Deferred();
    },
    promise: function(value) {
      // wrap around the value with a promise that resolves the same
      // time the value resolves.
      var deferred = this.defer();
      this.when(value).then(deferred.resolve);
      return _.result(deferred, 'promise');
    },
    when: function() {
      return this.promiseProvider.when.apply(this.promiseProvider, arguments);
    },
    tick: function(fn, sleep) {
      return _.bind(function() {
        var tick = this.defer();
        var args = arguments;

        var tock = _.bind(function() {
          var result = _.isFunction(fn) ? fn.apply(this, args) : fn;
          var that = this;
          // wrap the fn in a promise and tie
          // tick's resolution upon result's completion
          this.when(result).then(function() {
            tick.resolve();
          });
        }, this);
        var factory;

        sleep = sleep || this.defaultSleep || 0;

        if (sleep < 20 && _.isFunction(window.requestAnimationFrame)) {
          window.requestAnimationFrame(tock);
        } else {
          window.setTimeout(tock, sleep);
        }

        return _.result(tick, 'promise');
      }, this);
    },
    getQueue: function(id) {
      id = this._queueId(id);

      this._queueOperations = this._queueOperations || {};
      this._queueOperations[id] = this._queueOperations[id] || [];
      this._queueWorkers = this._queueWorkers || {};
      this._queueWorkers[id] = this._queueWorkers[id] || null;
      this._queueSteps = this._queueSteps || {};
      this._queueSteps[id] = this._queueSteps[id] || [];

      return this._queueOperations[id];
    },
    queueTailCompletes: function(id) {
      var queue = this.getQueue(id);
      var steps = this._queueSteps[this._queueId(id)];

      return steps[steps.length - 1] || this.promise();
    },
    pushQueue: function(operation, id) {
      var queue = this.getQueue(id);
      var steps = this._queueSteps[this._queueId(id)];

      var stepCompletion = this.defer();
      var step = _.bind(function() {
        var complete = function() {
          stepCompletion.resolve();
          steps.shift();
        };
        var result = _.isFunction(operation) ?
            operation.apply(this, arguments) : operation;

        return this.when(result).then(complete, complete);
      }, this);

      steps.push(_.result(stepCompletion, 'promise'));
      queue.push(step);

      this._startQueue(id);

      return queue.length;
    },
    hasEmptyQueue: function(id) {
      return !this.getQueue(id).length;
    },
    queueCompletes: function(id) {
      var queueWorker;

      id = this._queueId(id);
      queueWorker = this._queueWorkers && this._queueWorkers[id];

      return queueWorker || this.promise();
    },
    _startQueue: function(id) {
      var self = this;
      var workCompletes;
      var queue;
      var operation;

      id = this._queueId(id);

      if (this._queueWorkers[id] !== null) {
        return;
      }

      workCompletes = this.defer();
      queue = this.getQueue(id);

      self._queueWorkers[id] = _.result(workCompletes, 'promise');

      (function work() {
        var next;

        if (queue.length === 0) {
          self._queueWorkers[id] = null;
          workCompletes.resolve();
          return;
        }

        self.when(queue.shift()()).then(work, work);
        // TODO: Evaluate need for failure tolerance here:
      })();
    },
    _queueId: function(id) {
      return id || 'default';
    }
  };

  return QueueApi;
});

define('promenade/object',['backbone', 'underscore', 'promenade/queue'],
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
    this.initialize.apply(this, arguments);
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

define('promenade/delegation',['backbone', 'underscore'],
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
      var target;
      var maps;
      var index;
      var length;

      this._ensureDelegation();

      types = this.delegationTargets;

      for (index = 0, length = types.length; index < length; ++index) {
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
      var map;
      var handler;
      var index;
      var _index;
      var length;
      var _length;

      if (!maps || !target || !operation) {
        return;
      }

      for (index = 0, length = maps.length; index < length; ++index) {
        if (!(maps[index] in this)) {
          continue;
        }

        map = _.result(this, maps[index]);

        for (eventName in map) {
          handler = map[eventName];

          if (_.isArray(handler)) {
            for (_index = 0, _length = handler.length; _index < _length; ++_index) {
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

define('promenade/region',['promenade/object', 'promenade/view', 'underscore', 'promenade/delegation'],
       function(PromenadeObject, View, _, DelegationApi) {
  'use strict';
  // Promenade.Region
  // ----------------

  // A ``Promenade.Region`` represents a sub-selection of the DOM hierarchy that
  // represents a single view. A ``Region`` is used to insert one ``View`` into
  // another ``View`` at a specific place in the first ``View`` instance's DOM.
  // ``Region`` inherits from ``Promenade.Object``, and thus is compatible with
  // the ``Backbone.Events`` API.
  var Region = PromenadeObject.extend({

    events: {
      // The region listens to the before:render and render events of the
      // ``superview`` in order to determine when it is appropriate to detach
      // and reattach any ``subviews`` that it contains.
      '#superview before:render': '_detachSubviews',
      '#superview render': '_attachSubviews',
      '#superview dom:attach': '_bubbleDomAttach',
      '#superview dom:detach': '_bubbleDomDetach',
    },

    // A ``Region`` expects a ``superview`` and ``selector`` to be provided in
    // its options hash. The ``superview`` is a reference to the ``View``
    // instance that the ``Region`` belongs to, and ``selector`` is a jQuery
    // selector string that corresponds to the subset of the DOM of the
    // ``superview`` which should correspond to the ``Region`` instance.
    initialize: function(options) {
      this.superview = options.superview;
      this.selector = options.selector;
      this.subviews = [];

      this._documentFragment = document.createDocumentFragment();
      this._resetContainer();

      this.activateDelegation();
    },

    // It is sometimes useful to be able to quickly reset the jQuery selection
    // of the ``superview`` that corresponds to the ``Region`` instance.
    _resetContainer: function() {
      if (this.selector) {
        this.$container = this.superview.$(this.selector);
      } else {
        this.$container = this.superview.$el;
      }
    },

    // The ``add`` method allows one to add an arbitrary number of additional
    // subviews to the ``Region`` instance. New ``views`` can be in the form of
    // a single instance, or an ``Array`` of instances, and will be appended to
    // the ``Region`` instance in order.
    add: function(views, options) {
      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      this._insertBefore(views, null, options);

      this.subviews = this.subviews.concat(views);
    },

    // The ``remove`` method allows one to remove an arbitrary subset of
    // subviews from the ``Region``. If ``views`` can be detached in a way that
    // does not unset event bindings, it will be.
    remove: function(views) {
      var view;
      var index;
      var length;

      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      for (index = 0, length = views.length; index < length; ++index) {
        view = views[index];
        view.remove();
        this.stopListening(view);
      }

      this.subviews = _.difference(this.subviews, views);
    },

    detach: function(views) {
      var PromenadeView = require('promenade/view');
      var view;
      var index;
      var length;

      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      for (index = 0, length = views.length; index < length; ++index) {
        view = views[index];

        if (view instanceof PromenadeView) {
          view.detach();
        } else {
          view.$el.detach();
        }

        this.stopListening(view, 'navigate', this._onSubviewNavigate);
      }

      this.subviews = _.difference(this.subviews, views);
    },

    empty: function() {
      this.remove(this.subviews);
    },

    // The ``insertAt`` method does what you might think: inserts a ``view`` at
    // an arbitrary index within the current set of ``subviews``. If the index
    // exceeds the length of the current set of ``subviews``, the ``view`` is
    // appended. If a list of ``views`` is provided, each ``view`` is inserted
    // in order starting at the provided ``index``.
    insertAt: function(views, at, options) {
      var sibling = this.subviews[at];

      if (!_.isArray(views)) {
        views = [views];
      }

      if (!sibling) {
        this.add(views, options);
        return;
      }

      this._insertBefore(views, sibling.el, options);

      views.unshift(views.length, 0);

      this.subviews.splice.apply(this.subviews, views);
    },

    // This is a wrapper for the most common subview insertion operation. When
    // called, the current set of ``subviews`` is removed, and the new set of
    // ``views`` provided are added.
    show: function(views, options) {
      this.empty();

      this.add(views, options);
    },

    // When called, all ``subviews`` will be rendered. If ``recursive`` is
    // truthy and the ``subviews`` support deep rendering, ``deepRender`` is
    // called instead of ``render``.
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

    _insertBefore: function(views, before, options) {
      var PromenadeView = require('promenade/view');
      var async = options ? options.async !== false : true;
      var render = options ? options.render !== false : true;
      var view;
      var index;
      var length;

      for (index = 0, length = views.length; index < length; ++index) {
        view = views[index];

        this.listenTo(view, 'navigate', this._onSubviewNavigate);
        this._documentFragment.appendChild(view.el);
      }

      if (this.$container.length) {
        if (before) {
          this.$container.get(0).insertBefore(this._documentFragment, before);
        } else {
          this.$container.get(0).appendChild(this._documentFragment);
        }
      }

      for (index = 0, length = views.length; index < length; ++index) {
        view = views[index];

        if (view instanceof PromenadeView) {
          view.invalidateAttachmentState();
        }

        if (!render) {
          continue;
        }

        if (async) {
          if (view instanceof PromenadeView) {
            // Wait for parent's render queue to finish to the current tail..
            view.pushQueue(this.superview.queueTailCompletes('render'), 'render');
          }

          // Set parent's tail to the completion of this child's render queue..
          this.superview.pushQueue(view.asyncRender ?
                                       view.asyncRender() :
                                       _.bind(view.render, view),
                                   'render');
        } else {
          view.render();
        }
      }
    },

    _onSubviewNavigate: function(href, options) {
      this.superview.trigger('navigate', href, options);
    },

    // When a view is about to be rendered, it is useful to be able to
    // quickly detach the elements of its ``subviews`` which the DOM is being
    // wiped and re-rendered.
    _detachSubviews: function() {
      var PromenadeView;

      if (!this.subviews.length) {
        return;
      }

      PromenadeView = require('promenade/view');

      _.each(this.subviews, function(view) {
        if (view instanceof PromenadeView) {
          view.detach();
        } else {
          view.$el.detach();
        }
      });
    },

    // Once the ``superview`` is re-rendered, the ``$container`` needs to be
    // re-selected and the ``subviews`` need to be re-appended.
    _attachSubviews: function() {
      var PromenadeView;

      this._resetContainer();

      if (!this.subviews.length) {
        return;
      }

      PromenadeView = require('promenade/view');

      _.each(this.subviews, function(view) {
        if (view instanceof PromenadeView) {
          view.attachTo(this.$container);
        } else {
          this.$container.append(view.$el);
        }
      }, this);
    },

    _bubbleDomAttach: function(view) {
      _.invoke(this.subviews, 'invalidateAttachmentState');
    },

    _bubbleDomDetach: function(view) {
      _.invoke(this.subviews, 'invalidateAttachmentState');
    }
  });

  _.extend(Region.prototype, DelegationApi);

  return Region;
});

define('promenade/collection/retainer',['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Collection.Retainer API
  // --------------------------------

  var RetainerApi = {

    _verifySubsetApi: function(collection) {
      return collection && _.isFunction(collection.connect) && collection.cid;
    },

    retains: function(collection) {
      var connection;

      if (!this._verifySubsetApi(collection)) {
        return collection;
      }

      this._connections = this._connections || {};

      if (this._connections[collection.cid]) {
        return collection;
      }

      connection = collection.connect();

      this._connections[collection.cid] = connection;

      return collection;
    },

    releaseConnections: function() {
      for (var id in this._connections) {
        this._connections[id].release();
        delete this._connections[id];
      }
    }
  };

  return RetainerApi;
});

define('promenade/sync',['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Sync API
  // ------------------
  var SyncApi = {

    canRequestMore: function() {
      return this._paginationUpperIndex !== undefined &&
             this._paginationUpperIndex !== null;
    },

    canRequestUpdates: function() {
      return this._paginationLowerIndex !== undefined &&
             this._paginationLowerIndex !== null;
    },

    isSyncing: function() {
      return this._syncingStack > 0;
    },

    canSync: function() {
      return !!((this.collection && this.collection.url) ||
                _.isString(this.url) || this.urlRoot);
    },

    hasSynced: function() {
      return !this._needsSync || this._synced;
    },

    needsSync: function() {
      return this.canSync() && !this.hasSynced() && !this.isSyncing();
    },

    syncs: function() {
      return this._syncs;
    },

    // Sync is overridden at the ``Model`` and ``Collection`` level in order to
    // support a new ``'before:sync'`` event. This event is triggered on both
    // a ``Model`` or ``Collection`` and their associated ``Application`` (if
    // available. This event allows an ``Application`` to propagate extra
    // response data before the normal ``'sync'`` event triggers, and prior to
    // any network success callbacks being called.
    sync: function(method, model, options) {
      var success;
      var error;
      var beforeSend;

      options = options || {};
      success = options.success || function(){};
      error = options.error || function(){};
      beforeSend = options.beforeSend || function(){};

      this._resetSyncState();
      this._pushSync();

      options.success = _.bind(this._onSyncSuccess, this,
                               method, model, options, success);
      options.error = _.bind(this._onSyncError, this, error);
      options.beforeSend = _.bind(this._onBeforeSend, this, beforeSend);

      return Backbone.sync.call(this, method, model, options);
    },

    replay: function(method, model, options) {

    },

    _onSyncSuccess: function(method, model, options, success, resp, status, xhr) {
      var app = model.app;
      var upperIndex;
      var lowerIndex;

      if (xhr) {
        try {
          upperIndex = xhr.getResponseHeader('X-Upper-Index');
          lowerIndex = xhr.getResponseHeader('X-Lower-Index');
        } catch(e) {}
      }

      if (options.pipe && upperIndex && method === 'read' &&
          upperIndex !== this._paginationUpperIndex) {
        _.delay(_.bind(function() {
          this.sync(method, model, options);
        }, this), 0);
      }

      if (options.requestMore && upperIndex) {
        this._paginationUpperIndex = upperIndex;
        if (this._paginationLowerIndex === null ||
            this._paginationLowerIndex === undefined && lowerIndex) {
          this._paginationLowerIndex = lowerIndex;
        }
      } else if (options.requestUpdates && lowerIndex) {
        this._paginationLowerIndex = lowerIndex;
      }

      if (app) {
        app.trigger('before:sync', model, resp, options);
      }

      model.trigger('before:sync', model, resp, options);

      this._synced = true;
      this._popSync();

      success.call(options, resp, status, options);

      if (app) {
        app.trigger('sync', model, resp, options);
      }
    },

    _onSyncError: function(error, model, resp, options) {
      this._popSync();
      error.call(options, model, resp, options);
    },

    _onBeforeSend: function(beforeSend, xhr, options) {

      if (xhr) {
        if (options.requestMore && this.canRequestMore()) {
          try {
            xhr.setRequestHeader('X-Beyond-Index', this._paginationUpperIndex);
          } catch(e) {}
        } else if (options.requestUpdates && this.canRequestUpdates()) {
          try {
            xhr.setRequestHeader('X-Within-Index', this._paginationLowerIndex);
          } catch(e) {}
        }
      }

      beforeSend.call(options, xhr);
    },

    _pushSync: function() {
      ++this._syncingStack;
    },

    _popSync: function() {
      if (this._syncingStack) {
        --this._syncingStack;
      }
    },

    _resetSyncState: function() {
      var eventuallySyncs = new $.Deferred();

      this._synced = this._synced === true;
      this._syncingStack = this._syncingStack || 0;

      if (_.result(this, 'canSync') === false ||
          (_.result(this, 'isSparse') === false &&
           _.result(this, 'isNew') === false)) {
        eventuallySyncs.resolve(this);
      } else {
        this.on('sync', function syncs() {
          if (this.isSyncing()) {
            return;
          }

          this.off('sync', syncs);
          eventuallySyncs.resolve(this);
        }, this);
      }

      this._syncs = eventuallySyncs.promise();
    }
  };

  return SyncApi;
});

define('promenade/model',['backbone', 'require', 'promenade/collection/retainer', 'promenade/delegation', 'promenade/sync'],
       function(Backbone, require, RetainerApi, DelegationApi, SyncApi) {
  'use strict';
  // Promenade.Model
  // ---------------

  // A ``Promenade.Model`` is the same as a ``Backbone.Model``, with some added
  // properties that formalize how nested data structures are composed.
  var Model = Backbone.Model.extend({

    // If a ``structure`` property is declared, it should be a mapping of
    // ``type`` attribute names to class references, or to ``String`` values
    // that can be used to resolve a class reference via an AMD API.
    structure: {},

    // If a ``structureEvents`` map is available, events will be bound and
    // unbound automatically based on the supplied definition. For example:
    //
    //   // ...
    //   structure: {
    //     comments: Backbone.Collection
    //   },
    //   structureEvents: {
    //     'add comments': 'onCommentAdded'
    //   },
    //   // ...
    //
    // This will automatically bind a handler to the ``'add'`` event of the
    // ``comments`` sub-collection. When the sub-collection is removed or the
    // reference is changed, the handler will be automatically updated or
    // removed as appropriate.
    structureEvents: {},

    // When defined for a ``Model`` that is associated with an
    // ``Application``, the ``type`` is used as part of the property name that
    // the ``Model`` instance is assigned to on the ``Application``
    // instance. E.g., a ``Model`` with ``type`` that resolves to ``'foo'``
    // will be assigned to the ``'fooModel'`` property on the
    // ``Application``.
    type: function() {
      var defaults = _.result(this, 'defaults');
      var namespace = _.result(this, 'namespace');
      return (this.attributes && this.get('type')) ||
             (defaults && defaults.type) || namespace || '';
    },

    // An optional ``namespace`` can be declared. By default it is an empty
    // string and ignored as a falsey value. When a collection parses server
    // data, the ``namespace`` of a ``Model`` will be used to discover the
    // data in the server response that corresponds to the ``Model``
    // parsing it.
    namespace: '',

    defaultDelegationTargets: ['self', 'app'],

    propagates: {},

    initialize: function(attrs, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);

      options = options || {};

      // On initialize, the ``Model`` creates a class property that refers to an
      // app instance, if provided in the options. This behavior is used to
      // support reference passing of a top-level ``Application`` down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options.app;

      this._needsSync = options.needsSync !== false;
      this._resourceMap = this._resourceMap || {};

      this.activateDelegation();

      this._resetSyncState();
      this._resetUpdateState();
    },

    dispose: function() {
      this.deactivateDelegation();
      this.releaseConnections();
    },

    isSparse: function() {
      var type = _.result(this, 'type');
      var defaults = _.result(this, 'defaults');

      for (var attr in this.attributes) {
        if (attr !== 'id' && attr !== 'type') {
          if (defaults && defaults.hasOwnProperty(attr) &&
              defaults[attr] === this.attributes[attr]) {
            continue;
          }

          return false;
        }
      }

      if (this.attributes.type && this.attributes.type !== type) {
        return false;
      }

      return typeof this.attributes.id !== undefined;
    },

    hasUpdated: function() {
      return this._updated;
    },

    updates: function() {
      return this._updates;
    },

    urlFragment: function() {
      return _.result(this, 'namespace') + '/' + _.result(this, 'id');
    },

    composeUrlFrom: function() {
      var url = _.result(this, 'urlRoot');
      var others = Array.prototype.slice.call(arguments);
      var other;
      var index;
      var length;

      for (index = 0, length = others.length; index < length; ++index) {
        other = others[index];
        url += '/' + _.result(other, 'urlFragment');
      }

      url += '/' + _.result(this, 'namespace');

      return url;
    },

    belongsToResource: function(resource) {
      return !!this._resourceMap[resource];
    },

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Model`` in
    // a property that matches the defined ``namespace``.
    parse: function(data) {
      var namespace;

      if(typeof data === 'undefined') {
        return {};
      }

      if (data.id !== undefined && data.id !== null &&
          data.type !== undefined && data.type !== null) {
        return data;
      }

      namespace = _.result(this, 'namespace');

      if (namespace) {
        if (!(namespace in data)) {
          throw new Error('Response data namespaced to "' +
                          namespace + '" does not exist.');
        }

        data = data[namespace];
      }

      return data;
    },

    fetch: function(options) {
      this.trigger('before:fetch', this, options);
      return Backbone.Model.prototype.fetch.apply(this, arguments);
    },

    save: function(options) {
      this.trigger('before:save', this, options);
      return Backbone.Model.prototype.save.apply(this, arguments);
    },

    destroy: function(options) {
      this.trigger('before:destroy', this, options);
      return Backbone.Model.prototype.destroy.apply(this, arguments);
    },

    // The default ``set`` behavior has been significantly expanded to support
    // new relationships between ``Model``, ``Collection`` and ``Application``
    // instances.
    set: function(key, value, options) {
      var structure = _.result(this, 'structure');
      var result;
      var attrs;
      var attr;
      var Type;
      var current;
      var resourceAdded;

      // We borrow the options parsing mechanism specific to the original
      // Backbone implementation of this method.
      if (typeof key === 'object') {
        attrs = key;
        options = value;
      } else {
        (attrs = {})[key] = value;
      }

      // On ``set``, the ``Model`` creates a class property that refers to an
      // app instance, if provided in the options. This behavior is used to
      // support reference passing of a top-level ``Application`` down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      if (options) {
        if (options.app) {
          this.app = options.app;
        }

        if (options.url) {
          this._resourceMap = this._resourceMap || {};

          if (!this.belongsToResource(options.url)) {
            resourceAdded = true;
          }

          this._resourceMap[options.url] = true;
        }
      }

      // Then we iterate over all attributes being set.
      for (attr in attrs) {
        value = attrs[attr];

        // If the value is determined to be an embedded reference, we map the
        // attr / value combination to value derived from a resource linked from
        // the ``Application`` reference.
        if (this._isEmbeddedReference(attr, value)) {
          value = attrs[attr] = this._bridgeReference(attr, value);
        }

        // If an attribute is in our ``structure`` map, it means we should
        // ensure that the ultimate attribute value is an instance of the class
        // associated with the declared type.
        if (attr in structure) {
          Type = structure[attr];

          // If the type value is a ``String``, then we resolve the class using
          // an AMD API.
          if (_.isString(Type)) {
            Type = require(Type);
          }

          // When we have both a class and a value, and the value is not an
          // instance of the declared type, then we either create a new instance
          // of that type or update an existing instance in place.
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
      }

      result = Backbone.Model.prototype.set.call(this, attrs, options);

      if (resourceAdded) {
        this.trigger('resource', this);
        this.trigger('change', this);
      }

      // Once our attributes being set have been formatted appropriately,
      // the attributes are sent through the normal Backbone ``set`` method.
      return result;
    },

    // The default ``get`` behavior has been expanded to automatically evaluate
    // functions embedded within the attributes of a ``Model``. This allows the
    // ``Model`` to return canonical instances of ``Models`` identified by
    // embedded references as the result of a call to ``get``.
    get: function(attr) {
      var value = Backbone.Model.prototype.get.apply(this, arguments);

      if (_.isFunction(value)) {
        value = value();
      }

      return value;
    },

    toReference: function() {
      return {
        type: this.get('type'),
        id: this.id
      };
    },

    defaultSerializationDepth: 1,

    // JSON serialization has been expanded to accomodate for the new value
    // types that the ``Model`` supports. If any values resolved in the scope of
    // the expanded method have their own ``toJSON`` method, those values are
    // set to the result of that method. Additionally, a truthy value passed
    // to ``toJSON`` will result in a shallow serialization where embedded
    // references will not have their ``toJSON`` methods called (in order to
    // avoid circular reference serialization traps).
    toJSON: function(depth) {
      var data = Backbone.Model.prototype.toJSON.apply(this, arguments);
      var iterator = function(_value) {
        return (_value && _value.toJSON) ?
            _value.toJSON(depth) : _value;
      };
      var key;
      var value;

      if (!_.isNumber(depth)) {
        depth = this.defaultSerializationDepth;
      }

      if (depth === 0) {
        return this._trimReferences(data);
      }

      depth = Math.max(depth - 1, 0);

      for (key in data) {
        value = data[key];

        if (_.isArray(value)) {
          value = data[key] = _.map(value, iterator);
        }

        if (value && value.toJSON) {
          data[key] = value.toJSON(depth);
        }
      }

      return data;
    },

    // This method returns true if the ``key`` and ``value`` attributes together
    // are determined to refer to an embedded reference.
    _isEmbeddedReference: function(key, value) {
      // If no ``Application`` reference exists, there is no way to look up
      // embedded references in the first place.
      if (!this.app) {
        return false;
      }

      // For values that are ``Array`` instances, observing the first index
      // will suffice as a test.
      if (_.isArray(value)) {
        value = value[0];
      }

      if (!value) {
        return false;
      }

      // A value is considered an embedded reference if it contains an ``id``
      // and a ``type`` attribute, with no other attributes present.
      for (var attr in value) {
        if (attr !== 'id' && attr !== 'type') {
          return false;
        }
      }

      return typeof value.id !== undefined && typeof value.type === 'string';
    },

    // This method creates a bridge between an embedded reference and its
    // referred-to value. A bridge takes the form of a function that can be
    // called to look up the desired value.
    _bridgeReference: function(key, value) {
      var app = this.app;
      var collection;
      var model;

      // If the value is an ``Array``, then the embedded reference represents a
      // one-to-many relationship, and a bridge must be created for each of the
      // embedded references in the ``Array``.
      if (_.isArray(value)) {
        return _.map(value, function(_value) {
          return this._bridgeReference(key, _value);
        }, this);
      }

      // A bridge works by looking for a ``Backbone.Collection`` on the root
      // ``Application`` that corresponds to the resolved ``namespace``. If no
      // ``Collection`` is found, the bridge simply returns the original value
      // of the embedded reference as provided in the server data.
      if (app) {
        collection = app.getCollectionForType(value.type);

        if (collection && collection instanceof Backbone.Collection) {
          return collection.get(value, { fetch: false });
        }
      }

      return value;
    },

    _resetUpdateState: function() {
      var eventuallyUpdates = new $.Deferred();

      this._updated = this._updated === true;

      this.once('update', function() {
        eventuallyUpdates.resolve(this);
        this._resetUpdateState();
      }, this);

      this._updates = eventuallyUpdates.promise();
    },

    // The ``_pluralizeString`` method returns the plural version of a provided
    // string, or the string itself if it is deemed to already be a pluralized
    // string. Presently, the implementation of this method is not robust. It
    // will not properly pluralize ``'cactus'``, for instance.
    _pluralizeString: function(string) {
      var suffix = 's';
      var offset = 0;

      if (Model.match.PLURAL_STRING.test(string)) {
        return string;
      }

      if (Model.match.ENDS_IN_Y.test(string)) {
        suffix = 'ies';
        offset = 1;
      }

      if (Model.match.ENDS_IN_S.test(string)) {
        suffix = 'es';
      }

      return string.substr(0, string.length - offset) + suffix;
    },

    _castToReference: function(data) {
      if (_.isArray(data)) {
        return _.map(data, this._castToReference, this);
      } else if (data instanceof Model) {
        return data.toReference();
      } else if (data instanceof Backbone.Model ||
                 data instanceof Backbone.Collection) {
        return null;
      }

      return data;
    },

    _trimReferences: function(data) {
      var key;

      for (key in data) {
        data[key] = this._castToReference(data[key]);
      }

      return data;
    }
  }, {
    match: {
      PLURAL_STRING: /.+[^s]s$/,
      ENDS_IN_Y: /y$/,
      ENDS_IN_S: /s$/
    }
  });

  _.extend(Model.prototype, RetainerApi, DelegationApi, SyncApi);

  return Model;
});

define('promenade/collection/subset',['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Collection.Subset API
  // ------------------------------

  var SubsetApi = {

    configure: function(options) {
      this._prototype = this.constructor.prototype;

      this.url = options.url || this.url;
      this.superset = options.superset;
      this.iterator = options.iterator;
      this.alwaysRefresh = options.alwaysRefresh === true;
      this.dependencies = options.dependencies || [];

      this._connection = null;
      this._connectionStack = [];
      this._connectionMap = {};

      this.cid = _.uniqueId();
    },

    connect: function() {
      var connection = this._makeConnection();

      this._connectionMap[connection.id] = connection;
      this._connectionStack.push(connection.id);

      this._connectToSuperset();

      return connection;
    },

    release: function(connection) {
      connection = connection && this._connectionMap[connection.id];

      if (!connection) {
        return;
      }

      this._connectionMap[connection.id] = null;
      this._connectionStack.pop();

      if (!this._connectionStack.length) {
        this._disconnectFromSuperset();
      }
    },

    hasRootSuperset: function() {
      return !!(this.superset && !this.superset.superset);
    },

    isConnected: function() {
      return !!this._connection;
    },

    connectionCount: function() {
      return this._connectionStack.length;
    },

    refresh: function() {
      var index = 0;
      var model;

      while (index < this.length) {
        model = this.at(index);

        if (!this.iterator(model, index)) {
          this._prototype.remove.call(this, model, {
            operateOnSubset: true
          });
          continue;
        }

        ++index;
      }

      this._prototype.add.call(this, this.superset.filter(this.iterator), {
        operateOnSubset: true,
        sort: false
      });
    },

    _connectToSuperset: function() {
      var resource;
      var index;
      var length;

      // The ``'add'``, ``'remove'`` and ``'reset'`` events are listened to by
      // the ``subset`` on the superset ``Collection`` instance so that changes
      // to the superset are reflected automatically in the ``subset``.
      // When a ``subset`` is no longer being used, ``stopListening`` should
      // be called on it so that the automatically created listeners are cleaned
      // up.
      if (this.superset && !this.isConnected()) {
        this.listenTo(this.superset, 'add', this._onSupersetAdd);
        this.listenTo(this.superset, 'remove', this._onSupersetRemove);
        this.listenTo(this.superset, 'reset', this._onSupersetReset);
        this.listenTo(this.superset, 'change', this._onSupersetChange);
        this.listenTo(this.superset, 'sort', this._onSupersetSort);
        this.listenTo(this.superset, 'sync', this._onSupersetSync);
        this.listenTo(this.superset, 'resource', this._onSupersetChange);

        for (index = 0, length = this.dependencies.length; index < length; ++index) {
          resource = this.app.getResource(this.dependencies[index]);

          if (!resource) {
            continue;
          }

          this.listenTo(resource,
                        'add remove reset change sort', this.refresh);
        }

        this.refresh();

        this._connection = true;

        if (!this.hasRootSuperset()) {
          this._connection = this.retains(this.superset);
        }
      }

      return this;
    },

    _disconnectFromSuperset: function() {
      var resource;
      var index;
      var length;

      if (this.superset && this.isConnected()) {
        this.stopListening(this.superset);

        for (index = 0, length = this.dependencies.length; index < length; ++index) {
          resource = this.app.getResource(this.dependencies[index]);

          if (!resource) {
            continue;
          }

          this.stopListening(resource);
        }

        this.reset(null, { silent: true });


        if (_.isObject(this._connection)) {
          this._connection.release();
        }

        this._connection = false;
      }

      return this;
    },

    _makeConnection: function() {
      var subset = this;
      var connection = {
        id: _.uniqueId(),
        release: function() {
          subset.release(connection);
        }
      };

      return connection;
    },

    _onSupersetAdd: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      if (!this.iterator(model)) {
        return;
      }

      this._prototype.add.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetRemove: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      this._prototype.remove.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetReset: function() {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      this._prototype.reset.call(this, null, {
        operateOnSubset: true
      });
    },

    _onSupersetChange: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      if (!this.iterator(model)) {
        return this._onSupersetRemove(model);
      }

      this._prototype.add.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetSort: function(superset, options) {
      if (options && options.sortSubsets === false) {
        return;
      }

      this.sort(options);
    },

    _onSupersetSync: function(model, resp, options) {
      if (options.originatingSubset !== this) {
        return;
      }

      this.trigger('sync', this, resp, options);
    },

    set: function(models, options) {
      if (options && options.operateOnSubset) {
        return this._prototype.set.apply(this, arguments);
      }

      return this.superset.set.call(this.superset, arguments);
    }
  };

  _.each(['toJSON', 'toArray'], function(method) {
    SubsetApi[method] = function() {
      var result;

      if (this.isConnected()) {
        return this._prototype[method].apply(this, arguments);
      }

      this._connectToSuperset();

      result = this._prototype[method].apply(this, arguments);

      this._disconnectFromSuperset();

      return result;
    };
  });

  // When a ``superset`` is assigned to a ``SubsetCollection`` instance, any
  // in-place manipulation of the ``SubsetCollection`` instance is redirected to
  // the ``superset``. Changes will automatically reflect in the
  // ``SubsetCollection`` as events propagate.
  _.each(['add', 'remove'], function(method) {
    SubsetApi[method] = function() {
      if (this.superset) {
        return this.superset[method].apply(this.superset, arguments);
      }
    };
  });

  _.each(['create', 'fetch', 'save'], function(method) {
    SubsetApi[method] = function(options) {
      var self = this;
      var error;
      var success;

      if (this.superset) {
        options = options || {};
        options.url = _.result(this, 'url');

        error = options.error;
        success = options.success;

        options.error = function() {
          self._popSync();
          if (error) {
            error.apply(this, arguments);
          }
        };

        options.success = function() {
          self._popSync();
          self._synced = true;
          if (success) {
            success.apply(this, arguments);
          }
        };

        options.originatingSubset = this;

        this._resetSyncState();
        this._pushSync();

        return this.superset[method].call(this.superset, options);
      }
    };
  });


  return SubsetApi;
});

define('promenade/collection',['backbone', 'underscore', 'require', 'promenade/model',
        'promenade/collection/retainer', 'promenade/collection/subset',
        'promenade/delegation', 'promenade/sync'],
       function(Backbone, _, require, Model, RetainerApi, SubsetApi, DelegationApi, SyncApi) {
  'use strict';
  // Promenade.Collection
  // --------------------

  // A ``Promenade.Collection`` is the same as a ``Backbone.Collection``, with
  // some added functionality and pre-defined default behavior.
  var Collection = Backbone.Collection.extend({

    // The default model class for a Promenade ``Collection`` is the Promenade
    // ``Model``.
    model: Model,

    supportedEventMaps: Model.prototype.supportedEventMaps,

    setDefaults: {},

    propagates: {},

    // When defined for a ``Collection`` that is associated with an
    // ``Application``, the ``type`` is used as part of the property name that
    // the ``Collection`` instance is assigned to on the ``Application``
    // instance. E.g., a ``Collection`` with ``type`` that resolves to ``'foo'``
    // will be assigned to the ``'fooCollection'`` property on the
    // ``Application``. By default, a ``Collection`` defers to its designated
    // ``Model`` to resolve the value of ``type``.
    type: function() {
      return (this.model && _.result(this.model.prototype, 'type')) || '';
    },

    // An optional ``namespace`` can be declared. By default it is an empty
    // string and ignored as a falsey value. When a collection parses server
    // data, the ``namespace`` of a ``Collection`` will be used to discover the
    // data in the server response that corresponds to the ``Collection``
    // parsing it. By default, a ``Collection`` defers to its designated
    // ``Model`` to resolve the value of ``namespace``.
    namespace: function() {
      return _.result(this.model.prototype, 'namespace') || '';
    },

    initialize: function(models, options) {
      Backbone.Collection.prototype.initialize.apply(this, arguments);
      options = options || {};
      // On initialize, the ``Collection`` creates a class property that refers
      // to an app instance, if provided in the options. This behavior is used
      // to support reference passing of a top-level application down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options.app;

      this.resources = {};

      this._needsSync = options.needsSync !== false;
      this._setOperations = 0;

      this.activateDelegation();

      this._resetSyncState();
    },

    dispose: Model.prototype.dispose,

    hasUpdated: Model.prototype.hasUpdated,

    updates: Model.prototype.updates,

    fetch: function(options) {
      this.trigger('before:fetch', this, options);
      return Backbone.Collection.prototype.fetch.apply(this, arguments);
    },

    create: function(options) {
      this.trigger('before:create', this, options);
      return Backbone.Collection.prototype.create.apply(this, arguments);
    },

    // Promenade's ``Collection`` extends the default behavior of the ``get``
    // method. When ``get`` is used to find a model by Number or String ``id``,
    // and the model does not already exist in the collection, the model is
    // created, added and fetched before being returned by the method.
    get: function(id, options) {
      var model;

      options = options || {
        fetch: true
      };

      if (this._isPerformingSetOperation()) {
        options.fetch = false;
      }
      // If ``get`` receives an ``Array`` of ``id`` values as the first
      // parameter, then ``Collection`` will return an ``Array`` containing the
      // result of a lookup on each of those ``id`` values.
      if (_.isArray(id)) {
        return _.map(id, function(_id) {
          return this.get(_id, options);
        }, this);
      }

      model = Backbone.Collection.prototype.get.apply(this, arguments);

      // If the model is found by Backbone's default ``get`` implementation,
      // we return the found model instance.
      if (model) {
        if (!(model instanceof Model)) {
          return model;
        }
      } else {
        if (this._isPerformingSetOperation()) {
          return;
        }

        if (_.isObject(id) && id instanceof Backbone.Model) {
          return;
        }

        if (this.model && id) {
          if (_.isString(id) || _.isNumber(id)) {
            model = {};
            model[this.model.prototype.idAttribute] = id;
          } else {
            model = id;
          }

          // Here we create the model via the mechanism used by
          // ``Backbone.Collection``.
          model = this._prepareModel(model, {
            needsSync: true
          });

          this.add(model);
        }
      }

      if (options.fetch && this._isCandidateForFetch(model)) {

        // We pre-emptively fetch the model from the server.
        model.fetch();
      }

      return model;
    },

    set: function(models, options) {
      var result;

      options = _.defaults(options || {}, _.extend({
        merge: true,
        remove: false
      }, _.result(this, 'setDefaults')));

      //this._performingSetOperation = true;
      this._pushSetOperation();

      result = Backbone.Collection.prototype.set.call(this, models, options);

      //this._performingSetOperation = false;
      this._popSetOperation();

      return result;
    },

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Collection`` in
    // a property that matches the defined ``namespace``.
    parse: Model.prototype.parse,

    // A subset ``Collection`` instance can be created that represents the set
    // of ``models`` in the superset remaining when filtered by ``iterator``.
    // All semantics of ``_.filter`` apply when filtering a subset. The returned
    // ``Collection`` instance is an instance of ``Promenade.Collection`` by
    // default.
    subset: function(iterator, options) {
      var CollectionClass = this.constructor;
      var subset;

      options = _.extend(options || {}, {
        app: this.app,
        superset: this,
        iterator: iterator
      });

      subset = new CollectionClass(null, options);
      _.extend(subset, SubsetApi);
      subset.configure(options);

      return subset;
    },

    resource: function(url, options) {
      var resource = this.resources[url];
      var iterator;

      options = options || {};
      options.url = url;

      iterator = options.filter;

      if (resource) {
        if (iterator) {
          resource.iterator = iterator;
          resource.refresh();
        }

        return resource;
      }

      resource = this.subset(function(model) {
        var matchesResource = model.belongsToResource(url);

        if (!matchesResource) {
          return false;
        }

        return iterator ? iterator(model) : true;
      }, options);

      this.resources[url] = resource;

      return resource;
    },

    _pushSetOperation: function() {
      ++this._setOperations;
    },

    _popSetOperation: function() {
      if (this._isPerformingSetOperation()) {
        --this._setOperations;
      }
    },

    _isPerformingSetOperation: function() {
      return !!this._setOperations;
    },

    _isCandidateForFetch: function(model) {
      return this.url && model && model.url &&
          (!(model instanceof Model) ||
           (model.isSparse() && !model.hasSynced()));
    },

    // The internal ``_prepareModel`` method in the ``Collection`` is extended
    // to support propagation of any internal ``app`` references. This ensures
    // that ``Model`` instances created by the ``Collection`` will contain
    // matching references to a parent ``Application`` instance.
    _prepareModel: function(attrs, options) {
      var namespace;
      var namespaced;

      // Provided options, if any, are defaulted to contain a reference to this
      // ``Collection`` instance's corresponding ``app``.
      options = _.defaults(options || {}, {
        app: this.app,
        needsSync: false
      });

      namespace = _.result(this.model.prototype, 'namespace');

      // When we are preparing a ``Model`` instance with a declared
      // ``namespace``, the attributes must be nested in the ``namespace``
      // before they are parsed.
      if (options.parse && namespace) {
        namespaced = {};
        namespaced[namespace] = attrs;

        attrs = namespaced;
      }

      // With the option defaults set, the normal ``_prepareModel`` method is
      // used to finish creating the ``Model`` instance.
      return Backbone.Collection.prototype._prepareModel.call(this,
                                                              attrs, options);
    }
  });

  _.extend(Collection.prototype, RetainerApi, DelegationApi, SyncApi);

  Collection.Subset = SubsetApi;
  Collection.Retainer = RetainerApi;

  return Collection;
});



define('promenade/state',['backbone', 'underscore'],
       function(Backbone, _, $) {
  'use strict';
  // Promenade.StateMachine API
  // -------------------
  _.mixin({
    capitalize: function(string) {
      return string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
    },

    upperCaseFirstLetter: function(string) {
      return string.charAt(0).toUpperCase() + string.substring(1);
    }
  });

  var StateMachine = {
    states: null,

    transitionTo: function (newState) {
      var args = Array.prototype.slice.call(arguments, 1);

      if (!this.isValidTransition(newState)) {
        return;
      }

      this._currentState = newState;

      this._invokeEnterStateCallback('all', arguments);
      this._invokeEnterStateCallback(this._currentState, args);
    },

    _invokeEnterStateCallback: function (stateName, args) {
      var methodName = 'onEnterState' + (stateName !== 'all' ? _.upperCaseFirstLetter(stateName) : '');

      var method = this[methodName];

      if (_.isFunction(method)) {
        method.apply(this, args);
      }

      if (_.isFunction(this.trigger)) {
        this.trigger('enter-state:' + stateName, this);
      }
    },

    isValidTransition: function (newState) {
      var transitionToStates = this._getValidTransitionsForState(this.getCurrentState());
      var length = transitionToStates.length;
      var index;

      for (index = 0; index < length; ++index) {
        if (transitionToStates[index] === newState) {
          return true;
        }
      }

      return false;
    },

    getCurrentState: function () {
      return this._currentState;
    },

    getInitialState: function () {
      return 'initial';
    },

    _getStateByName: function (stateName) {
      return this.states[stateName];
    },

    _getValidTransitionsForState: function (stateName) {
      if (!stateName) {
        return ['initial'];
      }

      return this.states[stateName].transitionTo || [];
    },

    _ensureState: function () {
      if (!this.states || !this.states[this.getInitialState()]) {
        throw new Error('State machine initialized, but no states were declared.');
      }

      this.transitionTo(this.getInitialState());
    }
  };

  return StateMachine;
});

define('promenade/view',['jquery', 'backbone', 'templates', 'underscore', 'promenade/region',
        'promenade/collection/retainer', 'promenade/delegation', 'promenade/model',
        'promenade/collection', 'promenade/queue', 'promenade/state'],
       function($, Backbone, templates, _, Region, RetainerApi, DelegationApi,
                Model, Collection, QueueApi, StateMachineApi) {
  'use strict';
  // Promenade.View
  // --------------

  // A ``Promenade.View`` extends ``Backbone.View`` with functionality that is
  // commonly re-implemented. The ``View`` is automatically able to handle
  // template rendering, data serialization and subview/parentview
  // relationships.
  var View = Backbone.View.extend({

    constructor: function(options) {
      options = options || {};
      this.options = options;
      return Backbone.View.apply(this, arguments);
    },

    // Upon initialization, the ``View`` instance takes stock of optional
    // ``template`` and ``collection`` settings. If a ``template`` is defined,
    // either at the class level or overridden in the options, a template
    // is looked up on the resolved ``'templates'`` module.
    initialize: function(options) {
      Backbone.View.prototype.initialize.apply(this, arguments);

      options = options || {};

      this.collection = options.collection;
      this.template = options.template || this.template;
      this.parentView = options.parentView;

      if (this.template) {
        this.templateFactory = templates[this.template];
      }

      this.layout = options.layout || this.layout || {};

      this._loadingStack = 0;

      this._ensureRegions();

      if (this.states) {
        this._ensureState();
      }

      this._decorateElement();
    },

    defaultDelegationTargets: ['model', 'collection', 'self'],

    // The default ``render`` routine of Backbone is a no-op. In Promenade,
    // ``render`` has been formalized to support subviews and templates.
    render: function(recursive) {
      var data;
      var html;
      var region;

      // We alert any interested parties that the ``View`` is about to be
      // rendered. This allows ``Region`` instances to safely remove subviews
      // while the parent ``View`` instance is being rendered.
      this.trigger('before:render');

      // If a ``templateFactory`` is available, it is used to generate an HTML
      // structure based on model data.
      if (this.templateFactory) {
        data = this.serializeModelData();
        html = this.templateFactory(data);

        this.$el.html(html);
      }

      // If recursive is desired, each region is asked to re-render
      // its subviews.
      if (recursive === true) {
        for (region in this.layout) {
          this.getRegion(region).renderSubviews(recursive);
        }
      }

      // When ``render`` is done, a ``'render'`` event is dispatched to notify
      // any interested parties. ``Region`` instances will respond to this event
      // by re-attaching any previously detached subviews.
      this.trigger('render');

      return this;
    },

    // Remove has been expanded to automatically call ``undelegateEvents``. This
    // behavior is implied in Backbone because of the way jQuery.remove / empty
    // works, but we need to make sure that events bound to the ``model`` and
    // the ``View`` instance itself are also unbound.
    remove: function() {
      var region;

      for (region in this.layout) {
        this[this.getRegionProperty(region)].empty();
      }

      this.trigger('remove', this);

      this._bubbleDomDetach();

      this.undelegateEvents();

      this.deactivateDelegation();
      this.releaseConnections();

      Backbone.View.prototype.remove.apply(this, arguments);
      return this;
    },

    // The template can be declared on the class level.
    template: '',

    delegateEvents: function() {
      // set state class name
      if (!this.isDelegationActive()) {
        this.activateDelegation();
      }

      return Backbone.View.prototype.delegateEvents.apply(this, arguments);
    },

    onEnterState: function(state) {
      this._setStateClassName(state);
    },

    // A new ``detach`` method allows the ``View`` to be detached in a way that
    // is non-destructive for DOM event delegation.
    detach: function() {
      if (this.el.parentNode) {
        this.$el.detach();
        this.invalidateAttachmentState();
      }

      return this;
    },

    // The ``attachTo`` method allows easy re-attachment without also expecting
    // the user to subsequently call ``delegateEvents``.
    attachTo: function($parent) {
      this.detach();

      this.$el.appendTo($parent);

      this.invalidateAttachmentState();

      return this;
    },

    freezeHeight: function() {
      this.$el.css('height', this.$el.height());
    },

    unfreezeHeight: function() {
      this.$el.css('height', '');
    },

    // ``deepRender`` is a decorator for performing a recursive call to
    // ``render``.
    deepRender: function() {
      return this.render(true);
    },

    asyncRender: function() {
      this.pushQueue(this.tick(this.render), 'render');

      return this.queueCompletes('render');
    },

    // Model lookup has been formalized so that there are distinct rules for
    // when ``model`` is used, and when ``collection`` is used.
    hasModel: function() {
      return !!this.getModel();
    },

    getModel: function() {
      return this.model;
    },

    hasCollection: function() {
      return !!this.getCollection();
    },

    getCollection: function() {
      return this.collection;
    },

    // Region lookup has been formalized to support naming convention
    // agnosticism.
    getRegion: function(region) {
      return this[this.getRegionProperty(region)];
    },

    getRegionProperty: function(region) {
      return region + 'Region';
    },

    serializationDepth: 1,

    // The ``serializeModelData`` method is intended to provide an override-able
    // method for translating a ``model`` or ``collection`` into serialized
    // data consumable by the given template, if any.
    serializeModelData: function() {
      var data;
      var model;
      var collection;

      if (!this.hasModel()) {
        data = {};
      } else {
        model = this.getModel();
        collection = this.getCollection();

        data = model.toJSON(_.result(this, 'serializationDepth'));

        if (model instanceof Backbone.Model) {
          data.model_is_new = model.isNew();

          if (model instanceof Model) {
            data.model_has_synced = model.hasSynced();
          }
        }

        if (collection instanceof Collection) {
          data.collection_has_synced = collection.hasSynced();
          data.collection_is_empty = collection.length === 0;
        }
      }

      this.trigger('serialize', data);

      return data;
    },

    invalidateAttachmentState: function() {
      var root;

      if (this.el.parentNode) {
        this.trigger('attach', this);

        root = this.el;

        while (root && (root !== document.body)) {
          root = root.parentNode;
        }

        if (root) {
          this.trigger('dom:attach', this);
        } else {
          this.trigger('dom:detach', this);
        }
      } else {
        this.trigger('detach', this);
        this.trigger('dom:detach', this);
      }
    },

    renderOnChange: true,

    // By default, a ``View`` will re-render on most manipulation-implying
    // events dispatched by its ``model`` or ``collection``.
    _modelEvents: {
      'change': '_onModelChange',
      'before:fetch': '_setLoading',
      'before:save': '_setLoading',
      'before:destroy': '_setLoading',
      'sync': '_setNotLoading'
    },

    _collectionEvents: {
      'before:fetch': '_setLoading',
      'before:create': '_setLoading',
      'sync': '_setNotLoading'
    },

    _selfEvents: {
      'enter:all': '_setStateClassName'
    },

    _stateClassName: function(state) {
      return 'state-' + state;
    },

    _setStateClassName: function(state) {
      this.el.className = _.reject(this.el.className.split(/\s+/), function (className) {
        return View.stateClassNameMatcher.test(className);
      }).join(' ');

      this.$el.addClass(this._stateClassName(state));
    },

    _onModelChange: function() {
      if (this.renderOnChange === true) {
        this.render();
      }
    },

    _bubbleDomAttach: function(view) {
      for (var region in this.layout) {
        _.invoke(this.getRegion(region).subviews,
                 'trigger', 'dom:attach', view || this);
      }
    },

    _bubbleDomDetach: function(view) {
      for (var region in this.layout) {
        _.invoke(this.getRegion(region).subviews,
                 'trigger', 'dom:detach', view || this);
      }
    },

    _setLoading: function() {
      ++this._loadingStack;
      this.$el.addClass('loading');
    },

    _setNotLoading: function() {
      if (!this._loadingStack) {
        return;
      }

      if (--this._loadingStack === 0) {
        this.$el.removeClass('loading');
      }
    },

    _decorateElement: function() {
      var model;
      var type;
      var id;

      if (!this.model) {
        return;
      }

      model = this.getModel();

      type = _.result(model, 'type');
      id = _.result(model, 'id');

      if (id || id === 0) {
        this.$el.attr('data-model-id', id);
      }

      if (type) {
        this.$el.attr('data-type', type);
      }
    },

    _ensureRegions: function() {

      // Any regions of the ``View`` defined in the ``layout`` map
      // are created as ``Region`` instances associated with the ``View``
      // instance.
      for (var region in this.layout) {
        this[this.getRegionProperty(region)] = new Region({
          superview: this,
          selector: this.layout[region]
        });
      }
    },

    _tick: function() {
      var Result = new $.Deferred();

      if (typeof window.requestAnimationFrame !== 'undefined') {
        window.requestAnimationFrame(function() {
          Result.resolve();
        });
      } else {
        window.setTimeout(function() {
          Result.resolve();
        }, 0);
      }

      return Result.promise();
    }
  }, {
    stateClassNameMatcher: /state-[a-z0-9]*/
  });

  _.extend(View.prototype, RetainerApi, DelegationApi, QueueApi, StateMachineApi);

  return View;
});

define('promenade/view/collection',['promenade/view', 'promenade/collection'],
       function(View, Collection) {
  'use strict';
  // Promenade.CollectionView
  // ------------------------

  // The ``CollectionView`` handles a very common use case: using a
  // ``Backbone.View`` to represent a ``Backbone.Collection`` instance. The
  // ``CollectionView`` automatically handles insertion, removal and
  // re-rendering of ``View`` instances that correspond to ``Model`` instances
  // in a provided ``Collection`` instance.
  var CollectionView = View.extend({

    // The ``itemView`` declared on a ``CollectionView`` is the ``View`` class
    // that should be used to render individual items.
    itemClass: View,

    loadingClass: null,

    // The default ``tagName`` for a ``CollectionView`` is changed from
    // ``'div'`` to ``'ul'``, as it is a very common case to use a list to
    // represent a collection of things in the DOM.
    tagName: 'ul',

    initialize: function() {
      // The layout always must have an ``'outlet'`` region which corresponds
      // the the place where items in the provided ``collection`` should be
      // rendered to.
      this.layout = _.defaults(this.layout || {}, {
        outlet: '',
        loading: ''
      });
      this.items = {};

      View.prototype.initialize.apply(this, arguments);

      this.retains(this.getCollection());
    },

    // The semantics of looking up a given ``model`` or ``collection`` in a
    // ``CollectionView`` are slightly different. In ``Promenade.View``, a
    // ``model`` can be represented by either a ``model`` or ``collection`` (in
    // that order). In a ``CollectionView``, both a ``model`` and ``collection``
    // can be represented by the ``View`` at the same time.
    hasModel: function() {
      return !!this.model;
    },

    createItemView: function(options) {
      return new this.itemClass(options);
    },

    resolveItemOptions: function(model) {
      return {
        model: model
      };
    },

    createLoadingView: function() {
      return new this.loadingClass({
        model: this.getModel(),
        collection: this.getCollection()
      });
    },

    hasLoadingView: function() {
      return !!this.loadingClass;
    },

    // When a ``CollectionView`` needs to remove all items and re-add them
    // one at a time, this method can be called.
    resetItems: function() {
      this._removeAllItems();

      if (!this.hasCollection()) {
        return;
      }

      this.getCollection().each(function(model) {
        this._addItemByModel(model);
      }, this);
    },

    render: function() {
      View.prototype.render.apply(this, arguments);

      if (this.hasCollection() && this.getCollection().length === 0) {
        this.outletRegion.$container.addClass('empty');
      }

      return this;
    },

    // Upon render, we call ``resetItems`` to make sure that every contained
    // item gets rendered as well.
    _selfEvents: _.defaults({
      'render': 'resetItems'
    }, View.prototype._selfEvents),

    // A new mapping of ``collectionEvents`` can be declared. This allows a
    // distinction between the events bound to a ``model`` instance and a
    // ``collection`` instance. This means that a ``CollectionView`` can support
    // behavior in response to both a given ``model`` and a given
    // ``collection``.
    //
    // By default the ``collectionEvents`` are set up to respond to manipulation
    // events in the given ``collection`` by adding, removing or resetting its
    // subviews.
    _collectionEvents: _.defaults({
      'add': '_addItemByModel',
      'remove': '_removeItemByModel',
      'reset': 'resetItems',
      'sort': '_sortItems'
    }, View.prototype._collectionEvents),

    _setLoading: function() {
      var firstLoad = !this._loadingStack;

      View.prototype._setLoading.apply(this, arguments);

      if (firstLoad && this.hasLoadingView()) {
        this.getRegion('loading').show(this.createLoadingView());
      }
    },

    _setNotLoading: function() {
      View.prototype._setNotLoading.apply(this, arguments);

      if (!this._loadingStack) {
        this.getRegion('loading').empty();
      }
    },

    _decorateElement: function() {
      var collection;
      var type;

      if (!this.collection) {
        return;
      }

      collection = this.getCollection();
      type = _.result(collection, 'type');

      if (type) {
        this.$el.attr('data-type', type);
      }
    },

    // Subviews in a ``CollectionView`` are tracked by the ``cid`` of the models
    // that represent them. This allows us to look up a ``View`` instance by
    // a model instance.
    _containsItem: function(model) {
      return this.items[model.cid] !== null &&
             this.items[model.cid] !== undefined;
    },

    // The main mechanism for adding a subview to a ``CollectionView`` is by
    // a ``model`` reference. This ``model`` should be contained by the
    // ``collection`` that is associated with the ``CollectionView``.
    _addItemByModel: function(model) {
      var region;
      var index;
      var view;
      var options;

      this.outletRegion.$container.removeClass('empty');

      // If we already have this ``model`` as a subview, we do nothing.
      if (this._containsItem(model)) {
        return;
      }

      // We look-up the ``'outlet'`` region, get the index of the model being
      // added, create a ``View`` instance, render it and insert the ``View``
      // instance into our ``'outlet'`` region.
      region = this.getRegion('outlet');
      index = this.getCollection().indexOf(model);
      options = _.defaults(this.resolveItemOptions(model), { parentView: this });
      view = this.createItemView(options);
      this.listenTo(view, 'render', this._onItemRender);

      this.items[model.cid] = view;

      region.insertAt(view, index);

      this.trigger('add:item', view, this);
    },

    // Subviews are removed in a similar way to how they are added. A received
    // ``model`` instance is used to lookup a ``View`` instance previously
    // attached to the ``CollectionView``. If one exists, it is removed from
    // the ``'outlet'`` region and disposed of.
    _removeItemByModel: function(model) {
      var view = this.items[model.cid];
      var region = this.getRegion('outlet');

      if (!view) {
        return;
      }

      delete this.items[model.cid];

      region.remove(view);
      view.undelegateEvents();
      this.stopListening(view, 'render', this._onItemRender);

      this.trigger('remove:item', view, this);
    },

    _onItemRender: function(model) {
      this.trigger('render:item', this);
    },

    // Sometimes we want to remove all subviews at once. For instance, when our
    // provided ``collection`` triggers a ``'reset'`` event, all models in that
    // ``collection`` are flushed. The ``collection`` will dispatch separate
    // ``'add'`` events if the ``'reset'`` was triggered by some kind of network
    // sync, so we don't need to re-add subviews in this case.
    _removeAllItems: function() {
      var region = this.getRegion('outlet');

      _.each(this.items, function(view) {
        region.remove(view);
        view.undelegateEvents();
        this.stopListening(view, 'render', this._onItemRender);
        this.trigger('remove:item', view, this);
      }, this);

      this.items = {};
    },

    _sortItems: function() {
      if (this.hasEmptyQueue('sort')) {
        this.pushQueue(this.tick(function() {
          var region = this.getRegion('outlet');
          var views = [];

          this.freezeHeight();

          this.getCollection().each(function(model) {
            var view = this.items[model.cid];

            if (!view) {
              return;
            }

            region.detach(view);
            views.push(view);
          }, this);

          region.add(views, { render: false });

          this.unfreezeHeight();
        }), 'sort');
      }
    }
  });

  return CollectionView;
});

define('promenade/view/form',['promenade/view'],
       function(View) {
  'use strict';

  // Promenade.FormView
  // ------------------------

  var FormView = View.extend({

    events: function() {
      return {
        'submit':'triggerSubmit',
        'click input[type=submit]':'triggerSubmit'
      };
    },

    triggerSubmit: function(event){
      this.trigger('submit');
      return false;
    },

    reset: function(){
      this.$('form')[0].reset();
    }

  });

  return FormView;
});

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('promise',[], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Promise = root.Promise || factory();
    root.PromisePolyfill = factory();
  }
}(this, (function (root) {

  return function () {

    var isFunction = function (obj) {
      return !!(obj && typeof obj === 'function');
    };

    var isPromise = function (obj) {
      return !!(obj instanceof Promise);
    };

    var isIterable = function (obj) {
      return !!obj && // Truthy
          obj.hasOwnProperty('length') && // Has own length property
          !obj.propertyIsEnumerable('length'); // Length not enumerable
    };

    var isThenable = function (obj) {
      var type;

      if (obj === null) {
        return false;
      }

      type = typeof obj;

      return !!((type === 'object' || type === 'function') &&
                'then' in obj);
    };

    var setImmediate = (function () {
      if (root.setImmediate) {
        return root.setImmediate;
      } else if (root.requestAnimationFrame) {
        return root.requestAnimationFrame;
      }

      return function (fn) {
        root.setTimeout(fn, 0);
      };
    })();

    var bind = function (fn, context) {
      if (fn.bind) {
        return fn.bind(context);
      }

      return function () {
        return fn.apply(context, arguments);
      };
    };


    function Deferred(promise) {
      this.state = Deferred.state.PENDING;
      this.promise = promise;
      this.result = null;

      this.pendingFulfillmentHandlers = [];
      this.pendingRejectionHandlers = [];
    }

    Deferred.state = {
      PENDING: 'pending',
      FULFILLED: 'fulfilled',
      REJECTED: 'rejected'
    };

    Deferred.prototype.resolve = function (value) {
      var then;

      if (!this.isPending()) {
        return;
      }

      try {
        if (isPromise(value)) {
          return value.then(bind(this.resolve, this), bind(this.reject, this));
        } else if (isThenable(value)) {
          then = value.then;

          if (isFunction(then)) {
            return bind(function () {
              var pending = true;

              try {
                return then.call(value, bind(function (result) {
                  if (!pending) {
                    return;
                  }
                  pending = false;
                  this.resolve(result);
                }, this), bind(function (error) {
                  if (!pending) {
                    return;
                  }
                  pending = false;
                  this.reject(error);
                }, this));
              } catch(e) {
                if (!pending) {
                  return;
                }
                pending = false;
                this.reject(e);
              }
            }, this)();
          }
        }
      } catch(e) {
        return this.reject(e);
      }

      this.result = value;

      this.state = Deferred.state.FULFILLED;

      setImmediate(bind(function () {
        var onFulfilled;

        while (onFulfilled = this.pendingFulfillmentHandlers.shift()) {
          onFulfilled(value);
        }
      }, this));
    };

    Deferred.prototype.reject = function (error) {
      if (!this.isPending()) {
        return;
      }

      this.result = error;

      this.state = Deferred.state.REJECTED;

      setImmediate(bind(function() {
        var onRejected;

        while (onRejected = this.pendingRejectionHandlers.shift()) {
          onRejected(error);
        }
      }, this));
    };

    Deferred.prototype.whenResolved = function (fn) {
      if (this.isFulfilled()) {
        return setImmediate(bind(function() {
          fn(this.result);
        }, this));
      }

      if (!this.isPending()) {
        return;
      }

      this.pendingFulfillmentHandlers.push(fn);
    };

    Deferred.prototype.whenRejected = function (fn) {
      if (this.isRejected()) {
        return setImmediate(bind(function() {
          fn(this.result);
        }, this));
      }

      if (!this.isPending()) {
        return;
      }

      this.pendingRejectionHandlers.push(fn);
    };

    Deferred.prototype.isPending = function () {
      return this.state === Deferred.state.PENDING;
    };

    Deferred.prototype.isFulfilled = function () {
      return this.state === Deferred.state.FULFILLED;
    };

    Deferred.prototype.isRejected = function () {
      return this.state === Deferred.state.REJECTED;
    };


    function Promise(resolver) {
      var deferred = this.__deferred__ = new Deferred(this);

      if (!resolver) {
        throw new Error('Promise constructor takes a function argument');
      }

      resolver(bind(deferred.resolve, deferred),
               bind(deferred.reject, deferred));
    }

    Promise.prototype.then = function (onFulfilled, onRejected) {
      var promise = new Promise(function(resolve, reject) {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      var resolvePromise;
      var rejectPromise;

      this.__deferred__.whenResolved(function (value) {
        var result;

        if (isFunction(onFulfilled)) {
          try {
            result = onFulfilled(value);
          } catch (e) {
            return rejectPromise(e);
          }
        } else {
          result = value;
        }

        if (result === promise) {
          return rejectPromise(new TypeError());
        }

        resolvePromise(result);
      });

      this.__deferred__.whenRejected(function (error) {
        var result;

        if (isFunction(onRejected)) {
          try {
            result = onRejected(error);
          } catch (e) {
            return rejectPromise(e);
          }
        } else {
          return rejectPromise(error);
        }

        if (result === promise) {
          return rejectPromise(new TypeError());
        }

        resolvePromise(result);
      });

      return promise;
    };

    Promise.prototype['catch'] = function (onRejected) {
      return this.then(undefined, onRejected);
    };

    Promise.all = function (iterable) {
      var count = 0;
      var result = [];
      var rejected = false;
      var length;
      var index;

      if (!isIterable(iterable)) {
        return Promise.resolve(result);
      }

      length = iterable.length;

      if (length === 0) {
        return Promise.resolve(result);
      }

      return new Promise(function (resolveAll, rejectAll) {
        for (index = 0; index < length; ++index) {
          (function (value, index) {
            Promise.cast(value).then(function (resolvedValue) {
              if (rejected) {
                return;
              }

              result[index] = resolvedValue;

              if (++count === length) {
                resolveAll(result);
              }
            })['catch'](function (rejectedValue) {
              rejected = true;
              rejectAll(rejectedValue);
            });
          })(iterable[index], index);
        }
      });
    };

    Promise.cast = function (value) {
      if (value && typeof value === 'object' && value.constructor === this) {
        return value;
      }

      return Promise.resolve(value);
    };

    Promise.resolve = function (value) {
      return new Promise(function (resolve, reject) {
        resolve(value);
      });
    };

    Promise.reject = function (error) {
      return new Promise(function (resolve, reject) {
        reject(error);
      });
    };

    Promise.race = function (iterable) {
      var count = 0;
      var length;
      var index;

      if (!isIterable(iterable)) {
        return Promise.resolve();
      }

      length = iterable.length;

      return new Promise(function (resolve, reject) {
        for (index = 0; index < length; ++index) {
          Promise.cast(iterable[index]).then(function (value) {
            resolve(value);
          })['catch'](function (error) {
            reject(error);
          });
        }
      });
    };

    return Promise;
  };

}(typeof global !== 'undefined' ? global : this))));

define('promenade/controller/action',['promenade/object', 'underscore', 'promise', 'backbone'],
        function (PromenadeObject, _, Promise, Backbone) {
  'use strict';

  var ControllerAction = PromenadeObject.extend({
    initialize: function (options) {
      this._controller = options.controller;
      this._parentAction = options.parentAction;
      this._fragment = '';
      this._verb = '';
      this._type = '';
      this._handler = '';
      this._children = [];
      this._queryParameters = {};
    },

    hasVerb: function () {
      return !!this._verb;
    },

    getVerb: function () {
      return this._verb;
    },

    setVerb: function (verb) {
      this._verb = verb;
    },

    hasHandler: function () {
      return !!this._handler;
    },

    setHandler: function (handler) {
      this._handler = handler;
    },

    getHandler: function () {
      return this._handler;
    },

    hasType: function () {
      return !!this.getType();
    },

    setType: function (type) {
      this._type = type;
    },

    getType: function () {
      return this._type;
    },

    hasParentAction: function () {
      return !!this.getParentAction();
    },

    getParentAction: function () {
      return this._parentAction;
    },

    getPathnameRoot: function () {
      var pathnameRoot = '';

      if (this.hasParentAction()) {
        pathnameRoot += this.getParentAction().getPathname();
      }

      return pathnameRoot;
    },

    getPathname: function () {
      var pathnameParts = [];
      var pathnameRoot = this.getPathnameRoot();

      if (pathnameRoot) {
        pathnameParts.push(this.getPathnameRoot());
      }

      if (this.hasFragment()) {
        pathnameParts.push(this.getFragment());
      }

      if (this.hasParameter()) {
        pathnameParts.push(this.getParameter());
      }

      return pathnameParts.join('/');
    },

    getRoute: function () {
      return this.getPathname();
    },

    hasFragment: function () {
      return !!this.getFragment();
    },

    getFragment: function () {
      return this._fragment;
    },

    setFragment: function (fragment) {
      this._fragment = fragment;
    },

    hasParameter: function() {
      return this.getVerb() === ControllerAction.verbs.SHOW && this.hasType();
    },

    getParameter: function() {
      return this.hasParameter() ? ':' + this.getType() : '';
    },

    fork: function () {
      var child = new ControllerAction({
        controller: this._controller,
        parentAction: this
      });
      this._children.push(child);
      return child;
    },

    getNestedMediator: function () {
      var action = this.fork();

      return action.getMediator();
    },

    getChildren: function () {
      return this._children;
    },

    allowQueryParameter: function (key, type) {
      this._queryParameters[key] = type;
    },

    toBackboneRoute: function() {
      return {
        fragment: this.getRoute(),
        handler: this.createRouteHandlerForController()
      };
    },

    createRouteHandlerForController: function () {
      var action = this;
      var controller = this._controller;
      var actionHandler = action.getHandler();
      var controllerHandler = controller[actionHandler];
      var parameterValueActions;
      var queryValueGenerators;

      if (!controllerHandler) {
        return function () {
          throw new Error('Controller route #' + actionHandler + ' does not exist.');
        };
      }

      parameterValueActions = action.getParameterValueLineage();
      queryValueGenerators = action.getQueryValueGenerators();

      return function () {
        var rawParameters = Array.prototype.slice.call(arguments);
        var rawQueryString = action.fragmentHasSearchString() ? rawParameters.pop() : '';
        var rawQueryHash = action.parseQueryString(rawQueryString);
        var queryValues = {};

        var parameterValuePromises = _.map(parameterValueActions, function (action) {
          var generator;
          var value;

          generator = action.getFragmentValueGenerator();

          if (action.getVerb() === ControllerAction.verbs.SHOW) {
            value = rawParameters.shift();
          }

          return generator(controller.app, value);
        });

        var queryValuePromises = _.map(rawQueryHash, function (value, key) {
          var generator = queryValueGenerators[key];

          if (!generator) {
            return value;
          }

          return generator(controller.app, value).then(function (result) {
            queryValues[key] = result;
          });
        });

        var parameterValuesBecomeAvailable = Promise.all(parameterValuePromises);
        var queryValuesBecomeAvailable = Promise.all(queryValuePromises);

        controller.setActive();


        return parameterValuesBecomeAvailable.then(function (parameters) {
          return queryValuesBecomeAvailable.then(function () {
            var result;

            if (!controller.isActive()) {
              return;
            }

            parameters.push(queryValues);

            controller.currentAction = action;
            result = controller[actionHandler].apply(controller, parameters);
            controller.trigger('after:route', controller, action, result);

            return result;
          });
        });
      };
    },

    getParameterValueLineage: function () {
      var action = this;
      var lineage = [];

      while (action.hasParentAction()) {
        if (action.getVerb() !== ControllerAction.verbs.HANDLE) {
          lineage.unshift(action);
        }

        action = action.getParentAction();
      }

      return lineage;
    },

    flatten: function () {
      var actions = [this];
      var children = this.getChildren();
      var index;
      var child;

      for (index = 0; index < children.length; ++index) {
        child = children[index];
        actions = actions.concat(child.flatten());
      }

      return actions;
    },

    createGeneratorFunction: function (verb, type) {
      return function (app, value) {
        var model = app.getResource(type);

        if (!model) {
          return Promise.resolve(value);
        }

        if (verb === ControllerAction.verbs.SHOW) {
          model = model.get(value);
        } else if (_.result(model, 'needsSync') === true) {
          model.fetch();
        }

        if (_.result(model, 'isSyncing') === true) {
          model = _.result(model, 'syncs') || model;
        }

        return Promise.resolve(model);
      };
    },

    getQueryValueGenerators: function () {
      var parentAction = this.getParentAction();
      var generators;
      var key;
      var type;

      if (parentAction) {
        generators = parentAction.getQueryValueGenerators();
      } else {
        generators = {};
      }

      for (key in this._queryParameters) {
        type = this._queryParameters[key];
        generators[key] = this.createGeneratorFunction(ControllerAction.verbs.SHOW, type);
      }

      return generators;
    },

    getFragmentValueGenerator: function () {
      return this.createGeneratorFunction(this.getVerb(), this.getType());
    },

    parseMediatorArguments: function (fragment, handler, options, callback) {
      var args = {};
      args.fragment = fragment;

      if (_.isString(handler)) {
        args.handler = handler;
        if (_.isFunction(options)) {
          args.callback = options;
        } else {
          args.options = options;
          args.callback = callback;
        }
      }

      if (_.isFunction(handler)) {
        args.callback = handler;
      } else if (_.isObject(handler)) {
        args.options = handler;
        if (_.isFunction(options)) {
          args.callback = options;
        }
      }

      args.options = args.options || {};

      return args;
    },

    getMediator: function () {
      var parentAction = this;
      var parseArguments = function (args) {
        return parentAction.parseMediatorArguments.apply(parentAction, args);
      };

      return {
        show: function () {
          var args = parseArguments(arguments);
          var action = parentAction.fork();
          var fragment = args.fragment;
          var handler = args.handler;
          var options = args.options;
          var callback = args.callback;
          var type = options.type || args.fragment;

          action.setFragment(fragment);
          action.setType(type);
          action.setVerb(ControllerAction.verbs.SHOW);
          action.setHandler(handler);

          if (callback) {
            callback.call(action.getMediator());
          }
        },
        index: function () {
          var args = parseArguments(arguments);
          var action = parentAction.fork();
          var fragment = args.fragment;
          var handler = args.handler;
          var options = args.options;
          var callback = args.callback;
          var type = options.type || fragment;

          action.setFragment(fragment);
          action.setType(type);
          action.setVerb(ControllerAction.verbs.INDEX);
          action.setHandler(handler);

          if (callback) {
            callback.call(action.getMediator());
          }
        },
        handle: function () {
          var args = parseArguments(arguments);
          var action = parentAction.fork();
          var fragment = args.fragment;
          var handler = args.handler;
          var callback = args.callback;

          action.setFragment(fragment);
          action.setVerb(ControllerAction.verbs.HANDLE);
          action.setHandler(handler);

          if (callback) {
            callback.call(action.getMediator());
          }
        },
        query: function () {
          var args = parseArguments(arguments);
          var action = parentAction;
          var queryKey = args.fragment;
          var options = args.options;
          var type = options.type || queryKey;

          action.allowQueryParameter(queryKey, type);
        },
        getRelatedAction: function () {
          return parentAction;
        }
      };
    },

    fragmentHasSearchString: function() {
      var controller = this._controller;
      var matcher = ControllerAction.SEARCH_STRING_MATCHER;

      return matcher.test(controller.getFragment());
    },

    parseQueryString: function(queryString) {
      var parts;

      if (queryString) {
        parts = queryString.split('&');
      } else {
        parts = [];
      }

      return _.reduce(parts, function(queryHash, part) {
        var keyValue = part.split('=');
        var key = keyValue[0];
        var value = keyValue[1];

        if (typeof value === 'undefined') {
          value = true;
        }

        queryHash[key] = value;

        return queryHash;
      }, {});
    }
  }, {
    verbs: {
      SHOW: 'show',
      INDEX: 'index',
      HANDLE: 'handle'
    },
    SEARCH_STRING_MATCHER: /[^?]*\?.+$/
  });

  return ControllerAction;
});

define('promenade/controller',['backbone', 'underscore', 'promenade/object', 'promenade/delegation', 'promenade/controller/action', 'promise'],
       function(Backbone, _, PromenadeObject, DelegationApi, ControllerAction, Promise) {
  'use strict';
  // Promenade.Controller
  // --------------------


  // Promenade.Controller is a contruct that is used to handle responses to
  // navigation events in the application. It extends ``Promenade.Object``, and
  // as such supports the ``Backbone.Events`` API.
  var Controller = PromenadeObject.extend({

    // When instantiated, the only option a ``Controller`` expects is ``app``,
    // which is a reference to the parent ``Application`` instance.
    initialize: function(options) {
      var rootAction = this.getRootAction();

      this.app = options && options.app;

      this._state = Controller.state.INACTIVE;
    },

    isActive: function() {
      return this._state === Controller.state.ACTIVE;
    },

    // When the state changes to ``active``, this method is called.
    activate: function() {},

    // Similarly, when the state changes to ``inactive``, this method is called.
    deactivate: function() {},

    getActions: function() {
      var rootAction;

      if (!this.actions) {
        rootAction = this.getRootAction();

        this.defineRoutes.call(rootAction.getMediator());
        this.actions = _.filter(rootAction.flatten(), function(action) {
          return action.hasHandler();
        });
      }

      return this.actions;
    },

    getRootAction: function() {
      if (!this.rootAction) {
        this.rootAction = new ControllerAction({
          controller: this
        });
      }

      return this.rootAction;
    },

    getBackboneRoutes: function() {
      if (!this.backboneRoutes) {
        this.backboneRoutes = _.invoke(this.getActions(), 'toBackboneRoute').reverse();
      }

      return this.backboneRoutes;
    },

    getRouteMatchers: function() {
      var routes;

      if (!this.routeMatchers) {
        routes = _.invoke(this.getActions(), 'getRoute');

        this.routeMatchers = _.map(routes, function(route) {
          return this.app._routeToRegExp(route);
        }, this);
      }

      return this.routeMatchers;
    },

    // ``_activate`` and ``_deactivate`` exist the handle kicking off state
    // transition whenever the state changes between ``active`` and
    // ``inactive``. In addition to calling the built-in ``activate`` and
    // ``deactivate`` handlers, they dispatch an ``activate`` and ``deactivate``
    // event.
    setActive: function() {
      if (this._state === Controller.state.INACTIVE) {
        this._state = Controller.state.ACTIVE;
        this.activate();
        this.trigger('activate');
      }
    },

    setInactive: function() {
      if (this._state === Controller.state.ACTIVE) {
        this._state = Controller.state.INACTIVE;
        this.deactivate();
        this.trigger('deactivate');
      }
    },

    // Navigation events are observed to determine when it is appropriate to
    // transition the state of the ``Controller``.
    handlesRoute: function(route) {
      var routeMatchers = this.getRouteMatchers();
      var index;
      var length;

      for (index = 0, length = routeMatchers.length; index < length; ++index) {
        if (routeMatchers[index].test(route)) {
          return true;
        }
      }

      return false;
    },

    // This method defaults to a no-op. Override it to define the routes that
    // your inherited Controller can handle. Example:
    //
    //   // ...
    //   defineRoutes: function() {
    //     this.handle('foo', 'fooHandler');
    //     this.show('bar', 'barHandler');
    //     this.handle('baz', function() {
    //       this.show('vim', 'bazVimHandler');
    //     });
    //   }
    //   // ...
    //
    // Will define the following routes:
    //
    //   {
    //     'foo': 'fooHandler',
    //     'bar': 'barHandler',
    //     'baz/vim/:param1': 'bazVimHandler'
    //   }
    //
    // These routes will be consumed by the Application when the Controller is
    // instantiated.
    defineRoutes: function() {},

    getFragment: function() {
      return Backbone.history.getFragment();
    }
  }, {
    state: {
      ACTIVE: 'active',
      INACTIVE: 'inactive'
    }
  });

  return Controller;
});

define('promenade/inflector',['backbone', 'underscore', 'jquery'],
  function (Backbone, _, $) {
    'use strict';

    // Promenade Inflector

    var _pluralRules = [
      [/$/, 's'],
      [/s$/i, 's'],
      [/(ax|test)is$/i, '$1es'],
      [/(octop|vir)us$/i, '$1i'],
      [/(octop|vir)i$/i, '$1i'],
      [/(alias|status)$/i, '$1es'],
      [/(bu)s$/i, '$1ses'],
      [/(buffal|tomat)o$/i, '$1oes'],
      [/([ti])um$/i, '$1a'],
      [/([ti])a$/i, '$1a'],
      [/sis$/i, 'ses'],
      [/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
      [/(hive)$/i, '$1s'],
      [/([^aeiouy]|qu)y$/i, '$1ies'],
      [/(x|ch|ss|sh)$/i, '$1es'],
      [/(matr|vert|ind)(?:ix|ex)$/i, '$1ices'],
      [/(m|l)ouse$/i, '$1ice'],
      [/(m|l)ice$/i, '$1ice'],
      [/^(ox)$/i, '$1en'],
      [/^(oxen)$/i, '$1'],
      [/(quiz)$/i, '$1zes']
    ].reverse();

    var _uncountables = ['equipment', 'information', 'rice', 'money', 'species', 'series', 'fish', 'sheep', 'jeans'];

    var irregular = {
      person: 'people',
      man: 'men',
      child: 'children',
      sex: 'sexes',
      move: 'moves',
      cow: 'kine',
      zombie: 'zombies'
    };

    var InflectorApi = {
      _dictionary: _.extend({}, irregular),

      pluralize: function (word, count) {
        var usePluralForm = this._isNumberPlural(count);
        var result;
        var rule;
        var index;
        var length;
        var pattern;
        var replacement;

        this._dictionary = this._dictionary || {};

        if (!usePluralForm) {
          return word;
        }

        if (this._dictionary[word]) {
          // if the word is already in the dictionary, return it
          return this._dictionary[word];
        }

        if(_.contains(_uncountables, word)) {
          return word;
        }

        for(index=0, length = _pluralRules.length; index < length; index++) {
          rule = _pluralRules[index];
          pattern = rule[0];
          replacement = rule[1];
          result = this._replace(word, pattern, replacement);
          if (result) {
            break;
          }
        }

        if (result) {
          this._dictionary[word] = result; // add the plural form into the dictionary
          return result;
        } else {
          // return the word if no match
          return word;
        }
      },

      addIrregular: function (word, pluralForm) {
        if (word && pluralForm) {
          this._dictionary[word] = pluralForm;
        }
      },

      _isMoreThanOne: function (num) {
        return num > 1;
      },

      _replace: function (word, pattern, replacement) {
        var regex = new RegExp(pattern.source, 'gi');
        if (regex.test(word)) {
          return word.replace(regex, replacement);
        }
      },

      _isNumberPlural: function (count) {
        if (count === 0) {
          return false;
        }
        return count ? this._isMoreThanOne(count) : true;
      }
    };

    return InflectorApi;
  }
);
define('promenade/application',['backbone', 'underscore', 'jquery', 'require', 'promenade/inflector'],
       function(Backbone, _, $, require, InflectorApi) {
  'use strict';
  // Promenade.Application
  // --------------------

  // An Application is the central entry point for a Promenade app.
  // It inherits from Backbone.Router.
  var Application = Backbone.Router.extend({

    // The ``root`` property on ``Application`` is a string selector that
    // refers to the root element that the ``Application`` should use for
    // any insertion of new DOM elements. When defined, a ``rootElement`` and
    // ``$rootElement`` property will be present on an ``Application`` instance
    // that refer to the corresponding DOM node and jQuery selection of the
    // ``root`` property, respectively.
    root: 'body',

    session: 'user_session',

    updateLocation: true,

    // The ``controllers`` property should be declared as an ``Array`` of
    // ``Promenade.Controller`` class references. These references are used
    // to instantiate ``Controller`` instances that will govern the routing
    // and behavior of the ``Application`` instance. After initialization is
    // complete, each class reference in this ``Array`` is replaced with a
    // corresponding class instance.
    controllers: [],

    // The ``models`` property should be declared as an ``Array`` of
    // ``Promenade.Model`` and / or ``Promenade.Collection`` class references.
    // These references are used to instantiate the core models and collections
    // that represent the data to be presented by the ``Application``.
    models: [],

    view: null,

    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);
      var view = this.view;
      this.view = null;

      this._initializeModels();

      // All instantiated resources are listened to for ``'sync'`` events in
      // order to support data propagation.
      this.listenTo(this, 'before:sync', this._onBeforeSync);
      this.listenTo(this, 'sync', this._onSync);

      this.cid = _.uniqueId();
      this._ensureRoot();

      this.initializes = this.setup().then(_.bind(function() {
        this.useView(view);
      }, this));
    },

    getSearchString: function() {

      var searchString = '';
      var currentFragment = Backbone.history.getFragment();

      if (currentFragment.indexOf('?') !== -1) {
        searchString = currentFragment.split('?').pop();
      }

      return searchString ? '?' + searchString : searchString;
    },

    redirect: function(route, options) {
      options = _.defaults(options || {}, {
        replace: true,
        forwardSearch: true
      });

      return this.navigate(route, options);
    },

    navigate: function(fragment, options) {
      fragment = this.parseFragment(fragment);

      options = _.defaults(options || {}, {
        trigger: true
      });

      if (options.forwardSearch) {
        fragment += this.getSearchString();
      }

      if (this.updateLocation === false) {
        return Backbone.history.loadUrl(fragment);
      }

      return Backbone.Router.prototype.navigate.call(this, fragment, options);
    },

    parseFragment: function(fragment) {
      return _.isString(fragment) ? fragment.replace(/^\//, '') : fragment;
    },

    setup: function() {
      return (new $.Deferred()).resolve().promise();
    },

    // The ``getResource`` method can be called to lookup a backing datastore
    // when it can be either a ``Model`` or ``Collection`` instance. By default,
    // ``Collection`` instances are given preference.
    getResource: function(type) {
      return this.getCollectionForType(type) || this.getModelForType(type);
    },

    // Automatically looks up a ``Collection`` for a given ``type``.
    getCollectionForType: function(type) {
      return this[this.getCollectionName(type)];
    },

    // Similarly, looks up a ``Model`` for a given ``type``.
    getModelForType: function(type) {
      return this[this.getModelName(type)];
    },

    // These methods exist for the purpose of more predictable canonicalization
    // of property names given a ``type``.
    getCollectionName: function(type) {
      return this.camelize(type) + 'Collection';
    },

    getModelName: function(type) {
      return this.camelize(type) + 'Model';
    },

    hasSession: function() {
      return !!this.getSession();
    },

    getSession: function() {
      return this.getModelForType(_.result(this, 'session'));
    },

    // When assigning ``Collection`` and ``Model`` instances to the
    // ``Application`` instance as properties, we must gracefully hadnle cases
    // where a resolved ``type`` value is not camelized. This helper function
    // converted strings separated with ``'_'`` characters into camel-cased
    // strings.
    camelize: function(string) {
      var parts = string.split('_');
      var part;
      var index;
      var length;

      string = '';

      for (index = 0, length = parts.length; index < length; ++index) {
        part = parts[index].toLowerCase();

        if (!part) {
          continue;
        }

        if (index !== 0) {
          part = part.substr(0, 1).toUpperCase() +
                 part.substr(1, part.length - 1);
        }

        string += part;
      }

      return string;
    },

    // ``useView`` is an idempotent way to set the main layout of an
    // ``Application`` instance. The method accepts a string, class reference
    // or ``View`` instance.
    useView: function(View) {
      var view;

      // When no argument is provided, the method returns immediately.
      if (!View) {
        return;
      }

      // When the argument is a ``String``, it is resolved as a module using
      // an AMD API.
      if (_.isString(View)) {
        View = require(View);
      }

      // If we already have a ``view`` set on the ``Application`` instance, the
      // view is compared to the parameter provided. If ``view`` is an instance
      // of ``View``, or if ``view`` and ``View`` are the same, the method
      // returns immediately.
      if (this.view) {
        if ((_.isFunction(View) && this.view instanceof View) ||
            this.view === View) {
          return;
        }

        // Otherwise the current ``view`` is removed.
        this.stopListening(this.view, 'navigate', this.navigate);
        this.stopListening(this.view, 'redirect', this.redirect);
        this.view.remove();
      }

      // The new ``view`` is created either by instantiating a provided class,
      // or by setting a provided instance.
      if (_.isFunction(View)) {
        view = new View({
          model: this.getSession(),
          app: this
        });
      } else {
        view = View;
      }

      // Finally, the new ``view`` instance is rendered and appended to the
      // ``rootElement`` of the ``Application`` instance.
      this.listenTo(view, 'navigate', this.navigate);
      this.listenTo(view, 'redirect', this.redirect);
      view.render();
      this.$rootElement.append(view.$el);

      this.view = view;
    },

    _ensureRoot: function() {
      // The ``$rootElement`` and ``rootElement`` properties are created on the
      // ``Application`` instance during initialization.
      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);

      this.$rootElement.on('click.promenade' + this.cid,
                           '.route-link', _.bind(this._onClickRouteLink, this));
    },

    _onClickRouteLink: function(event) {
      var $el = $(event.currentTarget);
      var href = $el.attr('href') || $el.data('href');

      if (href) {
        this.navigate(href, { trigger: true });
        return false;
      }

      throw new Error('A route link was clicked, but no HREF was found.');
    },

    // Upon initialization, and ``Application`` iterates through the list of
    // provided classes associated with its ``models`` property. Each of these
    // classes is instantiated and cached against its ``type`` and ``namespace``
    // values, separately, if available.
    _initializeModels: function() {
      this._namespace = {};

      _.each(this.models, function(ModelClass) {
        var model = new ModelClass(null, {
          app: this
        });
        var type = _.result(model, 'type');
        var namespace = _.result(model, 'namespace');


        if (model instanceof Backbone.Collection) {
          this[this.getCollectionName(type)] = model;
        } else if (model instanceof Backbone.Model) {
          this[this.getModelName(type)] = model;
        }

        if (namespace) {
          this._namespace[namespace] = model;
        }
      }, this);
    },

    // When a resource triggers a ``'sync'`` event, the ``Application`` observes
    // the network response to determine if there is any data that applies to
    // resources in other namespaces. If there is, the data in the namespace is
    // propagated to the known corresponding resources.
    _onBeforeSync: function(model, response, options) {
      var originalNamespace = _.result(model, 'namespace');
      var propagates = _.result(model, 'propagates');

      options = _.defaults(options || {}, {
        propagate: true,
        update: true
      });

      if (!options.propagate) {
        return;
      }

      _.each(response, function(data, key) {
        var otherModel = this._namespace[key];
        var otherType;
        var otherData;

        if (key !== originalNamespace && propagates[key] !== false &&
            (otherModel instanceof Backbone.Model ||
             otherModel instanceof Backbone.Collection)) {
          otherData = otherModel.parse.call(otherModel, response);
          otherModel.set(otherData);

          otherType = _.result(otherModel, 'type');

          if (!options.update) {
            return;
          }

          if (otherType) {
            this.trigger('update:' + otherType, otherModel);
            otherModel.trigger('update', otherModel);
          }
        }
      }, this);
    },

    _onSync: function(model, response, options) {
      var type = _.result(model, 'type');

      options = _.defaults(options || {}, {
        update: true
      });

      if (!options.update) {
        return;
      }

      this.trigger('update:' + type, model);
      model.trigger('update', model);
    },

    // The default ``_bindRoutes`` behavior is extended to support the
    // ``controllers`` property of the ``Application``. All provided
    // ``Controller`` classes are instantiated and references are help
    // by the ``Application``.
    _bindRoutes: function() {
      Backbone.Router.prototype._bindRoutes.apply(this, arguments);

      this.controllers = _.map(this.controllers, function(Controller) {

        var controller = new Controller({
          app: this
        });
        var backboneRoutes = controller.getBackboneRoutes();

        // When a ``Controller`` is instantiated, it defines the ``routes`` that
        // it can support. These ``routes`` are each mapped to a ``route`` in
        // ``Application``, which is a ``Backbone.Router`` derivative.
        _.each(backboneRoutes, function(route) {
          this.route(route.fragment, route.fragment, _.bind(function() {
            _.each(this.controllers, function(_controller, index) {
              if (_controller !== controller && !_controller.handlesRoute(route.fragment)) {
                _controller.setInactive();
              }
            });
            route.handler.apply(controller, arguments);
          }, this));
        }, this);

        return controller;
      }, this);
    }
  });

  _.extend(Application.prototype, InflectorApi);

  return Application;
});

(function() {
  'use strict';

  define('promenade',['promenade/view', 'promenade/view/collection', 'promenade/view/form',
          'promenade/model', 'promenade/controller', 'promenade/controller/action',
          'promenade/application', 'promenade/region', 'promenade/object',
          'promenade/collection', 'promenade/delegation', 'promenade/sync',
          'promenade/queue', 'promenade/inflector', 'promenade/state', 'promise'],
         function(View, CollectionView, FormView, Model,  Controller, ControllerAction,
                  Application, Region, PromenadeObject, Collection,
                  DelegationApi, SyncApi, QueueApi, InflectorApi, StateMachineApi, Promise) {
    return {
      Model: Model,
      Collection: Collection,
      View: View,
      CollectionView: CollectionView,
      FormView: FormView,
      Controller: Controller,
      ControllerAction: ControllerAction,
      Application: Application,
      Region: Region,
      Delegation: DelegationApi,
      Sync: SyncApi,
      Queue: QueueApi,
      Inflector: InflectorApi,
      'Object': PromenadeObject,
      StateMachine: StateMachineApi,
      Promise: Promise
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