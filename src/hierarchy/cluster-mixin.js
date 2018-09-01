/**
 * Cluster chart for hierarchical graphs
 *
 *
 *
 * @class clusterChart
 * @memberof dc
 * @mixes dc.hierarchyMixin
 * @mixes dc.legendableMixin
 * @mixes dc.marginMixin
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @param {Object} _chart
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @returns {dc.clusterChart}
 **/

dc.clusterSizingMixin = function (_chart) {

    var _nodeSize
    , _separation
    , _nodeMarkerSize = 2.5;

/**
# cluster.size([width, height]) <>

If size is specified, sets this layout's size to the specified two-element array of numbers [width, height] and returns this layout. If size is not specified, returns the current layout size, which defaults to [1, 1]. A layout size of null indicates that a node size will be used instead. The coordinates x and y represent an arbitrary coordinate system; for example, to produce a radial layout, a size of [360, radius] corresponds to a breadth of 360° and a depth of radius.
*/

/**
# cluster.nodeSize([size]) <>
If size is specified, sets this layout's node size to the specified two-element array of numbers [width, height] and returns this cluster layout. If size is not specified, returns the current node size, which defaults to null. A node size of null indicates that a layout size will be used instead. When a node size is specified, the root node is always positioned at <0, 0>.
*/

    _chart.nodeSize = function (_) {
        if (arguments.length === 0) {
            return _nodeSize;
        }
        _nodeSize = _;
        return _chart;
    };

/**

If separation is specified, sets the separation accessor to the specified function and returns this layout. If separation is not specified, returns the current separation accessor, which defaults to:

function separation(a, b) {
  return a.parent == b.parent ? 1 : 2;
}
The separation accessor is used to separate neighboring leaves. The separation function is passed two leaves a and b, and must return the desired separation. The nodes are typically siblings, though the nodes may be more distantly related if the layout decides to place such nodes adjacent.

*/
    _chart.separation = function (_) {
        if (arguments.length === 0) {
            return _separation;
        }
        _separation = _;
        return _chart;
    };

/**
nodeMarkerSize

radius of the symbols used as node markers

defaults to 2.5
*/
    _chart.nodeMarkerSize = function (_) {
        if (arguments.length === 0) {
            return _nodeMarkerSize;
        }
        _nodeMarkerSize = _;
        return _chart;
    };
    return _chart;
};

dc.radialLayoutMixin = function (_chart) {

    var _radialLayout = false;
    /**
     *
     *
     * @method radialLayout
     * @memberof dc.radialLayoutMixin
     * @instance
     * @param {Number} [minHeightForLabel=false]
     * @returns {Number|dc.radialLayoutMixin}
     */
    _chart.radialLayout = function (bool) {
        if (!arguments.length) {
            return _radialLayout;
        }
        _radialLayout = bool;
        return _chart;
    };

    return _chart;
};

dc.clusterChart = function (parent, chartGroup) {

    var _chart = {};
    ['base', 'color', 'margin', 'legendable', 'orientation', 'hierarchy', 'collapsible', 'radialLayout', 'clusterSizing', 'highlighter', 'diagonal' ].forEach( function(m) {
        _chart = dc[m + 'Mixin'](_chart);
    });

    var _layoutType = 'cluster';

    var DEFAULT_MIN_HT_FOR_LABEL = 12;

    var _linkCssClass = 'cluster-link';
    var _nodeCssClass = 'cluster-node';
    var _labelCssClass = 'cluster-label';
    var _linkGroupCssClass = 'cluster-link-group';
    var _nodeGroupCssClass = 'cluster-node-group'
    var _labelGroupCssClass = 'cluster-label-group';
    var _emptyCssClass = 'empty-chart';
    var _emptyTitle = 'empty';

    var _g;
    var _minHeightForLabel = DEFAULT_MIN_HT_FOR_LABEL;

    var getTransform
    , transform = {
      radial: function ( d ) {
          return "translate(" + d3.pointRadial(d.x, d.y) + ")";
      }
      , h: function ( d ) {
          return "translate(" + d.y + "," + d.x + ")";
      }
      , v: function ( d ) {
          return "translate(" + d.x + "," + d.y + ")";
      }
    };


    _chart._highlightableClasses([ 'g.' + _nodeCssClass, 'path.' + _linkCssClass ]);
    _chart.margins({top: 10, right: 10, bottom: 10, left: 10});

    _chart.colorAccessor(_chart.keyAccessor());
    _chart.title(function (d) {
        return _chart.keyAccessor()(d) + ': ' + _chart.valueAccessor()(d);
    });
    _chart.label(_chart.keyAccessor());
    _chart.renderLabel(true);
    _chart.transitionDuration(350);
    _chart.transitionDelay(0);

    _chart.onClick = onClick;

    _chart._d3 = {};

    _chart.layoutData = function ( hierarchicalData, layout ) {
      layout( hierarchicalData );
      hierarchicalData.descendants()
      .forEach(function (d) {
          d.key = d.data.key;
      });
      return hierarchicalData;
    }

    var _cachedData;

    _chart._doRender = function () {
        initScales();
        _chart.resetSvg();

        _cachedData = _chart.data();

        _g = _chart.svg()
            .append('g');

        _chart.layers = { base: _g };

        [ _labelGroupCssClass, _linkGroupCssClass, _nodeGroupCssClass ].forEach( function (e) {
          _g.append('g').attr('class', e);
        });

        drawChart();

        return _chart;
    };

    _chart._doRedraw = function () {
        drawChart();
        return _chart;
    };

    function onClick (d, i) {
      if (_g.attr('class') !== _emptyCssClass) {
            _chart.__clickHandler(d, i);
        }
    }

    function initLayers() {
        _chart = dc.clusterTreeMixin(_chart);
        if ( _chart.radialLayout() ) {
          _chart = dc.clusterTreeRadialMixin(_chart);
        }
        else {
          _chart = dc.clusterTreeCartesianMixin(_chart);
        }
    }

    function initScales() {
      if ( _chart.radialLayout() ) {
        getTransform = transform.radial;
      }
      else {
        if ( _chart.horizontalOrientation() ) {
          getTransform = transform.h;
        }
        else {
          getTransform = transform.v;
        }
      }
    }

    _chart.layout = function () {
        // set either d3.cluster or d3.tree
        var layout = d3[_layoutType]();
        if ( _chart.radialLayout() ) {
            layout
            .size([ Math.PI * 2, Math.min( _chart.effectiveHeight(), _chart.effectiveWidth() )/2 ])
        }
        else {
            layout
            .size([ _chart.effectiveHeight(), _chart.effectiveWidth() ])
        }
        if ( _chart.nodeSize() !== undefined ) {
            layout.nodeSize( _chart.nodeSize() );
        }
        if ( _chart.separation() !== undefined ) {
            layout.separation( _chart.separation() );
        }
        return layout;
    };

    var _filterDisplayed = function (d) {
        return _chart.valueAccessor()(d) > 0;
    };


    function drawChart() {
        var chartData = _cachedData.filter(_filterDisplayed);
        var emptyChart = _chart.hasNoData( chartData );
        var dataWithLayout = _chart.prepareData( chartData, emptyChart );
        var i = 0;
        dataWithLayout.x0 = dataWithLayout.x;
        dataWithLayout.y0 = dataWithLayout.y;

        _chart.source = dataWithLayout;

        if (_g) {
            _g.classed(_emptyCssClass, emptyChart);

            // move the base to the appropriate location
            if ( _chart.radialLayout() ) {
              _g.attr('transform', 'translate('
              + ( _chart.margins().left + _chart.effectiveWidth()/2 ) + ','
              + ( _chart.margins().top + _chart.effectiveHeight()/2 ) + ')');
            }
            else {
              _g.attr('transform', 'translate('
              + _chart.margins().left + ',' + ( _chart.nodeSize() !== undefined ? _chart.margins().top + _chart.effectiveHeight()/2 : _chart.margins().top ) + ')');
            }

            var links = _g.select('g.' + _linkGroupCssClass)
                .selectAll('path.' + _linkCssClass)
                .data( dataWithLayout.descendants().slice(1), function(d) {
                  return d.id || (d.id = ++i);
                });

            var nodes = _g.select('g.' + _nodeGroupCssClass)
                .selectAll('g.' + _nodeCssClass)
                .data( dataWithLayout.descendants(), function(d) {
                  return d.id || (d.id = ++i);
                });

            if ( _chart.radialLayout() ) {
              var uniq = {}
              dataWithLayout.descendants().forEach( function(e) {
                uniq.hasOwnProperty( e.y ) ? uniq[e.y]++ : uniq[e.y] = 1;
              });

              var circs = _g.select('g.' + _labelGroupCssClass)
                .selectAll('circle.circClass')
                .data( Object.keys(uniq) );

              addCircles( circs, t );
            }

            var t = d3.transition()
              .duration( _chart.transitionDuration() )
              .delay( _chart.transitionDelay() );

            addElements( links, nodes, t );

           _chart._highlightFilter();

            dataWithLayout.each( function(d) {
              d.x0 = d.x;
              d.y0 = d.y;
            });

        }
    }

    function titleSelection ( selection ) {
        selection
        .text(function (d) {
            return _chart.title()(d.data);
        });
    }

    function highlightPaths(d) {
      // get the parents recursively
      var ancestors = [ d.id ]
      while ( d.parent !== null ) {
        ancestors.push(d.parent.id);
        d = d.parent;
      }
       _g.select('g.' + _linkGroupCssClass)
          .selectAll('path.' + _linkCssClass)
          .each( function(n) {
              if ( ancestors.includes( n.id ) ) {
                  this.parentNode.append(this)
                  this.classList.add('toRoot')
              }
          });
    }
    function dehighlightPaths(d) {
        _g.select('g.' + _linkGroupCssClass)
          .selectAll('path.' + _linkCssClass)
          .classed('toRoot', false)
    }

    function addCircles ( circs, t ) {
      circs.exit()
        .transition(t)
        .attr("r", 1e-6);

      var circEnter = circs.enter()
        .append('circle')
        .attr('r', 1e-6)
        .attr('class', 'circClass')

      circEnter.merge(circs)
        .transition(t)
        .attr('r', function(d) { return d })

    }

    function addElements ( links, nodes, t ) {
      var nodeExit = nodes.exit()
        .transition(t);

      nodeExit
        .attr("transform", function(d) {
          return getTransform(_chart.source)
        })
        .remove();

      nodeExit.select("circle")
        .attr("r", 1e-6);

      nodeExit.select("text")
        .style("fill-opacity", 1e-6);

      var nodesEnter = nodes.enter()
      .append("g")
      .attr("class", nodeCssClass)
      .attr("transform", function(d) {
        return getTransform({ x: _chart.source.x0, y: _chart.source.y0 })
      })
      .on('mouseover', highlightPaths)
      .on('mouseout', dehighlightPaths);

      // circle, cross, diamond, square, star, triangle, wye
//       d3.symbol()
//         .type(type)
//         .size(1)

      var symbolEnter = nodesEnter
      .append("circle")
      .attr("r", 1e-6)
      .on('click', _chart.collapsible() ? collapseClick : onClick )

      nodesEnter
      .transition(t)
      .attr("transform", function(d) {
        return getTransform(d)
      });

      symbolEnter
      .transition(t)
      .attr("r", _chart.nodeMarkerSize() )
      .style("fill", fill)


      if (_chart.renderTitle()) {
          titleSelection( symbolEnter.append('title') );
      }

      if ( _chart.renderLabel() ) {
        nodesEnter
          .append("text")
          .attr('class', _labelCssClass)
          .text( function( d ){ return _chart.label()(d) })
          .style("fill-opacity", 1e-6)
          .attr("dy", function(d) { return d.children || d._children ? "-.35em" : ".35em" })
          .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
          .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
      }

      var nodeUpdate = nodes.merge(nodesEnter)
        .transition(t);
        nodeUpdate
          .attr("transform", function(d) {
              return getTransform(d)
          });

      nodeUpdate.select("circle")
          .attr("r", _chart.nodeMarkerSize() )
          .style("fill", fill)

      nodeUpdate.select("text")
          .style("fill-opacity", 1)

   // Transition exiting links to the parent's new position.
      links.exit()
      .transition(t)
      .attr("d", function(d) {
        var o = {x: _chart.source.x, y: _chart.source.y};
        return _chart._d3.diagonal({source: o, target: o});
      })
      .remove();

      // Enter any new links at the parent's previous position.
      var linksEnter = links.enter().insert("path", "g")
          .attr("class", _linkCssClass )
          .attr("d", function(d) {
            var o = {x: _chart.source.x0, y: _chart.source.y0};
            return _chart._d3.diagonal({source: o, target: o});
          })

      // Transition links to their new position.
      linksEnter.merge(links)
      .transition(t)
        .attr("d", function(d) {
          return _chart._d3.diagonal({ source: d.parent, target: d });
        });
    }

    function collapseClick(d) {
      if( d.children ) {
        d._children = d.children;
        d.children = null;
      } else if( d._children ) {
        d.children = d._children;
        d._children = null;
      }
      drawChart();
    }

    function collapse(d) {
      if ( d.children ) {
        d._children = d.children;
        d._children.forEach(collapseClick);
        d.children = null;
      }
      drawChart();
    }


    function nodeCssClass (d, i) {
        return _nodeCssClass + ' _' + i + ' '
        + _nodeCssClass + '-level-' + d.depth +
        ( d.height === 0
          ? ' leaf'
          : (d.depth === 0
            ? ' root'
            : ' internal') );
    }

    function fill (d, i) {
        return _chart.getColor(d.data, i);
    }

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

    _chart.layoutType = function (_) {
        if (arguments.length === 0) {
            return _layoutType;
        }
        if ( _ !== 'cluster' && _ !== 'tree' ) {
            console.log('Could not set layoutType; permitted values are "cluster" and "tree"');
            return _chart;
        }
        _layoutType = _;
        return _chart;
    };


    return _chart.anchor(parent, chartGroup);
};

