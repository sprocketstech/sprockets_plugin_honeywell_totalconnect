/*jslint node: true */
'use strict';
var path = require('path');
var pkg = require('./package.json');

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    // Project configuration.
    grunt.initConfig({
        jasmine_nodejs: {
            options: {
                specNameSuffix: "spec.js",
                stopOnFailure: false,
                traceFatal: true,
                // configure one or more built-in reporters
                reporters: {
                    console: {
                        colors: true,        // (0|false)|(1|true)|2
                        cleanStack: 1,       // (0|false)|(1|true)|2|3
                        verbosity: 4,        // (0|false)|1|2|3|(4|true)
                        listStyle: "indent", // "flat"|"indent"
                        activity: false
                    }
                }
            },
            all: {
                // spec files
                specs: [
                    "test/**/*-spec.js"
                ]
            }
        }
    });

    grunt.registerTask('test',['jasmine_nodejs:all']);
};
