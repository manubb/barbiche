// Barbiche
// version: 0.5.0
// author: Manuel Baclet <manuel@eda.sarl>
// license: MIT

'use strict';

var attrs = ['if', 'alias', 'text', 'html', 'repeat', 'import', 'attr', 'class'];

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
	if (this.value && this.name != null) return this.name.toString();
	else return '';
}

var Parser = require('../parser.js');
Parser.parser.yy.context = context;
Parser.parser.yy.bbObj = bbObj;

function Barbiche(opt) {

	var prefix = 'bb-';
	var globalAttr = 'bb-global';
	var globalAttrSel = '[bb-global]';

	function addPrefix(str) {
		return prefix + str;
	}
	var prefixedAttrs = attrs.map(addPrefix);
	var prefixedAttrsObj = {};
	prefixedAttrs.forEach(function(attr, index) {
		prefixedAttrsObj[attr] = attrs[index];
	});
	var destructive = false;
	var store = {};

	function Template(node) {
		if (node instanceof bbObj) {
			var name = node.name;
			if (store[name]) return store[name];
			else {
				var t = document.createElement('template');
				t.innerHTML = node.value;
				if (name) t.id = name;
				node = t;
			}
		}
		if (typeof(node) == 'string') {
			if (store[node]) return store[node];
			else node = document.querySelector('#' + node);
		}
		if (!(this instanceof Template)) {
			return new Template(node);
		}
		if (node) {
			if (node.id) store[node.id] = this;
			this.closures = {};
			this.node = (destructive) ? node : node.cloneNode(true);
			this.ready = false;
		}
		return this;
	}

	Template.bbObj = bbObj;

	Template.setPrefix = function(str) {
		prefix = str;
		globalAttr = str + 'global';
		globalAttrSel = '[' + globalAttr + ']';
		prefixedAttrs = attrs.map(addPrefix);
		prefixedAttrsObj = {};
		prefixedAttrs.forEach(function(attr, index) {
			prefixedAttrsObj[attr] = attrs[index];
		});
	};

	Template.setDestructive = function(bool) {
		destructive = bool;
	};

	var delimiters = ['{', '}'];
	var reStringUnescape = '(\\\\(\\\\|' + escape(delimiters[0]) + '|' + escape(delimiters[1]) + '))';
	var reUnescape = new RegExp(reStringUnescape, 'g');

	function escape(str) {
		return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	}

	function unescape(str) {
		return str.replace(reUnescape, function() {return arguments[2];});
	}

	function setDelimiters() {
		var strs = [
			'aaa((?:a+f+c+d+e+b(?:a+f+c+d+e+b(?:a+f+c+d+e)))*)bbb',
			'aa((?:a+f+c+d+e+b(?:a+f+c+d+e))*)bb',
			'((?:b+f+c+d+e+a(?:b+f+c+d+e))(?:b+f+c+d+e+a(?:b+f+c+d+e))*(?:a(?!a)+b+f+c+d+e++a(?:b+f+c+d+e))+(?:a(?!a)))'
		];

		function prepare(str) {
			return str.replace(/\+/g, '|').replace(/a/g, escape(delimiters[0])).replace(/b/g, escape(delimiters[1])).replace(/c/g, escape("\\" + delimiters[0])).replace(/d/g, escape("\\" + delimiters[1])).replace(/e/g, '[^' + escape(delimiters[0]) + escape(delimiters[1]) + ']').replace(/f/g, escape("\\\\"));
		}

		return new RegExp(strs.map(function(str) {
			return '(?:' + prepare(str) + ')';
		}).join('|'), 'g');
	};

	Template.clean = function(name) {
		if (name) delete store[name];
		else {
			for (var key in store) {
				delete store[key];
			}
		}
	};

	var textNodeRegExp = setDelimiters();

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
		if (node.attributes.length > attrs.length) {
			prefixedAttrs.forEach(function(attr) {
				if (node.hasAttribute(attr)) {
					attrFound = true;
					var parsed = Parser.parse(node.getAttribute(attr));
					bbAttrs[prefixedAttrsObj[attr]] = template._addClosure(parsed);
					node.removeAttribute(attr);
				}
			});
		} else {
			for (var i = node.attributes.length - 1; i >= 0; i--) {
				var attr = node.attributes[i].name;
				if (attr in prefixedAttrsObj) {
					attrFound = true;
					var parsed = Parser.parse(node.attributes[i].value);
					bbAttrs[prefixedAttrsObj[attr]] = template._addClosure(parsed);
					node.removeAttribute(attr);
				}
			}
		}
		if (attrFound) node.setAttribute(globalAttr, JSON.stringify(bbAttrs));
		if (node.nodeName == 'TEMPLATE') {
			compile(node.content, template);
			if (!attrFound) node.replaceWith(node.content);
		} else {
			Array.from(node.childNodes).forEach(function(child) {
				compile(child, template);
			});
		}
	}

	compile_works[Node.TEXT_NODE] = function(node, template) {
		var res;
		while(res = textNodeRegExp.exec(node.nodeValue)) {
			if (res[3]) {
				var t = document.createTextNode(unescape(res[3]));
				node.before(t);
			} else if (res[2]) {
				var t = document.createElement('template');
				t.setAttribute(prefix + 'text', unescape(res[2]));
				node.before(t);compile(t, template);
			} else {
				var t = document.createElement('template');
				t.setAttribute(prefix + 'html', unescape(res[1]));
				node.before(t); compile(t, template);
			}
		}
		node.remove();
	};

	compile_works[Node.COMMENT_NODE] = function(node, template) {};

	compile_works[Node.DOCUMENT_FRAGMENT_NODE] = function(node, template) {
		Array.from(node.childNodes).forEach(function(child) {compile(child, template);});
	};

	Template.prototype._addClosure = (function() {
		var counter = 0;
		return function(fun) {
			counter++;
			var str = 'fun' + counter;
			this.closures[str] = fun;
			return str;
		};
	})();

	Template.prototype._compile = function() {
		compile(this.node.content, this);
		this.ready = true;
		return this;
	};

	function compile(node, template) {
		(compile_works[node.nodeType])(node, template);
	}

	Template.prototype._clone = function() {
		if (!this.ready) this._compile();
		var t = new Template();
		t.node = this.node.cloneNode(true);
		t.closures = this.closures;
		return t;
	}

	Template.prototype.merge = function() {
		var clone = this._clone();
		var args = new Array(arguments.length);
		for(var i = 0; i < args.length; ++i) {
			args[i] = arguments[i];
		}
		context.init(args);
		merge(clone.node.content, clone);
		context.init();
		return clone.node.content;
	}

	var works = {};
	works[Node.ELEMENT_NODE] = function(node, template) {
		var nodeContext = {};
		var nodeContextPushed = false;
		var bbAttrs = JSON.parse(node.getAttribute(globalAttr));
		node.removeAttribute(globalAttr);
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
			if (value != null) value = value.toString();
			if (value) {
				node.replaceWith(value);
			} else node.remove();
		} else if (bbAttrs.html) {
			var value = (template.closures[bbAttrs.html])();
			if (value != null) value = value.toString();
			if (value) {
				var aux = document.createElement('template');
				aux.innerHTML = value;
				node.replaceWith(aux.content);
			} else node.remove();
		} else if (node.nodeName == "TEMPLATE") {
			if (bbAttrs.repeat) {
				if (!nodeContextPushed) {
					context.push(nodeContext);
					nodeContextPushed = true;
				}
				var parsed = (template.closures[bbAttrs.repeat])();
				var order = parsed._order || 'before';
				if (!Array.isArray(parsed)) parsed = [parsed];

				var reduceInit = (function(str) {
					var closure = template.closures[bbAttrs.import];
					if (closure) return function() {
						var clone = Template(closure())._clone();
						node[order](merge(clone.node.content, clone));
					}; else return function() {
						node[order](merge(node.cloneNode(true).content, template));
					};
				})(bbAttrs.import);

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
				}, reduceInit))();
			} else if (bbAttrs.import) {
				var importId = (template.closures[bbAttrs.import])();
				var clone = Template(importId)._clone();
				node.before(merge(clone.node.content, clone));
			}
			node.remove();
		} else {
			if (bbAttrs.attr) {
				var parsed = (template.closures[bbAttrs.attr])();
				if (!Array.isArray(parsed)) parsed = [parsed];
				parsed.forEach(function(item) {
					var value = item.value;
					var name = item.name && item.name.toString();
					if (name && value != null) node.setAttribute(name, value);
				});
			}
			if (bbAttrs.class) {
				var parsed = (template.closures[bbAttrs.class])();
				if (!Array.isArray(parsed)) parsed = [parsed];
				parsed.forEach(function(item) {
					if (item != null) {
						var value = item.toString();
						if (value) node.classList.add(value);
					}
				});
			}
			var child;
			while(child = node.querySelector(globalAttrSel)) {merge(child, template);}
		}
		if (nodeContextPushed) context.pop();
	};

	works[Node.DOCUMENT_FRAGMENT_NODE] = function(node, template) {
		var child;
		while(child = node.querySelector(globalAttrSel)) {merge(child, template);}
	};

	function merge(node, template) {
		(works[node.nodeType])(node, template);
		return node;
	}
	return Template;
}
module.exports = Barbiche;
