define(['promenade/object', 'promenade/view'],
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
