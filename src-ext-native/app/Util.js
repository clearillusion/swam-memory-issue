/**
 * Copyright(c) Company: P2 Energy Solutions
 *
 * User: nicky
 * Date: 2/19/2014
 * Time: 9:09 PM
 */

/**
 * @author nicky
 * @singleton
 */
// @define CrashIssue.Util
Ext.define('CrashIssue.Util', {
  singleton: true,

  _SHARD_ID: 9,

  _seq: 0,

  log:
    //<debug>
    console.log ||
    //</debug>
    Ext.emptyFn,

  err:
    //<debug>
    console.error ||
    //</debug>
    Ext.emptyFn,

  /**
   * Reformats the url with the deployment root.
   * @param url
   * @returns {string} formatted URL
   */
  getUrlWithContextPath: function(url) {
    //TODO: app.url in offline mode?
    return 'https://ifopreview.p2energysolutions.com' + (url.indexOf('/')==0 ? '/apps' : '/apps/') + url;
  },

  getApiUrl: function(url) {
    var api = CrashIssue.url('api');
    return url.indexOf(api)==0 ? url : (url.indexOf('/')==0 ? api : api + '/') + url;
  },

  toggleSplashScreen: function(mask, msg) {
    var me = this;
    if(mask) {

      if(!!me.spinner) {
        Ext.getBody().unmask();
      }

      me.spinner = Ext.getBody().mask(msg);
      me.spinner.addCls('splashscreen');
      Ext.dom.Helper.insertFirst(me.spinner, {
        cls: 'x-splash-icon',
        style: {
          'position': 'fixed',
          'top': '50%',
          'left': '50%',
          'margin-top': '-190px',
          'margin-left':'-130px'
        }
      });
    } else {
      me.spinner.fadeOut({
        duration: 500,
        remove: true
      });
      me.spinner = null;
    }
  },

  generateUuid: function() {
    var binary = Ext.String.leftPad(Number(CrashIssue.Util._SHARD_ID).toString(2), 11, '0')
      + Ext.String.leftPad(Number(Ext.Date.now() - 1377993600000).toString(2), 41, '0')
      + Ext.String.leftPad(Number(CrashIssue.Util._seq++ % 4096).toString(2), 12, '0');
    return BigInteger.parse(binary, 2).toString();
  },

  columnToDisplayName: function(column) {
    return column.split('_').map(function(c) {
      return Ext.String.capitalize(c);
    }).join(' ');
  },

  /**
   * Delays a task by the specified time in milliseconds
   * @param config
   * @param {Number} config.duration - Length of time to delay task
   * @param {function} config.fn - Function to run after delay
   * @param {Array} [config.args] - The default Array of arguments
   * @param {Object} [config.scope] - The scope of the function. Defaults to the window object
   */
  delay: function(config) {

    if(Ext.isEmpty(config) || Ext.isEmpty(config.fn)) {
      return;
    }

    var delayedTask = new Ext.util.DelayedTask(config.fn, config.scope, config.args);

    delayedTask.delay(config.duration || 0);

  },

  /**
   * Delays returning a promise for the specified period of time.
   *
   * @param {Integer} milliseconds
   * @returns {Ext.Promise}
   */
  wait: function(milliseconds) {
    if(!Ext.isFunction(Ext.Promise)) {
      throw new Error('Promise not supported');
    }

    var promise = new Ext.Promise();

    (new Ext.util.DelayedTask(function() {
      promise.fulfill();
    })).delay(milliseconds);

    return promise;
  }
});

CrashIssue.log = CrashIssue.Util.log;
CrashIssue.err = CrashIssue.Util.err;

/**
 * Shorthand of {@link CrashIssue.Util#getUrlWithContextPath}
 */
CrashIssue.url = CrashIssue.Util.getUrlWithContextPath;