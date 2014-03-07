define(['backbone', 'underscore'],
  function (Backbone, _) {
    'use strict';
    // Promenade.Data.Context
    // ----------------------

    var Context = Backbone.Model.extend({
      url: null,
      sync: null,
      fetch: null,
      save: null,
      destroy: null
    });

    return Context;
  }
);
