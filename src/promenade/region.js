define(['promenade/object', 'promenade/view', 'underscore'],
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
