# Barbiche - Template engine for DOM &amp; JS

Barbiche is a logic-full template engine for browser environment. It is currently beta and syntactic changes are less likely to happen.

Source code is clean, readable and short (around 600 lines parser included).

See Barbiche live examples [here](http://htmlpreview.github.io/?https://github.com/manubb/barbiche/blob/master/examples/starter.html).

## Quick start

We start with a simple template and a call to Barbiche:
```html
<template id="test">
	<div bb-alias="items[1].name: 'name'" bb-class="customClass">
		<div>{{name}}</div>
		<ul bb-attr="my_replace(attrValue): 'attr-name'">
			<template bb-repeat="items: 'item'">
				<li bb-if="item.show" bb-class="[item.species || 'unknown', (_item_ == 0): 'first']">
					{{item.name}} (index: {{_item_}}) {{_item_ == 0: item.name}}
				</li>
			</template>
		</ul>
		<span>{{item.join(', ').toUpperCase()}}</span>
		{{{some_html}}}
	</div>
</template>
```
```js
Barbiche('test').merge({
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

We get:
```html
<div class="my-class">
	<div>Jacynthe</div>
	<ul attr-name="lunchrOOm">
		<li class="hen first">Elsa (index: 0) Elsa</li>
		<li class="unknown">Zaza (index: 2)</li>
	</ul>
	<span>HEN, CAT, DOG, SPIDER</span>
	<div><p>This is...</p><p>...some HTML.</p></div>
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

### `<template>`
Barbiche heavily relies on the great properties of the `<template>` element. An essential point of Barbiche is that you can wrap any html fragment of the template in a `<template>` element without changing the merge result. Sooner or later, you will want to set a Barbiche attribute between an element and its parent: just wrap the element in a `<template>` tag and set the attribute on this new tag.

### Decorations

Barbiche templates are decorated with special attributes which are evaluated in this order:

1. `bb-if="expression"`
2. `bb-alias="expression"`
3. `bb-repeat="expression (++|--)?"`
4. `bb-import="expression"`
5. `bb-attr="expression"`
6. `bb-class="expression"`

and uses `{{expression}}` and `{{{expression}}}` for merging text and HTML, respectively.
#### Expressions

Barbiche expressions support a subset of JavaScript:

* boolean expressions: `true`, `false`, `==`, `!=`, `<=`,`>=`, `<` ,`>` and `!`
* arrays
* function calls
* property accessors: `object.property` and `object['property']`
* numbers
* strings
* `+` operator

and a special constructor: `expression: expression` that we call a Barbiche object.

#### Text
Inserting text is done via `{{content}}` where `content` resolves to a string or a Barbiche object.

* if `content` resolves to a string, a text node containing `content` value is inserted
* if `content` resolves to a Barbiche object `bool: string`, if `bool` is true, a text node containing `string` value is inserted

Some examples:
```html
<div>
{{"You see me"}}
{{(2 == 1 + 1): "You see me too"}}
{{(1 == 4): "You won't see me"}}
{{Math.random() > 0.5: "Well, maybe..."}}
</div>
```
#### HTML
Inserting HTML is done via `{{{content}}}` where `content` resolves to a string or a Barbiche object.

* if `content` resolves to a string, its content is inserted as HTML
* if `content` resolves to a Barbiche object `bool: string`, if `bool` is true, `string` value is inserted as HTML

#### Conditions
A `bb-if` attribute resolves to a boolean value. If false, the current node (and its subtree) is removed.

Some examples of `bb-if` attributes:
```html
<div bb-if="pet.species != 'cat'">...</div>
<span bb-if="my_crazy_test(obj.items[2], obj.other.another)">...</span>
```
#### Aliases
A `bb-alias` attribute resolves to a Barbiche object or an array of Barbiche objects. For each object `value: name`, `name` is bound to `value` during the processing of the current subtree.

Some examples of `bb-alias` attributes:
```html
<div bb-alias="[JSON.stringify(obj): 'str1', obj.prop: 'str2']">...</div>
<div bb-alias="logo.resources.link[0]: 'link'">...</div>
```
In the first line, the value of `JSON.stringify(obj)` is bound to `str1` identifier and the value of `obj.prop` to `str2`.

#### Loops
A `bb-repeat` contains an expression and ends with an optional `--` or `++` keyword. The expression resolves to a Barbiche expression or an array of Barbiche expressions. For each Barbiche expression `array: 'string'`, a loop is executed on `array`, binding each array item to `'string'` and item index to `'_string_'`. A `++` ending keyword will insert merged items in natural order; `--` will insert merged items in reverse order; no ending keyword is the same as `++`.

####Imports
A `bb-import` attributes resolves to a string `id`. The template with id `id`, if any, is then merged using current context and the current node is replaced with the merge result. The `bb-import` attribute is reserved to `<template>` elements.

Some usage examples can be found [below](#subtemplates).

#### Attributes
A `bb-attr` attribute resolves to a Barbiche expression or an array of Barbiche expressions. For each expression `value: name`, `name` resolves to a string value. If `name` is not empty and if `value` has type `string`, attribute `name` is set on the current node with value `value`.

#### Classes
A `bb-class` attribute resolves to a string, a Barbiche expression or an array containing strings and Barbiche expressions. For each item:
* if item resolves to a string `name`, if `name` is not empty, class `name` is added to the current node
* if item resolves to a Barbiche expression `boolean: name`, `boolean` is resolved to a boolean value and `name` to a string. If `boolean` is true and if `name` is not empty, class `name` is added to the current node.

### Subtemplates
A simple example:
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
		<template bb-repeat="items: 'item'" bb-import="item"></template>
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
		<li bb-repeat="children: 'child'">{{child.name}}
			<template bb-if="child.children" bb-alias="child.children: 'children'"
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
