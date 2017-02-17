// Barbiche
// version: 0.4.0
// author: Manuel Baclet <manuel@eda.sarl>
// license: MIT

'use strict';

var prefix = 'bb-';
var globalAttr = 'bb-global';
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
	if (this.value && this.name != null) return this.name.toString();
	else return '';
}

var Parser = require('../parser.js');
Parser.parser.yy.context = context;
Parser.parser.yy.bbObj = bbObj;

function Barbiche(node) {
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
	globalAttr = str + 'global';
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
	if (attrFound) node.setAttribute(globalAttr, JSON.stringify(bbAttrs));
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
	var bbAttrs;
	if (node.hasAttribute(globalAttr)) {
		bbAttrs = JSON.parse(node.getAttribute(globalAttr));
		node.removeAttribute(globalAttr);
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
		if (value != null) value = value.toString();
		if (value) {
			node.replaceWith(value);
		} else node.remove();
	} else if (bbAttrs.html) {
		var value = (template.closures[bbAttrs.html])();
		if (value != null) value = value.toString();
		if (value) {
			var template = document.createElement('template');
			template.innerHTML = value;
			node.replaceWith(template.content);
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
					var clone = Barbiche(closure())._clone();
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
