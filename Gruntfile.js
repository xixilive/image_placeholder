/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    clean: {
      files: ['assets/dist/*', 'public/javascripts/**', 'public/stylesheets/**']
    },
    concat: {
      options: {
        banner: ""
      },
      dist: {
        src: ['assets/src/javascripts/jquery.js', 'assets/src/javascripts/jquery.cookie.js'],
        dest: 'assets/dist/jquery.js'
      }
    },
    uglify: {
      jquery:{
        options: {
          banner: "/*! jQuery JavaScript Library v2.0.3, built-in jQuery.Cookie plugin */\n"
        },
        files:[
          {src: 'assets/dist/jquery.js', dest: 'public/javascripts/jquery.min.js'}
        ]
      },
      dist:{
        options: {
          banner: '<%= banner %>'
        },
        files:[
          {src: 'assets/src/javascripts/application.js', dest: 'public/javascripts/app.min.js'}
        ]
      }
    },
    copy:{
      main:{
        files:[
          {src: 'assets/src/javascripts/foundation.min.js', dest: 'public/javascripts/foundation.min.js'},
          {src:'assets/src/javascripts/modernizr.min.js', dest: 'public/javascripts/modernizr.min.js'},
          {src: ['*'], dest: 'public/stylesheets/', filter: 'isFile', expand: true, cwd: 'assets/fonts/'}
        ]
      }
    },
    less:{
      production:{
        options: {
          paths: ["assets/stylesheets/"],
          yuicompress: true
        },
        files: {
          "public/stylesheets/normalize.css": "assets/src/stylesheets/normalize.less",
          "public/stylesheets/foundation.css": "assets/src/stylesheets/foundation.less",
          "public/stylesheets/foundation-icons.css": "assets/src/stylesheets/foundation-icons.less",
          "public/stylesheets/app.css": "assets/src/stylesheets/application.less",
        }
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-less');

  // Default task.
  grunt.registerTask('default', ['clean','concat', 'uglify', 'less', 'copy']);

};
