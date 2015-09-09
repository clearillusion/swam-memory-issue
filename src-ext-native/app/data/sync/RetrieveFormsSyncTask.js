Ext.define('CrashIssue.data.sync.RetrieveFormsSyncTask', {
  extend: 'CrashIssue.data.sync.TableSync',

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
  prepareRequest: function(syncOutDirectory) {
    var task = {
      "type": "retrieve-forms"
    };

    return Q.fulfill(task);
  },

  tableInfoForFormType: function(formType) {
    return {
      formTypeUuid: formType.id, // Todo unused?
      total: formType.total,
      importTableName: "temp_import_" + formType.id,
      tableName: "Form_" + (formType.table || formType.id),
      segment: formType.segment,
      columns: formType.columns,
      deleteIdsSegment: formType.deleteIdsSegment,
      deleteIdsTableName: "temp_deletes_" + formType.id,
      reset: formType.reset
    };
  },

  /***
   * @param task
   * @returns {Ext.Promise}
   * @private
   */
  processResults: function(syncId, task, syncInDirectory, database) {
    var me = this;
    //CrashIssue.log('Processing results for task ' + task.id + ' ...', task);

    //TODO move to utils
    function arrayReplace(a, value, newValue) {
      var i = a.indexOf(value);
      if (i >= 0) {
        a[i] = newValue;
      }
    }

    var tableInfoToProcess = [];
    Ext.each(task.formTypes, function(ft) {
      // Pairs with UploadFormsSyncTask - update there as well
      arrayReplace(ft.columns, 'id', 'uuid');
      arrayReplace(ft.columns, 'form_type_id', 'formType');
      arrayReplace(ft.columns, 'user_id', 'owner');
      arrayReplace(ft.columns, 'status_id', 'statusId');
      arrayReplace(ft.columns, 'entity_id', 'entity');
      arrayReplace(ft.columns, 'top_level_id', 'topLevel');
      arrayReplace(ft.columns, 'comment_group_id', 'commentGroup');
      arrayReplace(ft.columns, 'attachment_group_id', 'attachmentGroup');
      arrayReplace(ft.columns, 'workflow_instance_id', 'workflowInstance');
      arrayReplace(ft.columns, 'validation_code', 'validationCode');
      arrayReplace(ft.columns, 'validation_message', 'validationMessage');

      tableInfoToProcess.push(me.tableInfoForFormType(ft));
    });

    var deleteList = [];

    // Copy the array

    Ext.each(task.deletes, function (item) {
      deleteList.push(item);
    });

    function processNextDeleteItem() {
      var deleteItem = deleteList.shift();

      if(!deleteItem) {
        return Q.fulfill();
      }
      return Q(me.processTable({
        tableName: "temp_deletes_" + deleteItem.tableName,
        importTableName: "temp_deletes_" + deleteItem.tableName,
        columns: ['_state', 'uuid'],
        segment: deleteItem.deleteIdsSegment
      }, syncInDirectory, database)).then(function() {
        return processNextDeleteItem();
      });
    }

    function processNextTableInfo() {
      var tableInfo = tableInfoToProcess.shift();
      if (!tableInfo) {
        return processNextDeleteItem().then(function() {
          return Q.fulfill();
        });
      } else {
        return Q(me.processTable(tableInfo, syncInDirectory, database)).then(function() {
          return Q(me.processTable({
            importTableName: tableInfo.deleteIdsTableName,
            tableName: tableInfo.tableName,
            columns: ['_state','uuid'],
            segment: tableInfo.deleteIdsSegment
          }, syncInDirectory, database)).then(function() {
            return processNextTableInfo();
          });
        });
      }
    }

    return processNextTableInfo();
  },

  migrate: function(syncId, task, syncInDirectory, database) {
    var me = this;
    var tableInfoToProcessByTable = {};

    Ext.each(task.formTypes, function (ft) {
      var tableInfoForFormType = me.tableInfoForFormType(ft);
      var existing = tableInfoToProcessByTable[tableInfoForFormType.tableName];
      if (existing) {
        tableInfoForFormType.columns = Ext.Array.merge(tableInfoForFormType.columns, existing.columns);
      }
      tableInfoToProcessByTable[tableInfoForFormType.tableName] = tableInfoForFormType;
    });

    var tableInfoToProcess = Ext.Object.getValues(tableInfoToProcessByTable);

    return Q(database.createQueryGroup()).then(function (tx) {
      return Q(database.createQueryGroup()).then(function (tx2) {
        Ext.each(tableInfoToProcess, function (tableInfo) {
          tx.query("pragma table_info('" + tableInfo.tableName + "')").then(function (rows) {
            return me.migrateTable(tableInfo, database, Ext.Array.pluck(rows, 'name'), tx2);
          });
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
    //CrashIssue.log('Apply changes for task ' + task.id + ' ...', task);

    var tableInfoToApply = [];
    Ext.each(task.formTypes, function(ft) {
      tableInfoToApply.push(me.tableInfoForFormType(ft));
    });

    function applyStorageTableDeletes() {
      var deleteList = task.deletes;

      if(!Ext.isEmpty(deleteList)) {
        Ext.each(deleteList, function(deleteItem) {
          if (!Ext.isEmpty(deleteItem.tableName)) {
            if(deleteItem.reset === true) {
              Q(tx.query("delete from Form where uuid in (select uuid from Form_" + deleteItem.tableName+ ")"));
              Q(tx.query("select changes() as changeCount")).then(function(result) {
                CrashIssue.log('Reset - Deleted ' + result[0].changeCount + ' records from [Form] ' + deleteItem.tableName + '.');
              });

              Q(tx.query("delete from Form_" + deleteItem.tableName));
              Q(tx.query("select changes() as changeCount")).then(function(result) {
                CrashIssue.log('Reset - Deleted ' + result[0].changeCount + ' records from ' + deleteItem.tableName + '.');
              });
            }

            if(!Ext.isEmpty(deleteItem.deleteIdsSegment)) {
              Q(tx.query("delete from Form_" + deleteItem.tableName + " where uuid in (select uuid from temp_deletes_" + deleteItem.tableName + ")"));
              Q(tx.query("select changes() as changeCount")).then(function(result) {
                CrashIssue.log('Deleted ' + result[0].changeCount + ' records from Form_' + deleteItem.tableName + ".");
              });

              Q(tx.query("delete from Form where uuid in (select uuid from temp_deletes_" + deleteItem.tableName + ")"));
              Q(tx.query("select changes() as changeCount")).then(function(result) {
                CrashIssue.log('Deleted ' + result[0].changeCount + ' records from Form.');
              });
            }
          }
        });
      }
      return Q.fulfill();
    }

    function applyNextTableInfo() {
      var tableInfo = tableInfoToApply.shift();
      if (!tableInfo) {
        return Q.fulfill();
      } else {
        if(tableInfo.reset === true) {
          Q(tx.query("delete from Form where uuid in (select uuid from " + tableInfo.tableName+ ")"));
          Q(tx.query("select changes() as changeCount")).then(function(result) {
            CrashIssue.log('Reset - Deleted ' + result[0].changeCount + ' records from Form.');
          });
        }

        return Q(me.applyTable(tableInfo, db, tx, stats)).then(function() {
          // Only record stored forms will have deletes at this level

          if (!Ext.isEmpty(tableInfo.deleteIdsSegment)) {
            Q(tx.query("delete from Form where uuid in (select uuid from " + tableInfo.deleteIdsTableName + ")"));
            Q(tx.query("select changes() as changeCount")).then(function(result) {
              CrashIssue.log('Deleted ' + result[0].changeCount + ' records from Form.');
            });
          }

          if(!Ext.isEmpty(tableInfo.total) && tableInfo.total > 0) {
            Q(tx.query("insert or replace into Form (_state, uuid, formType, statusId, owner, topLevel, entity, workflowInstance, validationCode, validationMessage, deleted) select 'C', uuid, formType, statusId, owner, topLevel, entity, workflowInstance, validationCode, validationMessage, deleted from " + tableInfo.importTableName));
            Q(tx.query("select changes() as changeCount")).then(function(result) {
              CrashIssue.log('Upserted ' + result[0].changeCount + ' records in Form.');
            });
          }
          return applyNextTableInfo();
        });
      }
    }

    Q(tx.query("create table if not exists Form (_state not null, uuid, formType, statusId, owner, topLevel, entity, workflowInstance, validationCode, validationMessage, deleted, primary key (uuid))")).then(function() {
      CrashIssue.log('Verified Form table');
    });

    // Todo indexes for Form?

    return applyStorageTableDeletes().then(applyNextTableInfo);
  }
});
