/* global describe it beforeEach */

var expect = require('expect.js')
var htmly = (process.env.COVERAGE ? require('../lib-cov/htmly.js') : require('../lib/htmly.js'))
var processor = htmly.processor
var read = require('fs').readFileSync
var fixp = require('./support').fixp

describe('htmly processor', function () {
  beforeEach(function () {
    htmly.reset()
    htmly.config({
      minify: true,
      sourcemap: false
    })
  })

  it('should return a function if source is valid', function () {
    var filename = fixp('basic/source.html')
    var proc = processor(filename)
    expect(proc).to.be.a('function')
  })

  it('should return undefined if source does not exists', function () {
    var filename = fixp('basic/doesnotexists.html')
    var proc = processor(filename)
    expect(proc).to.be(undefined)
  })

  it('should return undefined if source is not html', function () {
    var filename = fixp('basic/app.js')
    var proc = processor(filename)
    expect(proc).to.be(undefined)
  })

  it('should use `match` option to filter acceptable source (override regex for .html)', function () {
    expect(processor(fixp('filter-simple/me.myhtml'))).to.be.a('function')
    expect(processor(fixp('filter-simple/notme.html'))).to.be(undefined)
  })

  it('should use `match` option to filter acceptable source (override regex for .html) with regex flags', function () {
    expect(processor(fixp('filter-flags/me.myhtml'))).to.be.a('function')
    expect(processor(fixp('filter-flags/notme.html'))).to.be(undefined)
  })

  it('should process a html source', function (done) {
    var filename = fixp('basic/source.html')
    var source = read(filename).toString()
    var proc = processor(filename)
    proc(source, function (err, result) {
      if (err) return done(err)
      expect(result).to.be.a('object')
      expect(result.src.trim()).to.eql('<div>foobar</div>')
      done()
    })
  })

  it('should support empty html source', function (done) {
    var filename = fixp('empty/source.html')
    var source = read(filename).toString()
    var proc = processor(filename)
    proc(source, function (err, result) {
      if (err) return done(err)
      expect(result.src).to.eql('')
      done()
    })
  })

  describe('with source processor', function () {
    it('should work with a processor defined in package.json', function (done) {
      var filename = fixp('processor/source.html')
      var source = read(filename).toString()
      var proc = processor(filename)
      proc(source, function (err, result) {
        if (err) return done(err)
        expect(result.src).to.contain('<div>foobar</div>')
        expect(result.src).to.contain('<!-- processor -->')
        done()
      })
    })
  })
})
