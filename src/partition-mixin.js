/**
 * Partition mixin for hierarchical graphs
 *
 * Specifics for partition graphs.
 *
 * @name partitionMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @returns {dc.partitionMixin}
 */
dc.partitionMixin = function (_chart) {

    //

    _chart.prepareData = function ( chartData, emptyChart ) {
        var dataWithLayout;
        // if we have data...
        if ( ! emptyChart ) {
            dataWithLayout = _chart.formatData( chartData, _chart.layout() );
            // partition charts do not need the root node, so shift it off
            dataWithLayout.shift();
        } else {
            // just the root node
            dataWithLayout = _chart.formatData( [], _chart.layout() );
        }
        return dataWithLayout;
    }

    return _chart;
};
