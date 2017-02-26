## Installation
Barbiche is available as a [npm](https://www.npmjs.com/) package:

`npm install barbiche`

## Barbiche API
### Common usage
First, we create a Barbiche instance:
```js
var barbiche = Barbiche();
```
Now, `barbiche` is a constructor that expects the id string of a `<template>` element or a `<template>` element:
```js
barbiche('my-template');
// or
barbiche(document.querySelector('#my-template'));
```
If the template has an id attribute, Barbiche internally stores the template for later reuse:
```js
var inst1 = barbiche('my-template');
var inst2 = barbiche('my-template');
// inst1 === inst2
```
Setting ids on your templates is strongly recommended.

Merging data into a Barbiche instance is done in this way:
```js
var frag = barbiche('my-template').merge(obj1, obj2, obj3,...);
```
The arguments of `merge` method are used to init the merge context: when Barbiche is looking for the value of an identifier, it searches first in `obj1`, then in `obj2`,..., then in `window`. For example, you may consider that:

* `obj1` is a plain JSON object that comes from your database
* `obj2` is an object that contains functions and data specific to `my-template`
* `obj3` is an object that contains functions and data common to all your templates

A DocumentFragment is returned that can be inserted in the main document:
```js
document.body.appendChild(frag);
```



When you are done with your merge operations, you can clean the `barbiche` store:
```js
barbiche.clean('my-template');
//or
barbiche.clean(); // clear all registered templates

```

### Settings

Barbiche instance constructor accepts an optional settings object which defaults to:
```js
Barbiche({
	delimiters: ['{', '}'],
	prefix: 'bb-',
	document: document,
	destructive: true
});
```

* `delimiters` is an array containing two distinct one character strings that will be used as delimiters for text and HTML insertion.
* `prefix` is the word used to prefix Barbiche attributes. Internally, Barbiche uses the following attributes: `bb-if`, `bb-alias`, `bb-text`, `bb-html`, `bb-repeat`, `bb-import`, `bb-attr`, `bb-class` and `bb-global`. If you need to use one of these attributes, you can set Barbiche prefix according to your needs.
* `document` is the HTML document where Barbiche will search for templates.
* `destructive` is a boolean that allows Barbiche to modify the HTML of the registered templates. (If false, Barbiche will use deep clones of the templates leaving your HTML untouched.)

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

and use `{{expression}}` and `{{{expression}}}` for merging text and HTML, respectively.

#### Expressions

Barbiche expressions support a subset of JavaScript:

* boolean expressions: `true`, `false`, `==`, `!=`, `<=`,`>=`, `<` ,`>` and `!`
* arrays
* function calls
* property accessors: `object.property` and `object[computed property]`
* numbers
* strings
* `+` operator

and a special constructor: `expression: expression` that we call a Barbiche object.

#### Text
Inserting text is done via `{{content}}` where `content` resolves to a string or a Barbiche object.

* if `content` resolves to a string, a text node containing `content` value is inserted
* if `content` resolves to a Barbiche object `boolean: string`, if `boolean` is true, a text node containing `string` value is inserted

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
* if `content` resolves to a Barbiche object `boolean: string`, if `boolean` is true, `string` value is inserted as HTML

#### Conditions
A `bb-if` attribute resolves to a boolean value. If this value is false, the current node (and its subtree) is removed.

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
A `bb-repeat` attribute contains an expression and ends with an optional `--` or `++` keyword. The expression resolves to a Barbiche expression or an array of Barbiche expressions which defines a set of *nested* loops. For each Barbiche expression `array: 'string'`, a loop is executed on `array`, binding each array item to `'string'` and item index to `'_string_'`. A `++` ending keyword will insert merged items in natural order; `--` will insert merged items in reverse order; no ending keyword is the same as `++`.

Some usage examples can be found [below](#loops-examples).

####Imports
A `bb-import` attributes resolves to a string `id`. The template with id `id` is then merged using current context and the current node is replaced with the merge result. The `bb-import` attribute is reserved to `<template>` elements.

Some usage examples can be found [below](#subtemplates-examples).

#### Attributes
A `bb-attr` attribute resolves to a Barbiche expression or an array of Barbiche expressions. For each expression `value: name`, `name` resolves to a string value. If `value` is not `undefined` or `null`, attribute `name` is set on the current node with value `value`.

#### Classes
A `bb-class` attribute resolves to a string, a Barbiche expression or an array containing strings and Barbiche expressions. For each item:
* if item resolves to a string `name`, class `name` is added to the current node
* if item resolves to a Barbiche expression `boolean: name`, `boolean` is resolved to a boolean value and `name` to a string. If `boolean` is true, class `name` is added to the current node.

### Loops examples
A simple example:
```html
<template id="loop">
	<div>
		<span bb-repeat="items: 'item'">{{item.name}} ({{_item_}})</span>
	</div>
</template>
```
```js
barbiche('loop').merge({
	items: [
		{species: "hen", name: "Elsa", show: true},
		{species: "cat", name: "Jacynthe", show: false},
		{species: null, name: "Zaza", show: true}
	]
});
```
will produce:
```html
<div>
	<span>Elsa (0)</span>
	<span>Jacynthe (1)</span>
	<span>Zaza (2)</span>
</div>
```
A descending loop:
```html
<template id="loop">
	<div>
		<span bb-repeat="items: 'item' --">{{item.name}} ({{_item_}})</span>
	</div>
</template>
```
```js
barbiche('loop').merge({
	items: [
		{species: "hen", name: "Elsa", show: true},
		{species: "cat", name: "Jacynthe", show: false},
		{species: null, name: "Zaza", show: true}
	]
});
```
will produce:
```html
<div>
	<span>Zaza (2)</span>
	<span>Jacynthe (1)</span>
	<span>Elsa (0)</span>
</div>
```
Filling a table is easy:
```html
<template id="table">
	<table>
		<tbody>
			<tr bb-repeat="rows: 'row'">
				<td bb-repeat="row: 'cell'">{{cell}}</td>
			</tr>
		</tbody>
	</table>
</template>
```
```js
barbiche('table').merge({
	rows: [
		["A1", "B1", "C1"],
		["A2", "B2", "C2"]
	]
});
```
will produce:
```html
<table>
	<tbody>
		<tr>
			<td>A1</td>
			<td>B1</td>
			<td>C1</td>
		</tr>
		<tr>
			<td>A2</td>
			<td>B2</td>
			<td>C2</td>
		</tr>
	</tbody>
</table>
```
and a one instruction nested loop:

```html
<template id="nested">
	<div>
		<span bb-repeat="[arr1: 'item1', arr2: 'item2']">{{item1}}{{item2}}</span>
	</div>
</template>
```
```js
barbiche('nested').merge({
	arr1: ["A", "B"],
	arr2: [1, 2, 3]
});
```
will produce:
```html
<div>
	<span>A1</span>
	<span>A2</span>
	<span>A3</span>
	<span>B1</span>
	<span>B2</span>
	<span>B3</span>
</div>
```

### Subtemplates examples
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
barbiche('simple-subtemplate').merge();
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
barbiche('dynamic-subtemplate').merge({
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
barbiche('recursive').merge({
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
