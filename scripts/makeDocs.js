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
		var Barbiche = window.Barbiche;
		$('#target').append(converter.makeHtml(documentationContent));
		var barbiche = Barbiche();
		$('#target').find('ul, ol').addClass('ui list');
		var obj = {
			h2: []
		};
		var h3;
		$('#target').find('h2[id], h3[id]').each(function() {
			if (this.nodeName == 'H2') {
				var header = window.document.createElement('h4');
				header.classList.add('ui', 'horizontal', 'header', 'divider');
				this.before(header);
				h3 = [];
				obj.h2.push({
					id: this.getAttribute('id'),
					text: $(this).text(),
					h3: h3
				});
			} else {
				h3.push({
					id: this.getAttribute('id'),
					text: $(this).text()
				})
			}
		});
		$('#toc-menu').append(barbiche('toc-template').merge(obj));
		$('#target').find('pre code').each(function() {
			var $this = $(this);
			var classes = $(this).attr('class');
			var update = '<div class="ui code raised segment hide"><textarea class="' + classes + '">' +
				$(this).text().replace(/\n$/, "") + '</textarea></div>';
			$this.parent().replaceWith(update);
		});
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
