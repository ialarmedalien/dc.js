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

    var _rootName = 'root',
    _layoutPadding,
    _layoutRound;


    // capMixin sets a string 'others' label; to work with hierarchical charts,
    // it needs to be an array.
    _chart.othersLabel( [ _chart.othersLabel() ] );

    _chart.layout = function() {
      var layout = d3.partition();
      if ( _layoutPadding ) {
          layout.padding( _layoutPadding );
      }
      if ( _layoutRound ) {
          layout.round( true );
      }
      return layout;
    };

// # partition.round([round]) <>
//
// If round is specified, enables or disables rounding according to the given boolean and returns this partition layout. If round is not specified, returns the current rounding state, which defaults to false.

    _chart.layoutRound = function (_) {
        if (arguments.length === 0) {
            return _layoutRound;
        }
        _layoutRound = _;
        return _chart;
    };

// # partition.padding([padding]) <>
//
// If padding is specified, sets the padding to the specified number and returns this partition layout. If padding is not specified, returns the current padding, which defaults to zero. The padding is used to separate a node's adjacent children.

    _chart.layoutPadding = function() {
        if (arguments.length === 0) {
            return _layoutPadding;
        }
        _layoutPadding = _;
        return _chart;
    };

    _chart.legendablesData = function() {
        return _chart.nodes.slice(1) || _chart.data();
    };

    //  var cdata = _chart.stratify( chartData );


    _chart.layoutData = function ( hierarchicalData, layout ) {
        var nodes = layout(
            hierarchicalData
              .sum( function(d) {
                  try {
                      return _chart._cappedValueAccessor(d) || 0;
                  }
                  catch (e) {
                      return 0;
                  }
              })
              .sort(function (a, b) {
                  return d3.ascending( _chart.ordering()(a), _chart.ordering()(b) );
              })
        )
        .descendants()
        .map(function (d) {
            d.key = d.data.key;
//             try {
//                 var val = _chart.valueAccessor()(d);
//                 d.data.computedValue = val;
//             }
//             catch (e) {
//                 d.data.computedValue = d.value;
//             }
            return d;
        });
        _chart.nodes = nodes;
        return nodes;
    };

    // Handle cases if value corresponds to generated parent nodes
    // ensure that titles return some value, rather than 'undefined'
    dc.override( _chart, 'cappedValueAccessor', function (d) {
        try {
            var value = _chart._cappedValueAccessor(d);
            if ( value ) {
                return value;
            }
            throw 'No value returned';
        }
        catch(e) {
            if (d.data && d.data.key) {
                return d.value;
            }
            return 0;
        }
    });
    dc.override( _chart, 'cappedKeyAccessor', function (d) {
        var key = _chart._cappedKeyAccessor(d);
        if ( typeof key === 'string' ) {
            return [ key ];
        }
        if ( key.length > 1 ) {
            return key.slice(-1)[0];
        }
        else if ( key.length === 0 ) {
            return _rootName;
        }
        return key[0];
    });


    return _chart;
};
