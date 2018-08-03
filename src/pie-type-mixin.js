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
dc.pieTypeMixin = function (_chart) {
    var DEFAULT_MIN_ANGLE_FOR_LABEL = 0.5;

    var _sliceCssClass = 'pie-slice';
    var _labelCssClass = 'pie-label';
    var _polylineCssClass = 'pie-path';
    var _sliceGroupCssClass = 'pie-slice-group';
    var _labelGroupCssClass = 'pie-label-group';
    var _polylineGroupCssClass = 'pie-path-group';
    var _emptyCssClass = 'empty-chart';
    var _emptyTitle = 'empty';

    var _radius,
        _givenRadius, // specified radius, if any
        _innerRadius = 0,
        _externalRadiusPadding = 0;

    var _g;
    var _cx;
    var _cy;
    var _minAngleForLabel = DEFAULT_MIN_ANGLE_FOR_LABEL;
    var _externalLabelRadius;
    var _drawPaths = false;
//     var _chart = dc.legendableMixin(dc.capMixin(dc.colorMixin(dc.baseMixin({}))));

    _chart.colorAccessor(_chart.cappedKeyAccessor);

    _chart.title(function (d) {
        return _chart.cappedKeyAccessor(d) + ': ' + _chart.cappedValueAccessor(d);
    });

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

    _chart.label(_chart.cappedKeyAccessor);
    _chart.renderLabel(true);

    _chart.transitionDuration(350);
    _chart.transitionDelay(0);

    _chart._doRender = function () {
        _chart.resetSvg();

        _g = _chart.svg()
            .append('g')
            .attr('transform', 'translate(' + _chart.cx() + ',' + _chart.cy() + ')');

        _g.append('g').attr('class', _sliceGroupCssClass);
        _g.append('g').attr('class', _labelGroupCssClass);
        _g.append('g').attr('class', _polylineGroupCssClass);

        drawChart();

        return _chart;
    };

    _chart._doRedraw = function () {
        drawChart();
        return _chart;
    };

/*

    var emptyData = [{ key: _emptyTitle, value: 1, others: [_emptyTitle] }];
    function layout () {
        return d3.pie().sort(null).value(_chart.cappedValueAccessor);
    }
*/
    function prepareData ( chartData, emptyChart ) {
        // if we have data...
        if ( ! emptyChart ) {
            return _chart.layout()( chartData );
        } else {
            // otherwise we'd be getting NaNs, so override
            // note: abuse others for its ignoring the value accessor
            return _chart.layout()( [{ key: _emptyTitle, value: 1, others: [_emptyTitle] }] );
        }
    }

    function drawChart () {
        // set radius from chart size if none given, or if given radius is too large
        var maxRadius =  d3.min([_chart.width(), _chart.height()]) / 2;
        _radius = _givenRadius && _givenRadius < maxRadius ? _givenRadius : maxRadius;
        var arc = buildArcs();

        var chartData = _chart.data();
        var emptyChart = true;
        if (d3.sum( chartData, _chart.valueAccessor())) {
            emptyChart = false;
        }
        var dataWithLayout = prepareData( chartData, emptyChart );

        if (_g) {
            _g.classed(_emptyCssClass, emptyChart);

            var slices = _g.select('g.' + _sliceGroupCssClass)
                .selectAll('g.' + _sliceCssClass)
                .data(dataWithLayout);

            var labels = _g.select('g.' + _labelGroupCssClass)
                .selectAll('text.' + _labelCssClass)
                .data(dataWithLayout);

            removeElements(slices, labels);

            createElements(slices, labels, arc, dataWithLayout);

            updateElements(dataWithLayout, arc);

            highlightFilter();

            dc.transition(_g, _chart.transitionDuration(), _chart.transitionDelay())
                .attr('transform', 'translate(' + _chart.cx() + ',' + _chart.cy() + ')');
        }
    }

    function createElements (slices, labels, arc, data) {
        var slicesEnter = createSliceNodes(slices);
        createSlicePath(slicesEnter, arc);
        createTitles(slicesEnter);
        createLabels(labels, data, arc);
    }

    function nodeSliceClass (d, i) {
        return _sliceCssClass + ' _' + i + ( d.depth ? _sliceCssClass + '-level-' + d.depth : '' );
    }

    function createSliceNodes (slices) {
        var slicesEnter = slices
            .enter()
            .append('g')
            .attr('class', nodeSliceClass);
        return slicesEnter;
    }

    function createSlicePath (slicesEnter, arc) {
        var slicePath = slicesEnter.append('path')
            .attr('fill', fill)
            .on('click', onClick)
            .attr('d', function (d, i) {
                return safeArc(d, i, arc);
            });

        var transition = dc.transition(slicePath, _chart.transitionDuration(), _chart.transitionDelay());
        if (transition.attrTween) {
            transition.attrTween('d', tweenFn);
        }
    }

    function createTitles (slicesEnter) {
        if (_chart.renderTitle()) {
            slicesEnter.append('title').text(function (d) {
                return _chart.title()(d.data);
            });
        }
    }

    function labelText (d) {
        if ((sliceHasNoData(d) || sliceTooSmall(d)) && !_chart.isSelectedSlice(d)) {
            return '';
        }
        return _chart.label()(d.data);
    }

    // sunburst version
//     function labelText (d) {
//         if ((sliceHasNoData(d) || sliceTooSmall(d)) && !_chart.isSelectedSlice(d)) {
//             return '';
//         }
//         return _chart.label()(d);
//     }

    function positionLabels (labels, arc) {
        dc.transition(labels, _chart.transitionDuration(), _chart.transitionDelay())
            .attr('transform', function (d) {
                return labelPosition(d, arc);
            })
            .attr('text-anchor', 'middle')
            .text(labelText);
    }

    function highlightSlice (i, whether) {
        _chart.select('g.pie-slice._' + i)
            .classed('highlight', whether);
    }

    function createLabels (labels, data, arc) {
        if (_chart.renderLabel()) {
            var labelsEnter = labels
                .enter()
                .append('text')
                .attr('class', function (d, i) {
                    var classes = _sliceCssClass + ' ' + _labelCssClass + ' _' + i;
                    if (_externalLabelRadius) {
                        classes += ' external';
                    }
                    return classes;
                })
                .on('click', onClick)
                .on('mouseover', function (d, i) {
                    highlightSlice(i, true);
                })
                .on('mouseout', function (d, i) {
                    highlightSlice(i, false);
                });
            positionLabels(labelsEnter, arc);
            if (_externalLabelRadius && _drawPaths) {
                updateLabelPaths(data, arc);
            }
        }
    }

    // differs
    function updateLabelPaths (data, arc) {
        var polyline = _g.select('g.' + _polylineGroupCssClass)
            .selectAll('polyline.' + _polylineCssClass)
            .data(data)

        polyline.exit().remove();

        polyline = polyline
            .enter()
            .append('polyline')
            .attr('class', function (d, i) {
                return _polylineCssClass + ' _' + i + ' ' + _sliceCssClass;
            })
            .on('click', onClick)
            .on('mouseover', function (d, i) {
                highlightSlice(i, true);
            })
            .on('mouseout', function (d, i) {
                highlightSlice(i, false);
            })
            .merge(polyline);

        var arc2 = d3.arc()
                .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .innerRadius(_radius - _externalRadiusPadding);

        var transition = dc.transition(polyline, _chart.transitionDuration(), _chart.transitionDelay());
        // this is one rare case where d3.selection differs from d3.transition
        if (transition.attrTween) {
            transition
                .attrTween('points', function (d) {
                    var current = this._current || d;
                    current = {startAngle: current.startAngle, endAngle: current.endAngle};
                    var interpolate = d3.interpolate(current, d);
                    this._current = interpolate(0);
                    return function (t) {
                        var d2 = interpolate(t);
                        return [arc.centroid(d2), arc2.centroid(d2)];
                    };
                });
        } else {
            transition.attr('points', function (d) {
                return [arc.centroid(d), arc2.centroid(d)];
            });
        }
        transition.style('visibility', function (d) {
            return d.endAngle - d.startAngle < 0.0001 ? 'hidden' : 'visible';
        });

    }

    function updateElements (data, arc) {
        updateSlicePaths(data, arc);
        updateLabels(data, arc);
        updateTitles(data);
    }

    function updateSlicePaths (data, arc) {
        var slicePaths = _g.selectAll('g.' + _sliceCssClass)
            .data(data)
            .select('path')
            .attr('d', function (d, i) {
                return safeArc(d, i, arc);
            });
        var transition = dc.transition(slicePaths, _chart.transitionDuration(), _chart.transitionDelay());
        if (transition.attrTween) {
            transition.attrTween('d', tweenFn);
        }
        transition.attr('fill', fill);
    }

    function updateLabels (data, arc) {
        if (_chart.renderLabel()) {
            var labels = _g.selectAll('text.' + _labelCssClass)
                .data(data);
            positionLabels(labels, arc);
            if (_externalLabelRadius && _drawPaths) {
                updateLabelPaths(data, arc);
            }
        }
    }

    function updateTitles (data) {
        if (_chart.renderTitle()) {
            _g.selectAll('g.' + _sliceCssClass)
                .data(data)
                .select('title')
                .text(function (d) {
                    return _chart.title()(d.data);
                });
        }
    }

    function removeElements (slices, labels) {
        slices.exit().remove();
        labels.exit().remove();
    }

    function highlightFilter () {
        if (_chart.hasFilter()) {
            _chart.selectAll('g.' + _sliceCssClass).each(function (d) {
                if (_chart.isSelectedSlice(d)) {
                    _chart.highlightSelected(this);
                } else {
                    _chart.fadeDeselected(this);
                }
            });
        } else {
            _chart.selectAll('g.' + _sliceCssClass).each(function () {
                _chart.resetHighlight(this);
            });
        }
    }

    /**
     * Get or set the external radius padding of the chart. This will force the radius of the
     * chart to become smaller or larger depending on the value.
     * @method externalRadiusPadding
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Number} [externalRadiusPadding=0]
     * @returns {Number|dc.pieTypeMixin}
     */
    _chart.externalRadiusPadding = function (externalRadiusPadding) {
        if (!arguments.length) {
            return _externalRadiusPadding;
        }
        _externalRadiusPadding = externalRadiusPadding;
        return _chart;
    };

    /**
     * Get or set the inner radius of the chart. If the inner radius is greater than 0px then the
     * chart will be rendered as a doughnut chart. Default inner radius is 0px.
     * @method innerRadius
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Number} [innerRadius=0]
     * @returns {Number|dc.pieTypeMixin}
     */
    _chart.innerRadius = function (innerRadius) {
        if (!arguments.length) {
            return _innerRadius;
        }
        _innerRadius = innerRadius;
        return _chart;
    };

    /**
     * Get or set the outer radius. If the radius is not set, it will be half of the minimum of the
     * chart width and height.
     * @method radius
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Number} [radius]
     * @returns {Number|dc.pieTypeMixin}
     */
    _chart.radius = function (radius) {
        if (!arguments.length) {
            return _givenRadius || _radius;
        }
        _givenRadius = radius;
        return _chart;
    };

    /**
     * Get or set center x coordinate position. Default is center of svg.
     * @method cx
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Number} [cx]
     * @returns {Number|dc.pieTypeMixin}
     */
    _chart.cx = function (cx) {
        if (!arguments.length) {
            return (_cx ||  _chart.width() / 2);
        }
        _cx = cx;
        return _chart;
    };

    /**
     * Get or set center y coordinate position. Default is center of svg.
     * @method cy
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Number} [cy]
     * @returns {Number|dc.pieTypeMixin}
     */
    _chart.cy = function (cy) {
        if (!arguments.length) {
            return (_cy ||  _chart.height() / 2);
        }
        _cy = cy;
        return _chart;
    };

    /**
     * Get or set the minimal slice angle for label rendering. Any slice with a smaller angle will not
     * display a slice label.
     * @method minAngleForLabel
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Number} [minAngleForLabel=0.5]
     * @returns {Number|dc.pieTypeMixin}
     */
    _chart.minAngleForLabel = function (minAngleForLabel) {
        if (!arguments.length) {
            return _minAngleForLabel;
        }
        _minAngleForLabel = minAngleForLabel;
        return _chart;
    };

    /**
     * Title to use for the only slice when there is no data.
     * @method emptyTitle
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {String} [title]
     * @returns {String|dc.pieTypeMixin}
     */
    _chart.emptyTitle = function (title) {
        if (arguments.length === 0) {
            return _emptyTitle;
        }
        _emptyTitle = title;
        return _chart;
    };

    /**
     * Position slice labels offset from the outer edge of the chart.
     *
     * The argument specifies the extra radius to be added for slice labels.
     * @method externalLabels
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Number} [externalLabelRadius]
     * @returns {Number|dc.pieTypeMixin}
     */
    _chart.externalLabels = function (externalLabelRadius) {
        if (arguments.length === 0) {
            return _externalLabelRadius;
        } else if (externalLabelRadius) {
            _externalLabelRadius = externalLabelRadius;
        } else {
            _externalLabelRadius = undefined;
        }

        return _chart;
    };

    /**
     * Get or set whether to draw lines from slices to their labels.
     *
     * @method drawPaths
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Boolean} [drawPaths]
     * @returns {Boolean|dc.pieTypeMixin}
     */
    _chart.drawPaths = function (drawPaths) {
        if (arguments.length === 0) {
            return _drawPaths;
        }
        _drawPaths = drawPaths;
        return _chart;
    };

    // differs
    function buildArcs () {
        if ( _chart.tweenType === 'pie' ) {
            return d3.arc()
                .outerRadius(_radius - _externalRadiusPadding)
                .innerRadius(_innerRadius);
        }
        return d3.arc()
            .startAngle(function (d) {
                return d.x0;
            })
            .endAngle(function (d) {
                return d.x1;
            })
            .innerRadius(function (d) {
                return d.data.key && d.data.key.length === 1 ? _innerRadius : Math.sqrt(d.y0);
            })
            .outerRadius(function (d) {
                return Math.sqrt(d.y1);
            });
    }

    // very different in sunburstChart!
//     function isSelectedSlice (d) {
//         return _chart.hasFilter(_chart.cappedKeyAccessor(d.data));
//     }

    function sliceTooSmall (d) {
        var angle;
        if ( d.hasOwnProperty('x0') ) {
            angle = (d.x1 - d.x0);
        }
        else {
            angle = (d.endAngle - d.startAngle);
        }
        return isNaN(angle) || angle < _minAngleForLabel;
    }

    function sliceHasNoData (d) {
        if (d.data) {
            return _chart.cappedValueAccessor(d.data) === 0;
        }
        return _chart.cappedValueAccessor(d) === 0;
    }

    function tweenFn (d) {
        var id = this;
        if (_chart.tweenType === 'pie') {
            return tweenPie(d, id);
        }
        return tweenSlice(d, id);
    }

    function tweenPie (b, id) {
        b.innerRadius = _innerRadius;
        var current = id._current;
        if (isOffCanvas(current)) {
            current = {startAngle: 0, endAngle: 0};
        } else {
            // only interpolate startAngle & endAngle, not the whole data object
            current = {startAngle: current.startAngle, endAngle: current.endAngle};
        }
        var i = d3.interpolate(current, b);
        id._current = i(0);
        return function (t) {
            return safeArc(i(t), 0, buildArcs());
        };
    }

    function tweenSlice (b, id) {
        b.innerRadius = _innerRadius; //?
        var current = id._current;
        if (isOffCanvas(current)) {
            current = {x: 0, y: 0, dx: 0, dy: 0};
        }
        // unfortunately, we can't tween an entire hierarchy since it has 2 way links.
        var tweenTarget = {x: b.x, y: b.y, dx: b.dx, dy: b.dy};
        var i = d3.interpolate(current, tweenTarget);
        id._current = i(0);
        return function (t) {
            return safeArc(Object.assign({}, b, i(t)), 0, buildArcs());
        };
    }

    function isOffCanvas (current) {
        return !current || isNaN(current.startAngle) || isNaN(current.endAngle);
    }

    // from sunburst
//     function isOffCanvas (current) {
//         return !current || isNaN(current.dx) || isNaN(current.dy);
//     }

    function fill (d, i) {
        return _chart.getColor(d.data, i);
    }

    function onClick (d, i) {
        if (_g.attr('class') !== _emptyCssClass) {
            _chart.onClick(d.data, i);
        }
    }

    function safeArc (d, i, arc) {
        var path = arc(d, i);
        if (path.indexOf('NaN') >= 0) {
            path = 'M0,0';
        }
        return path;
    }

    function labelPosition (d, arc) {
        var centroid;
        if (_externalLabelRadius) {
            centroid = d3.arc()
                .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .innerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .centroid( d.hasOwnProperty('x1') ? { startAngle: d.x0, endAngle: d.x1 } : d );
        } else {
            centroid = arc.centroid(d);
        }
        if (isNaN(centroid[0]) || isNaN(centroid[1])) {
            return 'translate(0,0)';
        } else {
            return 'translate(' + centroid + ')';
        }
    }

    return _chart;
};
