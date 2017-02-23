# [Barbiche](https://manubb.github.io/barbiche) - Template engine for DOM &amp; JS

[Barbiche](https://manubb.github.io/barbiche) is a logic-full template engine for browser environment. It has been designed to give you complete control over the data you want to merge into an HTML fragment. Current version is considered as a release candidate. Once minified and gzipped, Barbiche size is less than 11KB.

## Sample

We ask Barbiche to merge some data into an HTML template:
```html
<template id="test">
	<div bb-alias="items[1].name: 'name'" bb-class="customClass">
		<div>{{name}}</div>
		<ul bb-attr="my_replace(attrValue): 'attr-name'">
			<template bb-repeat="items: 'item'">
				<li bb-if="item.show" bb-class="[item.species || 'unknown', (_item_ == 0): 'first']">
					{{item.name}} (index: {{_item_}})
				</li>
			</template>
		</ul>
		<span>{{item.join(', ').toUpperCase()}}</span>
		{{{some_html}}}
	</div>
</template>
```
```js
var barbiche = Barbiche();
var frag = barbiche('test').merge({
	customClass: "my-class",
	"items": [
		{species: "hen", name: "Elsa", show: true},
		{species: "cat", name: "Jacynthe", show: false},
		{species: null, name: "Zaza", show: true}
	],
	item: ["hen", "cat", "dog", "spider"],
	some_html: "<div><p>This is...</p><p>...some HTML.</p></div>",
	my_replace: function(str) {return str.replace(/o/g, "O");},
	attrValue: "lunchroom"
});
```
The returned document fragment can then be inserted anywhere you want. It will contain:

```html
<div class="my-class">
	<div>Jacynthe</div>
	<ul attr-name="lunchrOOm">
		<li class="hen first">Elsa (index: 0)</li>
		<li class="unknown">Zaza (index: 2)</li>
	</ul>
	<span>HEN, CAT, DOG, SPIDER</span>
	<div><p>This is...</p><p>...some HTML.</p></div>
</div>
```

## Browser support

Barbiche requires support of `<template>` element, `Array.from` method and some DOM convenience methods (`ChildNode` and `element.classList` API). Properly polyfilled, Barbiche can be used with:

* Chrome >= 15 (no test with previous releases)
* Firefox >= 20
* Internet Explorer >=9
* Opera >=11.6
* Safari >=5.1

Polyfills, once minified and gzipped, weight an additionnal 5KB.
