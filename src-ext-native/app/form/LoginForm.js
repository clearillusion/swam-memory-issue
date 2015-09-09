/**
 * Copyright(c) Company: P2 Energy Solutions
 *
 * User: nicky
 * Date: 2014-09-22
 * Time: 11:27 AM
 */

/**
 * @author nicky
 */
Ext.define('CrashIssue.form.LoginForm', {
  extend: 'Ext.form.Panel',
  alias: 'widget.nativeloginform',

  requires: [
    'Ext.button.Button',
    'Ext.form.field.Text',
    'Ext.form.field.Hidden',
    'Ext.form.field.Display'
  ],
  bodyPadding: 35,
  buttonAlign: 'center',

  defaults: {
    width: 300,
    hideLabel: true,
    allowBlank: false,
    labelStyle: 'font-weight: bold;',
    listeners: {
      specialkey: function(field, event) {
        if(event.getKey()==event.ENTER) {
          var btn = field.up('form').down('button');
          btn.fireEvent('click', btn);
        }
      }
    }
  },

  setupItems: function() {
    var me = this;
    me.items = [{
      xtype: 'container',
      height: 100
    }, {
      value: '',
      xtype: 'displayfield',
      name: 'messages',
      height: 25,
      margin: '8 0 0 0'
    }, {
      emptyText: 'Username',
      xtype: 'textfield',
      displayField: 'username',
      valueField: 'username',
      name: 'login',
      allowBlank: false,
      inputAttrTpl: 'autocorrect=\"off\" autocapitalize=\"off\"'
    }, {
      inputType: 'password',
      emptyText: 'Password',
      xtype: 'textfield',
      name: 'pass',
      allowBlank: false
    }, {
      xtype: 'hidden',
      name: 'action',
      value: 'auth.Login'
    }, {
      xtype: 'button',
      name: 'button',
      scale: 'large',
      height: 40,
      margin: '10 0 10 0',
      text: 'Login',
      formBind: true,
      style: {
        border: '#FFFFFF'
      },
      listeners: {
        scope: me,
        click: 'onLoginClick'
      }
    }];
  },

  initComponent: function() {
    var me = this;
    me.setupItems();
    me.callParent(arguments);
  },

  onLoginClick: function(btn) {
    var me = btn.up('form'),
      passField = me.getForm().findField('pass'),
      errorMessage = me.getForm().findField('messages');

    btn.disable();
    if(me.isValid()) {
      Ext.Ajax.request({
        url: CrashIssue.url('/login_ajax.jsp'),
        params: me.getValues(),
        method: 'POST',
        callback: function(options, success, response) {
          // Sucessful Login detected
          if(response.status==200) {
            errorMessage.setValue('');
            me.fireEvent('succeed');
          }
          // Password change required
          else if(response.status==498) {
            me.fireEvent('passchange');
          }
          // Invalid Login detected
          else {
            errorMessage.setValue(Ext.String.format('<div style="width: 100%; text-align: center; color:#d2302e;">{0}</div>',
              !Ext.isEmpty(response.responseText) ? response.responseText :
                'Unable to login, please try again, if the problem still exists, please contact your administrator.'));
            passField.reset();
            passField.focus();
          }
          btn.enable();
        }
      });
    }
  }
});