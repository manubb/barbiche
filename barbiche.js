(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Barbiche = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.17 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,6],$V1=[1,7],$V2=[1,8],$V3=[1,9],$V4=[1,10],$V5=[1,11],$V6=[1,15],$V7=[1,29],$V8=[1,30],$V9=[1,19],$Va=[1,20],$Vb=[1,21],$Vc=[1,22],$Vd=[1,23],$Ve=[1,24],$Vf=[1,25],$Vg=[1,26],$Vh=[1,27],$Vi=[1,28],$Vj=[5,10,11,12,14,15,16,17,18,19,20,21,22,23,24,27],$Vk=[1,38],$Vl=[5,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,26,27,36],$Vm=[10,14],$Vn=[1,57],$Vo=[5,10,11,12,14,15,16,17,18,19,20,21,22,23,27],$Vp=[10,27];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Main":3,"Expression":4,"EOF":5,"Array":6,"SimpleExpression":7,"Order":8,"ArrayItemList":9,",":10,"--":11,"++":12,"[":13,"]":14,":":15,"||":16,"&&":17,"==":18,"!=":19,"<=":20,">=":21,"<":22,">":23,"+":24,"!":25,"(":26,")":27,"NUMBER":28,"STRING":29,"TRUE":30,"FALSE":31,"CallExpression":32,"MemberExpression":33,"Arguments":34,"ArgumentList":35,".":36,"PropertyName":37,"IdentifierName":38,"VAR":39,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",10:",",11:"--",12:"++",13:"[",14:"]",15:":",16:"||",17:"&&",18:"==",19:"!=",20:"<=",21:">=",22:"<",23:">",24:"+",25:"!",26:"(",27:")",28:"NUMBER",29:"STRING",30:"TRUE",31:"FALSE",36:".",39:"VAR"},
productions_: [0,[3,2],[3,2],[4,1],[4,2],[9,1],[9,3],[8,1],[8,1],[6,3],[6,4],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,2],[7,3],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[34,2],[34,3],[35,1],[35,3],[32,2],[32,2],[32,4],[32,3],[33,1],[33,4],[33,3],[37,1],[38,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1: case 2:
return $$[$0-1];
break;
case 3:
return $$[$0];
break;
case 4:
this.$ = (function(a, b) {
            var ret = [a()];
            ret.order = b;
            return ret;
        }).bind(null, $$[$0-1], $$[$0]);
break;
case 5: case 31:
this.$ = singleton.bind(null, $$[$0]);
break;
case 6: case 32:
this.$ = push.bind(null, $$[$0-2], $$[$0]);
break;
case 7:
this.$ = 'after';
break;
case 8:
this.$ = 'before';
break;
case 9: case 22: case 30:
this.$ = $$[$0-1];
break;
case 10:
this.$ = (function(a, b) {
            var ret = a();
            ret.order = b;
            return ret;
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 11:
this.$ = (function(a, b) {
            return new yy.bbObj(a(), b());
         }).bind(null, $$[$0-2], $$[$0]);
break;
case 12:
this.$ = (function(a, b) {
            return a() || b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 13:
this.$ = (function(a, b) {
            return a() && b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 14:
this.$ = (function(a, b) {
            return a() == b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 15:
this.$ = (function(a, b) {
            return a() != b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 16:
this.$ = (function(a, b) {
            return a() <= b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 17:
this.$ = (function(a, b) {
            return a() >= b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 18:
this.$ = (function(a, b) {
            return a() < b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 19:
this.$ = (function(a, b) {
            return a() > b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 20:
this.$ = (function(a, b) {
            return a() + b();
        }).bind(null, $$[$0-2], $$[$0]);
break;
case 21:
this.$ = (function(a) {
            return !(a());
        }).bind(null, $$[$0]);
break;
case 23:
this.$ = Number.bind(null, yytext);
break;
case 24:
this.$ = function() {return quoteUnescape(String(yytext));}
break;
case 25:
this.$ = function() {return true;}
break;
case 26:
this.$ = function() {return false;}
break;
case 27: case 28: case 37:
this.$ = $$[$0];
break;
case 29:
this.$ = function() {
            return [];
        }
break;
case 33: case 34:
this.$ = call.bind(null, $$[$0-1], $$[$0]);
break;
case 35: case 38:
this.$ = getProperty.bind(null, $$[$0-3], $$[$0-1]);
break;
case 36: case 39:
this.$ = getProperty.bind(null, $$[$0-2], $$[$0]);
break;
case 40:
this.$ = String.bind(null, yytext);
break;
case 41:
this.$ = yy.context.resolve.bind(yy.context, yytext);
break;
}
},
table: [{3:1,4:2,6:3,7:4,13:[1,5],25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{1:[3]},{5:[1,16]},{5:[1,17]},{5:[2,3],8:18,11:$V7,12:$V8,15:$V9,16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi},{7:32,9:31,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:33,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:34,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},o($Vj,[2,23]),o($Vj,[2,24]),o($Vj,[2,25]),o($Vj,[2,26]),o($Vj,[2,27],{34:35,13:[1,36],26:$Vk,36:[1,37]}),o($Vj,[2,28],{34:39,13:[1,40],26:$Vk,36:[1,41]}),o($Vl,[2,37]),o($Vl,[2,41]),{1:[2,1]},{1:[2,2]},{5:[2,4]},{7:42,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:43,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:44,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:45,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:46,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:47,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:48,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:49,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:50,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{7:51,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{5:[2,7]},{5:[2,8]},{10:[1,53],14:[1,52]},o($Vm,[2,5],{15:$V9,16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi}),o($Vj,[2,21]),{15:$V9,16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi,27:[1,54]},o($Vl,[2,34]),{7:55,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{37:56,39:$Vn},{7:60,25:$V0,26:$V1,27:[1,58],28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,35:59,38:14,39:$V6},o($Vl,[2,33]),{7:61,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},{37:62,39:$Vn},o([5,10,11,12,14,15,27],[2,11],{16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi}),o([5,10,11,12,14,15,16,27],[2,12],{17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi}),o([5,10,11,12,14,15,16,17,27],[2,13],{18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi}),o($Vo,[2,14],{24:$Vi}),o($Vo,[2,15],{24:$Vi}),o($Vo,[2,16],{24:$Vi}),o($Vo,[2,17],{24:$Vi}),o($Vo,[2,18],{24:$Vi}),o($Vo,[2,19],{24:$Vi}),o($Vj,[2,20]),{5:[2,9],8:63,11:$V7,12:$V8},{7:64,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},o($Vj,[2,22]),{14:[1,65],15:$V9,16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi},o($Vl,[2,36]),o($Vl,[2,40]),o($Vl,[2,29]),{10:[1,67],27:[1,66]},o($Vp,[2,31],{15:$V9,16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi}),{14:[1,68],15:$V9,16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi},o($Vl,[2,39]),{5:[2,10]},o($Vm,[2,6],{15:$V9,16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi}),o($Vl,[2,35]),o($Vl,[2,30]),{7:69,25:$V0,26:$V1,28:$V2,29:$V3,30:$V4,31:$V5,32:12,33:13,38:14,39:$V6},o($Vl,[2,38]),o($Vp,[2,32],{15:$V9,16:$Va,17:$Vb,18:$Vc,19:$Vd,20:$Ve,21:$Vf,22:$Vg,23:$Vh,24:$Vi})],
defaultActions: {16:[2,1],17:[2,2],18:[2,4],29:[2,7],30:[2,8],63:[2,10]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = Error;

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

function quoteUnescape(str) {
    return str.replace(/(\\('|"|\n|\t|\r))/g, function() {return arguments[2];});
}

function singleton(a) {
    return [a()];
}

function push(a, b) {
    var ret = a();
    ret.push(b());
    return ret;
}

function getProperty(a, b) {
    var val = a();
    var ret = val && val[b()];
    if (typeof(ret) == 'function') {
        return ret.bind(val);
    } else return ret;
}

function call(a, b) {
    return (a()).apply(null, b());
}
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* skip whitespace */
break;
case 1:return 28
break;
case 2:return 16
break;
case 3:return 17
break;
case 4:return 18
break;
case 5:return 19
break;
case 6:return 20
break;
case 7:return 21
break;
case 8:return 22
break;
case 9:return 23
break;
case 10:return 12;
break;
case 11:return 11;
break;
case 12:return 24
break;
case 13:return 25
break;
case 14:return 26
break;
case 15:return 27
break;
case 16:return 30
break;
case 17:return 31
break;
case 18:return 10
break;
case 19:return 36
break;
case 20:return 13
break;
case 21:return 14
break;
case 22:return 15
break;
case 23:yy_.yytext = yy_.yytext.substr(1, yy_.yyleng - 2); return 29
break;
case 24:return 39
break;
case 25:return 5
break;
case 26:return 'INVALID'
break;
}
},
rules: [/^(?:\s+)/,/^(?:[0-9]+(\.[0-9]+)?\b)/,/^(?:\|\|)/,/^(?:&&)/,/^(?:==)/,/^(?:!=)/,/^(?:<=)/,/^(?:>=)/,/^(?:<)/,/^(?:>)/,/^(?:\+\+)/,/^(?:--)/,/^(?:\+)/,/^(?:!)/,/^(?:\()/,/^(?:\))/,/^(?:true\b)/,/^(?:false\b)/,/^(?:,)/,/^(?:\.)/,/^(?:\[)/,/^(?:\])/,/^(?::)/,/^(?:(("(([^\"\\\n\r]+)|(\\((([\'\"\\bfnrtv])|([^\'\"\\bfnrtv0-9xu]))|((?:[1-7][0-7]{0,2}|[0-7]{2,3}))|([x]{HexDigit}{2})|([u]{HexDigit}{4})))|(\\(\r\n|\r|\n)))*")|('(([^\'\\\n\r]+)|(\\((([\'\"\\bfnrtv])|([^\'\"\\bfnrtv0-9xu]))|((?:[1-7][0-7]{0,2}|[0-7]{2,3}))|([x]{HexDigit}{2})|([u]{HexDigit}{4})))|(\\(\r\n|\r|\n)))*')))/,/^(?:(([$_a-zA-Z])(([$_a-zA-Z])|[0-9])*))/,/^(?:$)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))
},{"_process":3,"fs":1,"path":2}],5:[function(require,module,exports){
// Barbiche
// version: 0.1.1
// author: Manuel Baclet <manuel@eda.sarl>
// license: MIT

var prefix = 'bb-';
var destructive = false;
var re;
var store = {};

var context = {
	stack: []
};

context.resolve = function(identifier) {
	var m = this.stack.length - 1;
	var value;
	while (value === undefined && m >= 0) {
		value = this.stack[m][identifier];
		m--;
	}
	return (value === undefined) ? window[identifier] : value;
};

context.init = function(arr) {
	this.stack = arr || [];
};

context.push = function(obj) {
	this.stack.push(obj);
};

context.pop = function() {
	return this.stack.pop();
};

function bbObj(a, b) {
    this.value = a;
    this.name = b;
}

bbObj.prototype.toString = function() {
    if (this.value) return this.name;
    else return '';
}

var Parser = require('../parser.js');
Parser.parser.yy.context = context;
Parser.parser.yy.bbObj = bbObj;

function Barbiche(node) {
	if (typeof(node) == 'string') {
		if (store[node]) return store[node];
		else node = document.querySelector('#' + node);
	}
	if (!(this instanceof Barbiche)) {
		return new Barbiche(node);
	}
	if (node) {
		if (node.id) store[node.id] = this;
		this.closures = {};
		this.node = (destructive) ? node : node.cloneNode(true);
		this.ready = false;
	}
	return this;
}

Barbiche.bbObj = bbObj;

Barbiche.setPrefix = function(str) {
	prefix = str;
};

Barbiche.setDestructive = function(bool) {
	destructive = bool;
};

Barbiche.setDelimiters = function(arr) {
	var str = '{{([^{}]*)}}|{{{([^{}]*)}}}|([^{}]+)';
	var escaped = arr.map(function(char) {
		return char.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	});
	re = new RegExp(str.replace(/{|}/g, function(match) {if (match == '{') return escaped[0]; else return escaped[1];}), 'g');
};

Barbiche.setDelimiters(['{', '}']);

Barbiche.clean = function(name) {
	if (name) delete store[name];
	else {
		for (var key in store) {
			delete store[key];
		}
	}
};

function addPrefix(str) {
	return prefix + str;
}

var compile_works = {};
compile_works[Node.ELEMENT_NODE] = function(node, template) {
	if (node.hasAttribute(prefix + 'repeat') && node.nodeName != 'TEMPLATE') {
		if (node.hasAttribute(prefix + 'text') || node.hasAttribute(prefix + 'html')) node.removeAttribute(prefix + 'repeat');
		else {
			var wrapper = document.createElement('template');
			wrapper.setAttribute(prefix + 'repeat', node.getAttribute(prefix + 'repeat'));
			node.removeAttribute(prefix + 'repeat');
			['if', 'alias'].map(addPrefix).forEach(function(attr) {
				if (node.hasAttribute(attr)) {
					wrapper.setAttribute(attr, node.getAttribute(attr));
					node.removeAttribute(attr);
				}
			});
			node.before(wrapper);
			wrapper.content.appendChild(node);
			node = wrapper;
		}
	}
	var bbAttrs = {};
	var attrFound = false;
	['if', 'alias', 'text', 'html', 'repeat', 'import', 'attr', 'class'].forEach(function(attr) {
		if (node.hasAttribute(prefix + attr)) {
			attrFound = true;
			var parsed = Parser.parse(node.getAttribute(prefix + attr));
			bbAttrs[attr] = template._addClosure(parsed);
			node.removeAttribute(prefix + attr);
		}
	});
	if (attrFound) node.setAttribute(prefix + 'global', JSON.stringify(bbAttrs));
	if (node.nodeName == 'TEMPLATE') {
		compile(node.content, template);
	} else {
		Array.from(node.childNodes).forEach(function(child) {
			compile(child, template);
		});
	}
}

compile_works[Node.TEXT_NODE] = function(node, template) {
	var value = node.nodeValue;
	var tokenFound = false;
	var res;
	var stack = [];
	while(res = re.exec(value)) {
		if (res[3]) {
			stack.push({
				content: res[3],
				type: 'plain'
			});
		} else if (res[1]) {
			stack.push({
				content: res[1],
				type: 'text'
			});
			tokenFound = true;
		} else {
			stack.push({
				content: res[2],
				type: 'html'
			});
			tokenFound = true;
		}
	}
	if (tokenFound) {
		function resolve(accu) {
			var exp = accu.join('+');
			if (exp) {
				var t = document.createElement('template');
				t.setAttribute(prefix + 'text', exp);
				node.before(t); compile(t, template);
			}
		}
		resolve(stack.reduce(function(accu, item) {
			if (item.type == 'plain') {
				accu.push('"' + item.content.replace(/('|"|\n|\t|\r)/g, function() {return '\\' + arguments[1];}) + '"');
				return accu;
			} else if (item.type == 'text') {
				accu.push("(" + item.content + ")");
				return accu;
			} else {
				resolve(accu);
				var t = document.createElement('template');
				t.setAttribute(prefix + 'html', item.content);
				node.before(t); compile(t, template);
				return [];
			}
		}, []));
		node.remove();
	}
};

compile_works[Node.COMMENT_NODE] = function(node, template) {};

compile_works[Node.DOCUMENT_FRAGMENT_NODE] = function(node, template) {
	Array.from(node.childNodes).forEach(function(child) {compile(child, template);});
};

Barbiche.prototype._addClosure = (function() {
	var counter = 0;
	return function(fun) {
		counter++;
		var str = 'fun' + counter;
		this.closures[str] = fun;
		return str;
	};
})();

Barbiche.prototype._compile = function() {
	compile(this.node.content, this);
	this.ready = true;
	return this;
};

function compile(node, template) {
	(compile_works[node.nodeType])(node, template);
}

Barbiche.prototype._clone = function() {
	if (!this.ready) this._compile();
	var t = new Barbiche();
	t.node = this.node.cloneNode(true);
	t.closures = this.closures;
	return t;
}

Barbiche.prototype.merge = function() {
	var clone = this._clone();
	context.init(Array.from(arguments));
	merge(clone.node.content, clone);
	context.init();
	return clone.node.content;
}

var works = {};
works[Node.ELEMENT_NODE] = function(node, template) {
	var nodeContext = {};
	var nodeContextPushed = false;
	var bbAttrs;
	if (node.hasAttribute(prefix + 'global')) {
		bbAttrs = JSON.parse(node.getAttribute(prefix + 'global'));
		node.removeAttribute(prefix + 'global');
	}
	bbAttrs = bbAttrs || {};
	if (bbAttrs.if) {
		var value = (template.closures[bbAttrs.if])();
		if (!value) return node.remove();
	}
	if (bbAttrs.alias) {
		var parsed = (template.closures[bbAttrs.alias])();
		if (!Array.isArray(parsed)) parsed = [parsed];
		parsed.forEach(function(item) {
			nodeContext[item.name] = item.value;
		});
		context.push(nodeContext);
		nodeContextPushed = true;
	}
	if (bbAttrs.text) {
		var value = (template.closures[bbAttrs.text])();
		if (value) {
			node.replaceWith(value);
		} else node.remove();
	} else if (bbAttrs.html) {
		var value = (template.closures[bbAttrs.html])();
		if (value) {
			var template = document.createElement('template');
			template.innerHTML = value;
			node.replaceWith(template.content);
		} else node.remove();
	} else if (node.nodeName == "TEMPLATE") {
		if (bbAttrs.repeat) {
			var closure;
			if (bbAttrs.import) {
				closure = template.closures[bbAttrs.import];
			}
			if (!nodeContextPushed) {
				context.push(nodeContext);
				nodeContextPushed = true;
			}
			var parsed = (template.closures[bbAttrs.repeat])();
			if (!Array.isArray(parsed)) parsed = [parsed];
			var order = parsed.order || 'before';
			//iterate on cartesian product of arrays:
			(parsed.reduceRight(function(accu, task) {
				var alias = task.name;
				var value = task.value;
				return function() {
					value.forEach(function(item, index) {
						nodeContext[alias] = value[index];
						nodeContext['_' + alias + '_'] = index;
						accu();
					})
				};
			}, function() {
				var target = closure && Barbiche(closure()).node;
				var copy = (target || node).cloneNode(true);
				node[order](merge(copy.content, template));
			}))();
		} else if (bbAttrs.import) {
			var importId = (template.closures[bbAttrs.import])();
			var clone = Barbiche(importId)._clone();
			node.before(merge(clone.node.content, clone));
		} else {
			node.before(merge(node.content, template));
		}
		node.remove();
	} else {
		if (bbAttrs.attr) {
			var parsed = (template.closures[bbAttrs.attr])();
			if (!Array.isArray(parsed)) parsed = [parsed];
			parsed.forEach(function(item) {
				var value = item.value;
				var name = item.name;
				if (name) {
					if (typeof value == "string") node.setAttribute(name, value);
				}
			});
		}
		if (bbAttrs.class) {
			var parsed = (template.closures[bbAttrs.class])();
			if (!Array.isArray(parsed)) parsed = [parsed];
			parsed.forEach(function(item) {
				var value = item.toString();
				if (value) node.classList.add(value);
			});
		}
		Array.from(node.children).forEach(function(child) {merge(child, template);});
	}
	if (nodeContextPushed) context.pop();
};

works[Node.TEXT_NODE] = function(node, template) {};

works[Node.COMMENT_NODE] = function(node, template) {};

works[Node.DOCUMENT_FRAGMENT_NODE] = function(node, template) {
	Array.from(node.children || node.childNodes).forEach(function(child) {merge(child, template);});
};

function merge(node, template) {
	(works[node.nodeType])(node, template);
	return node;
}

module.exports = Barbiche;

},{"../parser.js":4}]},{},[5])(5)
});