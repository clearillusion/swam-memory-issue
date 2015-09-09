/**
 * Copyright(c) Company: P2 Energy Solutions
 *
 * User: nicky
 * Date: 11/28/2013
 * Time: 3:30 PM
 */

/**
 * @author nicky
 */
Ext.define('CrashIssue.data.proxy.StratusProxy', {
  requires: [
    'CrashIssue.Util'
  ],
  statics: {
    defaultCfg: {
      batchOrder: 'destroy,create,update', // 'destroy' is first to avoid unique constraint violations
      noCache: true,
      timeout: 360000,
      pageParam: undefined,
      startParam: 'offset',
      simpleSortMode: false,
      sortParam: 'orderBy',
      headers: {
        'Accept': 'application/vnd.p2.stratus+json;charset=UTF-8;v=1, text/plain',
        'Content-Type': 'application/vnd.p2.stratus+json;charset=UTF-8;v=1'
      }
    }
  },

  /**
   * @cfg {String} stratusUri (required)
   * URL of the ajax resources
   */
  stratusUri: undefined,

  setStratusUri: function(uri) {
    this.stratusUri = uri;
    this.url = CrashIssue.Util.getApiUrl(uri);
    //TODO freaking Touch requires below
    this._url = this.url;
  }

});