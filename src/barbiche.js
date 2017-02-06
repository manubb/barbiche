// Barbiche
// version: 0.0.1
// author: Manuel Baclet <manuel@eda.sarl>
// license: MIT
var Barbiche = {};

var templates = {};

function Context() {}

Context.prototype.resolve = function(identifier) {
	var m = this.stack.length - 1;
	var val;
	while (val == undefined && m >= 0) {
		val = this.stack[m][identifier];
		m--;
	}
	return val;
};

Context.prototype.init = function() {
	this.stack = [window];
};

Context.prototype.push = function(obj) {
	this.stack.push(obj);
};

Context.prototype.pop = function() {
	return this.stack.pop();
};

var context = new Context();

Barbiche.Parser = require('../parser.js');
Barbiche.Parser.parser.yy.context = context;

function Template(node) {
	if (typeof(node) == 'string') {
		if (templates[node]) return templates[node];
		else node = document.querySelector('#' + node);
	}
	if (!(this instanceof Template)) {
		return new Template(node);
	}
	if (node) {
		if (node.id) templates[node.id] = this;
		this.closures = {};
		this.node = node.cloneNode(true);
		this.ready = false;
	}
	return this;
}

Barbiche.Template = Template;

var compile_works = {};
compile_works[Node.ELEMENT_NODE] = function(node, template) {
	if (node.hasAttribute('bb-repeat') && node.nodeName != 'TEMPLATE') {
		var wrapper = document.createElement('template');
		wrapper.setAttribute('bb-repeat', node.getAttribute('bb-repeat'));
		node.removeAttribute('bb-repeat');
		if (node.hasAttribute('bb-alias')) {
			wrapper.setAttribute('bb-alias', node.getAttribute('bb-alias'));
			node.removeAttribute('bb-alias');
		}
		node.before(wrapper);
		wrapper.content.appendChild(node);
		node = wrapper;
	}
	['bb-if', 'bb-alias', 'bb-text', 'bb-html', 'bb-attr', 'bb-class', 'bb-repeat', 'bb-import'].forEach(function(attr) {
		if (node.hasAttribute(attr)) {
			var parsed = Barbiche.Parser.parse(node.getAttribute(attr));
			node.setAttribute(attr, template.addClosure(parsed));
		}
	});
	if (node.nodeName == 'TEMPLATE') {
		compile(node.content, template);
	} else {
		Array.from(node.children).forEach(function(child) {
			compile(child, template);
		});
	}
}

compile_works[Node.TEXT_NODE] = function(node, template) {};

compile_works[Node.COMMENT_NODE] = function(node, template) {};

compile_works[Node.DOCUMENT_FRAGMENT_NODE] = function(node, template) {
	Array.from(node.children || node.childNodes).forEach(function(child) {compile(child, template);});
};

Template.prototype.addClosure = (function() {
	var counter = 0;
	return function(fun) {
		counter++;
		var str = 'fun' + counter;
		this.closures[str] = fun;
		return str;
	};
})();

Template.prototype.compile = function() {
	compile(this.node.content, this);
	this.ready = true;
	return this;
};

function compile(node, template) {
	(compile_works[node.nodeType])(node, template);
}


Template.prototype.clone = function() {
	if (!this.ready) this.compile();
	var t = new Template();
	t.node = this.node.cloneNode(true);
	t.closures = this.closures;
	return t;
}

Template.prototype.merge = function(data, filters) {
	var clone = this.clone();
	context.init();
	if (filters) context.push(filters);
	context.push(data);
	merge(clone.node.content, clone);
	context.pop();
	if (filters) context.pop();
	return clone.node.content;
}

var works = {};
works[Node.ELEMENT_NODE] = function(node, template) {
	var nodeContext = {_node_: node};
	context.push(nodeContext);
	if (node.hasAttribute('bb-if')) {
		var parsed = (template.closures[node.getAttribute('bb-if')])().pop();
		var val = parsed && parsed.val;
		if (!val) {
			context.pop();
			return node.remove();
		} else node.removeAttribute('bb-if');
	}
	if (node.hasAttribute('bb-alias')) {
		var parsed = (template.closures[node.getAttribute('bb-alias')])();
		parsed.forEach(function(item) {
			nodeContext[item.name] = item.val;
		});
		node.removeAttribute('bb-alias');
	}
	if (node.hasAttribute('bb-text')) {
		var parsed = (template.closures[node.getAttribute('bb-text')])().pop();
		var val = parsed && parsed.val;
		if (val !== undefined) {
			node.replaceWith(val);
		} else node.remove();
	} else if (node.hasAttribute('bb-html')) {
		var parsed = (template.closures[node.getAttribute('bb-html')])().pop();
		var val = parsed && parsed.val;
		if (val !== undefined) {
			var template = document.createElement('template');
			template.innerHTML = val;
			node.replaceWith(template.content);
		} else node.remove();
	} else if (node.nodeName == "TEMPLATE") {
		if (node.hasAttribute('bb-import')) {
			var parsed = (template.closures[node.getAttribute('bb-import')])().pop();
			var clone = Template(parsed.val).clone();
			node.before(merge(clone.node.content, clone));
		} else if (node.hasAttribute('bb-repeat')) {
			var parsed = (template.closures[node.getAttribute('bb-repeat')])();
			//iterate on cartesian product of arrays:
			(parsed.reduceRight(function(accu, task) {
				var alias = task.name;
				var val = task.val;
				return function() {
					val.forEach(function(item, index) {
						nodeContext[alias] = val[index];
						nodeContext['_' + alias + '_'] = index;
						accu();
					})
				};
			}, function() {
				var copy = node.cloneNode(true);
				node.before(merge(copy.content, template));
			}))();
		} else {
			node.before(merge(node.content, template));
		}
		node.remove();
	} else {
		if (node.hasAttribute('bb-attr')) {
			var parsed = (template.closures[node.getAttribute('bb-attr')])();
			parsed.forEach(function(item) {
				var val = item.val;
				var name = item.name;
				if (name) {
					if (val != undefined) node.setAttribute(name, val);
					else node.removeAttribute(name);
				}
			});
			node.removeAttribute('bb-attr');
		}
		if (node.hasAttribute('bb-class')) {
			var parsed = (template.closures[node.getAttribute('bb-class')])();
			parsed.forEach(function(item) {
				var val = item.val;
				var name = item.name;
				if (name) {
					if (val) node.classList.add(name);
					else node.classList.remove(name);
				}
			});
			node.removeAttribute('bb-class');
		}
		Array.from(node.children).forEach(function(child) {merge(child, template);});
	}
	context.pop();
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
