'use strict'

let request = require('request')
let querystring = require('querystring')

function normalize_v(v) {
  if (v == null) {
    return null
  }

  if (v instanceof Array) {
    if (v.length === 0) {
      return null
    } else {
      return v
    }
  } else {
    return [v]
  }
}

function get_one_key(obj) {
  for (let k in obj) {
    if (!obj.hasOwnProperty(k))
      continue
    return k
  }
}

function compose_prefix_string(prefix_map) {
  var k, v
  return ((function() {
    let results = []
    for (k in prefix_map) {
      results.push("prefix " + k + ": <" + prefix_map[k] + ">")
    }
    return results
  })()).join(' ')
}

function does_query_have_prefixes(query) {
  let iof = query.toLowerCase().indexOf('prefix');
  return (0 < iof && iof < 10);
}

function ensure_prefixes(query, prefix_map) {
  let s = compose_prefix_string(prefix_map);
  if (s.length === 0 || does_query_have_prefixes(query)) {
    return query;
  } else {
    return s + ' ' + query;
  }
}

function generate_set_sparql(g, s, p, o, inverted, cb) {
  var a, del, e, ins, q, ref, v, val;
  ref = inverted ? [o, p, s] : [s, p, o], e = ref[0], a = ref[1], v = ref[2];
  v = normalize_v(v);
  del = (inverted ? ['?x', a, e] : [e, a, '?x']).join(' ');
  if (v != null) {
    ins = ((function() {
      var i, len, results;
      results = [];
      for (i = 0, len = v.length; i < len; i++) {
        val = v[i];
        results.push((inverted ? [val, a, e] : [e, a, val]).join(' '));
      }
      return results;
    })()).join(' . ');
    return q = "modify " + g + " delete { " + del + " } insert { " + ins + " } where { optional{ " + del + " } }";
  } else {
    return q = "delete from " + g + " { " + del + " } where { " + del + " } ";
  }
};

function generate_mset_sparql(g, s, atts, cb) {
  let qSjt = "insert into " + g + " { " + s + " ";
  let counter = 1;
  let qAtt = (function() {
    let results = [];
    for (let k in atts) {
      let v = atts[k];
      let x = "";

      if (counter < Object.keys(atts).length) {
        x = ";";
      }

      counter++;
      results.push(k + " '" + v + "' " + x);
    }
    return results;
  })();
  return qSjt + qAtt.join(" ") + ". }";
};

exports.ensure_prefixes = ensure_prefixes
exports.does_query_have_prefixes = does_query_have_prefixes
exports.compose_prefix_string = compose_prefix_string
exports.generate_set_sparql = generate_set_sparql
exports.generate_mset_sparql = generate_mset_sparql

class Client {
  constructor(url) {
    this.url = url;
    this.prefix_map = {};
  }

  query(query, cb) {
    query = ensure_prefixes(query, this.prefix_map)

    if (this.log_query != null) {
      if (typeof console !== "undefined" && console !== null) {
        console.log(query)
      }
    }

    let opts = {
      uri: this.url,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'accept': 'application/sparql-results+json'
      },
      body: querystring.stringify({
        query: query
      }),
      encoding: 'utf8'
    }

    return request.post(opts, function(err, res, body) {
      if ((res != null ? res.statusCode : void 0) === 200) {
        return typeof cb === "function" ? cb(null, JSON.parse(body)) : void 0
      } else {
        return typeof cb === "function" ? cb([err, res, body]) : void 0
      }
    })
  }

  rows(query, cb) {
    return this.query(query, function(err, res) {
      if (err != null) {
        cb(err)
        return
      }

      if (res != null) {
        return cb(null, res.results.bindings)
      } else {
        return cb(null, null)
      }
    })
  }

  cols(query, cb) {
    return this.query(query, function(err, res) {
      var i, len, name, r, ref, row;
      if (err != null) {
        cb(err)
        return
      }

      if (res != null) {
        r = {};
        ref = res.head.vars;
        for (i = 0, len = ref.length; i < len; i++) {
          name = ref[i];
          r[name] = (function() {
            var j, len1, ref1, results;
            ref1 = res.results.bindings;
            results = [];
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              row = ref1[j];
              results.push(row[name]);
            }
            return results;
          })();
        }
        return cb(null, r)
      } else {
        return cb(null, null)
      }
    })
  }

  cell(query, cb) {
    return this.row(query, function(err, res) {
      if (err != null) {
        cb(err)
        return
      }

      if (res != null) {
        return cb(null, res[get_one_key(res)])
      } else {
        return cb(null, null)
      }
    })
  }

  row(query, cb) {
    return this.query(query, function(err, res) {
      var b;
      if (err != null) {
        cb(err);
        return;
      }
      b = res.results.bindings;
      if (b.length === 0) {
        return cb(null, null);
      } else {
        return cb(null, b[0]);
      }
    });
  };

  col(query, cb) {
    return this.query(query, function(err, res) {
      var b, bs, key;
      if (err != null) {
        cb(err);
        return;
      }
      bs = res.results.bindings;
      if (bs.length === 0) {
        return cb(null, []);
      } else {
        key = get_one_key(bs[0]);
        return cb(null, (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = bs.length; i < len; i++) {
            b = bs[i];
            results.push(b[key]);
          }
          return results;
        })())
      }
    })
  }

  set(g, s, p, o, inverted, cb) {
    let q = generate_set_sparql(g, s, p, o, inverted)
    return this.query(q, function(err, res) {
      return typeof cb === "function" ? cb(err, res) : void 0
    })
  }

  mset(g, s, atts, cb) {
    let q = generate_mset_sparql(g, s, atts)
    return this.query(q, function(err, res) {
      return typeof cb === "function" ? cb(err, res) : void 0
    })
  }
}

exports.Client = Client
