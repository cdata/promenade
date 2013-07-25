define('templates', function() {
  return window.templates || window.JST || {};
});
define('jquery', function() {
  return $;
});
define('underscore', function() {
  return _;
});
define('backbone', ['jquery', 'underscore'], function() {
  return Backbone;
});
