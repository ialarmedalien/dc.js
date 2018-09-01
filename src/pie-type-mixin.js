dc.highlighterMixin = function (_chart) {

    var highlightableClasses = [];

    // internal function to set which classes can be highlighted
    // returns an array
    // targeted chart must implement a `isSelectedElement` method
    _chart._highlightableClasses = function (_) {
        if (!arguments.length) {
            return highlightableClasses;
        }
        highlightableClasses = _;
        return _chart;
    }

    _chart._highlightElement = function (i, whether) {
        highlightableClasses.forEach( function(c) {
          _chart.select(c + '._' + i)
              .classed('highlight', whether);
        });
    }

    _chart._highlightFilter = function () {
        if (_chart.hasFilter()) {
            highlightableClasses.forEach( function(c) {
                _chart.selectAll(c).each(function (d) {
                    if (_chart.isSelectedElement(d)) {
                        _chart.highlightSelected(this);
                    } else {
                        _chart.fadeDeselected(this);
                    }
                });
            });
        } else {
            highlightableClasses.forEach( function(c) {
              _chart.selectAll(c).each(function () {
                  _chart.resetHighlight(this);
              });
            });
        }
    }

    return _chart;
}


/**
 * functions and variables for pie-type charts, including the pie chart and the
 * sunburst chart.
 *
 * Charts consuming this mixin are assumed to be pie-like; for sunburst-type
 * charts, the _chart object should have a _chart.tweenType = 'slice'.
 *
 * Consuming charts should supply a _chart.prepareData( chartData, bool ) function
 * that takes _chart.data() and a boolean and returns the data appropriately
 * formatted and laid out using one of the d3 layout algorithms.
 *
 * @name pieTypeMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @returns {dc.pieTypeMixin}
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

    var node;

    /**
     * Get or set the maximum number of slices the pie chart will generate. The top slices are determined by
     * value from high to low. Other slices exeeding the cap will be rolled up into one single *Others* slice.
     * @method slicesCap
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [cap]
     * @returns {Number|dc.pieChart}

    // pie chart only?

    _chart.slicesCap = _chart.cap;
     */

    _chart = dc.highlighterMixin(_chart)._highlightableClasses([ 'g.' + _sliceCssClass ]);

    _chart.sliceCssClass = _sliceCssClass;

    _chart.renderLabel(true);

    _chart.transitionDuration(350);
    _chart.transitionDelay(0);

    _chart._doRender = function () {
        _chart.resetSvg();

        if ( _chart.tweenType === 'slice' ) {
            getStartAngle = startAngleXFn;
            getEndAngle = endAngleXFn;
            tweenFn = tweenSlice;
            buildArcs = buildSliceArcs;
            buildPolylineArcs = buildSlicePolylineArcs;
            labelText = labelTextSlice;
            labelPosition = labelPositionSlice;
            _chart.onClick = onClick;
        }
        else {
            tweenFn = tweenPie;
            buildArcs = buildPieArcs;
            buildPolylineArcs = buildPiePolylineArcs;
        }

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

    _chart.setVariables = function () {
        // set radius from chart size if none given, or if given radius is too large
        var maxRadius =  d3.min([_chart.width(), _chart.height()]) / 2;
        _radius = _givenRadius && _givenRadius < maxRadius ? _givenRadius : maxRadius;
        // set the y scale on sunburst charts
        if ( _chart.hasOwnProperty('_d3') && _chart._d3.hasOwnProperty('scale') ) {
          _chart._d3.scale.y.range([ _chart.innerRadius(), _chart.radius() - _chart.externalRadiusPadding() ]);
        }
    }

    function drawChart () {

        _chart.setVariables();

        var arc = buildArcs();

        var chartData = _chart.data();
        var emptyChart = _chart.hasNoData( chartData )
        var dataWithLayout = _chart.prepareData( chartData, emptyChart );
        if ( _chart.hasOwnProperty('nodes') ) {
            node = dataWithLayout[0];
        }
        if (_g) {
            _g.classed(_emptyCssClass, emptyChart);

            var slices = _g.select('g.' + _sliceGroupCssClass)
                .selectAll('g.' + _sliceCssClass)
                .data(dataWithLayout);

            var labels = _g.select('g.' + _labelGroupCssClass)
                .selectAll('text.' + _labelCssClass)
                .data(dataWithLayout);

            var polyline = _g.select('g.' + _polylineGroupCssClass)
                .selectAll('polyline.' + _polylineCssClass)
                .data(dataWithLayout);

            var t = d3.transition()
              .duration( _chart.transitionDuration() )
              .delay( _chart.transitionDelay() );


            [ slices, labels, polyline ].forEach( function (sel) {
                removeElements(sel);
            });

            createElements(slices, labels, polyline, arc, t);

            updateElements(slices, labels, polyline, arc, t);

            _chart._highlightFilter();

            chartTransition( _g )
                .attr('transform', 'translate(' + _chart.cx() + ',' + _chart.cy() + ')');
        }
    }

    function chartTransition ( el ) {
        return dc.transition(el, _chart.transitionDuration(), _chart.transitionDelay());
    }

    function nodeSliceClass (d, i) {
        return _sliceCssClass + ' _' + i + ( d.depth ? ' ' + _sliceCssClass + '-level-' + d.depth : '' );
    }

    function titleSelection ( selection ) {
        selection
        .text(function (d) {
            return _chart.title()(d.data);
        });
    }

    function createElements (slices, labels, polyline, arc, t) {
        var slicesEnter = slices
            .enter()
            .append('g')
            .attr('class', nodeSliceClass);

        var slicePaths = slicesEnter.append('path')
            .on('click', _chart.hasOwnProperty('collapsible') && _chart.collapsible() ? collapseClick : onClick);
        pathTween( slicePaths, arc, t );

        if (_chart.renderTitle()) {
            titleSelection( slicePaths.append('title') );
        }

        createLabels(labels, polyline, arc, t);
    }

    var labelText = function (d) {
        if ((datumValueIsZero(d.data) || sliceTooSmall(d)) && !_chart.isSelectedElement(d)) {
            return '';
        }
        return _chart.label()(d.data);
    },

    labelTextSlice = function (d) {
        if (!_chart.isSelectedElement(d)) {
            if ( datumValueIsZero(d) ) {
                return '';
            }
            if ( sliceTooSmall(d) ) {
                if ( d.height === 0 && _externalLabelRadius ) {
                    return _chart.label()(d);
                }
                return '';
            }
        }
        return _chart.label()(d);
    };

    function positionLabels (labels, arc, t) {
        labels
            .transition(t)
            .attr('transform', function (d) {
                return labelPosition(d, arc);
            })
            .attr('text-anchor', 'middle')
            .text(labelText);
    }

    function createLabels (labels, polyline, arc, t) {
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
                    _chart._highlightElement(i, true);
                })
                .on('mouseout', function (d, i) {
                    _chart._highlightElement(i, false);
                });
            positionLabels(labelsEnter, arc, t);
            if (_externalLabelRadius && _drawPaths) {
                updateLabelPaths(polyline, arc, t);
            }
        }
    }

    function updateLabelPaths (polyline, arc, t) {

        polyline = polyline
                  .enter()
                  .append('polyline')
                  .attr('class', function (d, i) {
                      return _polylineCssClass + ' _' + i + ' ' + _sliceCssClass;
                  })
                  .on('click', onClick)
                  .on('mouseover', function (d, i) {
                      _chart._highlightElement(i, true);
                  })
                  .on('mouseout', function (d, i) {
                      _chart._highlightElement(i, false);
                  })
            .merge(polyline);

        var arc2 = buildPolylineArcs();
        // this is one rare case where d3.selection differs from d3.transition
//        if (transition.attrTween) {
            polyline
                .transition(t)
                .attrTween('points', function (d) {
                    var current = {startAngle: getStartAngle(d), endAngle: getEndAngle(d)};
                    var interpolate = d3.interpolate(current, d);
                    this._current = interpolate(0);
                    return function (tx) {
                        var d2 = interpolate(tx);
                        return [arc.centroid(d2), arc2.centroid(d2)];
                    };
                })
                .style('visibility', function (d) {
                    if ( d.height && d.height !== 0 ) {
                      return 'hidden';
                    }
                    return getEndAngle(d) - getStartAngle(d) < 0.0001 ? 'hidden' : 'visible';
                });

//         } else {
//             transition.attr('points', function (d) {
//                 return [arc.centroid(d), arc2.centroid(d)];
//             });
//         }
//         transition.style('visibility', function (d) {
//             if ( d.height && d.height !== 0 ) {
//               return 'hidden';
//             }
//             return getEndAngle(d) - getStartAngle(d) < 0.0001 ? 'hidden' : 'visible';
//         });
    }

    function updateElements (slices, labels, polyline, arc, t) {

        pathTween( slices.select('path'), arc, t );
        if (_chart.renderTitle()) {
            titleSelection( slices.select('title') );
        }
        updateLabels(labels, polyline, arc, t);
    }

    function pathTween ( selection, arc, t ) {
        selection
        .transition( t )
        .attr('fill', fill)
        .attrTween('d', tweenFn);
//         function(d) {
//           return function() {
//             return safeArc(arc, d);
//           };
//         });
    }

    function updateLabels (labels, polyline, arc, t) {
        if (_chart.renderLabel()) {
            positionLabels(labels, arc, t);
            if (_externalLabelRadius && _drawPaths) {
                updateLabelPaths( polyline, arc, t);
            }
        }
    }

    function removeElements (selection) {
        selection.exit().remove();
    }

/**
    function highlightSlice (i, whether) {
        _chart.select('g.' + _sliceCssClass + '._' + i)
            .classed('highlight', whether);
    }

    function highlightFilter () {
        if (_chart.hasFilter()) {
            _chart.selectAll('g.' + _sliceCssClass).each(function (d) {
                if (_chart.isSelectedElement(d)) {
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
*/
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

    function sliceTooSmall (d) {
        var angle = ( getEndAngle(d) - getStartAngle(d) );
        return isNaN(angle) || angle < _minAngleForLabel;
    }

    function datumValueIsZero (d) {
        return _chart.cappedValueAccessor(d) === 0;
    }

    function isOffCanvasPie (d) {
        return !d || isNaN(getStartAngle(d)) || isNaN(getEndAngle(d));
    }

    function isOffCanvasSlice (d) {
        return !d || isNaN(d.x0) || isNaN(d.y0);
    };


    function fill (d, i) {
        return _chart.getColor(d.data, i);
    }

    function safeArc (arc, d) {
        var path = arc(d);
        if (path.indexOf('NaN') >= 0) {
            path = 'M0,0';
        }
        return path;
    }

    var startAngleXFn = function (d) {
        return d.x0;
    },
    endAngleXFn = function (d) {
        return d.x1;
    },
    getStartAngle = function (d) {
        return d.startAngle;
    },
    getEndAngle = function (d) {
        return d.endAngle;
    },

    tweenFn = function (d) {},

    tweenPie = function (d) {
        d.innerRadius = _innerRadius;
        var current = this._current;
        if (isOffCanvasPie(current)) {
            current = {startAngle: 0, endAngle: 0};
        } else {
            // only interpolate startAngle & endAngle, not the whole data object
            current = {startAngle: current.startAngle, endAngle: current.endAngle};
        }
        var i = d3.interpolate(current, d);
        this._current = i(0);
        return function (t) {
            return safeArc(buildArcs(), i(t));
        };
    },

    tweenSlice = function (d) {
        var current = this._current;
        if (isOffCanvasSlice(current)) {
            current = { x0: 0, x1: 0, y0: 0, y1: 0 };
        }
        var tweenTarget = {
            x0: d.x0,
            x1: d.x1,
            y0: d.y0,
            y1: d.y1
        };
        var i = d3.interpolate(current, tweenTarget);
        this._current = i(0);
        return function (t) {
           return safeArc(buildArcs(), Object.assign({}, d, i(t)));
        };
    },

    onClick = function (d, i) {
        if (_g.attr('class') !== _emptyCssClass) {
             _chart.__clickHandler(d,i);
        }
    },

    labelPosition = function (d, arc) {
        var centroid;
        if (_externalLabelRadius) {
            centroid = d3.arc()
                .innerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .centroid( d );
        } else {
            centroid = arc.centroid(d);
        }
        if (isNaN(centroid[0]) || isNaN(centroid[1])) {
            return 'translate(0,0)';
        } else {
            return 'translate(' + centroid + ')';
        }
    },

    labelPositionSlice = function (d, arc) {
        var centroid;
        if (_externalLabelRadius && d.height === 0) {
            centroid = d3.arc()
                .innerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .centroid( d.hasOwnProperty('x0') ? { startAngle: d.x1, endAngle: d.x0 } : d );
        } else {
            centroid = arc.centroid(d);
        }
        if (isNaN(centroid[0]) || isNaN(centroid[1])) {
            return 'translate(0,0)';
        } else {
            return 'translate(' + centroid + ')';
        }
    },

    buildArcs = function () {},

    buildPieArcs = function () {
        return d3.arc()
            .innerRadius(_innerRadius)
            .outerRadius(_radius - _externalRadiusPadding);
    },

    buildSliceArcs = function () {
        return d3.arc()
          .startAngle(function(d) {
              return Math.max(0, Math.min(2 * Math.PI, _chart._d3.scale.x(d.x0)));
          })
          .endAngle(function(d) {
              return Math.max(0, Math.min(2 * Math.PI, _chart._d3.scale.x(d.x1)));
          })
          .innerRadius(function(d) {
//               if ( d.data.key && d.data.key.length === 1 ) {
//                   return _innerRadius;
//               }
              return Math.max(0, _chart._d3.scale.y(d.y0));
          })
          .outerRadius(function(d) {
              return Math.max(0, _chart._d3.scale.y(d.y1));
          });
    },

    buildPolylineArcs = function () {},

    buildPiePolylineArcs = function () {
        return d3.arc()
            .innerRadius(_radius - _externalRadiusPadding)
            .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius);
    },

    buildSlicePolylineArcs = function () {
        return d3.arc()
            .startAngle(function (d) {
              return Math.max(0, Math.min(2 * Math.PI, _chart._d3.scale.x(d.x0)));
           })
            .endAngle(function (d) {
              return Math.max(0, Math.min(2 * Math.PI, _chart._d3.scale.x(d.x1)));
            })
            .innerRadius(_radius - _externalRadiusPadding)
            .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius);
    };


    // sunburst only!
    function collapseClick (d) {
        node = _chart.collapse(node.id === d.id ? _chart.nodes[0] : d);
    }

    _chart.collapse = function(d) {
      var xd = d3.interpolate(_chart._d3.scale.x.domain(), [d.x0, d.x1]),
          yd = d3.interpolate(_chart._d3.scale.y.domain(), [d.y0, 1]),
          yr = d3.interpolate(_chart._d3.scale.y.range(), [d.y0 ? 20 : _chart.innerRadius(), _chart.radius() - _chart.externalRadiusPadding()]);

        var transn = _chart.svg().transition()
          .tween("scale", function() {
            return function(t) {
              _chart._d3.scale.x.domain(xd(t));
              _chart._d3.scale.y.domain(yd(t)).range(yr(t)); };
          });
          transn.selectAll('path')
          .attrTween('d', function(d) {
            return function (t) {
              return buildArcs()(d);
            };
          })

          return d;
    };

    return _chart;
};
