const fs = require('fs');
const path = require('path');
const {ncp} = require('ncp');
const async = require('async');
const merge = require('merge');
const findpath = require('nw').findpath;

var NodeWebkitBrowser = function(baseBrowserDecorator, args) {
  baseBrowserDecorator(this);

  var customOptions = args.options || {};
  var searchPaths = (args.paths || ['node_modules']).map(function(searchPath) {
    return path.join(process.cwd(), searchPath);
  });
  searchPaths.unshift(process.env.NODE_PATH);

  this._start = function(url) {
    const self = this;
    const SOURCE_PATH = path.join(__dirname, 'runner.nw');
    const STATIC_PATH = path.join(self._tempDir, 'runner.nw');
    const INDEX_HTML = path.join(STATIC_PATH, 'index.html');
    const PACKAGE_JSON = path.join(STATIC_PATH, 'package.json');

    async.auto({
      directory: function(callback) {
        ncp(SOURCE_PATH, STATIC_PATH, callback);
      },
      'index.html:read': ['directory', function(results, callback) {
        fs.readFile(INDEX_HTML, callback);
      }],
      'index.html:write': ['index.html:read', function(results, callback) {
        const content = results['index.html:read'].toString().replace('%URL%', url);
        fs.writeFile(INDEX_HTML, content, callback);
      }],
      'package.json:read': ['directory', function(results, callback) {
        fs.readFile(PACKAGE_JSON, callback);
      }],
      'package.json:write': ['package.json:read', function(results, callback) {
        const options = JSON.parse(results['package.json:read'].toString());
        const mergedOptions = merge(true, options, customOptions);
        fs.writeFile(PACKAGE_JSON, JSON.stringify(mergedOptions), callback);
      }],
      'exec': ['index.html:write', 'package.json:write', function() {
        process.env.NODE_PATH = searchPaths.join(path.delimiter);
        self._execCommand(self._getCommand(), [STATIC_PATH]);
      }]
    });
  };
};

NodeWebkitBrowser.prototype = {
  name: 'node-webkit',

  DEFAULT_CMD: {
    linux: findpath(),
    darwin: findpath(),
    win32: findpath()
  },

  ENV_CMD: 'NODEWEBKIT_BIN'
};

NodeWebkitBrowser.$inject = ['baseBrowserDecorator', 'args'];

// PUBLISH DI MODULE
module.exports = {
  'launcher:NodeWebkit': ['type', NodeWebkitBrowser]
};
