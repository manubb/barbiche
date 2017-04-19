## Setup

### Installation

Barbiche is available as a [npm](https://www.npmjs.com/) package:

`npm install barbiche`

### Polyfills

For decent browser support, using some polyfills is required. Good results can be obtained with:
* [template](https://github.com/manubb/template) (available as npm package template-mb, use version 2.x with Barbiche 3.x and version 1.x with Barbiche 2.x)
* [classList.js](https://github.com/eligrey/classList.js) (available as npm package classlist.js, only needed for IE9 support)

The polyfills are included in Barbiche package in `polyfills.min.js`:

* version 3.x of Barbiche contains template-mb(2.x)
* version 2.x of Barbiche contains template-mb(1.x) and classList.js

## Barbiche API
### Common usage
First, we create a Barbiche instance:
```js
var barbiche = Barbiche();
```
Now, `barbiche` is a factory function that expects the id string of a `<template>` element or a `<template>` element:
```js
barbiche('my-template');
// or
barbiche(document.querySelector('#my-template'));
```
If no template is found, an unamed empty `<template>` element is used so that subsequent operations fail silently.

If the template has an id attribute, Barbiche internally stores the template for later reuse:
```js
var inst1 = barbiche('my-template');
var inst2 = barbiche('my-template');
// inst1 === inst2
```
Setting ids on your templates is strongly recommended.

Merging data into a Barbiche instance is done in this way:
```js
var frag = barbiche('my-template').merge(obj_k,..., obj_3, obj_2, obj_1);
```
The arguments of `merge` method are used to init the merge context: when Barbiche is looking for the value of an identifier, it searches first in `obj_1`, then in `obj_2`,..., then in `obj_k`. For example, you may consider that:

* `obj_1` is a plain JSON object that comes from your database
* `obj_2` is an object that contains functions and data specific to `my-template`
* `obj_3` is an object that contains functions and data common to all your templates

Some examples can be found [here](https://manubb.github.io/barbiche/demo.html#Context).

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
### Barbiche objects
Barbiche instances expose a factory function for BBObj class:
```js
var bbObj = barbiche.bbObj;
var bbObjInstance = bbObj(value, name);
```
Barbiche objects can be used to create a template from a string with an optional id:
```js
var id = 'my-template';
var str = '<div><span>{{text}}</span></div>';
barbiche(bbObj(str, id));
//or
barbiche(bbObj(str));
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

* `delimiters` is an array containing two distinct one character strings that will be used as delimiters for text and HTML insertion. Note that backslash character (`\`) is used for escaping delimiters and cannot be used as a delimiter. Some examples can be found [here](https://manubb.github.io/barbiche/demo.html#Delimiters).
* `prefix` is the word used to prefix Barbiche attributes. Internally, Barbiche uses the following attributes: `bb-[if|else|alias|text|html|repeat|import|attr|class|global|inert]`. If you need to use one of these attributes, you can set Barbiche prefix according to your needs.
* `document` is the HTML document where Barbiche will search for templates.
* `destructive` is a boolean that allows Barbiche to modify the HTML of the registered templates. (If false, Barbiche will use deep clones of the templates leaving your HTML untouched.)

## Template description

### `<template>`
Barbiche heavily relies on the great properties of the `<template>` element. An essential point of Barbiche is that you can wrap any html fragment of the template in a `<template>` element without changing the merge result. Sooner or later, you will want to set a Barbiche attribute between an element and its parent: just wrap the element in a `<template>` tag and set the attribute on this new tag.

### Decorations

Barbiche templates are decorated with special attributes which are evaluated in this order:

1. `bb-if="expression"` (and `bb-else`)
2. `bb-alias="expression"`
3. `bb-repeat="expression (++|--)?"`
4. `bb-import="expression"`
5. `bb-attr="expression"`
6. `bb-class="expression"`

and use `{{expression}}` and `{{{expression}}}` for merging text and HTML, respectively.

An additional attribute `bb-inert` can be set on a `<template>` element so that Barbiche will consider it as any other non `<template>` element.

### Expressions

Barbiche expressions support a subset of JavaScript:

* boolean expressions: `true`, `false`, `||`, `&&`, `==`, `!=`, `===`, `!==`, `<=`,`>=`, `<` ,`>` and `!`
* null and undefined keywords: `null` and `undefined`
* identifiers: `my_text`, `my_html`
* arrays: `[]`, `[text, "string", 1.12]`
* function calls: `my_function(obj)`, `JSON.stringify(JSON.parse(str))`
* property accessors: `object.property` and `object[computed property]`
* simple numbers: `1.2`, `5`, `-7.58`
* strings: `"double\"quote\"string"` and `'simple\'quote\'string'`
* `+` operator

and a special constructor: `expression: expression` for building Barbiche object.

For convenience, any string can be used as an identifier by using backtick delimiters: `` `this-is not-a-valid-JS-identifier` ``.
Backticks inside a backticked identifier have to be escaped: `` \` ``.

Strings and identifiers support usual escape sequences `(\n|\t|\r|\\|\'|\")`, hexadecimal and unicode escape sequences. Examples can be found [here](https://manubb.github.io/barbiche/demo.html#Identifiers).

### Text
Inserting text is done with `{{expression}}`.

* if `expression` is a Barbiche object `boolean: content`, if `boolean` is true and if `content` is not `null` or `undefined`, a text node containing `content.toString()` is inserted
* else, if `expression` is not `null` or `undefined`, a text node containing `expression.toString()` is inserted

A simple example:
```html
<template id="text">
	<div>{{text}}</div>
</template>
```
```js
barbiche('text').merge({
	text: "This is some text."
});
```
will produce:
```html
<div>This is some text.</div>
```

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Text/HTML).

### HTML
Inserting HTML is done with `{{{expression}}}`.

* if `expression` is an instance of `Node`,  it is inserted
* else if `expression` is a Barbiche object `boolean: content`, if `boolean` is true and if `content` is not `null` or `undefined`, `content.toString()` is inserted as HTML
* else, if `expression` is not `null` or `undefined`, `expression.toString()` is inserted as HTML

A simple example:
```html
<template id="html">
	<div>{{{html}}}</div>
</template>
```
```js
barbiche('html').merge({
	html: "<p>This is some<strong>html</strong>.</p>"
});
```
will produce:
```html
<div><p>This is some<strong>html</strong>.</p></div>
```

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Text/HTML).

### Conditions
if an element is decorated with a `bb-if="expression"` attribute, its next sibling element (if it exists) may be decorated with an (empty) `bb-else` attribute. According to the truth value of `expression`, the element or its next sibling element is removed.

Note that no curly braces expression can be set between two consecutive sibling elements decorated with `bb-if` and `bb-else` and that a node cannot be decorated with both `bb-if` and `bb-else` attributes.

A simple example:
```html
<template id="condition">
	<div bb-if="bool1">TRUE</div>
	<div bb-else>FALSE</div>
	<div bb-if="bool2">TRUE</div>
	<div bb-else>FALSE</div>
</template>
```
```js
barbiche('condition').merge({
	bool1: true,
	bool2: false
});
```
will produce:
```html
<div>TRUE</div>
<div>FALSE</div>
```

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Conditions).

### Aliases
A `bb-alias` contains a Barbiche object or an array of Barbiche objects. For each object `value: name`, `name` is bound to `value` during the processing of the current subtree.

A simple example:
```html
<template id="alias">
	<div bb-alias="value: 'alias'">{{alias}}</div>
</template>
```
```js
barbiche('alias').merge({
	value: 5
});
```
will produce:
```html
<div>5</div>
```

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Aliases).

### Loops
A `bb-repeat` attribute contains an expression and ends with an optional `--` or `++` keyword. The expression denotes a Barbiche object or an array of Barbiche objects which defines a set of *nested* loops. For each Barbiche object `array: 'string'`, a loop is executed on `array`, binding each array item to `'string'` and item index to `'_string_'`. A `++` ending keyword will insert merged items in natural order; `--` will insert merged items in reverse order; no ending keyword is the same as `++`.

For convenience, an `undefined` or `null` value for `array` is interpreted as an empty array: `[]`.

Any object with a `forEach` method (e.g. Maps or Sets) can be used in loops.

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

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Loops).

### Imports
The `bb-import` attribute is reserved to `<template>` elements. The value of a `bb-import` attribute can be a template node, a template id or a Barbiche object. It is applied to the barbiche instance function. The returned template is then merged using current context and the current node is replaced with the merge result.

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

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Imports).

### Attributes
A `bb-attr` attribute contains a Barbiche object or an array of Barbiche objects. For each object `value: name`, if `value` and `name` are not `undefined` or `null` and if `name.toString()` is not empty, attribute `name.toString()` is set on the current node with value `value`.

A simple example:
```html
<template id="attribute">
	<div bb-attr="value: 'my-attr'"></div>
</template>
```
```js
barbiche('attribute').merge({
	value: 'my-value'
});
```
will produce:
```html
<div my-attr="my-value"></div>
```

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Attributes).

### Classes
A `bb-class` attribute contains an expression or an array of expressions. For each expression:
* if expression is a Barbiche object `boolean: name`, if `boolean` is true and if `name` is not `null` or `undefined` and if `name.toString()` is not empty, class `name.toString()` is added to the current element,
* else if `expression` is not `null` or `undefined` and if `expression.toString()` is not empty, class `expression.toString()` is added to the current element.

A simple example:
```html
<template id="class">
	<div class="item" bb-class="myClass"></div>
</template>
```
```js
barbiche('class').merge({
	myClass: 'my-class'
});
```
will produce:
```html
<div class="item my-class"></div>
```

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Classes).

### Inert attribute
A `bb-inert` attribute can be set on a `<template>` element so that Barbiche will consider the element as any other non `<template>` element.

Note that a `<template>` element can not be decorated with both `bb-inert` and `bb-import` attributes.

A simple example:
```html
<template id="inert">
	<template><p>Not inert template</p></template>
	<template bb-inert><p>Inert template</p></template>
</template>
```
```js
barbiche('inert').merge();
```
will produce:
```html
<p>Not inert template</p>
<template><p>Inert template</p></template>
```

Other examples can be found [here](https://manubb.github.io/barbiche/demo.html#Inert).

## Template polyfill caveats

### Subdocument templates

Templates included in subdocuments (such as HTMLImports) need to be bootstrapped before being usable by calling:
```js
if (window.HTMLTemplateElement.bootstrap) window.HTMLTemplateElement.bootstrap(otherDoc);
```

Version 1.x of the polyfill only patches `document.createElement` and `<template>` can only be properly created from the main document: `otherDoc.createElement('TEMPLATE')` does not work as expected. This limitation is no longer relevant in version 2.x of the polyfill.

### Inherent limitation

Polyfilled templates are not as inert as native templates. For examples, scripts will be executed and images will be loaded.

In some rare situations, the HTML parser may break the template content. For example:

```html
<template id="table-fragment">
	<tr>
		<td>a</td><td>b</td>
	</tr>
</template>
```
will give you an empty template. A workaround for this is to use a `<script>` tag:
```html
<script id="table-fragment" type="text/barbiche-template">
	<tr>
		<td>a</td><td>b</td>
	</tr>
</script>
```
and then register the template with:
```js
var script = document.querySelector('#table-fragment');
var bbObj = barbiche.bbObj;
barbiche(bbObj(script.text, script.id));

```
