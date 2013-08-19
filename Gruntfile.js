module.exports = function(grunt) {
  'use strict';
  var project = 'promenade';
  var banner = '/*! <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> */\n';

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-phantom-hack');
  grunt.loadNpmTasks('grunt-docco2');

  grunt.initConfig({
    pkg: grunt.file.readJSON('bower.json'),
    watch: {
      javascripts: {
        files: [
          'src/**/*.js'
        ],
        tasks: ['requirejs']
      },
      test: {
        files: [
          'lib/*.js',
          'test/' + project + '/**/*.js'
        ],
        tasks: ['test']
      }
    },
    requirejs: {
      standalone: {
        options: {
          name: project,
          baseUrl: 'src/',
          mainConfigFile: 'src/config.js',
          out: 'lib/' + project + '-standalone.js',
          optimize: 'none',
          useStrict: true,
          exclude: ['templates'],
          wrap: {
            start: banner
          }
        }
      },
      barebones: {
        options: {
          name: project,
          baseUrl: 'src/',
          mainConfigFile: 'src/config.js',
          out: 'lib/' + project + '.js',
          optimize: 'none',
          useStrict: true,
          exclude: ['backbone', 'underscore', 'jquery', 'templates'],
          wrap: {
            start: banner
          }
        }
      },
      norequire: {
        options: {
          name: project,
          baseUrl: 'src/',
          mainConfigFile: 'src/config.js',
          out: 'lib/' + project + '-norequire.js',
          optimize: 'none',
          useStrict: true,
          exclude: ['backbone', 'underscore', 'jquery', 'templates'],
          include: ['support/almond', 'support/shim'],
          wrap: {
            start: banner + '(function(global) {',
            end: 'global.Promenade = require(\'' + project + '\');\n})(this);'
          }
        }
      }
    },
    docco: {
      docs: ['lib/' + project + '.js']
    },
    jshint: {
      all: ['src/**/*.js', '!src/support/*.js', 'test/' + project + '/**/*.js']
    },
    mocha: {
      all: ['test/index.html']
    }
  });

  grunt.registerTask('test', ['mocha', 'jshint']);
  grunt.registerTask('build', ['requirejs', 'docco']);
};
