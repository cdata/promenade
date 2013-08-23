define(['promenade/object', 'promenade/view', 'underscore'],
       function(PromenadeObject, View, _) {
  'use strict';
  // Promenade.Region
  // ----------------

  // A ``Promenade.Region`` represents a sub-selection of the DOM hierarchy that
  // represents a single view. A ``Region`` is used to insert one ``View`` into
  // another ``View`` at a specific place in the first ``View`` instance's DOM.
  // ``Region`` inherits from ``Promenade.Object``, and thus is compatible with
  // the ``Backbone.Events`` API.
  var Region = PromenadeObject.extend({

    // A ``Region`` expects a ``superview`` and ``selector`` to be provided in
    // its options hash. The ``superview`` is a reference to the ``View``
    // instance that the ``Region`` belongs to, and ``selector`` is a jQuery
    // selector string that corresponds to the subset of the DOM of the
    // ``superview`` which should correspond to the ``Region`` instance.
    initialize: function(options) {
      this.superview = options.superview;
      this.selector = options.selector;
      this.subviews = [];

      this._resetContainer();

      // The region listens to the before:render and render events of the
      // ``superview`` in order to determine when it is appropriate to detach
      // and reattach any ``subviews`` that it contains.
      this.listenTo(this.superview, 'before:render', this._detachSubviews);
      this.listenTo(this.superview, 'render', this._attachSubviews);
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
    add: function(views) {
      var PromenadeView = require('promenade/view');

      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        if (view instanceof PromenadeView) {
          view.attachTo(this.$container);
        } else {
          this.$container.append(view.el);
        }

        this.listenTo(view, 'navigate', this._onSubviewNavigate);
      }, this);

      this.subviews = this.subviews.concat(views);
    },

    // The ``remove`` method allows one to remove an arbitrary subset of
    // subviews from the ``Region``. If ``views`` can be detached in a way that
    // does not unset event bindings, it will be.
    remove: function(views) {
      var PromenadeView = require('promenade/view');

      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        view.remove();

        this.stopListening(view, 'navigate', this._onSubviewNavigate);
      }, this);

      this.subviews = _.difference(this.subviews, views);
    },

    detach: function(views) {
      var PromenadeView = require('promenade/view');

      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        if (view instanceof PromenadeView) {
          view.detach();
        } else {
          view.$el.detach();
        }

        this.stopListening(view, 'navigate', this._onSubviewNavigate);
      }, this);

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

      views.unshift(index, 0);

      this.subviews.splice.apply(this.subviews, views);

      //this.subviews.splice(index, 0, views);
    },

    // This is a wrapper for the most common subview insertion operation. When
    // called, the current set of ``subviews`` is removed, and the new set of
    // ``views`` provided are added.
    show: function(views) {
      var PromenadeView = require('promenade/view');

      this.remove(this.subviews);

      this.add(views);
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

    _onSubviewNavigate: function(href, options) {
      this.superview.trigger('navigate', href, options);
    },

    // When a view is about to be rendered, it is useful to be able to
    // quickly detach the elements of its ``subviews`` which the DOM is being
    // wiped and re-rendered.
    _detachSubviews: function() {
      _.each(this.subviews, function(view) {
        view.$el.detach();
      });
    },

    // Once the ``superview`` is re-rendered, the ``$container`` needs to be
    // re-selected and the ``subviews`` need to be re-appended.
    _attachSubviews: function() {
      this._resetContainer();

      _.each(this.subviews, function(view) {
        this.$container.append(view.$el);
      }, this);
    }
  });

  return Region;
});
