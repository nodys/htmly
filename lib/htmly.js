var async            = require('async');
var extend           = require('extend');
var concatStream     = require('concat-stream')
var createReadStream = require('fs').createReadStream
var lrio             = require('lrio')
var transform        = require('./transform.js');
var processor        = require('./processor.js');
var chokidar         = require('chokidar')
var resolve          = require('resolve').sync
var remedy           = require('./remedy')

// htmly is a browserify transform and a browserify plugin
var htmly = module.exports = module.exports = function(fileOrBrowserify, opts) {
  if('string' == typeof(fileOrBrowserify)) {
    return require('./transform')(fileOrBrowserify, opts);
  } else {
    return require('./plugin')(fileOrBrowserify, opts);
  }
}

// Export api
htmly.transform    = transform;
htmly.processor    = processor;
htmly.remedy       = remedy;

/**
 * Add a global htmly pre-processor
 *
 * @param  {Array/Function} procs
 *         A processor function or an array of functions
 * @return {htmly}
 */
htmly.pre = function(procs) {
  if(!Array.isArray(procs)) procs = [procs];
  procs.forEach(function(proc) {
    if(typeof(proc) === 'string') {
      proc = require(resolve(proc, {basedir: process.cwd()}));
    }
    process.htmly.preProcessors.push(proc);
  })
  return htmly;
}

/**
 * Add a global htmly post-processor
 *
 * @param  {Array/Function} procs
 *         A processor function or an array of functions
 * @return {htmly}
 */
htmly.post = function(procs) {
  if(!Array.isArray(procs)) procs = [procs];
  procs.forEach(function(proc) {
    if(typeof(proc) === 'string') {
      proc = require(resolve(proc, {basedir: process.cwd()}));
    }
    process.htmly.postProcessors.push(proc);
  })
  return htmly;
}


/**
 * Add an automatic htmly live source reload on a http(s) server
 *
 * This must be used on the same process than the browserify bundler
 *
 * @param {http(s).Server} server
 *        A node http / https server
 *
 * @param {[FSWatcher]} watcher
 *        Optional: a EventEmitter watcher instance (same as chokidar.FSWatcher)
 *
 * @return {Function}
 *        A change listener (take one argument: the filename that changed)
 *
 *        With two static properties:
 *        - watcher: the chokidar instance
 *        - lrioServer: the lrio instance
 */
htmly.live = function(server, watcher) {
  if(typeof(server) === 'string') {
    server = require(resolve(server));
  }
  watcher  = watcher || (new chokidar.FSWatcher);
  var listener = htmly.attachServer(server);
  watcher.on('change', listener)
  htmly.post(function(ctx, done) { watcher.add(ctx.filename); done(null, ctx) })
  listener.watcher = watcher;
  return listener;
}

/**
 * Attach a htmly live-reload server to a given http-server
 *
 * This must be used on for development purpose only: Attaching a htmly
 * live-reload server add a live-reload client to generated sources.
 *
 * Exemple with chokidar:
 *
 *     var chokidar     = require('chokidar');
 *     var htmly         = require('htmly');
 *     var server       = require('http').createServer();
 *
 *     if(process.env.NODE_ENV === 'development') {
 *       var htmlyListener = htmly.attachServer(server);
 *       chokidar.watch('./src').on('change', htmlyListener);
 *     }
 *
 * @param {http(s).Server} server
 *        A node http / https server
 *
 * @return {Function}
 *        A change listener (take one argument: the filename that changed)
 *
 *        With one static property:
 *        - lrioServer: the lrio instance
 */
htmly.attachServer = function(server) {
  var lrioServer = lrio(server, 'htmly')

  process.htmly.livereload = true;

  function change(filename) {
    var proc = processor(filename);
    if(!proc) return;
    createReadStream(filename)
    .pipe(concatStream(function(source) {
      proc(source.toString(), function(err, result) {
        lrioServer.broadcast({type:'change', uid: result.filename, src: result.src})
      })
    }))
  }

  change.lrioServer = lrioServer;

  return change;
}


/**
 * Global config getter/setter
 *
 * - `minify`: Minify source
 * - `sourcemap`: Enable source-map
 *
 * @param  {[Object]}
 *         object to merge with global config
 *
 * @return {Object} current config
 */
htmly.config = function(config) {
  process.htmly.config = extend(process.htmly.config, config || {});
  return process.htmly.config
}


/**
 * Reset htmly global configuration
 */
htmly.reset = function() {
  process.htmly                = {};
  process.htmly.postProcessors = [];
  process.htmly.preProcessors  = [];
  process.htmly.livereload     = false;
  process.htmly.config         = {
    minify:     false,
    sourcemap:  true
  };
}

// Reset once if needed
if(!process.htmly) {
  htmly.reset();
}
