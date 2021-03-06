## Features

Barbiche supports:
* text and HTML insertion
* conditions (`if` and optional `else`)
* aliases
* loops
* flexible subtemplate imports
* attribute setting
* class setting

Barbiche has a complete test suite that can be [run](https://manubb.github.io/barbiche/test.html) in your browser.

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
The returned document fragment can then be inserted anywhere you want. It contains:

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

Barbiche requires support of `<template>` element and basic support of `element.classList` API. Here is the support table:

|          |Native (v2 &amp; v3)|Polyfilled (v2)|Polyfilled (v3)|
|----------|--------------------|---------------|---------------|
|Chrome    |&ge;26              |**&ge;15**     |**&ge;26**     |
|Firefox   |&ge;22              |**&ge;22**     |**&ge;22**     |
|IE/Edge   |No support          |**&ge;9**      |**&ge;11**     |
|Opera     |&ge;15              |**&ge;11.6**   |**&ge;15**     |
|Safari    |&ge;9               |**&ge;6.2**    |**&ge;6.2**    |


Polyfills, once minified and gzipped, weight an additionnal 2KB.
