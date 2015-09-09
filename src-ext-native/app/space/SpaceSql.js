Ext.define("CrashIssue.space.Bridge", {
  singleton: true,
  cmd: function(details) {
    return Q.Promise(function(resolve, reject) {
      details.callbacks = details.callbacks || {};
      details.callbacks.success = resolve;
      details.callbacks.onComplete = resolve;
      details.callbacks.failure = reject;
      details.callbacks.onError = reject;

      Ext.space.Communicator.send(details);
    });
  }
});

Ext.define("CrashIssue.space.SpaceSql", {
  singleton: true,
  _openDBs: null,

  constructor: function() {
    this._openDBs = {};
  },

  listDatabases: function() {
    throw "listDatabases not implemented";
  },

  get: function(e) {
    var n = this._openDBs[e];
    if (n) {
      return n;
    }

    n = new CrashIssue.space.spacesql.Database({
      name: e
    });

    this._openDBs[e] = n;
    return n;
  },

  drop: function(e) {
    throw "drop not implemented";
  }
});

Ext.define("CrashIssue.space.spacesql.Database", {
  logCommands: false,

  log: function() {
    if (this.logCommands) {
      console.log.apply(console, arguments);
    }
  },

  constructor: function(e) {
    this.name = e.name;
    this.displayName = e.displayName || e.name;
    this._cleanup = e.cleanup;
    this.versionTable = "_sencha_schema_version";
    this.loaded = null;

    this.bridgeBeginPromise = null;
    this.bridgeCommitPromise = null;
    this.queryQueue = [];
    this.txCounter = 1;
    this.groupCounter = 1;
    this.txList = {};

    this.previousQuery = {};

    var db = this;

    this.loaded = Q(Ext.onSpaceReady()).then(function() {
      return CrashIssue.space.Bridge.cmd({
        command: "Sqlite#openDatabase",
        name: db.name,
        displayName: db.displayName || db.name

      }).then(function(n) {
        db.id = n.id;
        db.version = n.version;

        return db._tx(function(tx) {
          return tx.query("CREATE TABLE IF NOT EXISTS " + db.versionTable +
            " (id INT, version INT, created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
            "modified_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))").then(function() {
            return tx.query("SELECT VERSION FROM " + db.versionTable, []).then(function(rows) {
              db.loadedVersion = parseInt(rows.length > 0 ? rows[0].version : -1);
              return true;
            });
          });
        });
      });
    });

    return this.callParent(arguments);
  },

  createSchema: function(e, t) {
    return Q.reject("createSchema not implemented");
  },

  migration: function(e, t) {
    return Q.reject("migration not implemented");
  },

  query: function(e, t) {
    var db = this;

    return db.tx(function(tx) {
      return tx.query(e, t);
    });
  },

  listTables: function() {
    var db = this;

    return db.tx(function(tx) {
      return tx.query("SELECT * FROM sqlite_master WHERE type='table'");
    });
  },

  insert: function(e, t, n) {
    return Q.reject("insert not implemented");
  },

  insertMany: function(e, t, n) {
    return Q.reject("insertMany not implemented");
  },

  createTransaction: function() {
    throw "createTransaction deprecated. Use tx()";
  },

  drop: function() {
    return Q.reject("drop not implemented");
  },

  close: function() {
    var db = this;

    return CrashIssue.space.Bridge.cmd({
      command: "Sqlite#closeDatabase",
      databaseId: db.id
    }).then(function() {
      this._expired = true;
    });
  },

  importData: function(e, t, n, i, s, o, a) {
    var db = this;

    var deferred = Q.defer();
    db.queryQueue.push({
      type: 'import',
      state: 'pending',
      query: {
        e: e,
        t: t,
        n: n,
        i: i,
        s: s,
        o: o,
        a: a
      },
      deferred: deferred,
      groupId: -1
    });

    db.flush();

    return deferred.promise;
  },

  _convertResults: function(e) {
    for (var t = [], n = e.names, i = n.length, s = e.rows, o = 0, a = s.length; a > o; o++) {
      for (var r = s[o], c = {}, l = 0; i > l; l++) c[n[l]] = r[l];
      t.push(c);
    }
    return t;
  },

  _beginTx: function() {
    var db = this;
    return Q().then(function() {
      db.log("===================> createTransaction");
      return CrashIssue.space.Bridge.cmd({
        command: "Sqlite#createTransaction",
        databaseId: db.id,
        readOnly: false,
        queue: false //TODO what does this do? Was true
      }).then(function(txId) {
        db.log("===================> beginTransaction " + txId);
        return CrashIssue.space.Bridge.cmd({
          command: "Sqlite#beginTransaction",
          transactionId: txId
        }).then(function() {
          return txId;
        });
      });
    });
  },

  _commitTx: function(txId) {
    this.log("===================> commitTransaction " + txId);
    return CrashIssue.space.Bridge.cmd({
      command: "Sqlite#commitTransaction",
      transactionId: txId
    });
  },

  _rollbackTx: function(txId) {
    this.log("===================> rollbackTransaction " + txId);
    return CrashIssue.space.Bridge.cmd({
      command: "Sqlite#rollbackTransaction",
      transactionId: txId
    });
  },

  _bridgeCommit: function(rollback) {
    var db = this;

    if (db.bridgeCommitPromise) {
      return db.bridgeCommitPromise;
    }
    if (!db.bridgeBeginPromise) {
      return Q();
    }
    db.bridgeCommitPromise = db.bridgeBeginPromise.then(function(txId) {
      var cp;
      if (rollback === 'rollback') {
        cp = db._rollbackTx(txId);
      } else {
        cp = db._commitTx(txId);
      }
      return cp.then(function() {
        db.bridgeCommitPromise = null;
        return 0; // placeholder txId
      });
    });
    db.bridgeBeginPromise = null;

    return db.bridgeCommitPromise;
  },

  flush: function() {
    var db = this;

    return Q().then(function() {

      // Complete -> (removed)
      while ((db.queryQueue.length > 0) && (db.queryQueue[0].state === 'complete')) {
        db.previousQuery = db.queryQueue.shift();
      }

      // No pending queries
      if (db.queryQueue.length === 0) {

        // If there are no interested transactions, close the bridge tx
        if (Object.keys(db.txList).length === 0) {
          return db._bridgeCommit();
        }

        return;
      }

      // Process the current query
      var headQuery = db.queryQueue[0];

      // Executing... nothing to do but wait
      if (headQuery.state === 'executing') {
        return;
      }

      // Pending -> Executing
      if (headQuery.state === 'pending') {
        headQuery.state = 'executing';

        // Determine if the query should run in a TX
        var runInTx = true;
        if (headQuery.type === 'import') {
          runInTx = false;
        }

        // Determine the pre-work required before we actually execute the query
        var txPromise;
        if (runInTx) {
          // If no tx, or if we are doing rollback on failure, and this is a new group, then start a new tx
          if (!db.bridgeBeginPromise || (headQuery.rollbackOnFailure && (headQuery.groupId !== db.previousQuery.groupId))) {
            db.bridgeBeginPromise = db._bridgeCommit().then(function() {
              return db._beginTx();
            });
          }
          txPromise = db.bridgeBeginPromise;

        } else {

          // Close the current tx
          txPromise = db._bridgeCommit();
        }

        // Execute the query
        return txPromise.then(function(txId) {

          // Import Query
          if (headQuery.type === 'import') {
            var q = headQuery.query;

            db.log("===================> importData " + txId + ": " + q.e);

            return CrashIssue.space.Bridge.cmd({
              command: "Sqlite#importData",
              databaseId: db.id,
              file: q.e,
              progressInterval: q.o ? q.a || 5e3 : void 0,
              delimiter: q.s,
              type: q.t,
              fields: q.i,
              table: q.n,
              callbacks: {
                onProgress: function(e) {
                  if (q.o && e.rowsInserted) {
                    q.o(e.rowsInserted);
                  }
                }
              }
            });

            // SQL query
          } else {
            db.log("===================> executeStatement " + txId + ": " + headQuery.query.split('\n').join(' ').substring(0, 140));

            return CrashIssue.space.Bridge.cmd({
              command: "Sqlite#executeStatement",
              transactionId: txId,
              sqlStatement: headQuery.query,
              arguments: JSON.stringify(headQuery.parameters)

            }).then(function(results) {
              return db._convertResults(results);
            });
          }

        }).then(function(results) {

          // If we want to force a commit on success, then do it before we resolve the query
          if (headQuery.commitOnSuccess) {
            return db._bridgeCommit().then(function() {
              headQuery.deferred.resolve(results);
              // undefined
            });
          }

          // Otherwise, just resolve the query
          headQuery.deferred.resolve(results);
          // undefined

        }).fail(function(error) {
          db.log("===================> ERROR: " + error);

          // If we want rollback on failure, then rollback before we reject the query
          if (headQuery.rollbackOnFailure) {
            return db._bridgeCommit('rollback').then(function() {
              headQuery.deferred.reject(error);
              return Q.reject(error);
            });
          }

          // Otherwise, just reject the query
          headQuery.deferred.reject(error);
          return Q.reject(error);

        }).fin(function() {
          // Executing -> Complete
          headQuery.state = 'complete';
          db.flush();
        });
      }
    }).fail(function(error) {
      // Use CrashIssue.log here...
      CrashIssue.log("Fatal error flushing query queue", error);
      return Q.reject(error);
    });
  },

  _tx: function(work) {
    var db = this;
    return Q().then(function() {
      var txId = db.txCounter++;
      var txInstance = new CrashIssue.space.spacesql.Transaction(db, txId);

      db.txList[txId] = txInstance;
      return Q.fcall(work, txInstance).fin(function() {
        delete db.txList[txId];
        db.flush();
      });
    });
  },

  tx: function(work) {
    var db = this;
    return db.loaded.then(function() {
      return db._tx(work);
    });
  },

  createQueryGroup: function() {
    return new CrashIssue.space.spacesql.QueryGroup(this, null);
  }
});

Ext.define("CrashIssue.space.spacesql.Transaction", {
  constructor: function(db, txId) {
    this.db = db;
    this.id = txId;
  },

  createQueryGroup: function() {
    return new CrashIssue.space.spacesql.QueryGroup(this.db, this);
  },

  query: function(q, p) {
    var transaction = this;

    return Q(transaction.createQueryGroup()).then(function(queryGroup) {
      var queryPromise = queryGroup.query(q, p);

      queryGroup.execute();
      return queryPromise;
    });
  }
});

Ext.define("CrashIssue.space.spacesql.QueryGroup", {
  constructor: function(db, tx) {
    this.id = db.groupCounter++;
    this.db = db;
    this.tx = tx; // Can be null/undefined
    this.queries = [];
  },

  query: function(q, p) {
    var queryGroup = this;

    var deferred = Q.defer();
    queryGroup.queries.push({
      state: 'pending',
      query: q,
      parameters: p,
      deferred: deferred,
      groupId: this.id
    });
    return deferred.promise;
  },

  execute: function(rollbackOnFailure) {
    var queryGroup = this;

    return Q().then(function() {

      if (queryGroup.queries.length === 0) {
        return [];
      }

      queryGroup.queries.forEach(function(q) {
        q.rollbackOnFailure = rollbackOnFailure;
        queryGroup.db.queryQueue.push(q);
      });

      if (rollbackOnFailure) {
        queryGroup.queries[queryGroup.queries.length - 1].commitOnSuccess = true;
      }

      queryGroup.db.flush();

      return Q.all(queryGroup.queries.map(function(q) {
        return q.deferred.promise;
      }));

    });
  },

  insert: function() {
    return Q.reject("insert not yet implemented");
  }
});
