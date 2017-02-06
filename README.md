# Barbiche - Template engine for DOM &amp; JS

Barbiche is a logic-full template engine for browser environment. It is currently alpha and should be used only for testing as syntactic changes are very likely to happen.

Source code is clean, readable and short (around 500 lines parser included).

See Barbiche live examples [here](http://htmlpreview.github.io/?https://github.com/manubb/barbiche/blob/master/examples/starter.html).

Quick start
-----------

We start with a simple template and a call to Barbiche:
```html
<template id="test">
  <div bb-class="true: class">
    <ul>
      <template bb-repeat="items:'item'">
        <li bb-if="item.show" bb-class="true: item.species || 'unknown'">
          <template bb-text="item.name"></template>
        </li>
      </template>
    </ul>
    <span><template bb-text="item.join(', ').toUpperCase()"></template></span>
  </div>
</template>
```
```js
  Barbiche.Template('test').merge({
    "class": "list",
    "items": [
      {species: "hen", name: "Elsa", show: true},
      {species: "cat", name: "Jacynthe", show: false},
      {species: null, name: "Zaza", show: true}
    ],
    item: ["hen", "cat", "dog", "spider"]
  });
```

We get:
```html
<div class="list">
	<ul>
		<li class="hen">Elsa</li>
		<li class="unknown">Zaza</li>
	</ul>
	<span>HEN, CAT, DOG, SPIDER</span>
</div>
```
Browser support
---------------

Barbiche requires support of `<template>` tag, Array.from static method and some DOM convenience methods (childNode.before,
childNode.replaceWith and childNode.remove currently). Early but not so simple tests show that properly polyfilled, Barbiche can be used with:

* Chrome >= 15 (no test with previous releases)
* Firefox >= 20
* Internet Explorer >=9
* Opera >=11.6
* Safari >=5.1

Attributes
----------

Barbiche templates are decorated with special attributes which are resolved in this order:

1. `bb-if` for evaluating a boolean value
2. `bb-alias` for binding a value to an identifier
3. `bb-text` for inserting a text node
4. `bb-html` for inserting an html fragment
5. `bb-repeat` for looping
6. `bb-import` for importing a subtemplate
7. `bb-attr` for setting attributes on current node
8. `bb-class` for setting classes on current node

Subtemplates
-------------
Barbiche support subtemplating:
```html
<template id="simple-sub">
	<div>
		<template bb-import="'sub'"></template>
	</div>
</template>
<template id="sub">
	<span>I am a sub-template!</span>
</template>
```
```js
Barbiche.Template('simple-sub').merge();
```
will produce:
```html
<div>
	<span>I am a sub-template!</span>
</div>
```
Subtemplate import is dynamic:
```html
<template id="dynamic-sub-template">
	<div>
		<template bb-repeat="items:'item'">
			<template bb-import="item"></template>
		</template>
	</div>
</template>
<template id="sub1">
	<span>I am sub-template1!</span>
</template>
<template id="sub2">
	<span>I am sub-template2!</span>
</template>
```
```js
Barbiche.Template('dynamic-sub-template').merge({
	items: ['sub2', 'sub1']
})
```
produces:
```html
<div>
	<span>I am sub-template2!</span>
	<span>I am sub-template1!</span>
</div>
```
Recursion is also supported:
```html
<template id="recursive">
	<template bb-if="children.length" bb-import="'recursive-sub'"></template>
</template>
<template id="recursive-sub">
	<ul>
		<template bb-repeat="children:'child'">
			<li>
				<template bb-text="child.name"></template>
				<template bb-if="child.children" bb-alias="child.children:'children'" 
				bb-import="'recursive-sub'"></template>
			</li>
		</template>
	</ul>
</template>
```
```js
Barbiche.Template('recursive').merge({
	children: [
		{
			name: "Solomon",
			children: [
				{
					name : "Lexie",
					children: [
						{
							name: "Shavon",
							children: [
								{
									name : "Shirleen"
								}, {
									name : "Kathleen"
								}
							]
						},
						{
							name: "Travis"
						},
						{
							name: "Adele"
						},
						{
							name: "Barney"
						}
					]
				}, {
					name : "Allie"
				}
			]
		}, {
			name: "Juliann",
			children: [
				{
					name : "Guy"
				}, {
					name : "Yaeko"
				}
			]
		}
	]
})
```
will give you:
```html
<ul>
	<li>Solomon
		<ul>
			<li>Lexie
				<ul>
					<li>Shavon
						<ul>
							<li>Shirleen</li>
							<li>Kathleen</li>
						</ul>
					</li>
					<li>Travis</li>
					<li>Adele</li>
					<li>Barney</li>
				</ul>
			</li>
			<li>Allie</li>
		</ul>
	</li>
	<li>Juliann
		<ul>
			<li>Guy</li>
			<li>Yaeko</li>
		</ul>
	</li>
</ul>
```
