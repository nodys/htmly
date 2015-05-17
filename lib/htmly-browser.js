module.exports = createHtmlyBrowser

/*
 * Create a htmly browser instance for one html source
 *
 * @param  {String} src
 *         Css source
 *
 * @return {Object}
 *         Cssy browser instance
 */
function createHtmlyBrowser (src) {
  var changeListeners = []

  /**
   * HtmlyBrowser is the object exported by a module handled by htmly:
   *
   * ```javascript
   * var myHtml = require('./my.html')
   * // myHtml is a HtmlyBrowser
   * ```
   *
   * A HtmlyBrowser instance can be used as:
   *
   * - **An string** when used in a context that imply a string: thanks to
   *   `HtmlyBrowser.toString()` that return the html source.
   * - **A function**, alias of HtmlyBrowser.insert(to), to inject
   *   the html source in the document: `myHtml(parent)`.
   * - **An object** with the methods described below.
   *
   * @return {Object}
   *         See [HtmlyBrowser.insert()](#htmlybrowserinsertto)
   */
  function HtmlyBrowser (to) {
    return HtmlyBrowser.insert(to)
  }

  /**
   * Insert html source in the DOM
   *
   * The content of all the injected html source is binded to html source
   * change: When `.update()` is called by you or by the htmly's live source
   * reload server.
   *
   * @param  {HTMLElement|Document|ShadowRoot} to
   *         Where to inject the html source using innerHTML.
   *
   * @return {Object}
   *         An object with one method:
   *         - `remove` **{Function}**: Remove injected source
   */
  HtmlyBrowser.insert = function (to) {
    function update (html) {
      to.innerHTML = html
    }

    function remove () {
      HtmlyBrowser.offChange(update)
      to.innerHTML = ''
    }

    // Initialize:
    update(HtmlyBrowser.toString())
    HtmlyBrowser.onChange(update)

    return {
      remove: remove
    }
  }

  /**
   * Update current html source
   *
   * Each inject style element are updated too
   *
   * @param  {String} src
   */
  HtmlyBrowser.update = function (src) {
    HtmlyBrowser.src = src
    changeListeners.forEach(function (listener) {
      listener(src)
    })
    return HtmlyBrowser
  }

  /**
   * Listen for html source changes
   *
   * @param {Function} listener
   *        Change listener. Receive new html source
   */
  HtmlyBrowser.onChange = function (listener) {
    changeListeners.push(listener)
    return HtmlyBrowser
  }

  /**
   * Detach change listener
   *
   * @param {Function} listener
   */
  HtmlyBrowser.offChange = function (listener) {
    changeListeners = changeListeners.filter(function (l) {
      return l !== listener
    })
    return HtmlyBrowser
  }

  /**
   * Override default toString()
   *
   * @return {String}
   *         The current html source
   */
  HtmlyBrowser.toString = function () {
    return HtmlyBrowser.src
  }

  HtmlyBrowser.src = src

  return HtmlyBrowser
}
