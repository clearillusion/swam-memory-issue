/**
 * Custom SQL Proxy
 */

//TODO cache + expiry

Ext.define('CrashIssue.data.proxy.SecureSql', {
  alias: 'proxy.stratusSql',
  extend: 'Ext.data.proxy.Proxy',
  requires: [
    'CrashIssue.User',
    'CrashIssue.Util',
    'CrashIssue.space.SpaceSql'
  ],

  isSynchronous: false,

  isSQLProxy: true,

  config: {
    logQueries: false,
    enableCache: false,
    reader: null,
    writer: null,
    table: null,
    defaultDateFormat: 'c',
    myAlias: 'my'
  },

  statics: {
    /**
     * Returns a promise for the database for the given username
     */
    getOrOpenCommonDatabase: function(username) {
      var me = this; // class

      me.commonDatabase = me.commonDatabase || {};

      if (me.commonDatabase[username]) {
        return me.commonDatabase[username];
      }

      // Only available in Sencha Space
      if (!Ext.isSpace) {
        me.commonDatabase[username] = Q.reject('This functionality is only available in Sencha Space! www.Sencha.com');

      } else {
        me.commonDatabase[username] = Q(Ext.onSpaceReady()).then(function() {
          CrashIssue.log("Opening database for " + username);
          return CrashIssue.space.SpaceSql.get(username); // TODO escape username? Common opening point;
        });
      }

      return me.commonDatabase[username];
    }
  },

  constructor: function(config) {
    var me = this;

    me.clearCachedDetails();
    me.dbPromises = me.dbPromises || {};

    if (config.model && !config.model.getIdProperty) {
      me.modelName = config.model.modelName || config.model.getName();

      config.model.addStatics({
        getIdProperty: function() {
          return this.idProperty;
        }
      });
    }

    this.callParent(arguments);
  },

  logQuery: function(query, params) {
    if (!this.getLogQueries()) {
      return;
    }

    if (params !== undefined) {
      query = query.replace(/%/g, '\%\%');
      CrashIssue.log("PROXY: " + query, params);
    } else {
      CrashIssue.log("PROXY: " + query);
    }
  },

  /**
   * @override
   * Override that uses model.getName and iterates over getFields array
   * differently so that it works in ExtJS 5
   */
  updateModel: function(model) {
    var me = this;

    if (model) {
      me.modelName = model.modelName || model.getName();

      var defaultDateFormat = me.getDefaultDateFormat(),
        table = me.modelName.slice(me.modelName.lastIndexOf('.') + 1),
        fields = model.getFields();

      // Adjust the date format for date fields
      //TODO is this needed?
      for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        if (field.isDateField && !field.getDateFormat()) {
          field.dateFormat = defaultDateFormat;
        }
      }

      // Set the table name if not yet specified
      if (!me.getTable()) {
        me.setTable(table);
      }

      me.instanceModel = model;

      // Mark to reload the colum definitions
      me.clearCachedDetails();
    }

    // callSuper is broke for overrides in production builds (refer to SDKTOOLS-945 for more info)
    Ext.data.proxy.Client.superclass.updateModel.apply(me, arguments);
  },

  /**
   * Removes any cached details about columns for known tables
   */
  clearCachedDetails: function() {

    // Promises for loading column details
    this.columnDetailsPromises = {};

    // columnDetails is a map of tableName -> columnInfo
    this.columnDetails = {};

    // columnNames is a map of tableName -> [ columnNames:string ]
    this.columnNames = {};

    // idQueryCache is a map of id -> promise for select results
    this.idQueryCache = {};
  },

  /**
   * Returns a promise for the open database connection for the current user
   */
  getDatabase: function() {
    var me = this;
    var username = CrashIssue.User.getUser().username;

    if (!username) {
      return Q.reject('No current user available to open database');
    }

    if (me.dbPromises[username]) {

      // If the database promise is pending, just return it
      if (Q.isPending(me.dbPromises[username])) {
        return me.dbPromises[username];
      }

      // Make sure we (still) have column details, otherwise we need to re-load them
      if (me.columnDetails[me.getTable()]) {
        return me.dbPromises[username];
      }
    }

    me.dbPromises[username] = CrashIssue.data.proxy.SecureSql.getOrOpenCommonDatabase(username).then(function(db) {
      return db.tx(function(transaction) {
        return me.cacheTableColumnDetails(transaction, me.getTable()).then(function() {
          return db;
        });
      });
    });

    return me.dbPromises[username];
  },

  operationTx: function(operation, work) {
    var me = this;
    return Q(me.getDatabase()).then(function(db) {
      return db.tx(function(transaction) {
        operation.transaction = transaction;
        return work(transaction);
      });
    });
  },

  /**
   * Returns a promise for loading the column details for the given table
   */
  cacheTableColumnDetails: function(transaction, table) {
    var me = this;

    return Q().then(function() {

      if (me.columnDetailsPromises[table]) {
        return me.columnDetailsPromises[table];
      }

      me.columnDetailsPromises[table] = Q(transaction.createQueryGroup()).then(function(queryGroup) {

        var sqlQuery = "pragma table_info('" + table + "')";

        me.logQuery(sqlQuery);

        var executePromise = Q(queryGroup.query(sqlQuery)).then(function(pragmaResult) {
          var columns = [];
          var columnNames = [];

          var resultCount = pragmaResult.length;

          for (var i = 0; i < resultCount; i++) {
            var rowData = pragmaResult[i];

            if (rowData.name !== '_state') {
              columns.push({
                //TODO other detail?
                name: rowData.name
              });

              columnNames.push(rowData.name);
            }
          }

          //CrashIssue.log("Loaded columns for table " + table, columns);

          me.columnDetails[table] = columns;
          me.columnNames[table] = columnNames;

          return columns;
        });

        queryGroup.execute();
        return executePromise;
      });

      return me.columnDetailsPromises[table];
    });
  },

  /**
   * Standard proxy create function
   */
  create: function(operation, callback, scope) {
    var me = this;

    // Load db first so all column details are available
    me.operationTx(operation, function(transaction) {
      operation.setStarted();

      return me.insertRecords(operation.getRecords(), operation).then(function() {
        return me.postProcessRecords(operation.getRecords(), operation).then(function(affectedIds) {
          return me.commitRecords(operation.getRecords()).then(function() {

            // Finalize the operation and callback
            operation.setSuccessful(true);

            // Historical - operation.setCompleted should call the callbacks
            if (typeof callback === 'function') {
              callback.call(scope || me, operation);
            }

            // Notify that the db has changed
            me.fireEvent('proxyrefresh', affectedIds);
          });
        });
      });

    }).fail(function(error) {

      // Finalize the operation with the error and callback
      operation.setException(error);

      // Historical - operation.setException should call the callbacks
      if (typeof callback === 'function') {
        callback.call(scope || me, operation);
      }
    });
  },

  /**
   * Standard proxy read function
   */
  read: function(operation, callback, scope) {
    var me = this;

    // Load db first so all column details are available
    return me.operationTx(operation, function(transaction) {

      // Mark our start
      operation.setStarted();

      var idProperty = me.getModel().getIdProperty(),
        params = operation.getParams() || {},
        id = params[idProperty] || operation.getId();

      // Merge the operation details into params
      params = Ext.apply(params, {
        page: operation.getPage(),
        start: operation.getStart(),
        limit: operation.getLimit(),
        sorters: operation.getSorters(),
        filters: operation.getFilters()
      });

      return me.selectRecords((id !== undefined) ? id : params, operation).then(function(modelInstances) {
        //TODO non-SQL filtering

        var resultSet = new Ext.data.ResultSet({
          records: modelInstances,
          success: true
        });

        // Finalize the operation and callback
        operation.process(resultSet, null, null, true);

        // Historical - operation.process should call the callbacks
        if (typeof callback === 'function') {
          callback.call(scope || me, operation);
        }
      });

    }).fail(function(error) {

      // Finalize the operation with the error and callback
      operation.setException(error);

      // Historical - operation.setException should call the callbacks
      if (typeof callback === 'function') {
        callback.call(scope || me, operation);
      }
    });
  },

  /**
   * Standard proxy update function
   */
  update: function(operation, callback, scope) {
    var me = this;

    // Load db first so all column details are available
    me.operationTx(operation, function(transaction) {

      // Mark our start
      operation.setStarted();

      var recs = operation.getRecords();
      // Flush the id cache for the updated records
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        me.idQueryCache[r.getId()] = null;
      }

      return me.updateRecords(recs, operation).then(function() {
        return me.postProcessRecords(recs, operation).then(function(affectedIds) {
          return me.commitRecords(recs).then(function() {

            // Finalize the operation and callback
            operation.setSuccessful(true);
            // Historical - operation.setCompleted should call the callbacks
            if (typeof callback === 'function') {
              callback.call(scope || me, operation);
            }

            // Notify that the db has changed
            me.fireEvent('proxyrefresh', affectedIds);
          });
        });
      });

    }).fail(function(error) {

      // Finalize the operation with the error and callback
      operation.setException(error);

      // Historical - operation.setException should call the callbacks
      if (typeof callback === 'function') {
        callback.call(scope || me, operation);
      }
    });
  },

  /**
   * Standard proxy erase function
   */
  erase: function(operation, callback, scope) {
    var me = this;

    me.operationTx(operation, function(transaction) {

      // Mark our start
      operation.setStarted();

      var recs = operation.getRecords();
      // Flush the id cache for the deleted records
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        me.idQueryCache[r.getId()] = null;
      }

      //TODO cascading validations on delete

      return me.destroyRecords(recs, operation).then(function() {
        return me.commitRecords(recs).then(function() {

          // Finalize the operation and callback
          operation.setSuccessful(true);

          if (typeof callback === 'function') {
            callback.call(scope || me, operation);
          }

          // Notify that the db has changed
          me.fireEvent('proxyrefresh');
        });

      }).fail(function(error) {

        // Finalize the operation with the error and callback
        operation.setException(error);

        // Historical - operation.setException should call the callbacks
        if (typeof callback === 'function') {
          callback.call(scope || me, operation);
        }

        // Notify that the db has changed
        me.fireEvent('proxyrefresh');
      });
    });
  },

  /**
   * Converts the given query results into model instances
   */
  convertSelectResult: function(params, queryResult, operation) {
    // params and operation can be null

    var me = this;
    var idProperty = me.getModel().getIdProperty();
    var Model = me.instanceModel || me.getModel();
    var modelInstances = [];

    var resultCount = queryResult.length;

    if (resultCount > 0) {
      for (var i = 0; i < resultCount; i++) {
        var record;
        var rowData = queryResult[i];

        var recordCreator = (operation && operation.getRecordCreator) ? operation.getRecordCreator() : null;
        if (recordCreator) {
          record = recordCreator(rowData);
        } else {
          record = Ext.create(Model, rowData);
        }

        modelInstances.push(record);
      }
    }

    return Q.fulfill(modelInstances);
  },

  /**
   * Groups the given query results
   */
  groupSelectResult: function(options, queryResult) {
    var me = this;

    //TODO the fieldName related logic likely belongs in the Form specific subclass, but would complicate things

    return Q().then(function() {
      var groups = {},
        i, j, row, key;

      for (i = 0; i < queryResult.length; i++) {
        row = queryResult[i];
        key = me.groupForRow(options, row);
        if (key !== undefined) {
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(row);
        }
      }

      var groupKeys = Object.keys(groups);
      var resultGroups = groupKeys.map(function(key) {
        var groupResult = {
          groupKey: key
        };

        var group = groups[key];

        // Loop for each output column
        for (i = 0; i < options.groupSelect.length; i++) {
          var gs = options.groupSelect[i];
          // Determine where we'll get the data from in the row
          var sourceColumn = (gs.getSourceType() === 'fieldName') ? CrashIssue.Util.getColumnNameForFieldName(gs.getSource()) : (gs.getSource());
          if (!sourceColumn) {
            throw 'Unknown data source';
          }

          // And where in the output we'll put it
          var destField = (gs.getField());

          // Seed the value
          var groupValue;

          if (Ext.isFunction(gs.getGroupSeed())) {
            groupValue = gs.getGroupSeed().apply(gs, [key]);
          } else {
            groupValue = gs.getGroupSeed();
          }

          // Compute the grouping
          for (j = 0; j < group.length; j++) {
            var row = group[j];
            groupValue = gs.getGroupFn().apply(gs, [row[sourceColumn], groupValue, row]);
          }

          // Finalize, if needed
          if (gs.getGroupFinalize()) {
            groupValue = gs.getGroupFinalize().apply(gs, [groupValue]);
          }

          groupResult[destField] = groupValue;
        }

        return groupResult;
      });

      return resultGroups;
    });
  },

  groupForRow: function(options, row) {
    var group = [];

    for (var i = 0; i < options.groupBy.length; i++) {
      var gb = options.groupBy[i];
      if (gb.groupFn) {
        var groupFnResult = gb.groupFn(row);
        if (groupFnResult !== undefined) {
          group.push(groupFnResult);
        }

      } else if (gb.column) {
        group.push(row[gb.column]);

      } else if (gb.field) {
        group.push(row[gb.field]);

      } else if (gb.fieldName) {
        group.push(row[CrashIssue.Util.getColumnNameForFieldName(gb.fieldName)]);

      } else {
        throw "Unknown groupBy " + JSON.stringify(gb);
      }
    }

    if (!group.length) {
      return undefined;
    }

    return group.join('|');
  },

  /**
   * Builds the select query for the given parameters
   */
  createSelectQuery: function(params) {
    var me = this;
    var table = me.getTable();
    var idProperty = me.getModel().getIdProperty();

    var sqlQuery = "SELECT * FROM " + table;

    //TODO escaping!
    if (!Ext.isObject(params)) {
      sqlQuery += " WHERE " + idProperty + " = '" + params + "' AND _state != 'D'";

    } else {
      sqlQuery += " WHERE _state != 'D'";

      //TODO handle criteria
    }

    //TODO filters in sql query
    if (params.filters) {
      Ext.each(params.filters, function(filter) {
        // some logic to check if field exists
        var fld = me.getModel().getField(filter.getProperty());
        if (fld) {
          sqlQuery += (" AND " + filter.getProperty() + " " + me.createFilterOperator(filter) +
            " " + me.createFilterValue(filter, fld));
        }
      });
    }

    return Q.fulfill(sqlQuery);
  },

  createFilterOperator: function(filter) {
    if (filter.getOperator()) {
      //TODO in
      //TODO like
      switch (filter.getOperator()) {
        case '&gt;=':
          return '>=';
        case '&gt;':
          return '>';
        default:
          return filter.getOperator();
      }
    }
    return '=';
  },

  createFilterValue: function(filter, fld) {
    if (fld.getType() == 'string' || (fld.getType() == 'auto' && fld.reference)) {
      return "'" + filter.getValue() + "'";
    }
    return filter.getValue();
  },

  /**
   * Returns a promise for an array of model instances for the given read operation
   */
  selectRecords: function(params, operation) {
    var me = this;
    var id;
    var selectPromise;

    if (!Ext.isObject(params)) { // id lookup
      id = params;
      if (me.idQueryCache[id]) {
        selectPromise = me.idQueryCache[id];
      }
    }

    if (!selectPromise) {
      selectPromise = me.createSelectQuery(params).then(function(sqlQuery) {
        return Q(operation.transaction).then(function(transaction) {
          return Q(operation.transaction.createQueryGroup()).then(function(queryGroup) {
            me.logQuery(sqlQuery);

            // add the query to the tx
            var executePromise = Q(queryGroup.query(sqlQuery));

            queryGroup.execute();
            return executePromise;
          });
        });
      });

      if (me.getEnableCache() && id) {
        me.idQueryCache[id] = selectPromise;
      }
    }

    return selectPromise.then(function(queryResult) {
      return me.convertSelectResult(params, queryResult, operation);
      //TODO do we need record commit here?
    });
  },

  /**
   * Builds the insert queries necessary to create the specified record
   */
  createInsertQueries: function(id, record, baseColumns, baseValues, operation) {
    var me = this;

    var table = me.getTable();

    var query = "INSERT INTO " + table + " (" + baseColumns.join(', ') + ") VALUES (?";
    for (var i = 0; i < (baseColumns.length - 1); i++) {
      query += ",?";
    }
    query += ")";

    var insertQuery = {
      query: query,
      record: record,
      columns: [].concat(baseColumns),
      values: [].concat(baseValues),
      after: function(record) {
        record.setId(id);
      }
    };

    return Q.fulfill([insertQuery]);
  },

  /**
   * Creates the specified records give a create operation
   */
  insertRecords: function(records, operation) {
    var me = this;

    return Q().then(function() {

      var idProperty = me.getModel().getIdProperty();

      var queries = [];
      var recordPromises = [];

      // Build the queries for each record
      Ext.each(records, function(record) {

        //TODO other id types?

        // Use an existing id if provided
        var id = record.get('_' + idProperty);

        // Otherwise generate a new one
        if (Ext.isEmpty(id)) {
          id = CrashIssue.Util.generateUuid();
        }

        var baseColumns = ['_state', idProperty];
        var baseValues = ['N', id];

        var recordPromise = me.appendRecordValues(id, record, baseColumns, baseValues, operation).then(function() {
          return me.createInsertQueries(id, record, baseColumns, baseValues, operation).then(function(insertQueries) {
            queries = queries.concat(insertQueries);
          });
        });

        recordPromises.push(recordPromise);
      });

      // Run all the queries
      return Q.all(recordPromises).then(function() {
        return me.runQueries(queries, operation.transaction);
      });
    });
  },

  /**
   * Builds the queries for updating the specified record
   */
  createUpdateQueries: function(id, record, baseColumns, baseValues, operation) {
    var me = this;

    var table = me.getTable();
    var idProperty = me.getModel().getIdProperty();

    var query = "UPDATE " + table + " SET _state = (CASE WHEN _state = 'N' THEN 'N' ELSE 'U' END)";

    for (var i = 0; i < baseColumns.length; i++) {
      query += ", ";
      query += baseColumns[i];
      query += " = ?";
    }

    query += " WHERE " + idProperty + " = ? AND _state != 'D'";

    var columns = [].concat(baseColumns);
    var values = [].concat(baseValues);
    values.push(id);

    var updateQuery = {
      query: query,
      columns: columns,
      values: values,
      record: record
    };

    return Q.fulfill([updateQuery]);
  },

  /**
   * Updates the specified records given an update operation
   */
  updateRecords: function(records, operation) {
    var me = this;

    return Q().then(function() {

      var queries = [];
      var recordPromises = [];

      // Build the queries for each record
      Ext.each(records, function(record) {
        var id = record.getId();
        var columns = [];
        var values = [];

        var recordPromise = me.appendRecordValues(id, record, columns, values, operation).then(function() {
          return me.createUpdateQueries(id, record, columns, values, operation).then(function(updateQueries) {
            queries = queries.concat(updateQueries);
          });
        });

        recordPromises.push(recordPromise);
      });

      // Run all the queries
      return Q.all(recordPromises).then(function() {
        return me.runQueries(queries, operation.transaction);
      });
    });
  },

  commitRecords: function(records) {
    var me = this;

    return Q().then(function() {
      Ext.each(records, function(record) {
        record.commit();
      });

      return records;
    });
  },

  /**
   * Builds the queries to remove the specified record
   */
  createDeleteQueries: function(id, record, operation) {
    var me = this,
      table = me.getTable(),
      idProperty = me.getModel().getIdProperty(),
      query = "UPDATE " + table + " SET _state = 'D' WHERE " + idProperty + " = ?",
      deleteQuery;

    deleteQuery = {
      query: query,
      values: [id],
      record: record
    };

    return Q.fulfill([deleteQuery]);
  },

  /**
   * Removes the specified records given the delete operation
   */
  destroyRecords: function(records, operation) {
    var me = this;

    return Q().then(function() {
      var queries = [],
        recordPromises = [];

      Ext.each(records, function(record) {
        recordPromises.push(me.createDeleteQueries(record.getId(), record, operation).then(function(deleteQueries) {
          queries = queries.concat(deleteQueries);
        }));
      });

      return Q.all(recordPromises).then(function() {
        return me.runQueries(queries, operation.transaction);
      });
    });
  },

  /**
   * Adds the columns and values for the specified record to the input (columns, values) arrays
   */
  appendRecordValues: function(id, record, columns, values, operation) {
    var me = this;
    var data = me.getRecordData(record);

    if (!me.columnDetails[me.getTable()]) {
      throw "Column details not cached";
    }

    var cds = me.columnDetails[me.getTable()];
    for (var i = 0; i < cds.length; i++) {
      var c = cds[i];
      if (c.name !== 'uuid' && columns.indexOf(c.name) < 0) {
        var v = data[c.name];

        if (Ext.isObject(v)) {
          v = v.uuid || v.data.uuid;
        }

        columns.push(c.name);
        values.push(!Ext.isEmpty(v) ? v.toString() : v);
      }
    }

    return Q.fulfill();
  },

  /**
   * Opens a new tx and runs the specified list of queries. Resolves when all queries have resolved.
   */
  runQueries: function(queries, transaction) {
    var me = this;

    return Q(transaction).then(function(transaction) {
      return Q(transaction.createQueryGroup()).then(function(queryGroup) {

        var completedRecords = [],
          txPromises = [];

        queries.forEach(function(queryDetail) {
          me.logQuery(queryDetail.query, queryDetail.values);

          txPromises.push(Q(queryGroup.query(queryDetail.query, queryDetail.values)).then(function(updateResult) {
            if (queryDetail.after) {
              queryDetail.after(queryDetail.record);
            }
            completedRecords.push(queryDetail.record); // Assume it updated correctly
          }));
        });

        var executePromise = Q.all(txPromises).then(function() {
          return new Ext.data.ResultSet({
            records: completedRecords,
            success: true
          });
        });

        queryGroup.execute();
        return executePromise;
      });
    });
  },

  /**
   * Converts the specified record into a map of (ext) field -> value.
   */
  getRecordData: function(record) {
    var me = this,
      fields = record.getFields(),
      idProperty = record.getIdProperty(),
      associated = record.getAssociatedData(),
      data = {},
      name, value;

    Ext.each(fields, function(field) {
      if (field.getPersist()) {
        name = field.name;
        if (name === idProperty) {
          return;
        }
        value = record.get(name);
        if (value === undefined) {
          value = associated[name];
        }
        if (field.isDateField) {
          value = me.writeDate(field, value);
        }
        data[name] = value;
      }
    }, me);

    return data;
  },

  /**
   * Output the date in the correct format for storage
   */
  //TODO readDate?
  writeDate: function(field, date) {
    if (Ext.isEmpty(date)) {
      return null;
    }

    var dateFormat = field.getDateFormat() || this.getDefaultDateFormat();
    switch (dateFormat) {
      case 'timestamp':
        return date.getTime() / 1000;
      case 'time':
        return date.getTime();
      default:
        return Ext.Date.format(date, dateFormat);
    }
  },

  /**
   * Apply after/update insert processes
   */
  postProcessRecords: function(records, operation) {
    return Q(records.map(function(r) {
      return r.getId();
    }));
  },

  selectByTable: function(criteria, options, transaction) {
    return Q.fulfill(this.getTable());
  },

  /**
   *
   * @param {Array} criteria - set of criteria to filter on
   * @param {Object} options
   * @returns {*}
   */
  selectBy: function(criteria, options) {
    var me = this;

    options = options || {};

    var operation = {}; // Fake operation to hold the tx

    return me.operationTx(operation, function(transaction) {

      return me.selectByTable(criteria, options, transaction).then(function(table) {
        var queryCtxList = Ext.Array.from(table).map(function(tableName) {
          return me.buildQuery(tableName, criteria, options);
        });

        return Q(transaction.createQueryGroup()).then(function(queryGroup) {
          var executePromise = Q.all(queryCtxList.map(function(queryCtx) {
            me.logQuery(queryCtx.selectSql, queryCtx.parameters);
            return queryGroup.query(queryCtx.selectSql, queryCtx.parameters).then(function(results) {
              return {
                table: queryCtx.table,
                results: results
              };
            });

          })).then(function(resultCtx) {
            return me.processQueryResult(resultCtx, options, operation);
          });

          queryGroup.execute();
          return executePromise;
        });
      });
    }).fail(function(error) {
      CrashIssue.log("selectBy failed", error);
      return Q.reject(error);
    });
  },

  buildQuery: function(table, criteria, options) {
    var me = this,
      selectCtx = me.buildSelect(options.joins || [], table),
      whereCtx = me.buildWhere(selectCtx.hasMyTableJoin ? criteria || [] : [{
        column: '_state',
        comparison: 'ne',
        value: 'D'
      }].concat(criteria || [])),
      parameters = (selectCtx.parameters || []).concat(whereCtx.parameters);

    var selectSql = Ext.String.format("SELECT {0}\nFROM {1}\n{2}\nWHERE {3}", selectCtx.selects.join(', '), selectCtx.froms.join(', '), selectCtx.fromJoins.join('\n'), whereCtx.whereClauses.join("\nAND "));

    // Ordering
    if (options.orderBy && !options.groupBy) {
      var orderByClauses = [];

      for (var i = 0; i < options.orderBy.length; i++) {
        var ob = options.orderBy[i];
        if (ob.fieldName || ob.column) {
          orderByClauses.push(CrashIssue.Util.getColumnNameForFieldName(ob.fieldName || ob.column) + " " + (ob.direction == 'desc' ? 'DESC' : 'ASC'));
        } else if (ob.columnRaw) {
          orderByClauses.push(ob.columnRaw + " " + (ob.direction == 'desc' ? 'DESC' : 'ASC'));
        } else {
          throw "Unknown order by details " + JSON.stringify(ob);
        }
      }

      if (orderByClauses.length > 0) {
        selectSql += " ORDER BY " + orderByClauses.join(", ");
      }
    }

    if (Ext.isNumber(options.limit)) {
      selectSql += Ext.String.format("\nLIMIT {0}", options.limit);
    }

    return {
      table: table,
      selectSql: selectSql,
      parameters: parameters
    };
  },

  /**
   * Factory method to build the where clauses and parameter list from a set of criteria.
   * @private
   * @param {Array} criteria
   * @returns {{whereClauses: String[], parameters: Object[]}}
   */
  buildWhere: function(criteria) {
    var me = this,
      whereClauses = [],
      parameters = [];

    var comparisons = {
      eq: "=",
      gt: ">",
      lt: "<",
      ge: ">=",
      le: "<=",
      ne: "!="
    };

    for (var i = 0; i < criteria.length; i++) {
      var criterion = criteria[i];
      var column = criterion.column || criterion.field;

      if (!column && criterion.fieldName) {
        column = CrashIssue.Util.getColumnNameForFieldName(criterion.fieldName);
      }

      if (!column && (criterion.comparison !== 'notExistsQuery')) {
        throw "Unknown/incomplete criteria: " + JSON.stringify(criterion);
      }

      if (criterion.fieldType) {
        switch (criterion.fieldType) {
          case 'ref':
            column = column + '_refs';
            break;
        }
      }

      //TODO should pass the whole context of the join - my alias isn't always right
      if (column && (column.indexOf('.') === -1)) {
        column = Ext.String.format('{0}.{1}', me.getMyAlias(), column);
      }


      switch (criterion.comparison) {
        case 'in':
          var indexOfNull = criterion.value.indexOf(null);
          var values = criterion.value;

          if (indexOfNull >= 0) {
            values = values.slice(0, indexOfNull).concat(values.slice(indexOfNull + 1));
          }

          var clause = "(";

          // Non null values
          if (values.length > 0) {
            clause += column;
            clause += " in (?";
            parameters.push(values[0]);
            for (var v = 1; v < values.length; v++) {
              clause += ",?";
              parameters.push(values[v]);
            }
            clause += ")";
          }

          // null value
          if (indexOfNull >= 0) {
            if (values.length > 0) {
              clause += " or ";
            }

            clause += column;
            clause += " is null";
          }

          clause += ")";

          // add to output
          whereClauses.push(clause);
          break;
        case 'notExistsQuery':
          whereClauses.push("not exists (" + criterion.query + ")");
          if (criterion.parameters) {
            parameters = parameters.concat(criterion.parameters);
          }
          break;
        case 'inQuery':
          whereClauses.push("(" + column + " in (" + criterion.query + "))");
          if (criterion.parameters) {
            parameters = parameters.concat(criterion.parameters);
          }
          break;
        case 'between':
          if (!criterion.max || !criterion.min) {
            throw 'Between criteria - max and min constraints required';
          }
          whereClauses.push(Ext.String.format('{0} between ? and ?', column));
          parameters.push(criterion.min);
          parameters.push(criterion.max);
          break;
        case 'notNull':
          whereClauses.push(Ext.String.format('{0} is not null', column));
          break;
        case 'isNull':
          whereClauses.push(Ext.String.format('{0} is null', column));
          break;
        case 'like':
          whereClauses.push(Ext.String.format('{0} like ?', column));
          if (!Ext.isEmpty(criterion.value)) {
            parameters.push(criterion.value.toString());
          }
          break;
        default:
          whereClauses.push(Ext.String.format('{0} {1} {2}', column, comparisons[criterion.comparison || 'eq'], !Ext.isEmpty(criterion.value) ? "?" : criterion.valueColumn));
          if (!Ext.isEmpty(criterion.value)) {
            parameters.push(criterion.value.toString());
          }
          break;
      }
    }

    return {
      whereClauses: whereClauses,
      parameters: parameters
    };
  },

  /**
   * Factory method to parse and construct the select and from parameters for a select query.
   *
   * @private
   *
   * @param {Object[]} joins
   * @param {String} table - the root table name
   *
   * @returns {{ froms: String[], selects: String[], parameters: String[] }}
   */
  buildSelect: function(joins, table) {
    var me = this,
      froms = [],
      fromJoins = [],
      selects = [],
      joinParameters = [],
      myCriterion = {
        table: table,
        alias: me.getMyAlias(),
        selects: [{
          column: '*'
        }]
      },
      hasMyTableJoin = !Ext.isEmpty(joins) ? Ext.Array.some(joins, me.recursiveHasMyTableJoin, me) : false,
      tableJoins = !Ext.isEmpty(joins) ? hasMyTableJoin ? joins : [myCriterion].concat(joins) : [myCriterion];

    for (var i = 0; i < tableJoins.length; i++) {
      var tableJoin = tableJoins[i],
        joinCtx = me.parseJoin(tableJoin, table, false);

      if (!Ext.isEmpty(joinCtx.from)) {
        if (joinCtx.fromUsesJoinSyntax) {
          fromJoins.push(joinCtx.from);
        } else {
          froms.push(joinCtx.from);
        }
      }

      if (!Ext.isEmpty(joinCtx.selects)) {
        Ext.Array.push(selects, joinCtx.selects);
      }

      if (!Ext.isEmpty(joinCtx.parameters)) {
        Ext.Array.push(joinParameters, joinCtx.parameters);
      }
    }

    return {
      froms: froms,
      fromJoins: fromJoins,
      selects: selects,
      parameters: joinParameters,
      hasMyTableJoin: hasMyTableJoin
    };
  },

  processQueryResult: function(resultCtxList, options, operation) {
    var me = this,
      i;

    if (options.groupBy) {
      var queryResult = Ext.Array.flatten(resultCtxList.map(function(resultCtx) {
        return resultCtx.results;
      }));
      return me.groupSelectResult(options, queryResult).then(function(groups) {
        return groups;
      });
    } else if (options.countQuery) {
      var count = 0,
        countList = resultCtxList.map(function(resultCtx) {
          return parseInt(resultCtx.results[0].rowCount);
        });
      for (i = 0; i < countList.length; i++) {
        count += countList[i];
      }
      return count;
    } else {
      return Q.all(resultCtxList.map(function(resultCtx) {
        return me.convertSelectResult({
          selectTable: resultCtx.table
        }, resultCtx.results, operation);
      })).then(function(modelInstances) {
        return Ext.Array.flatten(modelInstances);
      });
    }
  },

  parseJoin: function(join, table, isDependentJoin) {
    var me = this;

    me.updateMyTableJoin(join, table);

    var joinTable = join.table,
      joinAlias = join.alias,
      parameters = [],
      selects = [],
      fromUsesJoinSyntax,
      from;

    if (Ext.isEmpty(joinTable)) {
      throw "Join option requires a table specified.";
    }

    if (Ext.isEmpty(joinAlias)) {
      throw "Join option requires an alias specified.";
    }

    if (join.criteria) {
      var joinCtx = me.buildWhere(joinAlias === me.getMyAlias() ? [{
        column: '_state',
        comparison: 'ne',
        value: 'D'
      }].concat(join.criteria) : join.criteria);

      if (joinCtx.whereClauses.length === 0) {
        throw 'Outer join option requires valid criteria';
      }

      from = Ext.String.format('\n{0} JOIN {1} {2} ON {3}', (join.outer ? 'LEFT OUTER' : ''), joinTable, joinAlias, joinCtx.whereClauses.join(' AND '));
      fromUsesJoinSyntax = true;

      if (!Ext.isEmpty(joinCtx.parameters)) {
        Ext.Array.push(parameters, joinCtx.parameters);
      }
    } else if (isDependentJoin) {
      throw "Outer join option requires criteria";

    } else {
      from = Ext.String.format('{0} {1}', joinTable, joinAlias);
      fromUsesJoinSyntax = false;
    }

    if (join.selects) {
      Ext.Array.each(join.selects, function(select) {

        if (Ext.isEmpty(select.column) && !select.countQuery) {
          throw "Join select option requires a column";
        }

        var selectStatement;

        if (!select.countQuery) {
          selectStatement = Ext.String.format("{0}.{1}{2}", joinAlias, select.column, !Ext.isEmpty(select.alias) ? ' as ' + select.alias : "");
        } else {
          selectStatement = Ext.String.format("count(1) as rowCount");
        }

        selects.push(selectStatement);
      });
    }

    if (join.joins) {
      var i, innerJoin, joinCtx2;
      for (i = 0; i < join.joins.length; i++) {
        innerJoin = join.joins[i];
        joinCtx2 = me.parseJoin(innerJoin, table, true);

        if (!Ext.isEmpty(joinCtx2.from)) {
          from = from + ' ' + joinCtx2.from;
        }

        if (!Ext.isEmpty(joinCtx2.parameters)) {
          Ext.Array.push(parameters, joinCtx2.parameters);
        }

        if (!Ext.isEmpty(joinCtx2.selects)) {
          selects.push(joinCtx2.selects);
        }
      }
    }

    return {
      from: from,
      fromUsesJoinSyntax: fromUsesJoinSyntax,
      selects: selects,
      parameters: parameters
    };
  },

  isAlias: function(join, alias) {
    return join.alias == alias;
  },

  recursiveHasMyTableJoin: function(join) {
    return this.isAlias(join, this.getMyAlias()) || Ext.isArray(join.joins) && Ext.Array.some(join.joins, this.recursiveHasMyTableJoin, this);
  },

  updateMyTableJoin: function(join, table) {
    var me = this;
    if (me.isAlias(join, me.getMyAlias())) {
      join.table = table;
      join.selects = join.selects || [{
        column: '*'
      }];

    } else if (join.joins) {
      var js = join.joins;
      for(var i = 0; i < js.length; i++) {
        var innerJoin = js[i];
        me.updateMyTableJoin(innerJoin, table);
      }
    }
  }
});
