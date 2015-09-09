/**
 * This class is the main view for the application. It is specified in app.js as the
 * "autoCreateViewport" property. That setting automatically applies the "viewport"
 * plugin to promote that instance of this class to the body element.
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('CrashIssue.view.main.MainController', {
  extend: 'Ext.app.ViewController',

  requires: [
    'Ext.window.Window',
    'CrashIssue.User',
    'CrashIssue.data.proxy.SecureSql'
  ],

  alias: 'controller.main',

  onLogout: function() {
    this.redirectTo('logout');
  },

  onUi: function() {
    var me = this;
    if(!me.window) {
      me.window = Ext.create('Ext.window.Window', {
        title: 'No content window hide/show',
        closeAction: 'hide',
        width: 300,
        height: 200
      });
    }
    me.window.setVisible(!me.window.isVisible());
  },

  _begin: function(btn) {
    var me = this,
      vm = me.getViewModel();
    btn.disable();
    vm.set('result', 'Running...');
  },

  _complete: function(btn) {
    var me = this,
      vm = me.getViewModel();
    vm.set('result', '<span style="color: green;">Done</span>');
    btn.enable();
  },

  onSwamApi: function(btn) {
    var me = this,
      vm = me.getViewModel(),
      sql = vm.get('query'),
      times = vm.get('times'),
      promises = [],
      db = Ext.space.SecureSql.get(CrashIssue.User.getUser().username);
    me._begin(btn);
    for(var i = 0; i < times; i++) {
      promises.push(db.query(sql).then(function(rows) {
        CrashIssue.log("Row count: " + rows.length);
        me.groupBy(rows);
      }));
    }
    Q.all(promises).then(function() {
      me._complete(btn);
    });
  },

  onHomebrewApi: function(btn) {
    var me = this,
      vm = me.getViewModel(),
      sql = vm.get('query'),
      times = vm.get('times'),
      promises = [];
    me._begin(btn);
    CrashIssue.data.proxy.SecureSql.getOrOpenCommonDatabase(CrashIssue.User.getUser().username).then(function(db) {
      for(var i = 0; i < times; i++) {
        promises.push(Q(db.query(sql)).then(function(rows) {
          CrashIssue.log("Row count: " + rows.length);
          me.groupBy(rows);
        }));
      }
      Q.all(promises).then(function() {
        me._complete(btn);
      });
    });
  },

  groupBy: function(rows) {
    var result = {},
      groups = this.getViewModel().get('groups').split(',');
    for(var i = 0; i < groups.length; i++) {
      var group = groups[i].split('.'),
        key = group[0], op = group[1], col = group[2];
      for(var j = 0; j < rows.length; j++) {
        var row = rows[j],
          k = row[key];
        if(!result[k]) {
          result[k] = {};
        }
        if(!result[k][col]) {
          result[k][col] = 0;
        }
        if('sum'==op) {
          result[k][col] += Number(row[col] || 0);
        }
      }
    }
    CrashIssue.log(result);
    return result;
  }
});
