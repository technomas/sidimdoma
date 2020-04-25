var gulp = require('gulp'),
  browserSync = require('browser-sync').create('first'),
  browserSyncProxy = require('browser-sync').create('second'),
  buffer = require('vinyl-buffer'),
  changed = require('gulp-changed'),
  del = require('del'),
  Fontmin = require('fontmin'),
  importify = require('gulp-importify'),
  prettify = require('gulp-jsbeautifier'),
  gcmq = require('gulp-group-css-media-queries'),
  gutil = require('gulp-util'),
  uglify = require('gulp-uglify'),
  imagemin = require('gulp-imagemin'),
  pug = require('gulp-pug'),
  plumber = require('gulp-plumber'),
  runSequence = require('run-sequence'),
  rename = require('gulp-rename'),
  replace = require('gulp-replace'),
  sass = require('gulp-sass'),
  autoprefixer = require('gulp-autoprefixer'),
  csscomb = require('gulp-csscomb'),
  csso = require('gulp-csso'),
  watch = require('gulp-watch'),
  svgSprite = require('gulp-svg-sprite'),
  cheerio = require('gulp-cheerio'),
  source = require('vinyl-source-stream'),
  browserify = require('browserify'),
  babelify = require('babelify');

var env = gutil.env.env || 'development';
var workPath = {
  build: {
    pages: './build/',
    css: './build/css/',
    drupalCss: './themes/custom/petschool/css/',
    js: './build/js/',
    drupalJs: './themes/custom/petschool/js/',
    images: './build/img/',
    drupalImg: './themes/custom/petschool/img/',
    icons: './build/img/',
    fonts: './build/fonts/',
    rootFiles: './build/'
  },
  src: {
    pages: './static/views/pages/**/*.pug',
    styles: ['./static/styles/foundation/custom.scss', './static/styles/scss/variables.scss', './static/styles/css/**/*.css', './static/styles/scss/**/*.scss', './static/blocks/**/*.scss'],
    jsApp: './static/scripts/app.js',
    js: './static/blocks/**/*.js',
    jsVendor: './static/scripts/vendor/*.js',
    otherScripts: './static/scripts/vendor/**/*.js',
    images: ['./static/images/**/*.{png,jpg,jpeg,gif,svg}', './static/blocks/**/*.{png,jpg,jpeg,gif,svg}', '!./static/blocks/icon/**/*.svg'],
    icons: './static/blocks/icon/sprite/*.svg',
    fonts: './static/fonts/**/*.*',
    rootFiles: './static/rootFiles/**/*.*'
  },
  watch: {
    layouts: './static/views/layouts/*.pug',
    blocks: './static/blocks/**/*.pug',
    pages: './static/views/pages/*.pug',
    styles: ['./static/styles/scss/**/*.scss', './static/styles/css/**/*.css', './static/blocks/**/*.scss'],
    js: ['./static/scripts/*.js', './static/blocks/**/*.js', './static/scripts/vendor/*.js'],
    images: ['./static/images/**/*.{png,jpg,jpeg,gif,svg}', './static/blocks/**/*.{png,jpg,jpeg,gif,svg}'],
    icons: './static/blocks/icon/**/*.svg',
    fonts: './static/fonts/**/*.*',
    rootFiles: './static/rootFiles/*.*'
  }
};

gulp.task('pages:build', function () {
  return gulp.src(workPath.src.pages)
    .pipe(plumber())
    .pipe(pug())
    .pipe(prettify({
      'indent_size': 2,
      'indent_char': ' '
    }))
    .pipe(plumber.stop())
    .pipe(gulp.dest(workPath.build.pages))
    .pipe(browserSync.stream());
});

gulp.task('styles:build', function () {
  gulp.src(workPath.src.styles, {base: process.cwd()})
    .pipe(plumber())
    .pipe(importify('styles.scss', {
      cssPreproc: 'scss'
    }))
    .pipe(sass({
      includePaths: ['./node_modules/foundation-sites/scss']
    }))
    .pipe(autoprefixer({
      browsers: ['> 1%', 'last 3 versions', 'Firefox >= 20', 'iOS >=7'],
      cascade: false
    }))
    .pipe(csscomb())
    .pipe(gcmq())
    .pipe(env === 'production' ? csso() : gutil.noop())
    .pipe(plumber.stop())
    .pipe(gulp.dest(workPath.build.css))
    .pipe(gulp.dest(workPath.build.drupalCss))
    .pipe(browserSync.stream());
});

gulp.task('scripts:build', function (done) {
  gulp.src(workPath.src.jsVendor)
    .pipe(uglify())
    .pipe(gulp.dest(workPath.build.js));

  return browserify({
      entries: [workPath.src.jsApp],
      debug: false
    })
    .transform(babelify, {plugins: ['transform-class-properties'], presets: ['es2015'], sourceMaps: false})
    .bundle()
    .on('error', function(err) {
      console.log(err.stack);
      this.emit('end');
    })
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(env === 'production' ? uglify() : gutil.noop())
    .pipe(gulp.dest(workPath.build.js))
    .pipe(gulp.dest(workPath.build.drupalJs))
    .pipe(browserSync.stream());
});

gulp.task('images:build', function () {
  gulp.src(workPath.src.images)
    .pipe(plumber())
    .pipe(changed(workPath.build.images))
    .pipe(imagemin({
      progressive: true,
      interlaced: true
    }))
    .pipe(plumber.stop())
    .pipe(gulp.dest(workPath.build.images))
    .pipe(gulp.dest(workPath.build.drupalImg));
});

var svg = {
  mode: {
    symbol: {
      dest: '',
      sprite: 'icons.svg'
    }
  },
  svg: {
    xmlDeclaration: false,
    doctypeDeclaration: false,
    namespaceIDs: false,
    dimensionAttributes: false
  }
};

gulp.task('icons:build', function () {
  gulp.src(workPath.src.icons)
    .pipe(cheerio({
      run: function ($) {
        $('[stroke]').removeAttr('stroke');
        $('[fill]').removeAttr('fill');
        $('[style]').removeAttr('style');
      },
      parserOptions: {xmlMode: true}
    }))
    .pipe(replace('&gt;', '>'))
    .pipe(rename({prefix: 'icon-'}))
    .pipe(svgSprite(svg))
    .pipe(gulp.dest(workPath.build.icons));
});

gulp.task('fonts:build', function () {
  var fontmin = new Fontmin()
    .src(workPath.src.fonts)
    .dest(workPath.build.fonts);

  fontmin.run(function (err, files) {
    if (err) {
      throw err;
    }
  });
});

gulp.task('rootFiles:build', function () {
  gulp.src(workPath.src.rootFiles)
    .pipe(plumber())
    .pipe(gulp.dest(workPath.build.rootFiles));
});

var server = {
  server: {
    baseDir: './build/'
  },
  tunnel: false,
  host: 'localhost',
  port: 5000,
  ui: {
    port: 5001
  }
};

var server2 = {
  port: 7000,
  proxy: 'http://localhost:5000',
  ui: {
    port: 7001
  }
};

gulp.task('connect', function () {
  browserSync.init(server);
  browserSyncProxy.init(server2);
});

gulp.task('clean', function (cb) {
  return del('./build', cb);
});

gulp.task('build', function (cb) {
  runSequence(
    'clean',
    ['pages:build', 'styles:build', 'scripts:build', 'images:build', 'icons:build', 'fonts:build', 'rootFiles:build'],
    cb
  );
});

gulp.task('watch', function () {
  watch([workPath.watch.layouts, workPath.watch.pages, workPath.watch.blocks], function (event, cb) {
    gulp.start('pages:build');
  });
  watch(workPath.watch.styles, function (event, cb) {
    gulp.start('styles:build');
  });
  watch(workPath.watch.js, function (event, cb) {
    gulp.start('scripts:build');
  });
  watch(workPath.watch.images, function (event, cb) {
    gulp.start('images:build');
  });
  watch([workPath.watch.icons], function (event, cb) {
    gulp.start('icons:build');
  });
  watch([workPath.watch.fonts], function (event, cb) {
    gulp.start('fonts:build');
  });
});

gulp.task('default', function (cb) {
  runSequence(
    'clean',
    'build',
    'connect',
    'watch',
    cb
  );
});
