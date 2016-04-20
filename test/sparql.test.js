'use strict'

let sparql = require('../lib/sparql')
let assert = require('assert')

let x = exports

let s = new sparql.Client('http://localhost:8890/sparql')

describe("Client", () => {
  describe(".testPrefixes()", () => {
    let prefixed_query = ' prefix foo: <urn:foo> select * where {?s ?p ?o}'
    let unprefixed_query = 'select * where {?s ?p ?o}'

    let prefix_map = {
      bar: 'urn:bar'
    }

    let empty_prefix_map = {}
    let ap = sparql.ensure_prefixes

    it("should correctly identify if a query has prefixes or not", () => {
      assert.equal(sparql.does_query_have_prefixes(prefixed_query), true)
      assert.equal(sparql.does_query_have_prefixes(unprefixed_query), false)

      assert.equal(ap(prefixed_query, prefix_map), prefixed_query)
      assert.equal(ap(prefixed_query, empty_prefix_map), prefixed_query)
      assert.notEqual(ap(unprefixed_query, prefix_map), unprefixed_query)

      assert.equal(ap(unprefixed_query, empty_prefix_map), unprefixed_query)
    })
  })

  describe(".testQueryReturnResults()", () => {
    const QUERY = 'select * where {?s ?p ?o} limit 10'

    it("should correctly return the results of the query", () => {
      s.query(QUERY, (err, res) => {
        assert.ok(res != null, 'result must be defined');
        assert.ok(res.results != null && res.results.bindings != null, 'and be a correct SPARQL results JSON object');
        assert.equal(res.results.bindings.length, 10, 'and contain 10 bindings');
      })
    })
  })

  describe(".testCell()", () => {
    const S1 = 'http://www.openlinksw.com/virtrdf-data-formats#default-iid';
    const P1 = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const O1 = 'http://www.openlinksw.com/schemas/virtrdf#QuadMapFormat';

    it('should return results in cell format', () => {
      s.cell("select * where { <" + S1 + "> <" + P1 + "> ?v }", (err, res) => {
        assert.ok(res != null, 'one() result must be defined');
        assert.equal(res.type, 'uri', 'and its type must be URI');
        assert.equal(res.value, O1);
      })
    })
  })

  describe(".testRow()", () => {
    it('should return defined results with correct parameters and types', () => {
      s.row('select * where {?s ?p ?o} limit 10', (err, res) => {
        assert.ok(res != null, 'result must be defined')
        assert.ok(res.s != null, 'and contain variable s')
        assert.ok(res.p != null, 'and contain variable p')
        assert.ok(res.o != null, 'and contain variable o')
        assert.equal(res.s.type, 'uri', 'subject must be of type URI')
        assert.equal(res.p.type, 'uri', 'predicate must be of type URI')
      })
    })
  })

  describe(".testCol()", () => {
    it('should return defined results with correct layout for .col()', () => {
      s.col('select distinct ?s where {?s ?p ?o} limit 10', (err, res) => {
        assert.ok(res != null, 'result must be defined')
        assert.equal(res.length, 10)
        assert.equal(res[2].type, 'uri')
      })
    })
  })

  describe(".testSet()", () => {
    it('should return defined results with correct layout for .set()', () => {
      let _g = '<urn:test:graph>'
      let _s = '<urn:test:s1>'
      let _p = '<urn:test:p1>'
      s.set(_g, _s, _p, 1, false, (err, res) => {
        assert.ok(res != null, 'result must be defined')

        s.cell("select ?v from " + _g + " where { " + _s + " " + _p + " ?v }", (err, res) => {
          assert.equal(res.value, '1')
          s.set(_g, _s, _p, null, false, (err, res) => {})
          assert.ok(res != null, 'result must be defined')

          s.cell("select ?v from " + _g + " where { " + _s + " " + _p + " ?v }", (err, res) => {
            assert.equal(res, null, 'failed')

            s.set(_g, _s, _p, [1, 2, 3], false, (err, res) => {
              assert.ok(res != null, 'result must be defined')

              s.col("select ?v from " + _g + " where { " + _s + " " + _p + " ?v }", (err, res) => {
                assert.equal(res.length, 3)

                s.set(_g, _s, _p, [], false, (err, res) => {
                  assert.ok(res != null, 'result must be defined')

                  s.col("select ?v from " + _g + " where { " + _s + " " + _p + " ?v }", (err, res) => {
                    assert.equal(res.length, 0)
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})

/*
sparql
modify <urn:test:graph> delete { <urn:test:s1> <urn:test:p1> ?x } insert { <urn:test:s1> <urn:test:p1> 1 } where { optional{ <urn:test:s1> <urn:test:p1> ?x } }
;
 */
