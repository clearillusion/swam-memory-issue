Ext.define('CrashIssue.data.sync.IfoPumperSyncScopeTask', {

  config: {
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
    var task = {
      "type": "ifo-pumper-sync-scope"
    };

    return Q.fulfill(task);
  },

  /***
   * @param task
   * @returns {Ext.Promise}
   * @private
   */
  processResults: function(syncId, task, syncInDirectory, database) {
    // CrashIssue.log('Processing results for task ' + task.id + ' ...', task);

    return Q.fulfill();
  },

  migrate: function(syncId, task, syncInDirectory, database) {
    return Q.fulfill();
  },

  /***
   * Apply any changes within the context of the provided transaction
   * @param task
   * @returns {Ext.Promise}
   * @private
   */
  applyChanges: function(syncId, task, db, tx) {
    return Q.fulfill();
  }
});