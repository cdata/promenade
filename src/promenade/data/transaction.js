define(['backbone', 'underscore', 'promise', 'promenade/object'],
       function (Backbone, _, Promise, PromenadeObject) {
    // Promenade.Data.Transaction
    // --------------------------

    var Transaction = PromenadeObject.extend({
      initialize: function (options) {
        this._context = options.context;
        this._completes = new Promise(_.bind(function (resolve, reject) {
          this._complete = resolve;
          this._incomplete = reject;
        }, this));
        this._transacts = new Promise(_.bind(function (resolve) {
          this._transact = resolve;
        }, this));

        this._responseTransforms = [];
      },

      transformRequest: function (transform) {
        transform(this._context);
      },

      transformResponse: function (transform) {
        this._responseTransforms.push(transform);
      },

      recover: function (recovery) {
        this._transacts = this._transacts.then(
            undefined, _.bind(recovery, undefined, this._context));
      },

      complete: function (completor) {
        while (this._responseTransforms.length) {
          this._transacts = this._transacts.then(
              _.bind(this._reponseTransforms.pop(), undefined, this._context));
        }

        this._transact(completor(this._context));
        this._complete(this._transacts);
      },

      completes: function () {
        return this._completes;
      },

      end: function () {
        this._incomplete(new Error('Unhandled transaction.'));
      }
    });

    return Transaction;
  }
);
