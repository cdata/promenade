define(['promenade/view'],
       function(View) {
  'use strict';
  
  // Promenade.FormView
  // ------------------------

  var FormView = View.extend({

    events: {
      'submit':'triggerSubmit',
      'click input[type=submit]':'triggerSubmit'
    },

    initialize: function() {
      View.prototype.initialize.apply(this, arguments);
    },

    triggerSubmit: function(event){
      event.preventDefault();
      this.trigger('submit');
      return false;
    },

    reset: function(){
      this.$('form')[0].reset();
    }

  });

  return FormView;
});