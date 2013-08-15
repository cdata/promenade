define(['../promenade'], function() {
  'use strict';

  mocha.checkLeaks();
  mocha.globals(['jQuery', '_', 'Backbone', 'requirejs', 'require', 'define']);

  define('templates', function() {
    return {
      simple: function() {
        return '<div></div>';
      },
      list: function(obj) {
        var output = '<ul>';

        for (var key in obj) {
          output += '<li class="' + key + '">' + obj[key] + '</li>';
        }

        return output + '</ul>';
      },
      form: function(){
        return '<form> ' +
          '<input type="checkbox" /> ' +
          '<input type="text" /> ' +
          '<input type="submit" /> ' +
          '</form>';
      }
    };
  });

  require(['test/view',
           'test/view/collection',
           'test/view/form',
           'test/model',
           'test/collection',
           'test/collection/subset',
           'test/collection/retainer',
           'test/controller',
           'test/application',
           'test/region',
           'test/object'],
           function() {
             mocha.run();
           });
});
