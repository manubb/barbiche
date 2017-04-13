// Barbiche
// version: 2.3.2
// author: Manuel Baclet <manuel@eda.sarl>
// license: MIT

'use strict';

/* Constants */

var attrs = ['if', 'alias', 'text', 'html', 'repeat', 'import', 'attr', 'class'];
var BB_IF = 0, BB_ALIAS = 1, BB_TEXT = 2, BB_HTML = 3,
    BB_REPEAT = 4, BB_IMPORT = 5, BB_ATTR = 6, BB_CLASS = 7;

var globalAttr = 'global';
var elseAttr = 'else';
var inertAttr = 'inert';

var TEMPLATE = 'TEMPLATE';

var ELEMENT_NODE = Node.ELEMENT_NODE, TEXT_NODE = Node.TEXT_NODE,
    COMMENT_NODE = Node.COMMENT_NODE, DOCUMENT_FRAGMENT_NODE = Node.DOCUMENT_FRAGMENT_NODE;

var ArrayFrom = Array.prototype.slice;

// <template> polyfill v1.x only patches document.createElement,
// not Document.prototype.createElement (unlike future v2.x)
function createTemplate() {
	return document.createElement(TEMPLATE);
}

/* Shared context */

var context = {
	stack: null,
	resolve: function(identifier) {
		var m = this.stack.length;
		var value;
		while (value === undefined && --m >= 0) {
			value = this.stack[m][identifier];
		}
		return value;
	},
	get: function() {
		return this.stack;
	},
	set: function(arr) {
		this.stack = arr;
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
	var prefixedInertAttr = prefix + inertAttr;

	var store = {};

	/* Compilation helpers */

	var compile_works = {};
	compile_works[ELEMENT_NODE] = function(node, template) {
		if (node.hasAttribute(prefixedAttrs[BB_REPEAT]) &&
			(node.nodeName !== TEMPLATE || node.hasAttribute(prefixedInertAttr))) {

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
				node.parentNode.insertBefore(wrapper, node);
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
		if (node.nodeName === TEMPLATE &&
			(node.hasAttribute(prefixedElseAttr) || node.hasAttribute(prefixedInertAttr))) attrFound = true;

		if (attrFound) node.setAttribute(prefixedGlobalAttr, JSON.stringify(bbAttrs));
		if (node.nodeName === TEMPLATE) {
			compile(node.content, template);
			// Some browsers such as Safari 6.2 does not support replaceChild(docFrag,...)
			if (!attrFound) {
				node.parentNode.insertBefore(node.content, node);
				node.parentNode.removeChild(node);
			}
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
					newNode = node.ownerDocument.createTextNode(unescapePlainText(match[3]));
					node.parentNode.insertBefore(newNode, node);
				} else if (match[2]) {
					newNode = createTemplate();
					newNode.setAttribute(prefixedAttrs[BB_TEXT], unescapeTextHTML(match[2]));
					node.parentNode.insertBefore(newNode, node);
					compile(newNode, template);
				} else if (match[1]) {
					newNode = createTemplate();
					newNode.setAttribute(prefixedAttrs[BB_HTML], unescapeTextHTML(match[1]));
					node.parentNode.insertBefore(newNode, node);
					compile(newNode, template);
				} else {
					textNodeRegExp.lastIndex = 0;
					throw new ParseError(match);
				}
			}
			node.parentNode.removeChild(node);
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
		var draft = createTemplate();
		return function(node, template) {
			var nodeContext;
			bbAttrs = JSON.parse(node.getAttribute(prefixedGlobalAttr));
			node.removeAttribute(prefixedGlobalAttr);
			if (bbAttrs.if) {
				value = (template.closures[bbAttrs.if])();
				if (node.nextElementSibling && node.nextElementSibling.hasAttribute(prefixedElseAttr)) {
					if (value) node.parentNode.removeChild(node.nextElementSibling);
					else {
						node.nextElementSibling.removeAttribute(prefixedElseAttr);
						return node.parentNode.removeChild(node);
					}
				} else if (!value) return node.parentNode.removeChild(node);
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
					node.parentNode.replaceChild(node.ownerDocument.createTextNode(value), node);
				} else node.parentNode.removeChild(node);
			} else if (bbAttrs.html) {
				// Some browsers such as Safari 6.2 does not support replaceChild(docFrag,...)
				value = (template.closures[bbAttrs.html])();
				if (value instanceof Node) node.parentNode.insertBefore(value, node);
				else if (value != null) {
					draft.innerHTML = value;
					node.parentNode.insertBefore(draft.content, node);
				}
				node.parentNode.removeChild(node);
			} else if (node.nodeName === TEMPLATE && !node.hasAttribute(prefixedInertAttr)) {
				if (bbAttrs.repeat) {
					if (!nodeContext) {
						nodeContext = {};
						context.push(nodeContext);
					}
					value = (template.closures[bbAttrs.repeat])();
					var after = (value._order === 'after');
					if (!Array.isArray(value)) value = [value];

					var reduceInit = (function(str) {
						var closure = template.closures[str];
						if (closure) return function() {
							var clone = Template(closure())._clone();
							node.parentNode.insertBefore(
								works[DOCUMENT_FRAGMENT_NODE](clone.node.content, clone),
								after ? node.nextSibling : node
							);
						}; else return function() {
							node.parentNode.insertBefore(
								works[DOCUMENT_FRAGMENT_NODE](node.cloneNode(true).content, template),
								after ? node.nextSibling : node
							);
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
					node.parentNode.insertBefore(
						works[DOCUMENT_FRAGMENT_NODE](clone.node.content, clone),
						node
					);
				} else {
					node.parentNode.insertBefore(
						works[DOCUMENT_FRAGMENT_NODE](node.content, template),
						node
					);
				}
				node.parentNode.removeChild(node);
			} else {
				if (bbAttrs.attr) {
					value = (template.closures[bbAttrs.attr])();
					if (!Array.isArray(value)) value = [value];
					value.forEach(function(item) {
						if (item.value != null && item.name != null) {
							var name = item.name.toString();
							if (name) node.setAttribute(name, item.value);
						}
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
				if (node.nodeName === TEMPLATE) {
					node.removeAttribute(prefixedInertAttr);
					works[DOCUMENT_FRAGMENT_NODE](node.content, template);
				} else {
					while((child = node.querySelector(prefixedGlobalAttrSelector))) {
						works[ELEMENT_NODE](child, template);
					}
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
			if (name != null) name = name.toString();
			if (name && store.hasOwnProperty(name)) return store[name];
			else {
				var t = createTemplate();
				t.innerHTML = node.value;
				if (name) t.id = name;
				node = t;
			}
		} else if (typeof(node) === 'string') {
			if (store.hasOwnProperty(node)) return store[node];
			else node = doc.querySelector('#' + node);
		}
		if (!(this instanceof Template)) {
			return new Template(node);
		}
		// <template> polyfill v1.x does not support (node instanceof HTMLTemplateElement)
		// future version 2.x does mostly
		if (node instanceof HTMLElement && node.nodeName === TEMPLATE) {
			if (node.id) store[node.id] = this;
			if (destructive) {
				this.node = node;
				if (node.parentNode) node.parentNode.removeChild(node);
			} else this.node = node.cloneNode(true);
			this.ready = false;
		} else {
			this.node = createTemplate();
			this.ready = true;
		}
		this.closures = {};
	}

	/* Statics */

	Template.bbObj = function(a, b) {return new BBObj(a, b);};

	Template.clean = function(name) {
		if (name === undefined) {
			for (var key in store) {
				delete store[key];
			}
		} else if (typeof(name) === 'string') delete store[name];
	};

	/* Public methods */

	Template.prototype.merge = function() {
		var clone = this._clone();
		var args = [];
		for(var i = 0; i < arguments.length; ++i) {
			if (arguments[i] != null) args.push(arguments[i]);
		}
		var savedContext = context.get();
		context.set(args);
		works[DOCUMENT_FRAGMENT_NODE](clone.node.content, clone);
		context.set(savedContext);
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
		return Object.create(Template.prototype, {
			node: {value: this.node.cloneNode(true)},
			closures: {value: this.closures},
			ready: {value: true}
		});
	};

	return Template;
}

module.exports = Barbiche;
