module.exports = function(grunt) {
  'use strict';
  var project = 'promenade';

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-phantom-hack');

  grunt.initConfig({
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
          'test/promenade/**/*.js'
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
          exclude: ['templates']
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
          exclude: ['backbone', 'underscore', 'jquery', 'templates']
        }
      }
    },
    jshint: {
      all: ['src/**/*.js', '!src/support/*.js']
    },
    mocha: {
      all: ['test/index.html']
    }
  });

  grunt.registerTask('test', ['mocha', 'jshint']);
  grunt.registerTask('build', ['requirejs']);
};
