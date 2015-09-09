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
    'Ext.grid.Panel',
    'Ext.form.Panel',
    'Ext.form.field.Text',
    'Ext.form.field.Number',
    'Ext.form.field.Display',
    'Ext.form.field.TextArea',
    'Ext.layout.container.Border',
    'Ext.chart.CartesianChart',
    'Ext.chart.series.Line',
    'Ext.chart.axis.Numeric',
    'Ext.chart.axis.Category',
    'CrashIssue.view.main.MainController',
    'CrashIssue.view.main.MainModel'
  ],

  controller: 'main',
  viewModel: {
    type: 'main'
  },
  layout: 'border',

  items: [{
    region: 'center',
    xtype: 'form',
    bodyPadding: 10,
    bind: {
      title: '{name}'
    },
    items: [{
      xtype: 'textarea',
      fieldLabel: 'Query',
      bind: '{query}',
      anchor: '100% 65%'
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
    tbar: [{
      text: 'Run Query (SWAM Public API)',
      handler: 'onSwamApi'
    }, {
      text: 'Run Query (P2 Homebrew API)',
      handler: 'onHomebrewApi'
    }, '->', {
      text: 'Logout',
      handler: 'onLogout'
    }]
  }, {
    region: 'south',
    border: true,
    height: 400,
    layout: 'border',
    items: [{
      region: 'west',
      width: 400,
      xtype: 'grid',
      scrollable: true,
      store: {
        fields: ['date', 'oil_production_volume', 'water_production_volume', 'gas_production_check_volume']
      },
      columns: [{
        text: 'Date',
        dataIndex: 'date'
      }, {
        text: 'Oil',
        dataIndex: 'oil_production_volume'
      }, {
        text: 'Water',
        dataIndex: 'water_production_volume'
      }, {
        text: 'Gas',
        dataIndex: 'gas_production_check_volume'
      }]
    }, {
      region: 'center',
      xtype: 'cartesian',
      legend: {
        tpl: [
          '<div class="', Ext.baseCSSPrefix, 'legend-container">',
            '<tpl for=".">',
              '<div class="', Ext.baseCSSPrefix, 'legend-item" style="font-size:8px;">',
                '<span ', 'class="', Ext.baseCSSPrefix, 'legend-item-marker {[ values.disabled ? Ext.baseCSSPrefix + \'legend-inactive\' : \'\' ]}" ',
                  'style="background:{mark};">', '</span>{name}',
              '</div>',
            '</tpl>',
          '</div>'
        ]
      },
      store: {
        fields: ['date', 'oil_production_volume', 'water_production_volume', 'gas_production_check_volume']
      },
      axes: [{
        type: 'numeric',
        position: 'left',
        grid: true,
        minimum: 0,
        increment: 100,
        label: {
          fontSize: 8
        },
        fields: ['oil_production_volume', 'water_production_volume', 'gas_production_check_volume']
      }, {
        type: 'category',
        position: 'bottom',
        label: {
          fontSize: 8
        },
        fields: ['date']
      }],
      series: [{
        type: 'line',
        style: {
          lineWidth: 1,
          stroke: '#94AE0A'
        },
        xField: 'date',
        yField: 'oil_production_volume',
        title: 'Oil Production'
      }, {
        type: 'line',
        style: {
          lineWidth: 1,
          stroke: '#115FA6'
        },
        xField: 'date',
        yField: 'water_production_volume',
        title: 'Water Production'
      }, {
        type: 'line',
        style: {
          lineWidth: 1,
          stroke: '#A61120'
        },
        xField: 'date',
        yField: 'gas_production_check_volume',
        title: 'Gas Production'
      }]
    }]
  }]
});
