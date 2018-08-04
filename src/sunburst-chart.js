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
    var _chart =
      dc.partitionMixin(
        dc.hierarchyMixin(
          dc.pieTypeMixin(
            dc.legendableMixin(dc.capMixin(dc.colorMixin(dc.baseMixin({}))))))
      );

    _chart.tweenType = 'slice';

//     function extendedValueAccessor (d) {
//        if (d.data.key) {
//             return d.value;
//         }
//         return _chart.cappedValueAccessor(d);
//     }

//     _chart.cappedValueAccessor = function (d, i) {
//         if (d.others) {
//             return d.value;
//         }
//         return _chart.valueAccessor()(d, i);
//     };
    // Handle cases if value corresponds to generated parent nodes
    // ensure that titles return some value, rather than 'undefined'
    dc.override( _chart, 'cappedValueAccessor', function (d) {
        try {
            var value = _chart._cappedValueAccessor(d);
            if ( value ) {
                return value;
            }
            throw "No value returned";
        }
        catch(e) {
            if (d.data && d.data.key) {
                return d.value;
            }
            else if ( d.computedValue ) {
                return d.computedValue;
            }
            return 0;
        }
    });

    dc.override( _chart, 'cappedKeyAccessor', function (d) {
        var key = _chart._cappedKeyAccessor(d);
        if ( key.length > 1 ) {
            return key.slice(-1)[0];
        }
        return key[0];
    });

    _chart.layout = function () {
        return d3.partition()
            .size([2 * Math.PI, (_chart.radius() - _chart.externalRadiusPadding() ) * (_chart.radius() - _chart.externalRadiusPadding() ) ]);
    }

    _chart.isOffCanvas = function (d) {
        return !d || isNaN(d.dx) || isNaN(d.dy);
    }

    return _chart.anchor(parent, chartGroup);
};
