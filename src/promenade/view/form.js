define(['promenade/view'],
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
