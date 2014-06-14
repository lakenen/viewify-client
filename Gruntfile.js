/*global module*/
/*jshint node: true*/

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            chrome: {
                src: [
                    'src/viewify.js',
                    'dist/chrome/viewify-chrome.js'
                ],
                dest: 'dist/chrome/viewify.js'
            }
        },
        jshint: {
            options: {
                jshintrc: true
            },
            files: ['./**/*.js']
        },
        copy: {
            chome: {
                files: [
                    { expand: true, cwd: 'chrome/', src: ['*'], dest: 'dist/chrome', filter: 'isFile' },
                    { expand: true, cwd: 'src/', src: ['*.css', '*.html'], dest: 'dist/chrome', filter: 'isFile' }
                ]
            }
        },
        watch: {
            scripts: {
                files: ['chrome/*', 'src/*'],
                tasks: ['build'],
                options: {
                  spawn: false,
                }
            }
        }
    });

    grunt.registerTask('test', ['jshint']);
    grunt.registerTask('build', ['copy', 'concat']);
};
