/*global module*/
/*jshint node: true*/

var path = require('path');

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        htmlmin: {
            templates: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: [{
                    expand: true,
                    flatten: true,
                    cwd: 'templates/',
                    dest: 'build/templates/',
                    src: '*'
                }]
            }
        },
        cssmin: {
            styles: {
                files: [{
                    expand: true,
                    flatten: true,
                    cwd: 'styles/',
                    dest: 'build/styles/',
                    src: '*'
                }]
            }
        },
        concat: {
            styles: {
                files: {
                    'build/templates/styles.css': 'build/styles/*'
                }
            },
            templates: {
                files: {
                    'build/scripts/templates.js': 'build/templates/*'
                },
                options: {
                    banner: 'var templates = {};\n',
                    process: function (content, srcPath) {
                        srcPath = path.basename(srcPath);
                        return 'templates[\'' + srcPath + '\'] = \'' + content + '\';\n';
                    }
                }
            },
            scripts: {
                files: {
                    'dist/main/viewify.js': 'build/scripts/*'
                }
            }
            // chrome: {
            //     src: [
            //         'dist/chrome/viewify.js',
            //         'dist/chrome/viewify-chrome.js'
            //     ],
            //     dest: 'dist/chrome/viewify.js'
            // }
        },
        jshint: {
            options: {
                jshintrc: true
            },
            files: ['./**/*.js']
        },
        copy: {
            scripts: {
                files: [{
                    expand: true,
                    cwd: 'scripts/',
                    src: '*',
                    dest: 'build/scripts/'
                }]
            }
            // chome: {
            //     files: [
            //         { expand: true, cwd: 'chrome/', src: ['*'], dest: 'dist/chrome', filter: 'isFile' },
            //         { expand: true, cwd: 'src/', src: ['*'], dest: 'dist/chrome', filter: 'isFile' }
            //     ]
            // }
        },
        watch: {
            scripts: {
                files: ['scripts/*', 'styles/*', 'templates/*'],
                tasks: ['build'],
                options: {
                  spawn: false,
                }
            }
        },
        clean: {
            build: ['build']
        }
    });

    grunt.registerTask('test', ['jshint']);
    grunt.registerTask('styles', ['cssmin', 'concat:styles']);
    grunt.registerTask('templates', ['styles', 'htmlmin:templates', 'concat:templates']);
    grunt.registerTask('scripts', ['copy:scripts', 'concat:scripts']);
    grunt.registerTask('build', ['templates', 'scripts']);
    grunt.registerTask('default', ['build']);
};
