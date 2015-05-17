var through2 = require('through2')
var transform = require('./transform')
var concatStream = require('concat-stream')
var getHtmlyConfig = require('./utils').getHtmlyConfig

module.exports = function (b, config) {
  if (Object.prototype.toString.call(config) !== '[object Object]') {
    config = getHtmlyConfig() // Default is the cwd package.json
  }

  if (!config.basedir) {
    config.basedir = process.cwd()
  }

  var match = config.match || ['\\.html$', 'i']

  if (!(match instanceof RegExp)) {
    match = RegExp.apply(null, Array.isArray(match) ? match : [match])
  }

  match = RegExp.apply(null, match)

  b.transform({global: true}, function (filename) {
    if (!match.test(filename)) {
      return through2()
    }

    var code = ''
    return through2(
      function (chunk, encoding, next) {
        code += chunk.toString()
        next()
      },
      function (done) {
        var self = this

        // TODO: Detection is dirty..
        if (/^module\.exports\s?=/.test(code)) {
          self.push(code)
          done()
        } else {
          var readable = through2()
          readable.pipe(transform(filename, config))
            .pipe(concatStream(function (result) {
              self.push(result)
              done()
            }))
          readable.push(code)
          readable.end()
        }
      }
    )
  })
}
