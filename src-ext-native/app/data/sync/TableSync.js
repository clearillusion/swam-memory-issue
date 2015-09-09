Ext.define('CrashIssue.data.sync.TableSync', {

  toCsv: function(data, columns) {
    var me = this;

    var line = '';

    columns.forEach(function(column) {
      var value = data[column];

      if(line.length) {
        line = line + ",";
      }

      if(!Ext.isEmpty(value)) {
        line = line + (value.length ? me.escapeCsv(value.toString()) : value);
      }
    });

    return line;
  },

  escapeCsv: function(s) {
    var i, c, needsEscape = false;

    for(i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if((c == ',') || (c == '"') || (c == '\r') || (c == '\n')) {
        needsEscape = true;
        break;
      }
    }

    if(!needsEscape) {
      return s;
    }

    var out = '"';
    for(i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if(c == '"') {
        out = out + '""';
      } else
        out = out + c;
    }
    out = out + '"';

    return out;
  },

  extractChangedRecords: function(tableDetails, syncOutDirectory, database, stats) {
    var me = this;

    var result = {
      columns: []
    };

    // Get column names

    return Q(database.query("pragma table_info('" + tableDetails.tableName + "')")).then(function(tableInfo) {
      if(tableInfo.length > 0) {
        tableInfo.forEach(function (column) {
          result.columns.push(column.name);
        });
        return extract();
      } else {
        return Q.fulfill();
      }
    });

    function extract() {
      var query = "select " + result.columns.join(",") + " from " + tableDetails.tableName + " where _state in ('U','N','D') ";

      if(!Ext.isEmpty(tableDetails.filter)) {
        query += " and " + tableDetails.filter;
      }

      var startQuery = new Date();
      return Q(database.query(query)).then(function(data) {
        CrashIssue.log('query: ' + tableDetails.tableName + ' ' + (Date.now() - startQuery) + 'ms');
        var segmentData = '';

        if(stats) {
          stats.dirtyCount += data.length;
        }

        try {
          data.forEach(function(row) {
            segmentData = segmentData + me.toCsv(row, result.columns);
            segmentData = segmentData + "\r\n";
          });
        } catch(e) {
          CrashIssue.log('bad ' + e);
        }

        if(segmentData.length === 0) {
          return Q.fulfill();
        } else {
          return(syncOutDirectory.set(tableDetails.segment, segmentData)).then(function () {
            return Q.fulfill(result);
          });
        }
      });
    }
  },

  countChangedRecords: function(tableDetails, database) {
    var me = this;

    var query = "select count(*) as count from " + tableDetails.tableName + " where _state in ('U','N','D') ";

    if(!Ext.isEmpty(tableDetails.filter)) {
      query += " and " + tableDetails.filter;
    }

    return Q(database.query(query)).then(function(data) {
      return Q.fulfill(data[0].count);
    });
  },

  processTable: function(tableDetails, syncInDirectory, database) {
    // CrashIssue.log('Processing results for ' + tableDetails.tableName + ' ...', tableDetails);

    var me = this;

    // Don't import empty segments

    if(Ext.isEmpty(tableDetails.segment)) {
      return Q.fulfill();
    }

    return Q(syncInDirectory.query({
      name: tableDetails.segment
    })).then(function(files) {
      var file = files[0];

      function createTemporaryTable() {
        return Q(database.query("create table " + tableDetails.importTableName + " (" + tableDetails.columns.join(',') + ", primary key(" + tableDetails.columns[1] + "))")).then(function () {
          // CrashIssue.log('Created table');
          return importRecordsIntoTemporaryTable();
        });
      }

      function importRecordsIntoTemporaryTable() {
        var loadStartTime = Date.now();

        // CrashIssue.log("Starting CSV import for " + tableDetails.tableName, file);

        return Q(database.importData(file.key, "csv", tableDetails.importTableName, tableDetails.columns, ",", null, null)).then(function (results) {
          var loadEndTime = Date.now();
          CrashIssue.log("Import for " + tableDetails.tableName + " complete. Time: " + (loadEndTime - loadStartTime) + "ms inserted: " + results.insertCount + ", failed: " + results.failureCount);

          return Q.fulfill();
        });
      }

      if(file) {
        CrashIssue.log('Importing ' + tableDetails.tableName + ' records into temporary table...', file);

        return Q(database.query("drop table if exists " + tableDetails.importTableName)).then(function () {
          // CrashIssue.log('Dropped existing table');
          return createTemporaryTable();
        });
      } else {
        return Q.fulfill();
      }
    });
  },

  migrateTable: function(tableDetails, database, existingColumns, tx) {
    var me = this;

    var newColumns = [];

    if(existingColumns.length > 0) {
      newColumns = Ext.Array.difference(tableDetails.columns, existingColumns);
    }

    if (existingColumns === null || existingColumns.length === 0) {
      tx.query("create table if not exists " + tableDetails.tableName + " (" + tableDetails.columns.join(',') + ", primary key (" + tableDetails.columns[1] + "))");
      tx.query("create index if not exists " + tableDetails.tableName + "_state on " + tableDetails.tableName + "(_state)");
    } else {
      Ext.each(newColumns, function (column) {
        tx.query("alter table " + tableDetails.tableName + " add " + column);
      });
    }
    return Q.fulfill();
  },

  applyTable: function(tableDetails, db, tx, stats) {
    var me = this;

    if(tableDetails.reset === true) {
      Q(tx.query("delete from " + tableDetails.tableName));
      Q(tx.query("select changes() as changeCount")).then(function(result) {
        CrashIssue.log('Reset - Deleted ' + result[0].changeCount + ' records from ' + tableDetails.tableName + '.');
      });
    }

    if (!Ext.isEmpty(tableDetails.deleteIdsSegment)) {
      Q(tx.query("delete from " + tableDetails.tableName + " where uuid in (select uuid from " + tableDetails.deleteIdsTableName + ")"));
      Q(tx.query("select changes() as changeCount")).then(function(result) {
        CrashIssue.log('Deleted ' + result[0].changeCount + ' records from ' + tableDetails.tableName + '.');
      });
    }

    if(!Ext.isEmpty(tableDetails.total) && tableDetails.total > 0) {
      // Multiple update specific columns where _state = 'A' -- too bad sqlite doesn't have "update from"

      if(tableDetails.acknowledgeColumns) {
        return Q(db.query('select ' +  tableDetails.acknowledgeColumns.join(',') + ' from ' + tableDetails.importTableName + " where _state = 'A'")).then(function(results) {
          Ext.each(results, function(row) {
            var query = "update " + tableDetails.tableName + " set _state = 'A', ";
            var columns = [], values = [];

            Ext.each(tableDetails.acknowledgeColumns, function(column) {
              if(column != 'uuid') {
                columns.push(column + ' = ?');
                values.push(row[column]);
              }
            });

            values.push(row.uuid);
            query += ' ' + columns.join(',') + ' where uuid = ?';

            Q(tx.query(query, values));
          });

          return inserts();
        });
      } else {
       return inserts();
      }

      function inserts() {
        // Insert or (delete & insert)

        tableDetails.columns = Ext.Array.remove(tableDetails.columns, '_state');
        Q(tx.query("insert or replace into " + tableDetails.tableName + "(_state, " + tableDetails.columns.join(',') + ") select 'C', " + tableDetails.columns.join(',') + " from " + tableDetails.importTableName + " where _state = 'C'"));
        Q(tx.query("select changes() as changeCount")).then(function (result) {
          CrashIssue.log('Upserted ' + result[0].changeCount + ' records in ' + tableDetails.tableName);
          if (stats) {
            stats.upsertCount += result[0].changeCount;
          }
        });
        return Q.fulfill();
      }
    }
    return Q.fulfill();
  }
});
