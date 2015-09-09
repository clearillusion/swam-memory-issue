/**
 * Copyright(c) Company: P2 Energy Solutions
 *
 * User: nicky
 * Date: 2013-09-12
 * Time: 12:13 PM
 */

/**
 * @author nicky
 */
Ext.define('CrashIssue.data.proxy.StratusAjax', {
  extend: 'Ext.data.proxy.Ajax',
  alias: 'proxy.stratusAjax',
  mixins: {
    standard: 'CrashIssue.data.proxy.StratusProxy'
  },

  request: function(options) {
    var me = this;
    Ext.Ajax.request(Ext.applyIf(Ext.apply({
      failure: function(response) {
        me.fireEvent('failure', me, response);
      }
    }, options), CrashIssue.data.proxy.StratusProxy.defaultCfg));
  },

  constructor: function (config) {
    config = config || {};
    Ext.applyIf(config, CrashIssue.data.proxy.StratusProxy.defaultCfg);
    this.callParent([config]);
    var stratusUri = config.stratusUri || this.stratusUri;
    if(stratusUri) {
      this.setStratusUri(stratusUri);
    }
  }
});