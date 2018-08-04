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

    _chart.prepareData = function ( chartData, emptyChart ) {
        var dataWithLayout;
        // if we have data...
        if ( ! emptyChart ) {
            dataWithLayout = _chart.formatData( chartData, _chart.layout() );
            // First one is the root, which is not needed
            dataWithLayout.shift();
        } else {
            // just the root node
            dataWithLayout = _chart.formatData( [], _chart.layout() );
        }
        return dataWithLayout;
    }

    return _chart;
};
