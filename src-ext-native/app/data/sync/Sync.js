/***
 * In progress
 */

Ext.define('CrashIssue.data.sync.Sync', {
  singleton: true,
  alias: 'sync.Sync',
  requires: [
    'CrashIssue.Util',
    'CrashIssue.User',
    'CrashIssue.data.sync.SyncTaskProvider'
  ],

  alreadySyncing: false,
  syncTimeOut: 60000 * 5,

  _lastSyncInfo : {
    dirtyCount: 0,
    upsertCount: 0
  },

  sync: function(options) {
    var me = this;

    return Q().then(function() {
      if (me.alreadySyncing) {
        return Q.reject('Sync is already in progress');
      }

      return CrashIssue.data.proxy.SecureSql.getOrOpenCommonDatabase(CrashIssue.User.getUser().username).then(function (db) {

        // Store a reference to the database
        me._database = db;

        me.alreadySyncing = true;

        return me._getDatabase().tx(function() {
          return me._syncInternal(SyncTaskProvider.getTasks(), options).then(function (syncResult) {
            CrashIssue.log('Finished Sync Successfully.');
            return syncResult;
          }).fin(function () {
            me.alreadySyncing = false;
          });
        }).fin(function() {
          // Clear internal database reference
          me._database = null;
        });
      });
    });
  },

  /***
   * @param syncTasks
   * @returns {*}
   * @private
   */
  _syncInternal: function(syncTasks, options) {
    var me = this;
    var syncId = CrashIssue.Util.generateUuid();

    CrashIssue.log('Starting Sync...');

    me._lastSyncInfo = {
      dirtyCount: 0,
      upsertCount: 0
    };

    var syncOutDirectory = Ext.space.SecureFiles.get("syncOut");
    var syncInDirectory = Ext.space.SecureFiles.get("syncIn");

    // Clear the directory contents if it exists

    CrashIssue.log("Creating syncIn directory...");

    return Q(syncInDirectory.clear()).then(function() {
      CrashIssue.log("Cleared syncIn directory.");

      return Q(syncOutDirectory.clear()).then(function() {
        CrashIssue.log("Cleared syncOut directory.");

        // Create the sync.json file

        var syncObject = {
          tasks: [],
          databaseInstanceId: '',
          lastSuccessfulSyncId: ''
        };

        return me._getUniqueDatabaseId().then(function(uniqueDatabaseId) {
          syncObject.databaseInstanceId = uniqueDatabaseId;

          return me._getLastSyncId().then(function(lastSuccessfulSyncId) {

            if(!Ext.isEmpty(lastSuccessfulSyncId)) {
              syncObject.lastSuccessfulSyncId = lastSuccessfulSyncId;
            }

            CrashIssue.log("Syncing with databaseId: " + syncObject.databaseInstanceId);

            var prepareRequestStart = new Date();
            return me._prepareRequest(syncObject, syncTasks, syncOutDirectory).then(function () {
              CrashIssue.log('prepareRequest: ' + (Date.now() - prepareRequestStart) + 'ms');
              // Submit sync segments to server, sync

              var syncJsonString = JSON.stringify(syncObject);

              return Q(syncOutDirectory.set("sync.json", syncJsonString)).then(function () {
                var syncServerStart = new Date();
                return me._syncServer(syncId, syncInDirectory, syncOutDirectory, options).then(function (rootResponse) {
                  CrashIssue.log('syncServer: ' + (Date.now() - syncServerStart) + 'ms');

                  CrashIssue.log("sync.json", rootResponse);

                  var processResultsStart = new Date();
                  return me._processResults(syncId, rootResponse.taskResults, syncTasks, syncInDirectory).then(function () {
                    CrashIssue.log('processResults: ' + (Date.now() - processResultsStart) + 'ms');

                    var migrateStart = new Date();
                    return me._migrate(syncId, rootResponse.taskResults, syncTasks, syncInDirectory).then(function () {
                      CrashIssue.log('migrate: ' + (Date.now() - migrateStart) + 'ms');

                      var applyChangesStart = new Date();
                      return me._applyChanges(syncId, rootResponse.taskResults, syncTasks).then(function (applyResults) {
                        CrashIssue.log('applyChanges: ' + (Date.now() - applyChangesStart) + 'ms');

                        return me._setLastSuccessfulSyncId(syncId).then(function() {
                          return {
                            recordsSent: me._lastSyncInfo.dirtyCount,
                            recordsReceived: me._lastSyncInfo.upsertCount
                          };
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  },

  /***
   * @param syncObject
   * @param syncTasks
   * @param syncOutDirectory
   * @returns {*}
   * @private
   */
  _prepareRequest: function(syncObject, syncTasks, syncOutDirectory) {
    var me = this;
    var index = 0;

    function nextPrepareRequest() {
      var syncTask = syncTasks[index];

      if(!syncTask.id) {
        syncTask.id = "T" + CrashIssue.Util.generateUuid();
      }

      return Q(syncTask.prepareRequest(syncOutDirectory, me._getDatabase(), me._lastSyncInfo)).then(function(task) {
        task.id = syncTask.id;

        syncObject.tasks.push(task);
        if (++index == syncTasks.length) {
          return Q.fulfill();
        } else {
          return nextPrepareRequest();
        }
      });
    }

    if (!Ext.isEmpty(syncTasks)) {
      return nextPrepareRequest();
    }

    return Q.fulfill();
  },

  countDirtyRecords: function(syncTasks) {
    var index = 0;
    var countSyncTasks = [];
    var stats = {
      dirtyCount: 0
    };

    return Q().then(function() {
      return CrashIssue.data.proxy.SecureSql.getOrOpenCommonDatabase(CrashIssue.User.getUser().username).then(function (db) {

        Ext.each(syncTasks, function (syncTask) {
          if (syncTask.countDirtyRecords) {
            countSyncTasks.push(syncTask);
          }
        });

        function nextPrepareRequest() {
          var syncTask = countSyncTasks[index];

          return Q(syncTask.countDirtyRecords(db, stats)).then(function () {
            if (++index == countSyncTasks.length) {

              return Q.fulfill({count: stats.dirtyCount});
            } else {
              return nextPrepareRequest();
            }
          });
        }

        if (!Ext.isEmpty(countSyncTasks)) {
          return nextPrepareRequest();
        }

        return Q.fulfill({count:0});
      });
    });
  },

  /***
   * @param syncId
   * @param syncInDirectory
   * @param syncOutDirectory
   * @returns {*}
   * @private
   * @param options
   */
  _syncServer: function(syncId, syncInDirectory, syncOutDirectory, options) {
    var me = this;

    CrashIssue.log("Compressing segments to send to the server...");

    return Q(syncOutDirectory.compress({
      archiveName: syncId + '.zip',
      path: syncOutDirectory.name,
      type: 'zip'
    })).then(function(file) {
      CrashIssue.log("Compressed.");

      CrashIssue.log("Syncing with server...");

      var uploadUrl = CrashIssue.Util.getApiUrl('mobile/sync/' + syncId),
        downloadUrl = CrashIssue.Util.getApiUrl('mobile/sync/' + syncId + '/out');
      if(me._onBuggySpacePlatform()) {
        // upload/download don't have access to the current WebView's cookie
        var sessionId = document.cookie.match(/JSESSIONID=(\w+);?/)[1];
        uploadUrl += '?JSESSIONID=' + sessionId;
        downloadUrl += '?JSESSIONID=' + sessionId;
      }
      return Q.Promise(function (resolve, reject) {
        file.upload({
          url: uploadUrl,
          fileFieldName: file.name
        }).then(function (uploadedFile, details) {
          resolve(details.response);
        }, reject);
      }).then(function (response) {
        CrashIssue.log("Uploaded " + file.name + " - status code: " + response.statusCode);

        if (response.statusCode == 200) {
          // Receive sync.json

          var rootResponse = Ext.decode(response.body);

          CrashIssue.log('Downloading segments zip ...');

          return Q(syncInDirectory.download({
            url: downloadUrl,
            overwriteFile: true
          })).then(function (file) {
            CrashIssue.log('Downloaded.', file);

            CrashIssue.log('Uncompressing ...');

            return Q(file.uncompress({
              type: "zip",
              path: syncInDirectory.name
            })).then(function (files) {
              CrashIssue.log('Uncompressed.');
              return rootResponse;
            });
          });
        } else {
          return Q.reject("Error synchronizing with the server");
        }
      });
    });
  },

  /***
   * @param syncId
   * @param taskResults
   * @param syncTasks
   * @param syncInDirectory
   * @returns {*}
   * @private
   */
  _processResults: function(syncId, taskResults, syncTasks, syncInDirectory) {
    var me = this;
    var index = 0;

    function nextProcessResults() {
      var syncTask = syncTasks[index];
      var task = taskResults[index];

      return Q(syncTask.processResults(syncId, task, syncInDirectory, me._getDatabase())).then(function() {
        if (++index == syncTasks.length) {
          return Q.fulfill();
        } else {
          return nextProcessResults();
        }
      });
    }

    if (!Ext.isEmpty(syncTasks)) {
      return nextProcessResults();
    }

    return Q.fulfill();
  },

  /***
   * @param syncId
   * @param taskResults
   * @param syncTasks
   * @param syncInDirectory
   * @returns {*}
   * @private
   */
  _migrate: function(syncId, taskResults, syncTasks, syncInDirectory) {
    var me = this;
    var index = 0;

    CrashIssue.log('Migrating database...');

    function nextMigration() {
      var syncTask = syncTasks[index];
      var task = taskResults[index];

      return Q(syncTask.migrate(syncId, task, syncInDirectory, me._getDatabase())).then(function() {
        if (++index == syncTasks.length) {
        return Q.fulfill();
        } else {
          return nextMigration();
        }
      });
    }

    if (!Ext.isEmpty(syncTasks)) {
      return nextMigration();
    }

    return Q.fulfill();
  },

  /***
   * Apply changes to the mobile database
   * @param syncId
   * @param taskResults
   * @returns {Ext.Promise}
   * @private
   * @param syncTasks
   */
  _applyChanges: function(syncId, taskResults, syncTasks) {
    var me = this;
    var index = 0;

    function dropTempTables() {
      return Q(me._getDatabase().createQueryGroup()).then(function(queryGroup) {
        return Q(me._getDatabase().query('select tbl_name, sql from sqlite_master where type = "table"')).then(function (rows) {
          Ext.each(rows, function (row) {
            if (Ext.String.startsWith(row.tbl_name, 'temp_')) {
              Q(queryGroup.query('drop table ' + row.tbl_name));
            }
          });
          if(!Ext.isEmpty(rows)) {
            return Q(queryGroup.execute());
          }
          return Q.fulfill();
        });
      });
    }

    return Q(me._getDatabase().createQueryGroup()).then(function(queryGroup) {

      CrashIssue.log('Applying changes to database within a transaction...');

      function nextApplyChanges() {
        var syncTask = syncTasks[index];
        var task = taskResults[index];

        return Q(syncTask.applyChanges(syncId, task, me._getDatabase(), queryGroup, me._lastSyncInfo)).then(function () {
          if (++index == syncTasks.length) {
            return Q(queryGroup.execute(true)).then(function () {
              CrashIssue.log('Transaction committed. All changes applied to database.');

              return dropTempTables().then(function() {
                CrashIssue.log('Dropped temp tables.');
              });
            });
          } else {
            return nextApplyChanges();
          }
        });
      }

      if (!Ext.isEmpty(syncTasks)) {
        return nextApplyChanges();
      }
    });
  },

  /***
   * @returns {*}
   * @private
   */
  _getDatabase: function() {
    return this._database;
  },

  /***
   * Returns the unique uuid for this database. Generates one if it doesn't already exist.
   * @returns Promise
   */
  _getUniqueDatabaseId: function() {
    var me = this;

    return me._getVariable('databaseid').then(function (databaseUuid) {
      if(Ext.isEmpty(databaseUuid)) {
        CrashIssue.log('Unique database id is empty, generating...');
        databaseUuid = CrashIssue.Util.generateUuid();
        return me._setVariable('databaseid', databaseUuid).then(function() {
          CrashIssue.log('Unique database id generated ' + databaseUuid);
          return databaseUuid;
        });
      } else {
        CrashIssue.log('Unique database id already exists, returning ' + databaseUuid);
        return databaseUuid;
      }
    });
  },

  _getLastSyncId: function() {
    return this._getVariable('lastSuccessfulSyncId');
  },

  _setLastSuccessfulSyncId: function(syncId) {
    return this._setVariable('lastSuccessfulSyncId', syncId);
  },

  _getVariable: function(name) {
    var variables = Ext.space.SecureLocalStorage.get(CrashIssue.User.getUser().username);
    return Q(variables.get(name)).then(function(value) {
      return value;
    });
  },

  _setVariable: function(name, value) {
    var variables = Ext.space.SecureLocalStorage.get(CrashIssue.User.getUser().username);
    return Q(variables.set(name, value));
  },

  //TODO: remove when headers can be passed in upload/download
  _onBuggySpacePlatform: function() {
    return Ext.isWindows || Ext.spaceIsAndroid;
  }
});
