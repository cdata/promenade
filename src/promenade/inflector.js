define(['backbone', 'underscore', 'jquery'],
  function (Backbone, _, $) {
    'use strict';

    // Promenade Inflector

    var _pluralRules = [
      [/$/, 's'],
      [/s$/i, 's'],
      [/(ax|test)is$/i, '$1es'],
      [/(octop|vir)us$/i, '$1i'],
      [/(octop|vir)i$/i, '$1i'],
      [/(alias|status)$/i, '$1es'],
      [/(bu)s$/i, '$1ses'],
      [/(buffal|tomat)o$/i, '$1oes'],
      [/([ti])um$/i, '$1a'],
      [/([ti])a$/i, '$1a'],
      [/sis$/i, 'ses'],
      [/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
      [/(hive)$/i, '$1s'],
      [/([^aeiouy]|qu)y$/i, '$1ies'],
      [/(x|ch|ss|sh)$/i, '$1es'],
      [/(matr|vert|ind)(?:ix|ex)$/i, '$1ices'],
      [/(m|l)ouse$/i, '$1ice'],
      [/(m|l)ice$/i, '$1ice'],
      [/^(ox)$/i, '$1en'],
      [/^(oxen)$/i, '$1'],
      [/(quiz)$/i, '$1zes']
    ].reverse();

    var _uncountables = ['equipment', 'information', 'rice', 'money', 'species', 'series', 'fish', 'sheep', 'jeans'];

    var irregular = {
      person: 'people',
      man: 'men',
      child: 'children',
      sex: 'sexes',
      move: 'moves',
      cow: 'kine',
      zombie: 'zombies'
    };

    var InflectorApi = {
      _dictionary: _.extend({}, irregular),

      pluralize: function (word, count) {
        var usePluralForm = this._isNumberPlural(count);
        var result;

        this._dictionary = this._dictionary || {};

        if (!usePluralForm) {
          return word;
        }

        if (this._dictionary[word]) {
          // if the word is already in the dictionary, return it
          return this._dictionary[word];
        }

        if(_.contains(_uncountables, word)) {
          return word;
        }

        _.detect(_pluralRules, _.bind(function (rule) {
          var pattern = rule[0];
          var replacement = rule[1];
          result = this._replace(word, pattern, replacement);
          return result;
        }, this));

        if (result) {
          this._dictionary[word] = result; // add the plural form into the dictionary
          return result;
        } else {
          // return the word if no match
          return word;
        }
      },

      addIrregular: function (word, pluralForm) {
        if (word && pluralForm) {
          this._dictionary[word] = pluralForm;
        }
      },

      _isMoreThanOne: function (num) {
        return num > 1;
      },

      _replace: function (word, pattern, replacement) {
        var regex = new RegExp(pattern.source, 'gi');
        if (regex.test(word)) {
          return word.replace(regex, replacement);
        }
      },

      _isNumberPlural: function (count) {
        if (count === 0) {
          return false;
        }
        return count ? this._isMoreThanOne(count) : true;
      }
    };

    return InflectorApi;
  }
);