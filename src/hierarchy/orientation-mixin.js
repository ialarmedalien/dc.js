dc.orientationMixin = function (_chart) {

    var _horizontalOrientation = false;

    /**
     * Get or set whether or not the chart displays horizontally. Default is to
     * display vertically (false).
     * @method horizontalOrientation
     * @memberof dc.partitionRectangle
     * @instance
     * @param {Boolean} [bool]
     * @returns {Boolean|dc.partitionRectangle}
     */
    _chart.horizontalOrientation = function (bool) {
      if (!arguments.length) {
        return _horizontalOrientation;
      }
      _horizontalOrientation = bool;
      return _chart;
    };

    return _chart;
};