'use strict';

/* Project variables*/
var kitPrefix			= 'sst-',
	iconFontName		= kitPrefix + 'icons',
	sourcePath			= './src',
	buildPath			= './build/';

var _glyphs				= {};

var gulp				= require('gulp'),
	gutil				= require('gulp-util'),
	watch				= require('gulp-watch'),
	prefixer			= require('gulp-autoprefixer'),
	uglify				= require('gulp-uglify'),
	stylus				= require('gulp-stylus'),
	sourcemaps			= require('gulp-sourcemaps'),
	rigger				= require('gulp-rigger'),
	cssmin				= require('gulp-clean-css'),
	imagemin			= require('gulp-imagemin'),
	pngquant			= require('imagemin-pngquant'),
	rimraf				= require('rimraf'),
	browserSync			= require('browser-sync'),
	reload				= browserSync.reload,
	iconfont			= require('gulp-iconfont'),
	rename				= require('gulp-rename'),
	concat				= require('gulp-concat'),
	Filter				= require('gulp-filter'),
	runSequence			= require('run-sequence'),
	nodemon				= require('gulp-nodemon'),
	fs					= require('fs-extra'),
	path				= require('path'),
	gulpJade			= require('gulp-jade'),
	jade				= require('jade'),
	console				= require('better-console'),
	async				= require('async');

var workspace = {

	build: {
		html:			buildPath + '/html/',
		js:				buildPath + '/js/',
		css:			buildPath + '/css/',
		images:			buildPath + '/images/',
		fonts:			buildPath + '/fonts/'
	},

	src: {
		jade: 			sourcePath + '/jade/*.jade',
		js:				sourcePath + '/js/*.js',
		stylus:
		{
			theme:		sourcePath + '/stylus_theme/*.styl',
			toolkit:	sourcePath + '/stylus_toolkit/*.styl',
			variables:	sourcePath + '/stylus_variables/*.styl',
		},
		external_css:	sourcePath + '/external_css/*.css',
		images:
		[
						sourcePath + '/images/**/*.jpeg',
						sourcePath + '/images/**/*.jpg',
						sourcePath + '/images/**/*.png'
		],
		fonts:			sourcePath + '/fonts/**/*.*',
		icons:
		{
			svg:		sourcePath + '/icons/*.svg',
			style:		sourcePath + '/icons/iconfont.styl'
		}
	},

	watch: {
		jade: 			sourcePath + '/jade/**/*.jade',
		js:				sourcePath + '/js/**/*.js',
		stylus:
		{
			theme:		sourcePath + '/stylus_theme/**/*.styl',
			toolkit:	sourcePath + '/stylus_toolkit/**/*.styl',
			variables:	sourcePath + '/stylus_variables/**/*.styl',
		},
		external_css:	sourcePath + '/external_css/**/*.css',
		images:
		[
						sourcePath + '/images/**/*.jpeg',
						sourcePath + '/images/**/*.jpg',
						sourcePath + '/images/**/*.png'
		],
		fonts:			sourcePath + '/fonts/**/*.*',
		icons:
		{
			svg:		sourcePath + '/icons/*.svg',
			style:		sourcePath + '/icons/iconfont.styl'
		},
		smarty:			'./smarty/**/*.tpl'
	},

	clean: buildPath
};

gulp.task('clean', (cb) => {
	rimraf(workspace.clean, cb);
});


var prefixerOptions = {
	browsers: [
		'> 1%',
		'last 2 versions',
		'firefox >= 4',
		'safari 7',
		'safari 8',
		'IE 8',
		'IE 9',
		'IE 10',
		'IE 11'
	],
	cascade: false 
}

var BROWSER_SYNC_RELOAD_DELAY = 500;

gulp.task('nodemon', (cb) => {

	var called = false;

	return nodemon({
		script: 'app.js',
		watch: ['app.js']
	})
	.on('start', () => {
		if (!called) { cb(); }
		called = true;
	})
	.on('restart', () => {
		setTimeout(() => {
			browserSync.reload({
				stream: false
			});
		}, BROWSER_SYNC_RELOAD_DELAY);
	});
});

gulp.task('browser-sync', ['nodemon'], () => {
	browserSync({
		proxy: 'http://localhost:3000',
		port: 4000
	});
});

gulp.task('setup', function(){
	var config
	fs.readFile( __dirname + '/config.json', 'utf8', function (err, data) {
		if (err) throw err;
		config = JSON.parse(data);
		var defaultTemplate = config.defaultTemplate
		var _files = []

		async.forEach( config.pages, function(item, callback){

			var fileName = sourcePath + '/jade/' + item.link + '.jade'
			var pageTitle = item.title
			var kickStart = 'extends ./partials/' + defaultTemplate + '.jade' + '\r\n' + 'block vars' + '\r\n' + '\t' + '- var pageTitle = \'' + pageTitle + '\'' + '\r\n' + 'block content' + '\r\n' + '\t' + '.sst-padding' + '\r\n' + '\t\t' + 'div= pageTitle'

			fs.exists(fileName, function (exists) {

				if(!exists){
					fs.writeFile(fileName, kickStart, function(){
						_files.push([item.link+ '.jade', 'created'])
						callback()
					});
				} else {
					_files.push([item.link+ '.jade', 'allready exists'])
					callback()
				}
			});
			
		}, function(){
			if(err){throw err;}
			console.table( _files )
		})
	})
})



gulp.task('icons:build', () => {

	return gulp.src(workspace.src.icons.svg)
		.pipe(iconfont({
			fontName: iconFontName,
			fontWeight: 'normal',
			fontStyle: 'normal',
			fontHeight: '500',
			round: 100,
			descent: 75,
			normalize: true,
			centerHorizontally: true,
			formats: ['ttf', 'eot', 'woff', 'woff2', 'svg']
		}))
		.on('glyphs', (glyphs, options) => {
			glyphs.forEach((glyph) => {
				glyph.name = glyph.name.replace(/^[0-9\-]+/g, ""); // Replace digits from names
				glyph.name = glyph.name.replace(/__/g, "-"); // Replace "__" with "-" in names
				glyph.name = glyph.name.replace(/--/g, "-"); // Replace "--" with "-" in names
				glyph.unicode = glyph.unicode[0].charCodeAt(0).toString(16).toUpperCase(); // Transform Unicode to ASCII code
			});
			_glyphs = glyphs;
			gulp.start('icons:css');
		})
		.pipe(gulp.dest(workspace.build.fonts));
});

gulp.task('icons:css', () => {
	return gulp.src(workspace.src.icons.style)
		.pipe(stylus({
			define: {
				$fontName: iconFontName,
				$fontPath: '../fonts/',
				$iconClass : 'icon',
				$glyphs: _glyphs
			},
			'include css': true,
			'prefix' : kitPrefix 
		}))
		.pipe(gulp.dest(workspace.build.css))
		.pipe(reload({stream: true}));
});

gulp.task('fonts', () => {
	return gulp.src(workspace.src.fonts)
		.pipe(gulp.dest(workspace.build.fonts))
});


var gulpWebpack = require('gulp-webpack');
var named = require('vinyl-named');

gulp.task('js:build', () => {
	return gulp.src(workspace.src.js)
		.pipe(named())
		.pipe(gulpWebpack(require('./webpack.config')))
		.pipe(gulp.dest(workspace.build.js))
		.pipe(reload({stream: true}));
});

gulp.task('js:as-is', () => {
	return gulp.src(sourcePath + '/js/as-is/*.js')
		.pipe(gulp.dest(workspace.build.js))
		.pipe(reload({stream: true}));
});

gulp.task('production:html', function () {
	var icons = fs.readJsonSync(path.join( __dirname, 'src', 'jade', 'partials' , 'icons.json' ))
	return gulp.src(workspace.src.jade) 
		.pipe(gulpJade({
			pretty: '\t',
			locals: {
				__p: '',
				__dirname: __dirname,
				__tp: '/local/templates/silversite',
				__icons: icons,
				compile: jade.compile,
				production: true
			}
		}))
		.pipe(gulp.dest(workspace.build.html))
});


gulp.task('images:dev', () => {
	return gulp.src(workspace.src.images)
		.pipe(gulp.dest(workspace.build.images))
		.pipe(reload({stream: true}));
});

gulp.task('images:production', (e) => {

	var src = e && e.path ? e.path : workspace.src.images

	return gulp.src( src ) 
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}],
			use: [pngquant()],
			interlaced: true
		}))
		.pipe(gulp.dest(workspace.build.images))
});

gulp.task('stylus_toolkit:build', () => {

	return gulp.src( workspace.src.stylus.toolkit )
		.pipe(stylus({
			define: {
				$fontName: iconFontName,
				$iconClass : 'icon',
				$glyphs: _glyphs
			},
			'include css': true,
			'prefix': kitPrefix 
		}))
		.on('error', function(err){ gutil.log(gutil.colors.red("ERROR"), err); this.emit("end")})
		.pipe(prefixer(prefixerOptions))
		.pipe(gulp.dest(workspace.build.css))
		.pipe(reload({stream: true}));
});


gulp.task('stylus_theme:build', () => {

	return gulp.src([ workspace.src.external_css, workspace.src.stylus.theme])
		.pipe(stylus({
			define: {
				$glyphs: _glyphs
			},
			'include css': true 
		}))
		.on('error', function(err){ gutil.log(gutil.colors.red("ERROR"), err); this.emit("end")})
		.pipe(prefixer(prefixerOptions))
		.pipe(concat( 'theme.css' ))
		.pipe(gulp.dest(workspace.build.css))
		.pipe(reload({stream: true}));
});

gulp.task('miniCSS', () => {

	gulp.src(path.build.css + '*.*')
		.pipe(sourcemaps.init())
		.pipe(cssmin())
		.pipe(rename({ suffix: ".min" }))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(path.build.css))

});

gulp.task('bs-reload', function () {
	browserSync.reload();
});

gulp.task('bs-reload-stream', function () {
	browserSync.reload({stream: true});
});

gulp.task('build:dev', function () {
	process.env.NODE_ENV = 'development';
	runSequence(
		['setup'],
		//['icons:build'],
		['stylus_toolkit:build'],
		['stylus_theme:build'],
		['js:build'],
		['js:as-is'],
		['images:dev'],
		['fonts'],
		['browser-sync']
	);
});

gulp.task('build:production', function () {
	process.env.NODE_ENV = 'production';
	runSequence(
		['production:html'],
		//['icons:build'],
		['stylus_toolkit:build'],
		['stylus_theme:build'],
		['js:build'],
		['js:as-is'],
		['images:production'],
		['fonts']
	);
});

gulp.task('build', [ 'build:production' ])






var filewalker = require('filewalker');
var mixinFile =
`mixin icon(name, size)
	-
		var Dimentions = function Dimentions( defaultWidth, defaultHeight ){
			this.defaultWidth = defaultWidth
			this.defaultHeight = defaultHeight
		}
		Dimentions.prototype.width = function(){
			return !size ? this.defaultWidth : size / this.defaultHeight * this.defaultWidth
		}
		Dimentions.prototype.height = function(){
			return !size ? this.defaultHeight : size
		}
	case name`

gulp.task( 'svg-to-jade', () => {

	var cheerio = require('cheerio')
	var directory = path.join( __dirname, 'src', 'svg-icons-src')

	var icons = {} 

	filewalker( directory )
	.on('file', function(p, s) {

		if( path.extname(p) == '.svg' ) {

			var content = fs.readFileSync( path.join( directory, p ) )
			var $ = cheerio.load( content, {xmlMode: true} )

			var name = p.replace( /\s/g, '-' ).replace( /-\d\d(-?)px\.svg$/g, '' )
			console.log(p);

			var svg = $('svg')

			var icon = {
				name: name,
				width: parseFloat(svg.attr( 'width' ).replace( 'px', '')),
				height: parseFloat(svg.attr( 'height' ).replace( 'px', '')),
				viewBox: svg.attr( 'viewBox' ),
				path: svg.find('path').attr( 'd' ).replace( /\r|\n|\t/g, '')
			}

			icons[ name ] = icon
			// icons.push( icon )
			// console.log( icon )
		}

	})
	.on('error', function(err) {
		console.error(err);
	})
	.on('done', function() {
		// console.log('%d files', this.files);
		//console.log( icons )


		// for( let icon of icons ) {
		// 	var funcName = icon.name.replace( /-/g, '' )

		// 	mixinFile += 
		// 	`\r\n\t\twhen '${ icon.name }'
		// 	- var ${funcName} = new Dimentions(${ icon.width }, ${ icon.height })
		// 	svg.sst-svg-icon&attributes(attributes)( width=${funcName}.width() height=${funcName}.height() viewBox='${ icon.viewBox }' version='1.1' aria-hidden='true') 
		// 		path(d='${icon.path}' fill-rule='evenodd')`
		// }

		// console.log(mixinFile)

		// var r = []
		// for( let icon of icons ) {
		// 	r.push( icon.name )
		// }
		// console.log(r)

		// fs.outputFileSync( path.join( __dirname, 'src', 'jade', 'partials', 'iconsMixin.jade'), mixinFile )
		fs.outputJSONSync( path.join( __dirname, 'src', 'jade', 'partials', 'icons.json'), icons )
		console.log(icons)
	})
	.walk();

})





gulp.task('default', [ 'build:dev' ], () => {
	
	watch(workspace.watch.js, () => {
		gulp.start('js:build');
	});

	watch(workspace.watch.stylus.toolkit, () => {
		gulp.start('stylus_toolkit:build');
	});

	watch(workspace.watch.stylus.theme, () => {
		gulp.start('stylus_theme:build');
	});

	watch(workspace.watch.images, () => {
		gulp.start('images:dev');
	});

	watch(workspace.watch.smarty, () => {
		gulp.start('bs-reload');
	});

	watch(workspace.watch.jade, () => {
		gulp.start('bs-reload');
	});

	watch(workspace.watch.fonts, () => {
		gulp.start('fonts');
	});

	watch( path.join( __dirname, 'config.json'), () => {
		gulp.start('setup');
	});

	// watch([workspace.watch.icons.svg, workspace.watch.icons.style], () => {
	// 	setTimeout(() => {
	// 		gulp.start('icons:build');
	// 	}, 500)
	// });

});
