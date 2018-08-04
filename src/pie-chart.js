/**
 * The pie chart implementation is usually used to visualize a small categorical distribution.  The pie
 * chart uses keyAccessor to determine the slices, and valueAccessor to calculate the size of each
 * slice relative to the sum of all values. Slices are ordered by {@link dc.baseMixin#ordering ordering}
 * which defaults to sorting by key.
 *
 * Examples:
 * - {@link http://dc-js.github.com/dc.js/ Nasdaq 100 Index}
 * @class pieChart
 * @memberof dc
 * @mixes dc.capMixin
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @example
 * // create a pie chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.pieChart('#chart-container1');
 * // create a pie chart under #chart-container2 element using chart group A
 * var chart2 = dc.pieChart('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/d3/d3-selection/blob/master/README.md#select d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @returns {dc.pieChart}
 */
dc.pieChart = function (parent, chartGroup) {

    var _chart = dc.pieTypeMixin(dc.legendableMixin(dc.capMixin(dc.colorMixin(dc.baseMixin({})))));

    _chart.tweenType = 'pie';

    /**
     * Get or set the maximum number of slices the pie chart will generate. The top slices are determined by
     * value from high to low. Other slices exeeding the cap will be rolled up into one single *Others* slice.
     * @method slicesCap
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [cap]
     * @returns {Number|dc.pieChart}
     */
    _chart.slicesCap = _chart.cap;

    function layout () {
        return d3.pie().sort(null).value(_chart.cappedValueAccessor);
    }

    // otherwise we'd be getting NaNs, so override
    // note: abuse others for its ignoring the value accessor
    function emptyData () {
        return [{ key: _chart.emptyTitle(), value: 1, others: [_chart.emptyTitle()] }];
    }

    _chart.prepareData = function ( chartData, emptyChart ) {
        // if we have data...
        if ( ! emptyChart ) {
            return layout()( chartData );
        } else {
            return layout()( emptyData() );
        }
    }

    _chart.__clickHandler = function (d, i) {
        _chart.onClick(d.data, i);
    };

    _chart.isSelectedSlice = function (d) {
        return _chart.hasFilter(_chart.cappedKeyAccessor(d.data));
    };

    return _chart.anchor(parent, chartGroup);
};
