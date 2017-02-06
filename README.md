# Barbiche - Logic-full template engine for DOM &amp; JavaScript
================================================================

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
