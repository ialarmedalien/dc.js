/**
 * Legendables mixin for charts
 *
 * requires the target graph to have .sliceCssClass set
 *
 * @name legendableMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @returns {dc.legendableMixin}
 */

dc.legendableMixin = function (_chart) {

    _chart.legendables = function () {
        return _chart.data()
          .map(function (d, i) {
            var legendable = { name: d.key, data: d.value, others: d.others, chart: _chart };
            legendable.color = _chart.getColor(d, i);
            return legendable;
          })
          .sort(function (a, b) {
              return d3.ascending( a.name, b.name );
        });
    };

    _chart.legendHighlight = function (d) {
        highlightSliceFromLegendable(d, true);
    };

    _chart.legendReset = function (d) {
        highlightSliceFromLegendable(d, false);
    };

    _chart.legendToggle = function (d) {
        _chart.onClick({key: d.name, others: d.others});
    };

    function highlightSliceFromLegendable (legendable, highlighted) {
//        _chart.selectAll('g.' + _chart.sliceCssClass).each(function (d) {
        _chart.selectAll('g.pie-slice').each(function (d) {
            if (legendable.name === d.data.key) {
                d3.select(this).classed('highlight', highlighted);
            }
        });
    }

    return _chart;
};
