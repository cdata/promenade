define(['promise', 'jquery', 'promenade/inflector'],
       function (Promise, $, Inflector) {

  var RESTClient = function (data) {

    function ajax () {
      return Promise.resolve($.ajax.apply(this, arguments));
    }

    function verb (context) {
      switch (context.get('method')) {
        case 'create':
          return 'POST';
        case 'read':
          return 'GET';
        case 'update':
          return 'PUT';
        case 'destroy':
          return 'DELETE';
      }

      return '';
    }

    function path (context) {
      var parts;
      var type;
      var method;

      if (context.has('resourcePath')) {
        return context.get('resourcePath');
      }

      parts = [''];
      type = context.get('type');
      method = context.get('method');


      if (this.prefix) {
        parts.push(this.prefix);
      }

      parts.push(Inflector.pluralize(type));

      if (method !== 'create' && context.has('id')) {
        parts.push(context.get('id'));
      }

      return parts.join('/');
    }

    function data (context) {
      return context.get('attributes');
    }

    return function (transaction) {
      transaction.complete(function (context) {
        return ajax({
          url: path(context),
          data: data(context),
          type: verb(context)
        });
      });
    };
  };

  return RESTClient;
});
