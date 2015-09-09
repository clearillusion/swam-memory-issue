Ext.define('CrashIssue.data.sync.RetrieveTableSyncTask', {
  extend: 'CrashIssue.data.sync.TableSync',

  config: {
    clientTableName: undefined,
    serverTableName: undefined,
    serverColumns: undefined
  },

  constructor: function(config) {
    var me = this;
    me.initConfig(config);
    me.callParent([config]);
  },

  /***
   * Generate any segments and store in syncOutDirectory
   * @param syncOutDirectory
   * @returns Sync json for task
   */
  prepareRequest: function(syncOutDirectory) {
    var me = this;

    var task = {
      "type": "retrieve-table",
      "tableName": me.getServerTableName()
    };

    return Q.fulfill(task);
  },

  clientTableInfo: function(task) {
    var me = this;
    return {
      tableName: me.getClientTableName(),
      importTableName: "temp_import_" + me.getClientTableName(),
      columns: task.columns,
      acknowledgeColumns: task.acknowledgeColumns,
      segment: task.segment,
      total: task.total,
      deleteIdsSegment: task.deleteIdsSegment,
      deleteIdsTableName: "temp_deletes_" + me.getClientTableName(),
      reset: task.reset
    };
  },

  /***
   * @param task
   * @returns {Ext.Promise}
   * @private
   */
  processResults: function(syncId, task, syncInDirectory, database) {
    var me = this;
    // CrashIssue.log('Processing results for task ' + task.id + ' ...', task);
    return me.processTable(me.clientTableInfo(task), syncInDirectory, database).then(function() {

      // Import deleteIds segment [if exists]

      if(!Ext.isEmpty(task.deleteIdsSegment)) {
        return me.processTable({
            tableName: "temp_deletes_" + me.getClientTableName(),
            importTableName: "temp_deletes_" + me.getClientTableName(),
            columns: ['_state', task.columns[1]],
            segment: task.deleteIdsSegment
          }, syncInDirectory, database);
      }

      return Q.fulfill();
    });
  },

  migrate: function(syncId, task, syncInDirectory, database) {
    var me = this;
    var clientTableInfo = me.clientTableInfo(task);

    // CrashIssue.log('Migrate for task ' + task.id + ' ...', task);

    return Q(database.createQueryGroup()).then(function (tx) {
      return Q(database.createQueryGroup()).then(function (tx2) {
        tx.query("pragma table_info('" + clientTableInfo.tableName + "')").then(function (tableInfo) {
          return me.migrateTable(me.clientTableInfo(task), database, Ext.Array.pluck(tableInfo, 'name'), tx2);
        });
        return Q(tx.execute()).then(function () {
          return Q(tx2.execute());
        });
      });
    });
  },

  /***
   * Apply any changes within the context of the provided transaction
   * @param task
   * @returns {Ext.Promise}
   * @private
   */
  applyChanges: function(syncId, task, db, tx, stats) {
    var me = this;
    // CrashIssue.log('Apply changes for task ' + task.id + ' ...', task);
    return me.applyTable(me.clientTableInfo(task), db, tx, stats);
  }
});
