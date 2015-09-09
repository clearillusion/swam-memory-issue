/**
 * Copyright(c) Company: P2 Energy Solutions
 *
 * User: nicky
 * Date: 2014-09-19
 * Time: 11:29 AM
 */

/**
 * @author nicky
 */
Ext.define('CrashIssue.controller.Main', {
  extend: 'Ext.app.Controller',
  requires: [
    'Ext.window.Window',
    'Ext.plugin.Viewport',
    'CrashIssue.data.sync.Sync',
    'CrashIssue.data.sync.SyncTaskProvider',
    'CrashIssue.data.sync.RetrieveTableSyncTask',
    'CrashIssue.data.sync.UploadTableSyncTask',
    'CrashIssue.data.sync.RetrieveFormsSyncTask',
    'CrashIssue.data.sync.UploadFormsSyncTask',
    'CrashIssue.data.sync.IfoPumperSyncScopeTask',
    'CrashIssue.data.proxy.SecureSql',
    'CrashIssue.form.LoginForm',
    'CrashIssue.view.main.Main'
  ],

  statics: {
    /**
     * Currently logged in user information, mostly CrashIssue.User.getUser(). It's like a session data that will be cleared
     * upon logout.
     *
     * @return {Ext.space.localstorage.Collection} with key-value pairs:
     *    <LI>info: CrashIssue.User.getUser()</LI>
     */
    storedCurrentUser: function() {
      return Ext.space.SecureLocalStorage.get('storedUser');
    },
    /**
     * Per user data who have logged in the device for at least once, including mostly sync information, e.g:
     * last sync time, is auto-sync enabled etc. Those are persistent data that won't be cleared upon logout. Keys:
     * <LI>
     *   User's login ID: Ext.space.localstorage.Collection, with keys -
     * <LI>
     *
     * @param login
     * @return {Ext.space.localstorage.Collection} with keys:
     *    <LI>lastSync</LI>
     *    <LI>syncAutoSyncEnabled</LI>
     */
    storedPerUserData: function(login) {
      return Ext.space.SecureLocalStorage.get(login ? login : CrashIssue.User.getUser().username);
    }
  },

  /**
   * @event synccomplete
   * fires when sync is done successfully, with the sync time as the single argument
   */

  initialized: false,

  control: {
    'nativeloginform': {
      succeed: 'onLoginSuccess'
    }
  },

  routes: {
    'logout': 'onLogout',
    'home': 'validateSession'
  },

  validateSession: function() {
    var me = this,
      currentUser,
      storedUser,
      action = [].pop.apply(arguments),
      proceed = function(valid) {
        if(valid) {
          action ? action.resume() : me.initLanding();
        } else {
          if(action) {
            action.stop(true);
          }
          me.initLogin();
        }
      },
      initialize = function() {
        // initialize CrashIssue.Util
        CrashIssue.User.setUser(currentUser);
        me.initialized = true;
      };
    if(me.initialized) {
      proceed(true);
    } else {
      Ext.getBody().mask('Initializing...');
      Ext.onSpaceReady().then(function() {
        storedUser = CrashIssue.controller.Main.storedCurrentUser();
        storedUser.get('info').then(function(info) {
          if(info) {
            // offline access
            currentUser = info;
            initialize();
            proceed(true);
            Ext.getBody().unmask();
          } else {
            // remote access to cache the user info locally
            me.retrieveServerSession().then(function(user) {
              currentUser = user;
              storedUser.set('info', currentUser).then(function() {
                initialize();
                proceed(true);
              });
            }).fail(function() {
              proceed(false);
            }).fin(function() {
              Ext.getBody().unmask();
            });
          }
        });
      });
    }
  },

  retrieveServerSession: function() {
    return Q.Promise(function(resolve, reject) {
      var proxy = Ext.create('CrashIssue.data.proxy.StratusAjax', {
        stratusUri: 'session/user'
      });
      proxy.request({
        url: proxy.url,
        failure: Ext.emptyFn,
        callback: function(operations, options, response) {
          if(response.status==200) {
            resolve(Ext.decode(response.responseText));
          } else {
            reject('Server session is lost');
          }
        }
      });
    });
  },

  initLogin: function() {
    Ext.widget('window', {
      height: 350,
      closable: false,
      resizable: false,
      autoShow: true,
      title: 'Login',
      layout: 'fit',
      items: {
        xtype: 'nativeloginform'
      }
    });
  },

  initLanding: function() {
    var me = this,
      renderMain = function() {
        Ext.widget('app-main', {
          plugins: 'viewport'
        });
      };
    CrashIssue.controller.Main.storedPerUserData().get('lastSync').then(function(lastSync) {
      if(lastSync) {
        renderMain();
      } else {
        CrashIssue.Util.toggleSplashScreen(true, 'Synchronizing your data...');
        me.sync().fail(function(e) {
          CrashIssue.err(e);
        }).fin(function() {
          renderMain();
          CrashIssue.Util.toggleSplashScreen(false);
        });
      }
    });
  },

  onLoginSuccess: function() {
    location.reload();
  },

  onLogout: function() {
    var me = this,
      storedUser = CrashIssue.controller.Main.storedCurrentUser();

    storedUser.clear().then(function() {
      Ext.Ajax.request({
        url: CrashIssue.Util.getApiUrl('stratus_logout'),
        callback: function() {
          location.hash = 'home';
          location.reload();
        }
      });
    });
  },

  prepareSyncTasks: function() {
    var syncTasks = [];

    // Establish pumper scope
    syncTasks.push(Ext.create('CrashIssue.data.sync.IfoPumperSyncScopeTask', {}));

    // Upload Forms
    syncTasks.push(Ext.create('CrashIssue.data.sync.UploadFormsSyncTask', {}));

    // Upload Form Links
    syncTasks.push(Ext.create('CrashIssue.data.sync.UploadTableSyncTask', {
      serverTableName: 'ft_form_link',
      clientTableName: 'FormLink'
    }));

    // Upload Form Link Attributes
    syncTasks.push(Ext.create('CrashIssue.data.sync.UploadTableSyncTask', {
      serverTableName: 'ft_form_link_attribute',
      clientTableName: 'FormLinkAttribute'
    }));

    // Upload Workflow Instances
    syncTasks.push(Ext.create('CrashIssue.data.sync.UploadTableSyncTask', {
      serverTableName: 'ft_workflow_instance',
      clientTableName: 'WorkflowInstance'
    }));

    // Upload Workflow Instances User Role
    syncTasks.push(Ext.create('CrashIssue.data.sync.UploadTableSyncTask', {
      serverTableName: 'ft_workflow_instance_user_role',
      clientTableName: 'WorkflowInstanceUserRole'
    }));

    // Upload Comments
    syncTasks.push(Ext.create('CrashIssue.data.sync.UploadTableSyncTask', {
      serverTableName: 'comment',
      clientTableName: 'Comment'
    }));

    // Upload Attachments
    syncTasks.push(Ext.create('CrashIssue.data.sync.UploadTableSyncTask', {
      serverTableName: 'attachment_group',
      clientTableName: 'AttachmentGroup'
    }));

    syncTasks.push(Ext.create('CrashIssue.data.sync.UploadTableSyncTask', {
      serverTableName: 'attachments',
      clientTableName: 'Attachment'
    }));

    // FormTypes
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_form_type',
      clientTableName: 'FormType'
    }));

    // GridConfigurations
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_grid_configuration',
      clientTableName: 'GridConfiguration'
    }));

    // Forms + Links
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveFormsSyncTask', {}));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_form_link',
      clientTableName: 'FormLink'
    }));

    // Forms + Attributes
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_form_link_attribute',
      clientTableName: 'FormLinkAttribute'
    }));

    // Choices
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_choice',
      clientTableName: 'Choice'
    }));

    // Entities + Types
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'entities',
      clientTableName: 'Entity'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'cnthierty',
      clientTableName: 'EntityType'
    }));

    // Form field rules
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_form_field_rule',
      clientTableName: 'FormFieldRule'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_form_field_rule_definition',
      clientTableName: 'FormFieldRuleDefinition'
    }));

    // Form field conversions
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_unit_of_measure_class',
      clientTableName: 'UnitOfMeasureClass'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_unit_of_measure',
      clientTableName: 'UnitOfMeasure'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_unit_of_measure_conversion',
      clientTableName: 'UnitOfMeasureConversion'
    }));

    // Users
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'users',
      clientTableName: 'User'
    }));

    // Notification + Types
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'notification_type',
      clientTableName: 'NotificationType'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'v_notification_alert',
      clientTableName: 'Notification'
    }));

    // EntityActivity
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'v_entity_activity',
      clientTableName: 'EntityActivity'
    }));
    // Entity Activity - Actions (To Do... complete)
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'actions_action',
      clientTableName: 'Action'
    }));
    // Entity Activity - Calendar (To Do... complete)
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'severity',
      clientTableName: 'Severity'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'calendar_event_category',
      clientTableName: 'CalendarEventCategory'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'calendar_event_template',
      clientTableName: 'CalendarEventTemplate'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'calendar_event',
      clientTableName: 'CalendarEvent'
    }));
    // Entity Activity - Comments
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'comment_group',
      clientTableName: 'CommentGroup'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'v_comment',
      clientTableName: 'Comment'
    }));
    // Attachments
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'attachment_group',
      clientTableName: 'AttachmentGroup'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'attachments',
      clientTableName: 'Attachment'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_workflow',
      clientTableName: 'Workflow'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_role',
      clientTableName: 'Role'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_activity',
      clientTableName: 'Activity'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_transition',
      clientTableName: 'Transition'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_workflow_instance',
      clientTableName: 'WorkflowInstance'
    }));
    syncTasks.push(Ext.create('CrashIssue.data.sync.RetrieveTableSyncTask', {
      serverTableName: 'ft_workflow_instance_user_role',
      clientTableName: 'WorkflowInstanceUserRole'
    }));

    SyncTaskProvider.setTasks(syncTasks);
  },

  sync: function() {
    var me = this;
    return Q(Ext.space.Connection.getStatus()).then(function(status) {
      if(!status.online) {
        return Q.reject('A network connection is required to sync.');
      }
      return me.retrieveServerSession().then(function() {
        me.prepareSyncTasks();
        return CrashIssue.data.sync.Sync.sync().then(function (syncResult) {
          var syncDate = new Date();

          return Q(CrashIssue.controller.Main.storedPerUserData().set('lastSync', syncDate)).then(function () {
            CrashIssue.log('Sync done at: ' + syncDate);
            me.fireEvent('synccomplete', syncDate, true);

            return Q.fulfill(syncDate);
          });
        });
      }).fail(function() {
        Ext.Msg.confirm('Error', 'You need to re-login to sync. Do you want to proceed?', function(btn) {
          if('yes'==btn) {
            me.redirectTo('logout');
          } else {
            me.fireEvent('synccomplete', new Date(), false);
          }
        });
      });
    }).fail(function (error) {
      me.fireEvent('synccomplete', new Date(), false);
      // Todo replace with something pretty
      CrashIssue.err(error);
      alert("Error synchronizing with the server" + '\n\n' + "(" + (error.error || error) + ")");
    });
  }
});