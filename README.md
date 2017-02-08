# Barbiche - Template engine for DOM &amp; JS

Barbiche is a logic-full template engine for browser environment. It is currently ~~alpha and should be used only for testing as syntactic changes are very likely to happen~~ beta and syntactic changes are less likely to happen.

Source code is clean, readable and short (around 600 lines parser included).

See Barbiche live examples [here](http://htmlpreview.github.io/?https://github.com/manubb/barbiche/blob/master/examples/starter.html).

## Quick start

We start with a simple template and a call to Barbiche:
```html
<template id="test">
	<div bb-class="[true: customClass]">
		<ul>
			<template bb-repeat="[items: 'item']">
				<li bb-if="item.show" bb-class="[true: item.species || 'unknown']">{{item.name}}</li>
			</template>
		</ul>
		<span>{{item.join(', ').toUpperCase()}}</span>
	</div>
</template>
```
```js
  Barbiche('test').merge({
    "customClass": "list",
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

## Browser support

Barbiche requires support of `<template>` tag, `Array.from` static method and some DOM convenience methods (currently `childNode.before`, `childNode.after`, `childNode.replaceWith`, `childNode.remove` and `element.classList` api). Early but not so simple tests show that properly polyfilled, Barbiche can be used with:

* Chrome >= 15 (no test with previous releases)
* Firefox >= 20
* Internet Explorer >=9
* Opera >=11.6
* Safari >=5.1


## API
### Common usage
Barbiche constructor expects the id string of a `<template>` element or a `<template>` element:
```js
Barbiche('my-template');
// or
Barbiche(document.querySelector('#my-template'));
```
If the template has an id attribute, Barbiche internally stores the template for later reuse:
```js
var inst1 = Barbiche('my-template');
var inst2 = Barbiche('my-template');
// inst1 === inst2
```
Setting ids on your templates is strongly recommended.

Merging data into a Barbiche instance is done in this way:
```js
Barbiche('my-template').merge(obj1, obj2, obj3,...);
```
This returns a DocumentFragment that can be inserted in the main document. The arguments of `merge` method are used to init the merge context: when Barbiche is looking for the value of an identifier, it searches first in `obj1`, then in `obj2`,..., then in `window`.

For example, in `Barbiche('my-template').merge(obj1, obj2, obj3)`, you may consider that:
* `obj1` is a plain JSON object that comes from your database
* `obj2` is an object that contains functions and data specific to `my-template`
* `obj3` is an object that contains functions and data common to all your templates

### Settings

This is currently secret.

## Template description

### `<template>` element
Barbiche heavily relies on the great properties of the `<template>` element. An essential point of Barbiche is that you can wrap any html fragment of the template in a `<template>` tag without changing the merge result. One day or the other, you will want to set a Barbiche attribute in-between an element and its parent: just wrap the element in a `<template>` tag and set the attribute on this tag.

### Attributes

Barbiche templates are decorated with special attributes which are evaluated in this order:

1. `bb-if`
2. `bb-alias`
3. `bb-text`
4. `bb-html`
5. `bb-repeat`
6. `bb-import`
7. `bb-attr`
8. `bb-class`

Attributes `bb-if` resolve to boolean values, `bb-text`, `bb-html`, `bb-import` to string values and `bb-alias`, `bb-repeat`, `bb-attr` and `bb-class` to arrays that contain object with properties `name` and `value`.

#### `bb-if`
A `bb-if` attribute resolves to a boolean value. If false, the decorated node (and its subtree) is removed. Supported operators are: `||`, `&&`, `!`, `==`, `!=`, `<`, `>`, `<=`, `>=`.

Some examples of `bb-if` attributes:
```html
<div bb-if="children.length >= 4 || species != 'cat'">...</div>
<span bb-if="my_crazy_filter(obj.items[2], obj.other.another)">...</span>
```
### `bb-alias`
A `bb-alias` attribute resolves to an array of objects that have properties `name` and `value`. For each item of the array, `value` is bound to `name` during the processing of the current subtree.

Some examples of `bb-alias` attributes:
```html
<div bb-alias="[JSON.stringify(obj): 'str1', obj.prop: 'str2']">...</div>
<div bb-alias="[logo.resources.link[0]: 'link']">...</div>
```
In the first line, the value of `JSON.stringify(obj)` is bound to `str1` identifier and the value of `obj.prop` to `str2`.

### `bb-text`
This attribute is reserved to `<template>` element. A `bb-text` attribute resolves to a string `str`. The node that has the attribute (and its subtree) is replaced by a text node which has content `str`. For your convenience, you can use à la mustache expressions `{{string_exp}}`.

### `bb-html`
This attribute is reserved to `<template>` element. A `bb-html` attribute resolves to a string `str`. The node that has the attribute (and its subtree) is replaced by the fragment has `str` as html. For your convenience, you can use à la mustache expressions `{{{string_exp}}}`.

### Subtemplates

Barbiche supports subtemplating:
```html
<template id="simple-subtemplate">
	<div>
		<template bb-import="'sub'"></template>
	</div>
</template>
<template id="sub">
	<span>I am a subtemplate!</span>
</template>
```
```js
Barbiche('simple-subtemplate').merge();
```
will produce:
```html
<div>
	<span>I am a subtemplate!</span>
</div>
```
Subtemplate import is dynamic:
```html
<template id="dynamic-subtemplate">
	<div>
		<template bb-repeat="[items: 'item']" bb-import="item"></template>
	</div>
</template>
<template id="sub1">
	<span>I am subtemplate1!</span>
</template>
<template id="sub2">
	<span>I am subtemplate2!</span>
</template>
```
```js
Barbiche('dynamic-subtemplate').merge({
	items: ['sub2', 'sub1']
})
```
produces:
```html
<div>
	<span>I am subtemplate2!</span>
	<span>I am subtemplate1!</span>
</div>
```
Recursion is also supported:
```html
<template id="recursive">
	<template bb-if="children.length" bb-import="'recursive-sub'"></template>
</template>
<template id="recursive-sub">
	<ul>
		<li bb-repeat="[children: 'child']">{{child.name}}
			<template bb-if="child.children" bb-alias="[child.children: 'children']"
				bb-import="'recursive-sub'"></template>
		</li>
	</ul>
</template>
```
```js
Barbiche('recursive').merge({
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
