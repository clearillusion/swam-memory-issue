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

  _begin: function(btn) {
    var me = this,
      view = me.getView(),
      vm = me.getViewModel();
    view.query('grid')[0].getStore().removeAll();
    view.query('cartesian')[0].getStore().removeAll();
    btn.disable();
    vm.set('result', 'Running...');
  },

  _complete: function(btn, groupingResult) {
    var me = this,
      view = me.getView(),
      vm = me.getViewModel(),
      chartStore = view.query('cartesian')[0].getStore(),
      gridStore = view.query('grid')[0].getStore(),
      chartData = [], gridData = [];
    for(var dt in groupingResult) {
      var values = groupingResult[dt], 
        d = {
          date: dt
        };
      for(var key in values) {
        d[key] = values[key];
      }
      chartData.push(d);
    }
    chartStore.loadData(chartData);
    gridStore.loadData(chartData);
    vm.set('result', '<span style="color: green;">Done</span>');
    btn.enable();
  },

  onSwamApi: function(btn) {
    var me = this,
      vm = me.getViewModel(),
      sql = vm.get('query'),
      times = vm.get('times'),
      promises = [],
      db = Ext.space.SecureSql.get(CrashIssue.User.getUser().username),
      groupingResult;
    me._begin(btn);
    for(var i = 0; i < times; i++) {
      promises.push(db.query(sql).then(function(rows) {
        CrashIssue.log("Row count: " + rows.length);
        groupingResult = me.groupBy(rows);
      }));
    }
    Q.all(promises).then(function() {
      me._complete(btn, groupingResult);
    });
  },

  onHomebrewApi: function(btn) {
    var me = this,
      vm = me.getViewModel(),
      sql = vm.get('query'),
      times = vm.get('times'),
      promises = [],
      groupingResult;
    me._begin(btn);
    CrashIssue.data.proxy.SecureSql.getOrOpenCommonDatabase(CrashIssue.User.getUser().username).then(function(db) {
      for(var i = 0; i < times; i++) {
        promises.push(Q(db.query(sql)).then(function(rows) {
          CrashIssue.log("Row count: " + rows.length);
          groupingResult = me.groupBy(rows);
        }));
      }
      Q.all(promises).then(function() {
        me._complete(btn, groupingResult);
      });
    });
  },

  groupBy: function(rows) {
    var result = {},
      vm = this.getViewModel(),
      groupKey = vm.get('groupKey'),
      groups = vm.get('groups').split(',');
    for(var j = 0; j < rows.length; j++) {
      var row = rows[j],
        rawDate = row[groupKey];
      if(rawDate) {
        var date = Ext.Date.format(Ext.Date.clearTime(new Date(rawDate)), 'Y-m-d');
        if(!result[date]) {
          result[date] = {};
        }
        for(var i = 0; i < groups.length; i++) {
          var g = groups[i].split('.'), op = g[0],  col = g[1];
          if(!result[date][col]) {
            result[date][col] = 0;
          }
          if('sum'==op) {
            result[date][col] += Number(row[col] || 0);
          }
        }
      }
    }
    CrashIssue.log(result);
    return result;
  }
});
