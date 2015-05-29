/* global describe it beforeEach */

var expect = require('expect.js')
var htmly = (process.env.COVERAGE ? require('../lib-cov/htmly.js') : require('../lib/htmly.js'))
var processor = htmly.processor
var read = require('fs').readFileSync
var EventEmitter = require('events').EventEmitter
var fixp = require('./support').fixp
var browserify = require('browserify')
var concatStream = require('concat-stream')

describe('htmly', function () {
  beforeEach(function () {
    htmly.reset()
    htmly.config({
      minify: true
    })
  })

  it('can be used as browserify transform', function (done) {
    var b = browserify()
    b.transform(htmly)
    b.add(fixp('basic/source.html'))
    b.bundle()
      .pipe(concatStream(function (result) {
        var src = result.toString()
        expect(src).to.contain('module.exports')
        expect(src).to.contain("require('../../../lib/htmly-browser.js')")
        expect(src).to.contain('<div>foobar</div>')
        done()
      }))
  })

  it('can be used as browserify plugin', function (done) {
    var flags = { }
    var mockServer = {
      on: function () {
        flags.live = true
      }
    }

    var b = browserify()
    b.plugin(htmly, {
      minify: true,
      pre: function (ctx) { flags.pre = true; return ctx },
      post: function (ctx) { flags.post = true; return ctx },
      live: mockServer,
      remedy: true
    })

    b.add(fixp('remedy/source.html'))

    b.bundle()
      .pipe(concatStream(function (result) {
        var src = result.toString()
        expect(flags.pre).to.be(true)
        expect(flags.post).to.be(true)
        expect(flags.live).to.be(true)
        expect(src).to.contain('module.exports')
        expect(src).to.contain('htmlyio')
        expect(src).to.contain("require('../../../lib/htmly-browser.js')")
        expect(src).to.contain('<div>foobar</div>')
        done()
      }))

  })

  describe('.attachServer()', function () {
    it('should attach a lrio server and send transformed source to client', function (done) {
      // Mock http server:
      var mockServer = {on: function () {}}

      // Attach htmly
      var htmlylr = htmly.attachServer(mockServer)

      // Mock lrioServer broadcast method:
      htmlylr.lrioServer.broadcast = function (data) {
        expect(data.type).to.eql('change')
        expect(data.uid).to.eql('test/fixtures/basic/source.html')
        expect(data.src).to.contain('<div>foobar</div>')
        done()
      }

      // Emit change on a file
      htmlylr(fixp('basic/source.html'))

    })
  })

  describe('.pre() / .post()', function () {
    it('should add global pre/post-processor', function (done) {
      var steps = []

      htmly.pre([
        function (ctx, done) {
          steps.push('pre1')
          done(null, ctx)
        },
        function (ctx, done) {
          steps.push('pre2')
          done(null, ctx)
        }
      ])

      htmly.post([
        function (ctx, done) {
          steps.push('post1')
          done(null, ctx)
        },
        function (ctx, done) {
          steps.push('post2')
          done(null, ctx)
        }
      ])

      var filename = fixp('basic/source.html')
      var source = read(filename).toString()
      var proc = processor(filename)
      proc(source, function (err, result) {
        if (err) return done(err)
        expect(steps).to.eql(['pre1', 'pre2', 'post1', 'post2'])
        done()
      })
    })

    it('should accept string (path resolved from cwd())', function (done) {
      htmly.pre(fixp('processor/preProcessor.js'))
      htmly.post(fixp('processor/postProcessor.js'))
      htmly.config({minify: false})
      var filename = fixp('processor/source.html')
      var source = read(filename).toString()
      var proc = processor(filename)
      proc(source, function (err, result) {
        if (err) return done(err)
        var src = result.src
        expect(src).to.contain('preProcessor')
        expect(src).to.contain('postProcessor')
        expect(src).to.contain('processor')
        done()
      })
    })
  })

  describe('.live()', function () {
    it('should attach a lrio server and watch for processed source change', function (done) {
      var filename = fixp('basic/source.html')
      var source = read(filename).toString()
      var proc = processor(filename)

      // Mock http server:
      var mockServer = new EventEmitter()
      var mockChokidar = new EventEmitter()
      mockChokidar.add = function (_file) {
        mockChokidar.file = _file
      }

      // Attach htmly
      var htmlylr = htmly.live(mockServer, mockChokidar)

      // Transform a source
      proc(source, function (_, result) {
        // Now, mockChockidar must watch for file
        expect(mockChokidar.file).to.eql('test/fixtures/basic/source.html')

        // Emit change on file:
        mockChokidar.emit('change', mockChokidar.file)

      })

      // Mock lrioServer broadcast method:
      htmlylr.lrioServer.broadcast = function (data) {
        expect(data.type).to.eql('change')
        expect(data.uid).to.eql('test/fixtures/basic/source.html')
        expect(data.src).to.contain('<div>foobar</div>')
        done()
      }

    })

    it('should accept string (path resolved from cwd())', function (done) {
      htmly.live(fixp('live/mockserver.js'))
      var filename = fixp('basic/source.html')
      var source = read(filename).toString()
      var proc = processor(filename)
      proc(source, function (err, result) {
        if (err) return done(err)
        expect(process._htmly_live).to.be(true)
        done()
      })
    })
  })
})
