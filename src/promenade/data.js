define(['backbone', 'underscore', 'promenade/object',
        'promenade/data/operator', 'promenade/data/transaction'],
  function (Backbone, _, PromenadeObject, Operator, Transaction) {
    'use strict';
    // Promenade.Data
    // --------------

    var Data = PromenadeObject.extend({
      initialize: function () {
        this._middleware = [];
      },

      raw: function (context) {
        return this.sync(new Context(context));
      },

      type: function (type) {
        return new Operator({
          data: this,
          context: new Context({
            type: type
          })
        });
      },

      use: function (middleware) {
        this._middleware.push(middleware(this));
      },

      sync: function (context) {
        var transaction = new Transaction({
          context: context.clone()
        });
        var middleware;
        var index;

        for (index = 0, middleware = this._middleware[index];
             index < this._middleware.length;
             middleware = this._middleware[++index]) {

          middleware(transaction);
        }

        transaction.end();

        return transaction.completes();
      }
    });

    return Data;
  }
);
