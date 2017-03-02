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
var jquery = fs.readFileSync("../node_modules/jquery/dist/jquery.js", "utf-8");
var polyfill = fs.readFileSync("../polyfills/dom4.js", "utf-8");
var barbiche = fs.readFileSync("../barbiche.min.js", "utf-8");
var examples = require("../docs_src/examples.json");

jsdom.env({
	html: documentationTemplate,
	src: [jquery, polyfill, barbiche],
	done: function (err, window) {
		var $ = window.$;
		var document = window.document;
		var Barbiche = window.Barbiche;
		var target = document.querySelector('#target');
		target.innerHTML = converter.makeHtml(documentationContent);
		var barbiche = Barbiche();
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
					text: $(h).text(),
					h3: h3
				});
			} else {
				h3.push({
					id: h.getAttribute('id'),
					text: $(h).text()
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
	src: [jquery],
	done: function (err, window) {
		var $ = window.$;
		$('#target').append(converter.makeHtml(indexHeader + indexContent));
		$('#target').find('ul, ol').addClass('ui list');
		$('#target').find('h2').each(function() {
			var header = window.document.createElement('h4');
			header.classList.add('ui', 'horizontal', 'header', 'divider');
			this.before(header);
		});

		$('#target').find('pre code').each(function() {
			var $this = $(this);
			var classes = $(this).attr('class');
			var update = '<div class="ui code raised segment hide"><textarea class="' + classes + '">' +
				$(this).text().replace(/\n$/, "") + '</textarea></div>';
			$this.parent().replaceWith(update);
		});
		$('table').addClass('ui celled table');
		fs.writeFileSync("../docs/index.html", serializeDocument(window.document));
  }
});

jsdom.env({
	html: demoTemplate,
	src: [jquery],
	done: function (err, window) {
		var $ = window.$;
		var obj = {};
		var buttons = $('#buttons')
		examples.forEach(function(example) {
			var button = window.document.createElement('button');
			button.setAttribute("name", example.name);
			button.setAttribute("class", "ui button");
			var text = window.document.createTextNode(example.name);
			button.appendChild(text);
			buttons.append(button);
			obj[example.name] = {
				template: example.template,
				js: example.js
			};
			$('#target').text("var examples = " + JSON.stringify(obj));
		});
		fs.writeFileSync("../docs/demo.html", serializeDocument(window.document));
  }
});

fs.writeFileSync("../README.md", ReadMeHeader + indexContent);
