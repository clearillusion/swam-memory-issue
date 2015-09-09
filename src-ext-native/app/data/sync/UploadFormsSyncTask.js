Ext.define('CrashIssue.data.sync.UploadFormsSyncTask', {
  extend: 'CrashIssue.data.sync.TableSync',

  requires: [
    'CrashIssue.Util'
  ],

  config: {},

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
      type: "upload-forms",
      formTypes: []
    };

    // Todo form types with the same storage_table are queried N times (once per formTypeUuid) -- inefficient
    // Todo query by unique storage_table instead?

    return Q(database.query("select tbl_name from sqlite_master where type = 'table' and tbl_name = 'FormType'")).then(function(x) {
      if(x.length === 0) {
        // First sync, no FormType table
        return Q.fulfill(task);
      }

      return Q(database.query("select uuid, storage_method, storage_table from FormType")).then(function(rows) {
        if(rows.length === 0) {
          CrashIssue.log("No form types to sync");
          return Q.fulfill(task);
        }

        var rowIndex = 0;

        function processNextFormType() {
          if(rowIndex >= rows.length) {
            return Q.fulfill(task);
          }
          var row = rows[rowIndex++];

          var formTypeUuid = row.uuid;
          var storageMethod = row.storage_method;
          var storageTable = row.storage_table;
          var segmentId = CrashIssue.Util.generateUuid() + "-forms-" + formTypeUuid + ".csv";
          var formTable = "Form_" + ((storageMethod === 'T') ? storageTable : formTypeUuid);

          var formTypeDetails = {
            id: formTypeUuid,
            segment: segmentId
          };

          return Q(me.extractChangedRecords({
            tableName: formTable,
            segment: segmentId,
            filter: "formType = '" + formTypeUuid + "'"
          }, syncOutDirectory, database, stats)).then(function(result) {
            if(result) {
              formTypeDetails.columns = [].concat(result.columns);

              //TODO move to utils
              function arrayReplace(a, value, newValue) {
                var i = a.indexOf(value);
                if (i >= 0) {
                  a[i] = newValue;
                }
              }

              // Pairs with RetreiveFormsSyncTask - update there as well
              arrayReplace(formTypeDetails.columns, 'uuid', 'id');
              arrayReplace(formTypeDetails.columns, 'formType', 'form_type_id');
              arrayReplace(formTypeDetails.columns, 'owner', 'user_id');
              arrayReplace(formTypeDetails.columns, 'statusId', 'status_id');
              arrayReplace(formTypeDetails.columns, 'entity', 'entity_id');
              arrayReplace(formTypeDetails.columns, 'topLevel', 'top_level_id');
              arrayReplace(formTypeDetails.columns, 'commentGroup', 'comment_group_id');
              arrayReplace(formTypeDetails.columns, 'attachmentGroup', 'attachment_group_id');
              arrayReplace(formTypeDetails.columns, 'workflowInstance', 'workflow_instance_id');
              arrayReplace(formTypeDetails.columns, 'validationCode', 'validation_code');
              arrayReplace(formTypeDetails.columns, 'validationMessage', 'validation_message');

              task.formTypes.push(formTypeDetails);
            }
            return processNextFormType();

          });
        }

        return processNextFormType();

      });
    });
  },

  countDirtyRecords: function(database, stats) {
    var me = this;

    return Q(database.query("select tbl_name from sqlite_master where type = 'table' and tbl_name = 'FormType'")).then(function(x) {
      if(x.length === 0) {
        // First sync, no FormType table
        return Q.fulfill();
      }

      return Q(database.query("select uuid, storage_method, storage_table from FormType")).then(function(rows) {
        if(rows.length === 0) {
          CrashIssue.log("No form types to sync");
          return Q.fulfill();
        }

        var rowIndex = 0;

        function processNextFormType() {
          if(rowIndex >= rows.length) {
            return Q.fulfill();
          }
          var row = rows[rowIndex++];

          var formTypeUuid = row.uuid;
          var storageMethod = row.storage_method;
          var storageTable = row.storage_table;
          var segmentId = CrashIssue.Util.generateUuid() + "-forms-" + formTypeUuid + ".csv";
          var formTable = "Form_" + ((storageMethod === 'T') ? storageTable : formTypeUuid);

          return Q(me.countChangedRecords({
            tableName: formTable,
            segment: segmentId,
            filter: "formType = '" + formTypeUuid + "'"
          }, database)).then(function(count) {
            stats.dirtyCount += count;

            return processNextFormType();
          });
        }

        return processNextFormType();

      });
    });
  },

  /***
   * @param syncId
   * @param task
   * @param syncInDirectory
   * @param database
   * @returns {*}
   */
  processResults: function(syncId, task, syncInDirectory, database) {
    var me = this;
    // CrashIssue.log('Processing results for task ' + task.id + ' ...', task);

    return Q.fulfill();
  },

  /***
   * Migrate the database for this task
   * @param syncId
   * @param task
   * @param syncInDirectory
   * @param database
   * @returns {*}
   */
  migrate: function(syncId, task, syncInDirectory, database) {
    var me = this;
    // CrashIssue.log('Migrating for task ' + task.id + ' ...', task);

    return Q.fulfill();
  },

  /***
   * Apply any changes within the context of the provided transaction
   * @param syncId
   * @param task
   * @param tx
   * @returns {*}
   */
  applyChanges: function(syncId, task, db, tx) {
    var me = this;
    // CrashIssue.log('Apply changes for task ' + task.id + ' ...', task);

    return Q.fulfill();
  }
});
