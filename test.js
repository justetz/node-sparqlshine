var sparql = require('./lib/sparql')

var client = new sparql.Client('http://dbpedia.org/sparql');

client.query('select * where { ?s ?p ?o } limit 100', function(err, res) {
  return console.log(res);
});
