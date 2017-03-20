// Barbiche
// version: 2.0.5
// author: Manuel Baclet <manuel@eda.sarl>
// license: MIT

'use strict';

/* Constants */

var attrs = ['if', 'alias', 'text', 'html', 'repeat', 'import', 'attr', 'class'];
var BB_IF = 0, BB_ALIAS = 1, BB_TEXT = 2, BB_HTML = 3,
    BB_REPEAT = 4, BB_IMPORT = 5, BB_ATTR = 6, BB_CLASS = 7;

var globalAttr = 'global';
var elseAttr = 'else';

var TEMPLATE = 'TEMPLATE';

var ELEMENT_NODE = Node.ELEMENT_NODE, TEXT_NODE = Node.TEXT_NODE,
    COMMENT_NODE = Node.COMMENT_NODE, DOCUMENT_FRAGMENT_NODE = Node.DOCUMENT_FRAGMENT_NODE;

var ArrayFrom = Array.prototype.slice;

/* Shared context */

var context = {
	stack: [],
	resolve: function(identifier) {
		var m = this.stack.length;
		var value;
		while (value === undefined && --m >= 0) {
			value = this.stack[m][identifier];
		}
		return value;
	},
	init: function(arr) {
		this.stack = arr || [];
	},
	push: function(obj) {
		this.stack.push(obj);
	},
	pop: function() {
		this.stack.pop();
	}
};

/* BBObj class */

function BBObj(a, b) {
	this.value = a;
	this.name = b;
}

BBObj.prototype.toString = function() {
	if (this.value && this.name != null) return this.name.toString();
	else return '';
};

/* Shared Parser*/

var Parser = require('../parser.js');
Parser.parser.yy.context = context;
Parser.parser.yy.BBObj = BBObj;

/* Curly braces parsing error */

function ParseError(res) {
	this.message = 'Unexpected characters "' + res[0] + '":\n' +
		res.input.replace(/\t|\n/g, '.') + '\n' + (new Array(res.index + 1).join('-')) + '^';
	this.name = 'ParseError';
}

/* Barbiche instance builder */

function Barbiche(opt) {
	opt = opt || {};
	var doc = opt.document || document;
	var prefix = opt.prefix || 'bb-';
	var destructive = (opt.destructive !== undefined) ? !!opt.destructive : true;

	var prefixedAttrs = attrs.map(function(str) {
		return prefix + str;
	});
	var prefixedAttrsObj = {};
	prefixedAttrs.forEach(function(attr, index) {
		prefixedAttrsObj[attr] = attrs[index];
	});

	var prefixedGlobalAttr = prefix + globalAttr;
	var prefixedGlobalAttrSelector = '[' + prefixedGlobalAttr + ']';
	var prefixedElseAttr = prefix + elseAttr;

	function createTemplate() {
		return doc.createElement(TEMPLATE);
	}

	var store = {};

	/* Compilation helpers */

	var compile_works = {};
	compile_works[ELEMENT_NODE] = function(node, template) {
		if (node.hasAttribute(prefixedAttrs[BB_REPEAT]) && node.nodeName != TEMPLATE) {
			if (node.hasAttribute(prefixedAttrs[BB_TEXT]) || node.hasAttribute(prefixedAttrs[BB_HTML]))
				node.removeAttribute(prefixedAttrs[BB_REPEAT]);
			else {
				var wrapper = createTemplate();
				wrapper.setAttribute(prefixedAttrs[BB_REPEAT], node.getAttribute(prefixedAttrs[BB_REPEAT]));
				node.removeAttribute(prefixedAttrs[BB_REPEAT]);
				[prefixedAttrs[BB_IF], prefixedAttrs[BB_ALIAS], prefixedElseAttr].forEach(function(attr) {
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
		function setAttr(name, value) {
			attrFound = true;
			var parsed = Parser.parse(value);
			bbAttrs[prefixedAttrsObj[attr]] = template._addClosure(parsed);
			node.removeAttribute(attr);
		}
		var attrFound = false;
		if (node.attributes.length > attrs.length) {
			prefixedAttrs.forEach(function(attr) {
				if (node.hasAttribute(attr)) setAttr(attr, node.getAttribute(attr));
			});
		} else {
			for (var i = node.attributes.length - 1; i >= 0; i--) {
				var attr = node.attributes[i].name;
				if (attr in prefixedAttrsObj) setAttr(attr, node.attributes[i].value);
			}
		}
		if (node.nodeName == TEMPLATE && node.hasAttribute(prefixedElseAttr)) attrFound = true;
		if (attrFound) node.setAttribute(prefixedGlobalAttr, JSON.stringify(bbAttrs));
		if (node.nodeName == TEMPLATE) {
			compile(node.content, template);
			if (!attrFound) node.replaceWith(node.content);
		} else {
			ArrayFrom.call(node.childNodes).forEach(function(child) {
				compile(child, template);
			});
		}
	};

	compile_works[TEXT_NODE] = (function() {
		var delimiters = opt.delimiters || ['{', '}'];

		function regExpEscape(str) {
			return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
		}

		var textHTMLTable = {
			'\\': '\\\\'
		};
		textHTMLTable[delimiters[0]] = delimiters[0];
		textHTMLTable[delimiters[1]] = delimiters[1];

		var UnescapeDelimitersRegExp = new RegExp('\\\\(' +
			['\\\\', regExpEscape(delimiters[0]), regExpEscape(delimiters[1])].join('|') +
		')', 'g');
		function unescapePlainText(str) {
			return str.replace(UnescapeDelimitersRegExp, function() {return arguments[1];});
		}
		function unescapeTextHTML(str) {
			return str.replace(UnescapeDelimitersRegExp, function() {return textHTMLTable[arguments[1]];});
		}

		var regExpTemplate = [
			'aaa((?:a|f|c|d|e|b(?:a|f|c|d|e|b(?:a|f|c|d|e)))*)bbb',
			'aa((?:a|f|c|d|e|b(?:a|f|c|d|e))*)bb',
			'((?:b|f|c|d|e|a(?:b|f|c|d|e))(?:b|f|c|d|e|a(?:b|f|c|d|e))*(?:a(?!a)|b|f|c|d|e||a(?:b|f|c|d|e))' +
			'|(?:a(?!a)))',
			'(.+)'
		];
		var table = {
			a: regExpEscape(delimiters[0]),
			b: regExpEscape(delimiters[1]),
			c: regExpEscape('\\' + delimiters[0]),
			d: regExpEscape('\\' + delimiters[1]),
			e: '[^' + regExpEscape(delimiters[0]) + regExpEscape(delimiters[1]) + ']',
			f: regExpEscape('\\\\')
		};

		var textNodeRegExp = new RegExp(regExpTemplate.map(function(str) {
			return '(?:' +
				str.replace(/a|b|c|d|e|f/g, function() {return table[arguments[0]];}) + ')';
		}).join('|'), 'g');

		var match, newNode;
		return function(node, template) {
			while((match = textNodeRegExp.exec(node.nodeValue))) {
				if (match[3]) {
					newNode = doc.createTextNode(unescapePlainText(match[3]));
					node.before(newNode);
				} else if (match[2]) {
					newNode = createTemplate();
					newNode.setAttribute(prefixedAttrs[BB_TEXT], unescapeTextHTML(match[2]));
					node.before(newNode);
					compile(newNode, template);
				} else if (match[1]) {
					newNode = createTemplate();
					newNode.setAttribute(prefixedAttrs[BB_HTML], unescapeTextHTML(match[1]));
					node.before(newNode);
					compile(newNode, template);
				} else {
					textNodeRegExp.lastIndex = 0;
					throw new ParseError(match);
				}
			}
			node.remove();
		};
	})();

	compile_works[COMMENT_NODE] = function(node, template) {};

	compile_works[DOCUMENT_FRAGMENT_NODE] = function(node, template) {
		ArrayFrom.call(node.childNodes).forEach(function(child) {compile(child, template);});
	};

	function compile(node, template) {
		(compile_works[node.nodeType])(node, template);
	}

	/* Merge helpers */

	var works = {};
	works[ELEMENT_NODE] = (function() {
		var child, bbAttrs, value;
		return function(node, template) {
			var nodeContext;
			bbAttrs = JSON.parse(node.getAttribute(prefixedGlobalAttr));
			node.removeAttribute(prefixedGlobalAttr);
			if (bbAttrs.if) {
				value = (template.closures[bbAttrs.if])();
				if (node.nextElementSibling && node.nextElementSibling.hasAttribute(prefixedElseAttr)) {
					if (value) node.nextElementSibling.remove();
					else {
						node.nextElementSibling.removeAttribute(prefixedElseAttr);
						return node.remove();
					}
				} else if (!value) return node.remove();
			}
			if (bbAttrs.alias) {
				value = (template.closures[bbAttrs.alias])();
				if (!Array.isArray(value)) value = [value];
				nodeContext = {};
				context.push(nodeContext);
				value.forEach(function(item) {
					nodeContext[item.name] = item.value;
				});
			}
			if (bbAttrs.text) {
				value = (template.closures[bbAttrs.text])();
				if (value != null) {
					node.replaceWith(value.toString());
				} else node.remove();
			} else if (bbAttrs.html) {
				value = (template.closures[bbAttrs.html])();
				if (value != null) {
					(function(t) {
						t.innerHTML = value.toString();
						node.replaceWith(t.content);
					})(createTemplate());
				} else node.remove();
			} else if (node.nodeName == TEMPLATE) {
				if (bbAttrs.repeat) {
					if (!nodeContext) {
						nodeContext = {};
						context.push(nodeContext);
					}
					value = (template.closures[bbAttrs.repeat])();
					var order = value._order || 'before';
					if (!Array.isArray(value)) value = [value];

					var reduceInit = (function(str) {
						var closure = template.closures[str];
						if (closure) return function() {
							var clone = Template(closure())._clone();
							node[order](works[DOCUMENT_FRAGMENT_NODE](clone.node.content, clone));
						}; else return function() {
							node[order](works[DOCUMENT_FRAGMENT_NODE](
								node.cloneNode(true).content, template
							));
						};
					})(bbAttrs.import);

					//iterate on cartesian product of arrays:
					(value.reduceRight(function(accu, task) {
						var alias = task.name;
						var value = task.value;
						if (value == null) value = [];
						return function() {
							value.forEach(function(item, index) {
								nodeContext[alias] = item;
								nodeContext['_' + alias + '_'] = index;
								accu();
							});
						};
					}, reduceInit))();
				} else if (bbAttrs.import) {
					value = (template.closures[bbAttrs.import])();
					var clone = Template(value)._clone();
					node.before(works[DOCUMENT_FRAGMENT_NODE](clone.node.content, clone));
				} else {
					node.before(works[DOCUMENT_FRAGMENT_NODE](node.content, template));
				}
				node.remove();
			} else {
				if (bbAttrs.attr) {
					value = (template.closures[bbAttrs.attr])();
					if (!Array.isArray(value)) value = [value];
					value.forEach(function(item) {
						var value = item.value;
						var name = item.name && item.name.toString();
						if (name && value != null) node.setAttribute(name, value);
					});
				}
				if (bbAttrs.class) {
					value = (template.closures[bbAttrs.class])();
					if (!Array.isArray(value)) value = [value];
					value.forEach(function(item) {
						if (item != null) {
							var value = item.toString();
							if (value) node.classList.add(value);
						}
					});
				}
				while((child = node.querySelector(prefixedGlobalAttrSelector))) {
					works[ELEMENT_NODE](child, template);
				}
			}
			if (nodeContext) context.pop();
		};
	})();

	works[DOCUMENT_FRAGMENT_NODE] = (function() {
		var child;
		return function(node, template) {
			while((child = node.querySelector(prefixedGlobalAttrSelector))) {
				works[ELEMENT_NODE](child, template);
			}
			return node;
		};
	})();

	/* Template class */

	function Template(node) {
		if (node instanceof BBObj) {
			var name = node.name;
			if (store[name]) return store[name];
			else {
				var t = createTemplate();
				t.innerHTML = node.value;
				if (name) t.id = name;
				node = t;
			}
		} else if (typeof(node) == 'string') {
			if (store[node]) return store[node];
			else node = doc.querySelector('#' + node);
		}
		if (!(this instanceof Template)) {
			return new Template(node);
		}
		if (node) {
			if (node.id) store[node.id] = this;
			this.node = destructive ? node : node.cloneNode(true);
			this.ready = false;
		} else {
			if (node !== undefined) {
				this.node = createTemplate();
			}
			this.ready = true;
		}
		this.closures = {};
		return this;
	}

	/* Statics */

	Template.bbObj = function(a, b) {return new BBObj(a, b);};

	Template.clean = function(name) {
		if (name) delete store[name];
		else {
			for (var key in store) {
				delete store[key];
			}
		}
	};

	/* Public methods */

	Template.prototype.merge = function() {
		var clone = this._clone();
		var args = new Array(arguments.length);
		for(var i = 0; i < args.length; ++i) {
			args[i] = arguments[i];
		}
		context.init(args);
		works[DOCUMENT_FRAGMENT_NODE](clone.node.content, clone);
		context.init();
		return clone.node.content;
	};

	/* Private methods */

	Template.prototype._addClosure = (function() {
		var counter = 0;
		return function(fun) {
			var str = 'fun' + (++counter);
			this.closures[str] = fun;
			return str;
		};
	})();

	Template.prototype._compile = function() {
		compile(this.node.content, this);
		this.ready = true;
		return this;
	};

	Template.prototype._clone = function() {
		if (!this.ready) this._compile();
		var t = new Template();
		t.node = this.node.cloneNode(true);
		t.closures = this.closures;
		return t;
	};

	return Template;
}

module.exports = Barbiche;
