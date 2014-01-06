(function(window) {
  'use strict';

  var karma = window.__karma__;
  var tests = [];

  for (var file in karma.files) {
    if (karma.files.hasOwnProperty(file)) {
      if (/-spec.js$/.test(file)) {
        tests.push(file);
      }
    }
  }

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


  requirejs.config({
    baseUrl: '',
    deps: tests,
    callback: karma.start
  });
})(this);

