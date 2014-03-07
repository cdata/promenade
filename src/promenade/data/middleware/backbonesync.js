define(['backbone'],
       function (Backbone) {

  var BackboneSync = function (data) {
    return function (transaction) {
      transaction.complete(function (context) {
        return Backbone.sync.call(
            Backbone, context.get('method'), context.get('model'), context.get('ajaxOptions'));
      });
    };
  };

  return BackboneSync;
});
