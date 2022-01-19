# Splice is a templating language

#### Splice supports nesting, partial templates, iterators, conditionals, variable assignment, local scope, comments, escape characters, and escapes HTML by default. In its minified form, it is only 2.16 KB, uncompressed, and has no dependencies.

### To learn more see the [documentation website.](https://duncan-britt.github.io/splice-docs/#language_guide)

## HTML Templating

Include a script tag in your html file with an id of `template`, or a custom id if you prefer. Set the type attribute to `text/x-template`.

```javascript
<script id="template" type="text/x-template">
  <ul>
    (:~ each chapters as 'chapter {
    <li>
      <a class="headerLink" href="#(: chapter.id :)">(: chapter.name :)</a>
    </li>
    }:)
  </ul>
</script>
```

Make sure to also link to a file containing the Splice JavaScript engine before linking to JS files which utilize Splice.

```html
<head>
  <!-- ... -->
  <script src="javascripts/splice.js"></script>
  <!-- ... -->
</head>
```

Call `Splice.render` and watch your template be rendered in place!

```javascript
Splice.render(yourData, "#id-of-script-tag");
```

If your template script tag has an id of "template", you may omit the CSS selector.

```javascript
Splice.render(yourData);
```

For more control, call `Splice.compile` to return a function which returns a string for a given scope.

```javascript
const evaluatorFn = Splice.compile(templateText);
const finalText = evaluatorFn({
  chapters: [{
    id: 2,
    name: 'The Vanishing Glass',
  }, {
    id: 3,
    name: 'The Letters from No One',
  }]
});
```

### Partials

To register your partial template, simply invoke `Splice.registerPartial` with the id of your template.

```javascript
Splice.registerPartial('sidebar_template');
```

Invoke a partial in your template:

```coffeescript
(:~ partial sidebar_template {}:)
```

### Iteration

To iterate through a collection, invoke `each` and pass an array. Within the body of each, you may reference elements of the collection with `$`.

```coffeescript
(:~ each baskets {
  <p>(: $ :)</p>
}:)
```
Alternatively, you may refer to elements of your collection using an alias defined with `as`.

```
(:~ each baskets as 'aBasket {
  <p>(: aBasket :)</p>
}:)
```

Scopes may be nested as deeply as you please.

```
(:~ each valley.o as 'bogs {
  (:~ each bogs as 'holes {
    (:~ each holes as 'tree {
      <p>A rare (: tree :), a rattlin (: tree :)</p>
    }:)
  }:)
}:)
```

### Conditionals

Splice has two conditional functions: `if` and `unless`. They both takes one argument and a body which may be evaluated depending on whether the argument is truthy or falsy.

```
(:~ if isValid {
<p>Access Granted</p>
}:)

(:~ unless isValid {
<p>Access Denied</p>
}:)
```

### Assignment

Assign bindings in the current scope using the assignment function: `def`.

```ruby
(:~ def 'snack meal {}:)
```

Then use the new binding to access its value within the current scope.

```html
<p>I'm just going to have a (: snack :).</p>
```

### Properties

If a binding references an object, access its properties using dot-notation.

```coffeescript
(: person.community.region :)
```

### Execution Context

`in` takes a scope object uses it to create different context for evaluating bindings within its body. For instance:

```coffeescript
<li>(: person.name :)</li>
<li>(: person.job :)</li>
```

becomes

```coffeescript
(:~ in person {
  <li>(: name :)</li>
  <li>(: job :)</li>
}:)
```

### Escaping

By default, text referenced by a binding is HTML-escaped to avoid cross-site scripting. To render unescaped html, use (:! instead of (: when evaluating a binding.

```
(:~ def 'unsafe '<a>docs</a> {}:)
<li>(:! unsafe :)</li>
```

In addition, any character anywhere in a Splice template may be explicitly escaped by prefixing it with \\. This prevents a character from being evaluated as syntax. For instance, \\(: will render (: as text. To display a backslash in the template, you must escape it.

```html
<p>A Splice expression begins with \(: and ends with \:).</p>
```

### Browser Compatibility

The splice source code makes use of arrow functions which aren't supported by some older browsers such as Internet Explorer 11. The source code can easily be transpiled to es5 compatible code using a tool like Babel.


### Documentation
The full documentation for Splice is published at https://duncan-britt.github.io/splice-docs/#language_guide
