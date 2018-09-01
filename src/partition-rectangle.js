dc.partitionRectangle = function (parent, chartGroup) {

    var _chart = {};
    ['base', 'color', 'cap', 'margin', 'legendable', 'orientation', 'hierarchy', 'partition', 'highlighter', 'collapsible'].forEach( function(m) {
        _chart = dc[m + 'Mixin'](_chart);
    });

    var DEFAULT_MIN_HT_FOR_LABEL = 12;

    var _sliceCssClass = 'partition-slice';
    var _labelCssClass = 'partition-label';
    var _sliceGroupCssClass = 'partition-slice-group';
    var _labelGroupCssClass = 'partition-label-group';
    var _emptyCssClass = 'empty-chart';
    var _emptyTitle = 'empty';

    var _g;
    var _minHeightForLabel = DEFAULT_MIN_HT_FOR_LABEL;
    var node;

    var dx = function(d){
      return _chart._d3.scale.x(d.x1) - _chart._d3.scale.x(d.x0);
    },
    dy = function(d){
      return _chart._d3.scale.y(d.y1) - _chart._d3.scale.y(d.y0);
    },
    xy = function(d) {
      return 'translate(' + _chart._d3.scale.x(d.x0) + ',' + _chart._d3.scale.y(d.y0) + ')';
    },
    yx = function(d) {
      return 'translate(' + _chart._d3.scale.x(d.y0) + ',' + _chart._d3.scale.y(d.x0) + ')';
    },
    getWidth = dx,
    getHeight = dy,
    getTransform = xy;

    _chart.margins({top: 0, right: 0, bottom: 0, left: 0});
    _chart.sliceCssClass = _sliceCssClass;
    _chart._highlightableClasses([ 'g.' + _sliceCssClass ]);

    _chart.colorAccessor(_chart.cappedKeyAccessor);
    _chart.title(function (d) {
        return _chart.cappedKeyAccessor(d) + ': ' + _chart.cappedValueAccessor(d);
    });
    _chart.label(_chart.cappedKeyAccessor);
    _chart.renderLabel(true);
    _chart.transitionDuration(350);
    _chart.transitionDelay(0);

    _chart.onClick = onClick;

    // add a clip-path for the rectangles layer
/*    function addClipPath( el ) {
        el
          .append( 'rect' )
          .attr( 'x', 0 )
          .attr( 'y', 0 )
          .attr( 'width', _chart.effectiveWidth() )
          .attr( 'height', _chart.effectiveHeight() );
        return;
    }
*/
    _chart._d3 = {};

    _chart._d3.scale = {
        x: d3.scaleLinear()
      , y: d3.scaleLinear()
      , qtt: d3.scaleLinear()
      , names: d3.scaleOrdinal()
    };
    _chart._d3.transform = function(d, n) { return "translate(8," + (d.x1-d.x0) * n / 2 + ")"; };


    // translate the base to the appropriate position
//     _chart.base
//       .attr( 'transform', chart.plot_transform() );

    _chart._doRender = function () {
        _chart.resetSvg();

        if ( _chart.horizontalOrientation() ) {
          getWidth = dy,
          getHeight = dx,
          getTransform = yx;
        }

        _g = _chart.svg()
            .append('g');

        _g.append('clipPath')
          .attr('id', function() {
              return 'clip-path-' +  _chart.__dcFlag__;
          })
          .append( 'rect' )
          .attr( 'x', 0 )
          .attr( 'y', 0 )
          .attr( 'width', _chart.effectiveWidth() )
          .attr( 'height', _chart.effectiveHeight() );

        _g.append('g')
            .attr('class', _sliceGroupCssClass)
            .attr('clip-path', 'url(\'#clip-path-' + _chart.__dcFlag__ + '\')');

        _g.append('g').attr('class', _labelGroupCssClass);

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

//     function transitionEl (duration, delay, el) {
//         return dc.transition( el, duration, delay );
//     }

    function drawChart() {
        var chartData = _chart.data();
        var emptyChart = true;
        for (var i = 0; i < chartData.length; i++) {
            if ( _chart.cappedValueAccessor( chartData[i] ) !== 0 ) {
                emptyChart = false;
                break;
            }
        }

        var dataWithLayout = _chart.prepareData( chartData, emptyChart );
        node = dataWithLayout[0];

        _chart._d3.scale.x
          .range( [ 0, _chart.effectiveWidth() ] )
        _chart._d3.scale.y
          .range( [ 0, _chart.effectiveHeight() ] )

        // map y axis values to counts
        // domain should be the 0 - chart.root_node.count
//        _chart._d3.scale.qtt.range( [ _chart.effectiveHeight(), 0 ] );

        // map depth to classification category
//        _chart._d3.scale.names.bandwidth( _chart._d3.scale.x.range() );

        if (_g) {
            _g.classed(_emptyCssClass, emptyChart);

            var slices = _g.select('g.' + _sliceGroupCssClass)
                .selectAll('g.' + _sliceCssClass)
                .data(dataWithLayout);

            var t = d3.transition()
              .duration( _chart.transitionDuration() )
              .delay( _chart.transitionDelay() );

            slices.exit()
              .transition(t)
              .remove();

            createElements(slices, t);

            updateElements(slices, t);

            _chart._highlightFilter();

            dc.transition(_g,
              _chart.transitionDuration(),
              _chart.transitionDelay()
            )
            .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');
        }
    }


    function nodeSliceClass (d, i) {
        return _sliceCssClass + ' _' + i + ( d.depth ? ' ' + _sliceCssClass + '-level-' + d.depth : '' );
    }

    function fill (d, i) {
        return _chart.getColor(d.data, i);
    }

    function titleSelection ( selection ) {
        selection
        .text(function (d) {
            return _chart.title()(d.data);
        });
    }

    function tweenPos ( selection, t ) {
        selection
        .transition(t)
        .attr( 'transform', getTransform );
    }

    function tweenRect ( selection, t ) {
        selection.transition(t)
          .style('opacity', 1)
          .attr('fill', fill)
          .attr('width', getWidth)
          .attr('height', getHeight);
    }

    function tweenText ( selection, t ) {
        selection
          .transition(t)
          .text( function( d ){ return _chart.label()(d) })
          .style( 'opacity', function( d ){
            return getHeight(d) > _chart.minHeightForLabel() ? 1 : 0
          })
          .attr( 'transform', function( d ){
            return 'translate(8,' + (getHeight(d)/2 + 4) + ')';
          })

    }

    function createElements ( selection, t ) {
      var selEnter = selection
        .enter()
        .append('g')
        .on('click', _chart.collapsible() ? collapseClick : onClick)
        .on('mouseover', function (d, i) {
            _chart._highlightElement(i, true);
        })
        .on('mouseout', function (d, i) {
            _chart._highlightElement(i, false);
        })
        .attr('class', nodeSliceClass )
        .classed( 'leaf', function( d ){
          return d.height === 0
        })
//         .merge(selection)
//         .transition(t)
//         .attr('transform', getTransform);

//       tweenPos( selEnter, t );
      selEnter
        .transition(t)
        .attr( 'transform', getTransform );

      if (_chart.renderTitle()) {
          titleSelection( selEnter.append('title') );
      }

      tweenRect( selEnter.append( 'rect' )
        .attr('fill', fill)
        .style('opacity', 0)
        .attr('width', 0 )
        .attr('height', 0 ), t );

      if ( _chart.renderLabel() ) {
        tweenText( selEnter
          .append( 'text' )
          .style( 'opacity', 0 ), t );
      }
    }

    function updateElements ( selection, t ) {

      selection
        .transition(t)
        .attr( 'transform', getTransform );

      tweenRect( selection.select( 'rect' ), t );

      if ( _chart.renderLabel() ) {
          tweenText( selection.select( 'text' ), t );
      }

      if (_chart.renderTitle()) {
          titleSelection( selection.select('title') );
      }
    }

    function collapseClick (d) {
        console.log( node.id === d.id ? _chart.nodes[0] : d );
        node = _chart.collapse(node.id === d.id ? _chart.nodes[0] : d);
        console.log('node now: ' + node.id);
    }

    _chart.collapse = function(d) {
        console.log(d.id);
        _chart._d3.scale.x
          .domain([ d.x0, d.x1 ])
          .range([
            d.x0 ? 20 : 0,
            d.x1 === 1 ? _chart.effectiveWidth() : _chart.effectiveWidth() - 20
          ]);
        _chart._d3.scale.y
          .domain([d.y0, 1 ])
          .range([d.y0 ? 20 : 0, _chart.effectiveHeight()]);

        var slices = _g.select('g.' + _sliceGroupCssClass)
            .selectAll('g.' + _sliceCssClass);

        var t = d3.transition()
          .duration( _chart.transitionDuration() )
          .delay( _chart.transitionDelay() );

        updateElements( slices, t );

        return d;
      };


    /**
     * Get or set the minimum slice height for label rendering. Any slice with a smaller height will not
     * display a label.
     * @method minHeightForLabel
     * @memberof dc.pieTypeMixin
     * @instance
     * @param {Number} [minHeightForLabel=12]
     * @returns {Number|dc.pieTypeMixin}
     */
    _chart.minHeightForLabel = function (minHeightForLabel) {
        if (!arguments.length) {
            return _minHeightForLabel;
        }
        _minHeightForLabel = minHeightForLabel;
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

    return _chart.anchor(parent, chartGroup);

};

dc.partitionRectangleChart = dc.partitionRectangle;
