#!/usr/bin/env node
var showdown  = require('showdown'),
    converter = new showdown.Converter();
converter.setFlavor('github');
var jsdom = require("jsdom");
var serializeDocument = require("jsdom").serializeDocument;
var fs = require("fs");
var documentationContent = fs.readFileSync("../docs_src/documentation.md", "utf-8");
var documentationTemplate = fs.readFileSync("../docs_src/documentation.html", "utf-8");
var demoTemplate = fs.readFileSync("../docs_src/demo.html", "utf-8");
var indexContent = fs.readFileSync("../docs_src/index.md", "utf-8");
var indexHeader = fs.readFileSync("../docs_src/index_header.md", "utf-8");
var ReadMeHeader = fs.readFileSync("../docs_src/README_header.md", "utf-8");
var indexTemplate = fs.readFileSync("../docs_src/index.html", "utf-8");
var polyfill = fs.readFileSync("../polyfills.min.js", "utf-8");
var barbiche = fs.readFileSync("../barbiche.min.js", "utf-8");
var examples = require("../docs_src/examples.json");

jsdom.env({
	html: documentationTemplate,
	src: [polyfill, barbiche],
	done: function (err, window) {
		var document = window.document;
		var Barbiche = window.Barbiche;
		var target = document.querySelector('#target');
		target.innerHTML = converter.makeHtml(documentationContent);
		var barbiche = Barbiche({destructive: false});
		Array.prototype.slice.call(target.querySelectorAll('ul, ol')).forEach(function(list) {
			list.classList.add('ui', 'list');
		});
		var obj = {
			h2: []
		};
		var h3;
		Array.prototype.slice.call(target.querySelectorAll('h2[id], h3[id]')).forEach(function(h) {
			if (h.nodeName == 'H2') {
				var header = window.document.createElement('h4');
				header.classList.add('ui', 'horizontal', 'header', 'divider');
				h.before(header);
				h3 = [];
				obj.h2.push({
					id: h.getAttribute('id'),
					text: h.textContent,
					h3: h3
				});
			} else {
				h3.push({
					id: h.getAttribute('id'),
					text: h.textContent
				})
			}
		});
		Array.prototype.slice.call(target.querySelectorAll('pre code')).forEach(function(code) {
			var classes = code.getAttribute('class');
			var div = document.createElement('div');
			div.classList.add('ui', 'code', 'raised', 'segment', 'hide');
			div.innerHTML = '<textarea class="' + classes + '">' +
				code.textContent.replace(/\n$/, "") + '</textarea>';
			code.parentNode.replaceWith(div);
		});
		document.querySelector('#toc-menu').appendChild(barbiche('toc-template').merge(obj));
		fs.writeFileSync("../docs/documentation.html", serializeDocument(window.document));
  }
});
jsdom.env({
	html: indexTemplate,
	src: [polyfill],
	done: function (err, window) {
		var document = window.document;
		var target = document.querySelector('#target');
		target.innerHTML = converter.makeHtml(indexHeader + indexContent);
		Array.prototype.slice.call(target.querySelectorAll('ul, ol')).forEach(function(list) {
			list.classList.add('ui', 'list');
		});

		Array.prototype.slice.call(target.querySelectorAll('h2')).forEach(function(h) {
			var header = document.createElement('h4');
			header.classList.add('ui', 'horizontal', 'header', 'divider');
			h.before(header);
		});

		Array.prototype.slice.call(target.querySelectorAll('pre code')).forEach(function(code) {
			var classes = code.getAttribute('class');
			var div = document.createElement('div');
			div.classList.add('ui', 'code', 'raised', 'segment', 'hide');
			div.innerHTML = '<textarea class="' + classes + '">' +
				code.textContent.replace(/\n$/, "") + '</textarea>';
			code.parentNode.replaceWith(div);
		});
		Array.prototype.slice.call(target.querySelectorAll('table')).forEach(function(table) {
			table.classList.add('ui', 'celled', 'table');
		});
		fs.writeFileSync("../docs/index.html", serializeDocument(window.document));
  }
});

jsdom.env({
	html: demoTemplate,
	done: function (err, window) {
		var document = window.document;
		var obj = {};
		var buttons = document.querySelector('#buttons');
		examples.forEach(function(example) {
			var button = document.createElement('button');
			button.setAttribute("name", example.name);
			button.setAttribute("class", "ui button");
			var text = document.createTextNode(example.name);
			button.appendChild(text);
			buttons.appendChild(button);
			obj[example.name] = {
				template: example.template,
				js: example.js
			};
			document.querySelector('#target').textContent = "var examples = " + JSON.stringify(obj);
		});
		fs.writeFileSync("../docs/demo.html", serializeDocument(window.document));
  }
});

fs.writeFileSync("../README.md", ReadMeHeader + indexContent);
