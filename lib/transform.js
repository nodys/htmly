var through2     = require('through2')
var getProcessor = require('./processor')
var pathResolve  = require('path').resolve
var pathRelative = require('path').relative
var dirname      = require('path').dirname
var extend       = require('extend')

/**
 * Browserify transform (see browsreify API)
 */
module.exports = function (filename, config) {

  config = extend({
    checkHtml: true
  }, config || {})

  // Get htmly source processor
  var proc = getProcessor(filename, config);

  // If undefined, then ignore and pass through
  if(!proc) return through2();

  var code      = '';
  return through2(
    function (chunk, encoding, next) {
      code += chunk.toString();
      next()
    },
    function (done) {
      var self     = this;

      // *Basic* check that the source is html-like source ...
      // the first char must be a <
      if(config.checkHtml && !/^\s*</.test(code)) {
        self.push(code);
        done();
        return;
      }

      proc(code, function(err, result) {
        if(err) return done(err);

        var browserPath = pathRelative(dirname(filename), pathResolve(__dirname, './htmly-browser.js'))
        var htmlyioPath = pathRelative(dirname(filename), pathResolve(__dirname, './htmlyio.js'))

        self.push("module.exports = (require('"+browserPath+"'))(" + JSON.stringify(result.src) + ");");

        if(process.htmly.livereload) {
          self.push("\nrequire('"+htmlyioPath+"').on('change:"+result.filename+"', function(src) { module.exports.update(src)})");
        }

        done();
      })

    }
  );

}
