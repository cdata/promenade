define(['promenade/object', 'promenade/view', 'underscore', 'promenade/delegation'],
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
        this.stopListening(view, 'navigate', this._onSubviewNavigate);
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
