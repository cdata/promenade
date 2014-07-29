define(['promenade/object', 'underscore', 'promise', 'backbone'],
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

      if (this.getParentAction()) {
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
