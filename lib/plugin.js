module.exports = function (b, config) {
  var htmly = require('./htmly')
  var remedy = require('./remedy')

  // Read configuration:
  htmly.pre(config.pre || [])
  htmly.post(config.post || [])

  if (config.live) {
    htmly.live(config.live) // Attach a server instance
  }

  if (typeof (config.minify) !== 'undefined') {
    htmly.config({minify: config.minify})
  }

  if (config.remedy) {
    b.plugin(remedy, config.remedy)
  }
}
