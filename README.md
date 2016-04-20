# sparqlshine

A simple SPARQL HTTP Client library for Node.js. The spiritual successor to
[Aldo Bucchi](https://github.com/aldonline)'s [node-sparql](https://github.com/aldonline/node-sparql)

## Getting Started

### Install

    npm install sparqlshine

### Use

```javascript
var sparql = require('sparqlshine');

var client = new sparql.Client('http://dbpedia.org/sparql');

client.query('select * where { ?s ?p ?o } limit 100', function(err, res) {
  return console.log(res);
});
```

The result of calling the `query()` function will be a raw object conforming to the `SPARQL-JSON[1]` results format.

## Core API

### `query`

Low level function. Returns the complete [SPARQL-JSON][sparql-json] results object.

```javascript
client.query('select * where {?s ?p ?o} limit 10', function(err, res) {
  var ref = res.results.bindings;
  for (var i = 0, len = ref.length; i < len; i++) {
    console.log(ref[i].s);
  }
});
```

## Convenience Query Methods

### `rows`

Convenience method to get to the rows directly. Builds on top of sparql.query, like most of the
other query methods.

```javascript
client.rows('select * where {?s ?p ?o} limit 10', function(err, res) {
  for (var i = 0, len = res.length; i < len; i++) {
    console.log(res[i].s);
  }
});
```

### `row`

Convenience method that only returns the first row in the result set

```javascript
client.row('select * where {?s ?p ?o} limit 10', function(err, res) {
  console.log(res.s);
});
```

### `col`

Convenience method that returns an array of with the first value of each row

```javascript
client.col('select distinct ?name where {?s foaf:name ?name} limit 10', function(err, res) {
  for (var i = 0, len = res.length; i < len; i++) {
    console.log(res[i].value);
  }
});
```

What's with the rdf_value.value part?
Read the [SPARQL-JSON][sparql-json] results format specification page.

### `cell`

Convenience method that returns only the first binding of the first row or NULL

```javascript
client.col('select ?name where {?s foaf:name ?name} limit 1', function(err, res) {
  console.log(res);
});
```

Convenience Update Methods
------------------------------

There are a bunch of higher level methods that generate SPARQL for you.
I am providing a small number of such methods, as I don't want this library to grow into something like Active Record.

Writing SPARQL by hand is highly encouraged.

### `set`

Provide an abstraction atop a simple 'entity oriented' operation that is not so simple when you are working with SPARQL.

Imagine you want to do something like this, conceptually speaking:

    aldo.name = 'Aldo'

You can get that with one simple call to the API

```javascript
client.set('<urn:test:graph>', '<urn:test:aldo>', '<urn:test:name>', '"Aldo"', false, function(err, res) {
  console.log('Aldo is now named Aldo, hooray!');
});
```

Not so simple? Well, compare that to the SPARQL Update statement that gets generated under the covers:

    modify <urn:test:graph>
      delete { <urn:test:aldo> <urn:test:name> ?x }
      insert { <urn:test:aldo> <urn:test:name> "Aldo" }
      where { optional{ <urn:test:aldo> <urn:test:name> ?x } }

Notice that, if `<urn:test:aldo>` had a previous `<urn:test:name>`, it will be replaced. If it doesn't, then a new triple will be inserted.

You can also delete a value by setting it to null ( effectively removing one or more triples )

```javascript
client.set('<urn:test:graph>', '<urn:test:aldo>', '<urn:test:name>', null, false, function(err, res) {
  console.log('Aldo went back to anonimity');
});
```

In this case, the generated SPARQL is:

    delete from <urn:test:graph>
      { <urn:test:aldo> <urn:test:name> ?x }
      where { <urn:test:aldo> <urn:test:name> ?x }

The 5th parameter is a boolean flag indicating whether the triple patterns should be inverted ( useful for when you only have the reversed predicate )

### mset

One Subject, several pairs Predicate-Object

Let's group some attributes of an user

	attributes =
		'<urn:test:username>' : 'haj'
		'<urn:test:password>' : '123'
		'<urn:test:name>' : 'Herman'

And we invoke `mset`

```javascript
client.mset('<urn:test:graph>', '<urn:test:haj>', attributes, function(err, res) {
  if (err != null) {
    console.log('Success');
  } else {
    console.log('Error: ' + err);
  }
});
```

The SPARQL query generated is:

	INSERT INTO <urn:test:graph>
		{ <urn:test:haj> 	<urn:test:username> 	'Haj';
							<urn:test:password>		'123';
							<urn:test:name>			'Herman'. }

# Tests

Mocha is used for testing. Install Mocha by running `npm install -g mocha`.

To run the tests, find the root directory of the project and run `mocha test/sparql.test.js`.

[sparql-json]: http://www.w3.org/TR/rdf-sparql-json-res/
