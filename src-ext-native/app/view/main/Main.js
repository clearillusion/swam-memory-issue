/**
 * This class is the main view for the application. It is specified in app.js as the
 * "autoCreateViewport" property. That setting automatically applies the "viewport"
 * plugin to promote that instance of this class to the body element.
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('CrashIssue.view.main.Main', {
  extend: 'Ext.container.Container',
  alias: 'widget.app-main',
  requires: [
    'Ext.form.Panel',
    'Ext.form.field.Text',
    'Ext.form.field.Number',
    'Ext.form.field.Display',
    'Ext.form.field.TextArea',
    'Ext.layout.container.Fit',
    'CrashIssue.view.main.MainController',
    'CrashIssue.view.main.MainModel'
  ],

  controller: 'main',
  viewModel: {
    type: 'main'
  },
  layout: 'fit',

  items: [{
    xtype: 'form',
    bodyPadding: 10,
    bind: {
      title: '{name}'
    },
    items: [{
      xtype: 'textarea',
      fieldLabel: 'Query',
      bind: '{query}',
      anchor: '100% 60%'
    }, {
      xtype: 'textfield',
      fieldLabel: 'Groups',
      bind: '{groups}',
      anchor: '100%'
    }, {
      xtype: 'numberfield',
      fieldLabel: 'Repeat #',
      bind: '{times}'
    }, {
      xtype: 'displayfield',
      fieldLabel: 'Result',
      bind: '{result}'
    }],
    bbar: [{
      text: 'Run Query (SWAM Public API)',
      handler: 'onSwamApi'
    }, {
      text: 'Run Query (P2 Homebrew API)',
      handler: 'onHomebrewApi'
    }, {
      text: 'Some UI Work',
      handler: 'onUi'
    }, '->', {
      text: 'Logout',
      handler: 'onLogout'
    }]
  }]
});
