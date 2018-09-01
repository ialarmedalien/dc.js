/**
 * The sunburst chart implementation is usually used to visualize a small tree distribution.  The sunburst
 * chart uses keyAccessor to determine the slices, and valueAccessor to calculate the size of each
 * slice relative to the sum of all values. Slices are ordered by {@link dc.baseMixin#ordering ordering} which defaults to sorting
 * by key.
 *
 * The keys used in the sunburst chart should be arrays, representing paths in the tree.
 *
 * When filtering, the sunburst chart creates instances of {@link dc.filters.HierarchyFilter HierarchyFilter}.
 *
 * @class sunburstChart
 * @memberof dc
 * @mixes dc.partitionMixin
 * @mixes dc.collapsibleMixin
 * @mixes dc.hierarchyMixin
 * @mixes dc.pieTypeMixin
 * @mixes dc.legendableMixin
 * @mixes dc.capMixin
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @example
 * // create a sunburst chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.sunburstChart('#chart-container1');
 * // create a sunburst chart under #chart-container2 element using chart group A
 * var chart2 = dc.sunburstChart('#chart-container2', 'chartGroupA');
 *
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @returns {dc.sunburstChart}
 **/
dc.sunburstChart = function (parent, chartGroup) {

    var _chart = {};
//      =
//       dc.partitionMixin(
//         dc.hierarchyMixin(
//           dc.pieTypeMixin(
//             dc.legendableMixin(dc.capMixin(dc.colorMixin(dc.baseMixin({}))))))
//       );

    ['base', 'color', 'cap', 'legendable', 'pieType', 'hierarchy', 'collapsible', 'partition'].forEach( function(m) {
        _chart = dc[m + 'Mixin'](_chart);
    });

    _chart.colorAccessor(_chart.cappedKeyAccessor);

    _chart.title(function (d) {
        return _chart.cappedKeyAccessor(d) + ': ' + _chart.cappedValueAccessor(d);
    });

    _chart.label(_chart.cappedKeyAccessor);

    _chart.tweenType = 'slice';

    _chart._d3 = {
      scale: {
        x: d3.scaleLinear()
          .range([0, 2 * Math.PI]).clamp(true)
        , y: d3.scaleLinear()
      }
    };

    return _chart.anchor(parent, chartGroup);

};


dc.partitionArc = dc.sunburstChart;