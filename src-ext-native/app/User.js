/**
 * Copyright(c) Company: P2 Energy Solutions
 *
 * User: nicky
 * Date: 2/19/2014
 * Time: 9:19 PM
 */

/**
 * @author nicky
 * @singleton
 */
// @define CrashIssue.User
Ext.define('CrashIssue.User', {
  singleton: true,

  _initAuthorities: function() {
    var me = this,
      authorities = [];
    Ext.each(me.user.authorities, function(auth) {
      authorities.push(auth.authority);
    });
    Ext.apply(me.user, {
      authorities: authorities
    });
  },

  setUser: function(user) {
    var me = this;
    me.user = user;
    me._initAuthorities();

  },

  getUser: function() {
    var me = this;
    if(!me.user) {
      if(!Ext.isDefined(window.GlobalConstants) || !Ext.isDefined(window.GlobalConstants.user)) {
        Ext.log({
          level: 'error'
        }, 'window.GlobalConstants.user is required!');
      } else {
        me.user = Ext.decode(window.GlobalConstants.user);
        me._initAuthorities();
        delete window.GlobalConstants.user;
      }
    }
    return me.user;
  },

  getCheckboxPref: function(key){
    var me=this,
        pref = me.getPref(key);
    return (pref!==null && pref==='on');
  },

  getPref: function(key) {
    var me = this,
      value = null,
      prefs = me.getUser().preferences;
    Ext.each(prefs, function(pref) {
      if(key==pref.key) {
        value = pref.value;
        return false;
      }
    });
    return value;
  },
  /**
   * Has ALL roles if list sent   (See hasRole for at least one)
   * @param roles
   * @returns {Boolean|*}
   */
  hasRoles: function(roles) {
    var me = this;
    if(!Ext.isArray(roles)) {
      roles = roles.split(',');
    }
    return Ext.Array.every(roles, function(role) {
      return me.getUser().roles.indexOf(role) >= 0;
    });
  },
  /**
   * Has ALL permissions if list sent
   * @param permissions
   * @returns {Boolean|*}
   */
  hasPermissions: function(permissions) {
    var me = this;
    if(!Ext.isArray(permissions)) {
      permissions = permissions.split(',');
    }
    return Ext.Array.every(permissions, function(permission) {
      return me.getUser().authorities.indexOf(permission) >= 0;
    });
  },
  /**
   * Has at least one role if list sent  (See hasRoles for ALL)
   * @param roles
   * @returns {Boolean|*}
   */
  hasRole: function(roles) {
    var me = this;
    if(!Ext.isArray(roles)) {
      roles = roles.split(',');
    }
    var found = false;
    Ext.Array.each(roles, function(role) {
      if (me.getUser().roles.indexOf(role) >= 0){
        found = true;
        return false;
      }
    });
    return found;
  },
  /**
   * Has at least one role if list sent
   * @param permissions
   * @returns {Boolean|*}
   */
  hasPermission: function(permissions) {
    var me = this;
    var found = false;
    if(!Ext.isArray(permissions)) {
      permissions = permissions.split(',');
    }
    Ext.Array.each(permissions, function(permission) {
      if (me.getUser().authorities.indexOf(permission) >= 0){
        found=true;
        return false;
      }
    });
    return found;
  },
  hasFormType: function(uuid) {
    return this.getUser().accessibleFormTypes.indexOf(uuid) >= 0;
  },
  getFirstName: function() {
    return this.getUser().firstName;
  },
  getLastName: function() {
    return this.getUser().lastName;
  },
  getFullName: function () {
    return Ext.String.format('{0} {1}', this.getFirstName(), this.getLastName());
  },
  getTopLevelName: function() {
    return this.getUser().topLevelName;
  },
  getCommentGroup: function() {
    return this.getUser().commentGroup;
  },
  getUuid: function() {
    return this.getUser().uuid;
  },
  getId: function() {
    return this.getUser().employeeId;
  },
  getWorkplaceId: function(){
    return this.getUser().primaryWorkplace.workplaceId;
  }
});