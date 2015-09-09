/**
 * This class is the view model for the Main view of the application.
 */
Ext.define('CrashIssue.view.main.MainModel', {
  extend: 'Ext.app.ViewModel',

  alias: 'viewmodel.main',

  data: {
    name: 'Crash Issue',
    times: 1,
    result: null,
    query: "SELECT my.*\n" + 
    " FROM Form_ft_ifo_readings my\n" +
    " WHERE my._state != 'D'\n" +
    " AND (my.entity in (SELECT linkForm.entity FROM FormLink link, Form linkForm, FormType linkFormType WHERE link.form IN (   SELECT linkForm.uuid FROM FormLink link, Form linkForm    WHERE link.form = (SELECT uuid FROM Form WHERE formType = '18210759336060219' LIMIT 1) AND link.linkedForm = linkForm.uuid AND linkForm.formType = '10009' ) AND link.linkedForm = linkForm.uuid AND linkForm.formType = linkFormType.uuid AND linkFormType.composition LIKE '%~Asset~%'))\n" +
    " AND (my.formType in (SELECT uuid FROM FormType WHERE composition LIKE '%~Reading~%'));",
    groupKey: 'begin_date_time',
    groups: "sum.oil_production_volume,sum.water_production_volume,sum.gas_production_check_volume"
  }

});