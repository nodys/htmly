/* jshint undef: false, unused: false */

var expect           = require('expect.js')
var htmly            = (process.env.COVERAGE ? require('../lib-cov/htmly.js') : require('../lib/htmly.js'))
var processor        = htmly.processor
var transform        = htmly.transform
var remedy           = htmly.remedy
var read             = require('fs').readFileSync
var createReadStream = require('fs').createReadStream
var concatStream     = require('concat-stream')
var fixp             = require('./support').fixp
var browserify       = require('browserify')


describe('htmly with remedy plugin', function(){

  beforeEach(function() {
    htmly.reset();
    htmly.config({
      minify:    true,
      sourcemap: false,
    })
  })

  it('should allow the use of source from package without htmly', function(done) {
    var b = browserify();
    b.plugin(remedy)
    b.add(fixp('remedy/source.html'));
    b.bundle().pipe(concatStream(function(result) {
      var src = result.toString();
      expect(src).to.contain('module.exports')
      expect(src).to.contain('<div>foobar</div>')
      done();
    }))
  })

  it('should use parser, pre-processor, processor, post-processor', function(done) {
    var flags = {
      parser    : false,
      pre       : false,
      processor : false,
      post      : false,
    };

    htmly.pre(function(ctx) {
      flags.pre = true;
      return ctx;
    })

    htmly.post(function(ctx) {
      flags.post = true;
      return ctx;
    })

    var b = browserify();

    b.plugin(remedy, {
      parser: function(ctx) {
        flags.parser = true;
        return ctx;
      },
      processor: function(ctx) {
        flags.processor = true;
        return ctx;
      }
    })

    b.add(fixp('remedy/source.html'));
    b.bundle().pipe(concatStream(function(result) {
      var src = result.toString();
      expect(flags.pre).to.be(true)
      expect(flags.post).to.be(true)
      expect(flags.parser).to.be(true)
      expect(flags.processor).to.be(true)
      expect(src).to.contain('module.exports')
      expect(src).to.contain('<div>foobar</div>')
      done();
    }))
  })
})
