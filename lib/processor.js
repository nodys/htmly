var dirname = require('path').dirname
var pathRelative = require('path').relative
var relativePackage = require('relative-package')
var resolve = require('resolve')
var exists = require('fs').existsSync
var async = require('async')
var pathResolve = require('path').resolve
var compose = require('./utils').compose
var toAsync = require('./utils').toAsync
var getHtmlyConfig = require('./utils').getHtmlyConfig
var extend = require('extend')
var minify = require('html-minifier').minify

module.exports = getProcessor

/**
 * Provide a source processor for the given filename
 *
 * @param  {String} filename
 *         File path of the source to process
 *
 * @param  {Object} [config]
 *         Use given config instead of relative package.json config
 *
 * @return {Function}
 *         An asynchronous processing function with two arguments: A html source
 *         to process and a standard node callback (err, result)
 *         This function return a htmly context object with:
 *         - `filename` : the source filename
 *         - `src` : the processed source
 */
function getProcessor (filename, config) {
  if (!exists(filename)) {
    return
  }

  // Filename always relative to cwd
  filename = pathRelative(process.cwd(), pathResolve(filename))

  // Package.json relative to filename
  var pkgPath = relativePackage(pathResolve(filename))

  // htmly config
  config = config || getHtmlyConfig(pkgPath)

  config.basedir = config.basedir || dirname(pkgPath)

  // Check if htmly should handle this source
  config.match = config.match || ['\\.(html|xhtml|svg)$', 'i']

  if (!(config.match instanceof RegExp)) {
    config.match = RegExp.apply(null, Array.isArray(config.match) ? config.match : [config.match])
  }

  if (!(config.match).test(filename)) {
    return
  }

  // List local parsers according to config:
  var parsers = resolveFunctionList(config.parsers || config.parser, config.basedir)

  // List local processors according to config:
  var localProcessors = resolveFunctionList(config.processors || config.processor, config.basedir)

  function handle (src, done) {
    // Transform source
    async.waterfall([
      // 1. Parse source
      function (next) {
        var ctx = {
          config: config,
          filename: filename,
          src: src
        }

        var newCtx
        async.detectSeries(
          parsers,
          function (parser, callback) {
            parser(extend({}, ctx), function (err, result) {
              if (err) {
                return done(err)
              }
              if (!result || (result.src === src)) {
                return callback(false)
              } else {
                newCtx = result
                return callback(true)
              }
            })
          },
          function (found) {
            if (found) {
              next(null, newCtx)
            } else {
              next(null, ctx)
            }
          }
        )

      },

      // 2. Perform all global pre-processor on context
      compose(process.htmly.preProcessors),

      // 3. Perform local processor on context
      compose(localProcessors),

      // 4. Perform all global post-processor on context
      compose(process.htmly.postProcessors),

      // 5. Finalize: generate source and minify if enabled
      function (ctx, next) {
        // Minify ?
        if (process.htmly.config.minify) {
          var opts = process.htmly.config.minify
          opts = (typeof (opts) === 'object') ? opts : {}
          ctx.src = minify(ctx.src, (typeof (opts) === 'object') ? opts : {})
        }

        next(null, ctx)
      }
    ], done)
  }
  return handle
}

/**
 * Resolve and require a list of module path that exports async function
 *
 * Each path is resolved against `basedir`. `utils.toAsync()` unsure that
 * each function will work as async function.
 *
 * @param {Array|String} functionList
 *        Module path or array of module path
 *
 * @param {String} basedir
 *        Base path for path resolution (dirname of the package.json)
 *
 * @return {Array}
 *         An array of htmly asynchronous functions
 */
function resolveFunctionList (functionList, basedir) {
  if (!functionList) return []
  return (Array.isArray(functionList) ? functionList : [functionList])
    .map(function (proc) {
      if (typeof (proc) === 'string') {
        proc = require(resolve.sync(proc, { basedir: basedir }))
      }
      return toAsync(proc)
    })
}
