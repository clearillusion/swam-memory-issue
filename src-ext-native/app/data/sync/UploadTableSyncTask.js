Ext.define('CrashIssue.data.sync.UploadTableSyncTask', {
  extend: 'CrashIssue.data.sync.TableSync',

  config: {
    clientTableName: undefined,
    serverTableName: undefined
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
  prepareRequest: function(syncOutDirectory, database, stats) {
    var me = this;

    var task = {
      type: "upload-table",
      tableName: me.getServerTableName()
    };

    return Q(database.query("select tbl_name from sqlite_master where type = 'table' and tbl_name = '" + me.getClientTableName() + "'")).then(function(x) {
      if (x.length === 0) {
        // First sync, no table
        return Q.fulfill(task);
      }

      var segmentId = CrashIssue.Util.generateUuid() + "-" + me.getServerTableName() + ".csv";

      return me.extractChangedRecords({
        tableName: me.getClientTableName(),
        segment: segmentId
      }, syncOutDirectory, database, stats).then(function (result) {
        if(result) {
          task.segment = segmentId;
          task.columns = [].concat(result.columns);
        }
        return Q.fulfill(task);
      });
    });
  },

  countDirtyRecords: function(database, stats) {
    var me = this;

    return Q(database.query("select tbl_name from sqlite_master where type = 'table' and tbl_name = '" + me.getClientTableName() + "'")).then(function(x) {
      if (x.length === 0) {
        // First sync, no table
        return Q.fulfill();
      }

      return me.countChangedRecords({
        tableName: me.getClientTableName()
      }, database).then(function (count) {
        stats.dirtyCount += count;
        return Q.fulfill();
      });
    });
  },

  /***
   * @param task
   * @returns {Ext.Promise}
   * @private
   */
  processResults: function(syncId, task, syncInDirectory, database) {
    var me = this;
    // CrashIssue.log('Processing results for task ' + task.id + ' ...', task);

    return Q.fulfill();
  },

  /***
   * Migrate the database for this task
   * @returns {Ext.Promise}
   * @private
   */
  migrate: function(syncId, task, syncInDirectory, database) {
    var me = this;
    //CrashIssue.log('Migrating for task ' + task.id + ' ...', task);

    return Q.fulfill();
  },

  /***
   * Apply any changes within the context of the provided transaction
   * @param task
   * @returns {Ext.Promise}
   * @private
   */
  applyChanges: function(syncId, task, db, tx) {
    var me = this;
    // CrashIssue.log('Apply changes for task ' + task.id + ' ...', task);

    return Q.fulfill();
  }
});
