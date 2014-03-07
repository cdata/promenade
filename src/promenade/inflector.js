define(['backbone', 'underscore', 'jquery'],
  function (Backbone, _, $) {
    'use strict';
    // Promenade.Inflector API
    // -----------------------

    var pluralRules = [
      /(quiz)$/i, '$1zes',
      /^(oxen)$/i, '$1',
      /^(ox)$/i, '$1en',
      /(m|l)ice$/i, '$1ice',
      /(m|l)ouse$/i, '$1ice',
      /(matr|vert|ind)(?:ix|ex)$/i, '$1ices',
      /(x|ch|ss|sh)$/i, '$1es',
      /([^aeiouy]|qu)y$/i, '$1ies',
      /(hive)$/i, '$1s',
      /(?:([^f])fe|([lr])f)$/i, '$1$2ves',
      /sis$/i, 'ses',
      /([ti])a$/i, '$1a',
      /([ti])um$/i, '$1a',
      /(buffal|tomat)o$/i, '$1oes',
      /(bu)s$/i, '$1ses',
      /(alias|status)$/i, '$1es',
      /(octop|vir)i$/i, '$1i',
      /(octop|vir)us$/i, '$1i',
      /(ax|test)is$/i, '$1es',
      /s$/i, 's',
      /$/, 's'
    ];

    var singularRules = [
      /(database)s$/, '$1',
      /(quiz)zes$/, '$1',
      /(matr)ices$/, '$1ix',
      /(vert|ind)ices$/, '$1ex',
      /^(ox)en/, '$1',
      /(alias|status)es$/, '$1',
      /(octop|vir)i$/, '$1us',
      /(cris|ax|test)es$/, '$1is',
      /(shoe)s$/, '$1',
      /(o)es$/, '$1',
      /(bus)es$/, '$1',
      /([m|l])ice$/, '$1ouse',
      /(x|ch|ss|sh)es$/, '$1',
      /(m)ovies$/, '$1ovie',
      /(s)eries$/, '$1eries',
      /([^aeiouy]|qu)ies$/, '$1y',
      /([lr])ves$/, '$1f',
      /(tive)s$/, '$1',
      /(hive)s$/, '$1',
      /([^f])ves$/, '$1fe',
      /(^analy)ses$/, '$1sis',
      /((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/, '$1$2sis',
      /([ti])a$/, '$1um',
      /(n)ews$/, '$1ews',
      /s$/, ''
    ];

    var uncountables = {
      // Uncountables
      equipment: 'equipment',
      information: 'information',
      rice: 'rice',
      money: 'money',
      species: 'species',
      fish: 'fish',
      sheep: 'sheep',
      jeans: 'jeans'
    };

    var pluralDictionary = {
      // Irregular plurals
      person: 'people',
      man: 'men',
      child: 'children',
      sex: 'sexes',
      move: 'moves',
      cow: 'kine',
      zombie: 'zombies'
    };

    var singularDictionary = {
      // Irregular singulars
      people: 'person',
      men: 'man',
      children: 'child',
      sexes: 'sex',
      move: 'moves',
      kine: 'cow',
      zombies: 'zombie'
    };

    var InflectorApi = {
      isPlural: function (word) {
        return this.pluralize(word) === word;
      },

      isSingular: function (word) {
        return this.singularize(word) === word;
      },

      singularize: function (word) {
        return this._map(word, singularRules, singularDictionary);
      },

      pluralize: function (word, count) {
        var usePluralForm = this._isNumberPlural(count);

        if (!usePluralForm) {
          return this.singularize(word);
        }

        return this._map(word, pluralRules, pluralDictionary);
      },

      addIrregular: function (word, pluralForm) {
        if (word && pluralForm) {
          pluralDictionary[word] = pluralForm;
          singularDictionary[pluralForm] = word;
        }
      },

      _map: function (word, rules, dictionary) {
        var index;
        var pattern;
        var replacement;
        var result;

        if (dictionary[word]) {
          // if the word is already in the dictionary, return it
          return dictionary[word];
        }

        if (uncountables[word]) {
          return word;
        }

        for(index = 0; index < rules.length; index += 2) {
          pattern = rules[index];
          replacement = rules[index + 1];

          result = this._replace(word, pattern, replacement);

          if (result) {
            break;
          }
        }

        if (result) {
          dictionary[word] = result; // add the plural form into the dictionary
          return result;
        } else {
          // return the word if no match
          return word;
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
