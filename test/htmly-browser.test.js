/* global describe it beforeEach */

var expect = require('expect.js')
var htmly = (process.env.COVERAGE ? require('../lib-cov/htmly.js') : require('../lib/htmly.js'))
var read = require('fs').readFileSync
var concatStream = require('concat-stream')
var jsdom = require('jsdom')
var browserify = require('browserify')
var fixp = require('./support').fixp

describe('htmly browser', function () {
  beforeEach(function () {
    htmly.reset()
    htmly.config({
      minify: true,
      sourcemap: false
    })
  })

  function readJsdomError (errors) {
    var msg = errors.reduce(function (memo, item) {
      memo += item.type + ' ' + item.message + ':\n  ' + item.data.error.message
      return memo
    }, '')
    return new Error(msg)
  }

  function simu (fixturePath, callback) {
    var srcPath = fixp(fixturePath) + '/index.js'
    var html = read(fixp(fixturePath) + '/index.html')

    browserify(srcPath)
      .plugin(htmly, {remedy: true})
      .bundle().pipe(concatStream(function (result) {
      var bundle = result.toString()
      jsdom.env({
        'html': html.toString(),
        'src': [bundle],
        'done': function (errors, window) {
          if (errors && errors.length) {
            return callback(readJsdomError(errors))
          }
          callback(null, window)
        }
      })
    }))
  }

  function auto (fixturePath) {
    var expected = read(fixp(fixturePath) + '/expected.html').toString().trim().replace(/\n/g, '')
    return function (done) {
      simu(fixturePath, function (err, window) {
        if (err) return done(err)
        var result = window.document.documentElement.outerHTML.trim().replace(/\n/g, '')
        expect(result).to.eql(expected)
        done()
      })
    }
  }

  it('.insert() should insert style in the given node',
    auto('browser/insert'))

  it('.remove() should remove inserted source',
    auto('browser/remove'))

  it('.update() should update sources',
    auto('browser/update'))

  it('.toString() should return html source (implicit toString())',
    auto('browser/tostring'))

  it('If enabled, style must listening for htmly livereload web socket', function (done) {
    // Attach to a mock http server to enable livereload
    htmly.attachServer({on: function () {}})

    var fixturePath = 'browser/livereload'
    var srcPath = fixp(fixturePath) + '/index.js'
    var html = read(fixp(fixturePath) + '/index.html')
    var expected = read(fixp(fixturePath) + '/expected.html').toString().trim().replace(/\n/g, '')
    var socket

    browserify(srcPath).bundle().pipe(concatStream(function (result) {
      var bundle = result.toString()
      jsdom.env({
        'html': html,
        'src': [bundle],
        'created': function (errors, window) {
          if (errors && errors.length) {
            return done(readJsdomError(errors))
          }

          // Mock XMLHttpRequest for lrio
          window.XMLHttpRequest = function () {
            var self = this
            self.readyState = 2
            self.getResponseHeader = function () {return 'enabled'}
            self.open = function () {}
            self.send = function () {
              self.onreadystatechange()
            }
          }
          // Mock WebSocket for lrio
          window.WebSocket = function () { socket = this }

        },
        'done': function (errors, window) {
          if (errors && errors.length) {
            return done(readJsdomError(errors))
          }

          // Simulate a change event :
          socket.onmessage({
            data: JSON.stringify({
              type: 'change',
              uid: 'test/fixtures/browser/livereload/source.html',
              src: '<div>changed by live reload server</div>'
            })
          })

          var result = window.document.documentElement.outerHTML.trim().replace(/\n/g, '')
          expect(result).to.eql(expected)
          done()
        }
      })
    }))
  })

})
