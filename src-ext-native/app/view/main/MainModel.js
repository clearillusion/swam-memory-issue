/**
 * This class is the view model for the Main view of the application.
 */
Ext.define('CrashIssue.view.main.MainModel', {
  extend: 'Ext.app.ViewModel',

  alias: 'viewmodel.main',

  data: {
    name: 'Crash Issue',
    times: 10,
    result: null,
    query: "SELECT asset.uuid as assetId, routeStop.form as routeId, assetFormType.composition as assetComposition, my.*,assetDataFormType.composition as assetDataComposition\n" +
      " FROM Entity asset\n" +
      "  JOIN FormLink stopAsset ON asset.detailForm = stopAsset.linkedForm\n" +
      "  JOIN Form stop ON stopAsset.form = stop.uuid AND stop.formType = '10009'\n" +
      "  JOIN FormLink routeStop ON stop.uuid = routeStop.linkedForm\n" +
      "  JOIN Form route ON routeStop.form = route.uuid AND route.formType = '18210759336060219'\n" +
      "  JOIN Form assetForm ON asset.detailForm = assetForm.uuid\n" +
      "  JOIN FormType assetFormType ON assetForm.formType = assetFormType.uuid\n" +
      " LEFT OUTER JOIN Form_ft_ifo_event my ON my._state != 'D' AND my.entity = asset.uuid AND my.statusId != '302' AND (my.formType in (SELECT uuid FROM FormType WHERE composition LIKE '%~Approvable~%'))\n" +
      " LEFT OUTER JOIN FormType assetDataFormType ON my.formType = assetDataFormType.uuid;",
    groups: "routeId.sum.oil_production_volume,routeId.sum.water_production_volume,routeId.sum.gas_production_check_volume"
  }

});