# htmly
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
[![travis][travis-image]][travis-url]
[![npm][npm-image]][npm-url]
[![downloads][downloads-image]][downloads-url]

[travis-image]: https://img.shields.io/travis/nodys/htmly.svg?style=flat&branch=master
[travis-url]: https://travis-ci.org/nodys/htmly
[npm-image]: https://img.shields.io/npm/v/htmly.svg?style=flat
[npm-url]: https://npmjs.org/package/htmly
[downloads-image]: https://img.shields.io/npm/dm/htmly.svg?style=flat
[downloads-url]: https://npmjs.org/package/htmly

> A browserify transform for html (with vitamins): Use html sources **like any other module** but **without forgo** the benefits of **pre-processing** and **live source reload**.

```javascript
var myHtml = require('foo/my.html')
myHtml(elsewhere)                   // To inject html somewhere
myHtml.update('<div></div>')        // Update source for all injected instances
myHtml.onChange(function(html) { }) // Watch for change (hey, you like live source reload ?)
console.log('Source: %s', myHtml)   // Use as a string
```

See [exemple with cssy, htmly and lrio](https://github.com/nodys/cssy/tree/master/exemples)

## Features

- **Require html as any other commonjs module**: `require('foo/my.html')`.
- **Pre/post processing**: htmly is framework-agnostic
- **A nice API to read, insert, update or remove**: Use the exported css wherever you want and as you like.
- **Live source reload**: Provide a simple http(s) server hook reload seamlessly html source in development environnement.
- **Regex filter**: Configurable, you can apply htmly's transform selectively
- **Plugin**: Use [htmly as a plugin](#htmly-plugin) at application level to configure htmly finely
- **Remedy**: Enable [htmly remedy](#remedy) to handle package that does not export html as commonjs module

## Installation

```bash
npm install --save htmly
```

**Then add htmly transform to your `package.json`**. Encapsulate your html processing logic inside your package: use [browserify.transform field](https://github.com/substack/browserify-handbook#browserifytransform-field).

```javascript
{
  // ...
  "browserify": { "transform": [ "htmly" ] ] }
}
```

## Options

In you `package.json` you can add some options for the current package (`[ "htmly", {  /* options */ } ]`)

- `parser` **{Array|String}**: One or many path to module that export a [parser](#parser)
- `processor` **{Array|String}**: One or many path to module that export a [processor](#processor)
- `match` **{String|Array}**: Filter which file htmly must handle. See [Regex filter](#regex-filter)
- `checkHtml` **{Boolean}**: Basic check that source is html-like to prevent transform on source that as already been handled by another transform (default: true - That imply that source must begin by a `<` char according to regex: `/^\s*</`)

Path inside `parser` and `processor` options are either relative to package.json or npm package.

**Example:**

```javascript

  // ...
  "browserify": { "transform": [
    [ "htmly",
      {
        "parser"   : [
          "./myHtmlParser",
        ],
        "processor": "./support/myHtmlProcessor",
        "import"   : false,
        "match"    : ["\\.(html|myhtml)$",i]
      }
    ]
  ]}

```

## Global configuration

At *application level* you can change some *global* htmly behaviors

```javascript
var htmly = require('htmly')
htmly.config({
  // Enable html minification (default: false)
  minify:  true
  // Or with html-minifier options:
  minify: {
    removeComments: true
  }
})
```

*htmly minification is done with [html-minifier](html-minifier). Feel free to use another one inside a [global post-processor](#global-prepost-processor).*

## Internal workflow

1. **Parser** htmly try each [parser](#parser) to transform any kind of source to html.
2. **Global pre-processor**: htmly call each [Global pre-processor](#global-prepost-processor)
3. **processor**: htmly call each [local processor](#processor)
4. **Global post-processor**: htmly call each [Global post-processor](#global-prepost-processor)
4. **minify**: If enable htmly minify html source
4. **live reload**: If enable htmly add live source reload client to the generated bundle

## Context object

Each function that transform a css source ([parser](#parser), [global pre/post processor](#global-prepost-processor), [processor](#processor)), receive a **context object**:

  - `src` **{String}**: Html source
  - `filename` **{String}**: Css source filepath (relative to `process.cwd()`)
  - `config` **{Object}**: The htmly's [transform configuration](https://github.com/substack/browserify-handbook#configuring-transforms)

## Functions

Each function used in htmly ([parser](#parser), [global pre/post processor](#global-prepost-processor), [processor](#processor)) use the same API and **may be asynchronous or synchronous**.

```javascript

// Asynchronous parser, processor, pre/post processor:
module.exports = function (ctx, done) {
  // ... change the ctx object ...

  // Return ctx
  done(null, ctx)

  // Or if something wrong happened
  done(new Error('oups...'))
}

// Synchronous parser, processor, pre/post processor:
module.exports = function (ctx) {
  // ... change the ctx object ...
  return ctx;
}
```


## Parser

Parser's job is to read a source from any format, and to return a **html source**.

- Parsers use the [same api](#functions) than any other function used in htmly
- See [options.parser](#options) to add your own parser before htmly's parsers
- Parser are executed in series, until one return a context with a new source.

## Processor

For htmly, a *processor* is an function that transform a [htmly context object](#htmly-context-object) to another [htmly context object](#htmly-context-object). Like for [browserify's transform](https://github.com/substack/node-browserify#btransformopts-tr) htmly processor are applied **only on the sources of the current package**. (See too [Global pre/post processor](#Global pre/post processor))


- Parsers use the [same api](#functions) than any other function used in htmly
- See [options.processor](#options) to add one or many processor

### Processor example


```javascript
module.exports = function(ctx, done) {
  // Do something complex with ctx.src ...
  done(null, ctx)
}
```

## Global pre/post processor

Global pre/post processor must be used only at *application level* (where you bundle your application) for things like global `href` rebasing, optimizations for production, etc. Pre/post processor share the same api than [htmly processor](#processor).

```javascript
var htmly = require('htmly')

// Add one or many pre-processors
htmly.pre(function(ctx, done) {
  // ... Applied on every source handled by htmly
})

// Add one or many post-processors
htmly.post(function(ctx, done) {
  // ... Applied on every source handled by htmly
})

```

## Live source reload

**htmly provide a tiny live source reload mechanism based on websocket for development purpose only.** Classic live source reload mechanism can not handle injected html source without reloading all the application.

**Just attach htmly to the http(s) server that serve the application, htmly will do the rest:** (browserify bundler must in the same process):

```javascript
var http   = require('http')
var htmly  = require('htmly')
var server = http.createServer(/* your application */).listen(8080);

htmly.live(server);
```

### Use your own file watcher

To trigger a change on a css source, just call the change listener returned by `cssy.attachServer()` :

```javascript
var htmlyChangeListener = htmly.attachServer(server);
htmlyChangeListener('path/to/source.html');
```

Here is an example with [chockidar](https://github.com/paulmillr/chokidar) :

```javascript
require('chokidar')
  .watch('.', {ignored: /[\/\\]\./})
  .on('change', htmly.attachServer(server))
```


## Regex filter

Default filter is all html, xhtml (?) and svg files : `/\.(html|xhtml|svg)$/i`. You can set the [match option](#options) to filter which file htmly must handle.

`match` option is either a String or an Array used to instantiate a new [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions):

- With a string `"\\.myHtml$"` become `/\.myHtml$/`
- With an array, to add regular expression flags `["\\.myHtml$","i"]` become `/\.myHtml$/i`


```javascript
{
  // ... package.json ...
  "browserify": {
    "transform": [
      // Match all *.mycss files in src/templates
      [ "htmly", {  match: ["src\\/templates\\/.*\\.html$","i"] } ]
    ]
  }
}
```

## Htmly plugin

Htmly can be used as a browserify plugin to set global behaviors:

#### Using browserify api

```javascript
var browserify = require('browserify');
var htmly      = require('htmly');
var b          = browserify('./app.html')
b.plugin(htmly, {
  // Global configuration:
  minify:    true,

  // See live source reload:
  live: myHttpServerInstance,

  // See pre/post processor (function or path to a processor module):
  pre:  [
    './myPreprocessor',
    function anotherPreprocessor(ctx) { return ctx }
  ],
  post: 'post-processor',

  // See remedy:
  //   - Use current package htmly config:
  remedy: true,
  //   - Use set remedy config:
  remedy: {
    processor: './processor' // (function or path to a processor module)
    match:     /html$/i,
    import:    false
  }
})

```

#### Using browserify command

Browserify use [subarg](https://www.npmjs.org/package/subarg) syntaxe. See too [browserify plugin](https://github.com/substack/node-browserify#plugins)

```sh
browserify ./app.html -p [                                \
  htmly                                                   \
    --minify                                              \
    --live './server.js'                                  \
    --pre  './myPreprocessor'                             \
    --pre  'another-preprocessor'  # repeat for an array  \
    --post 'post-processor'                               \
    --remedy                       # enable remedy ...    \
    --remedy [                     # ... or use subarg    \
      --processor './processor'                           \
      --match 'html$' --match 'i'                         \
    ]                                                     \
]
```

## Remedy

**Htmly's remedy is a solution to use libraries that does not export their html sources as commonjs modules**

Browserify transforms are scoped to the current package, not its dependency: and that's a good thing !

> *[From module-deps readme:](https://github.com/substack/module-deps#transforms)* (...) the transformations you specify will not be run for any files in node_modules/. This is because modules you include should be self-contained and not need to worry about guarding themselves against transformations that may happen upstream.

**However**, if you want to use such npm package, htmly provide a solution **at application level** (where you bundle your application): the **remedy** global transform.

#### Enable remedy:

If remedy options is `true` htmly will use the htmly configuration from the `package.json` closest to the current working directory :

```javascript
// Add remedy to a browserify instance (bundler)
bundler.plugin(htmly, { remedy: true })
```

But you can set specific options has described in the [htmly plugin section](#htmly-plugin)

```javascript
// Add remedy to a browserify instance (bundler)
bundler.plugin(htmly, { remedy: { processor: 'myprocessor' } })
```

#### Remedy options:

Remedy options are the same of [the htmly's transform options](#options).


---

# HtmlyBrowser API

<!-- START HtmlyBrowser -->

## HtmlyBrowser()
> HtmlyBrowser is the object exported by a module handled by htmly:

```javascript
var myHtml = require('./my.html')
// myHtml is a HtmlyBrowser
```

A HtmlyBrowser instance can be used as:

- **An string** when used in a context that imply a string: thanks to
  `HtmlyBrowser.toString()` that return the html source.
- **A function**, alias of HtmlyBrowser.insert(to), to inject
  the html source in the document: `myHtml(parent)`.
- **An object** with the methods described below.

**return** {`Object`}
See [HtmlyBrowser.insert()](#htmlybrowserinsertto)


## HtmlyBrowser.insert(to)
> Insert html source in the DOM

The content of all the injected html source is binded to html source
change: When `.update()` is called by you or by the htmly's live source
reload server.

**Parameters:**

  - **to** {`HTMLElement`|`Document`|`ShadowRoot`}
    Where to inject the html source using innerHTML.

**return** {`Object`}
An object with one method:
- `remove` **{Function}**: Remove injected source
- `remove` **{Function}**: Remove injected source


## HtmlyBrowser.update(src)
> Update current html source

Each inject style element are updated too

**Parameters:**

  - **src** {`String`}



## HtmlyBrowser.onChange(listener)
> Listen for html source changes

**Parameters:**

  - **listener** {`Function`}
    Change listener. Receive new html source
    Change listener. Receive new html source


## HtmlyBrowser.offChange(listener)
> Detach change listener

**Parameters:**

  - **listener** {`Function`}



## HtmlyBrowser.toString()
> Override default toString()

**return** {`String`}
The current html source

<!-- END HtmlyBrowser -->

---

License: [The MIT license](./LICENSE)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
