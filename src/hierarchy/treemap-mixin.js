/**
 * Treemap mixin for hierarchical graphs
 *
 */
dc.treemap = function (parent, chartGroup) {

    var DEFAULT_MIN_HT_FOR_LABEL = 12;

    var _sliceCssClass = 'cell-slice';
    var _labelCssClass = 'cell-label';
    var _sliceGroupCssClass = 'cell-slice-group';
    var _labelGroupCssClass = 'cell-label-group';
    var _emptyCssClass = 'empty-chart';
    var _emptyTitle = 'empty';

    var _g;
    var _minHeightForLabel = DEFAULT_MIN_HT_FOR_LABEL;
    var node;

    var _chart =
      dc.hierarchyMixin(
        dc.marginMixin(
          dc.orientationMixin(
            dc.legendableMixin(dc.capMixin(dc.colorMixin(dc.baseMixin({}))))
          )
        )
      );


    _chart.layout = function() {
      return d3.treemap();
    };

   _chart._doRender = function () {
        _chart.resetSvg();

        _g = _chart.svg()
            .append('g');

        _g.append('g').attr('class', _sliceGroupCssClass);
        _g.append('g').attr('class', _labelGroupCssClass);

        drawChart();

        return _chart;
    };

    _chart._doRedraw = function () {
        drawChart();
        return _chart;
    };

    function drawChart() {

        var chartData = _chart.data();
        var emptyChart = _chart.hasNoData( chartData );
        var dataWithLayout = _chart.prepareData( chartData, emptyChart );
        node = dataWithLayout[0];

        if (_g) {
            _g.classed(_emptyCssClass, emptyChart);

            var slices = _g.select('g.' + _sliceGroupCssClass)
                .selectAll('g.' + _sliceCssClass)
                .data(dataWithLayout);

            var labels = _g.select('g.' + _labelGroupCssClass)
                .selectAll('text.' + _labelCssClass)
                .data(dataWithLayout);

            var t = d3.transition()
              .duration( _chart.transitionDuration() )
              .delay( _chart.transitionDelay() );

            [ slices, labels ].forEach( function(e) {
              removeElements(e, t);
            });

            createElements(slices, labels, t);

            updateElements(slices, labels, t);

            highlightFilter();

            dc.transition(_g, _chart.transitionDuration(), _chart.transitionDelay())
                .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');


        }
    }
/*
  d3.select("body")
    .selectAll(".node")
    .data(root.leaves())
    .enter()
      .append("div")
      .attr("class", "node")
      .attr("title", function(d) { return d.id + "\n" + format(d.value); })
      .style("left", function(d) { return d.x0 + "px"; })
      .style("top", function(d) { return d.y0 + "px"; })
      .style("width", function(d) { return d.x1 - d.x0 + "px"; })
      .style("height", function(d) { return d.y1 - d.y0 + "px"; })
      .style("background", function(d) {
          while (d.depth > 1) d = d.parent;
          return color(d.id);
      })
    .append("div")
      .attr("class", "node-label")
      .text(function(d) { return d.id.substring(d.id.lastIndexOf(".") + 1).split(/(?=[A-Z][^A-Z])/g).join("\n"); })
    .append("div")
      .attr("class", "node-value")
      .text(function(d) { return format(d.value); });


      var selEnter = selection
        .enter()
        .append('g')
        .on('click', _collapsible ? collapseClick : onClick)
        .on('mouseover', function (d, i) {
            highlightSlice(i, true);
        })
        .on('mouseout', function (d, i) {
            highlightSlice(i, false);
        })
        .attr('class', nodeSliceClass )
        .classed( 'leaf', function( d ){
          return d.height === 0
        })



    }
*/


    return _chart;
};
