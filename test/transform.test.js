/* jshint undef: false, unused: false */

var expect           = require('expect.js')
var htmly            = (process.env.COVERAGE ? require('../lib-cov/htmly.js') : require('../lib/htmly.js'))
var processor        = htmly.processor
var transform        = htmly.transform
var read             = require('fs').readFileSync
var createReadStream = require('fs').createReadStream
var concatStream     = require('concat-stream')
var fixp             = require('./support').fixp

describe('htmly transform', function(){

  beforeEach(function() {
    htmly.reset();
    htmly.config({
      minify:    true,
      sourcemap: false,
    })
  })

  it('should not transform if source is not html', function(done) {
    var filename = fixp('basic/app.js');
    createReadStream(filename)
    .pipe(transform(filename))
    .pipe(concatStream(function(result) {
      expect(result.toString()).to.eql(read(filename).toString())
      done();
    }))
  })

  it('should process a html source', function(done) {
    var filename = fixp('basic/source.html');
    createReadStream(filename)
    .pipe(transform(filename))
    .pipe(concatStream(function(result) {
      var src = result.toString();
      expect(src).to.contain('module.exports')
      expect(src).to.contain('require(\'../../../lib/htmly-browser.js\')')
      expect(src).to.contain('<div>foobar</div>')
      done();
    }))
  })

  it('should add htmlyio if livereload is enabled', function(done) {
    var filename = fixp('basic/source.html');

    // Attach to a mock http server to enable livereload
    htmly.attachServer({on:function() {}});

    createReadStream(filename)
    .pipe(transform(filename))
    .pipe(concatStream(function(result) {
      var src = result.toString();
      expect(src).to.contain('module.exports')
      expect(src).to.contain('require(\'../../../lib/htmlyio.js\')')
      expect(src).to.contain('change:test/fixtures/basic/source.html')
      done();
    }))
  })
})
