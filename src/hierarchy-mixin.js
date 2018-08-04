/**
 * Hierarchy mixin for hierarchical graphs
 *
 * When filtering, the hierarchical chart creates instances of {@link dc.filters.HierarchyFilter HierarchyFilter}.
 *
 * @name hierarchyMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @returns {dc.hierarchyMixin}
 */
dc.hierarchyMixin = function (_chart) {

    // filters for hierarchical graphs
    _chart.filterHandler(function (dimension, filters) {
        if (filters.length === 0) {
            dimension.filter(null);
        } else {
            dimension.filterFunction(function (d) {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (filter.isFiltered && filter.isFiltered(d)) {
                        return true;
                    }
                }
                return false;
            });
        }
        return filters;
    });

    _chart.isSelectedSlice = function (d) {
        return isPathFiltered( d.key );
    }

    function isPathFiltered (path) {
        for (var i = 0; i < _chart.filters().length; i++) {
            var currentFilter = _chart.filters()[i];
            if (currentFilter.isFiltered(path)) {
                return true;
            }
        }
        return false;
    }

//  returns all filters that are a parent or child of the path
    _chart.filtersForPath = function (path) {
        var pathFilter = dc.filters.HierarchyFilter(path);
        var filters = [];
        for (var i = 0; i < _chart.filters().length; i++) {
            var currentFilter = _chart.filters()[i];
            if (currentFilter.isFiltered(path) || pathFilter.isFiltered(currentFilter)) {
                filters.push(currentFilter);
            }
        }
        return filters;
    }

    /**
     * Hierarchy click handling
     *
     * The argument is the data from the item clicked upon; the click handler
     * checks whether the item is currently filtered or not. Triggers a chart
     * re-draw.
     *
     * @method __clickHandler
     * @memberof dc.hierarchyMixin
     * @param {Object} [d]
     */


    _chart.__clickHandler = function (d) {
        var path = d.key;
        var filter = dc.filters.HierarchyFilter(path);

        // filters are equal to, parents or children of the path.
        var filters = _chart.filtersForPath(path);
        var exactMatch = false;
        // clear out any filters that cover the path filtered.
        for (var i = filters.length - 1; i >= 0; i--) {
            var currentFilter = filters[i];
            if (dc.utils.arraysIdentical(currentFilter, path)) {
                exactMatch = true;
            }
            _chart.filter(filters[i]);
        }
        dc.events.trigger(function () {
            // if it is a new filter - put it in.
            if (!exactMatch) {
                _chart.filter(filter);
            }
            _chart.redrawGroup();
        });
    }

    // formatting data for a hierarchical graph
    // converts a flat array of data into a hierarchy using the key field
    // if there are missing parents, _chart.stratify will fill them in

    _chart.formatData = function ( chartData, layout ) {

        var cdata = _chart.stratify( chartData, _chart.keyAccessor() );
        var maxDepth = 0;
        var nodes = layout( cdata
          .sum( function(d) {
              return _chart.cappedValueAccessor(d);
          })
          .sort(function (a, b) {
              return d3.ascending( _chart.ordering()(a), _chart.ordering()(b) );
          })
        )
        .descendants()
        .map(function (d) {
            d.key = d.data.key;
            try {
                var val = _chart.valueAccessor()(d);
                d.data.computedValue = val;
            }
            catch (e) {
                d.data.computedValue = d.value;
            }
//             if ( ! d.data.value ) {
//                 d.data.value = d.value;
//             }
            if (d.depth > maxDepth) {
                maxDepth = d.depth;
            }
            return d;
        });
        _chart.maxDepth = maxDepth;
        _chart.nodes = nodes;
        return nodes;
    };

    _chart.stratify = function ( list, key_acc ) {

      // if we have data...
      var extras = []
      var ordered = list.map( function(x){
        return { data: x, ix: key_acc(x).join("\0") }
      }).sort( function( x, y ) {
        return x.ix === y.ix ? 0 : x.ix > y.ix
      } )
      .map( function(x){
        return x.data
      })
      var prev = { key: [] }
      for ( var i = 0; i < ordered.length; i++ ) {
        var curr = ordered[i]
        for ( var j = 0; j < curr.key.length - 1; j++ ) {
          if ( ! prev.key[j] || prev.key[j] !== curr.key[j] ) {
            for ( var x = 1; x < curr.key.length - j; x ++ ) {
              extras.push( { key: curr.key.slice( 0, j+x ) } )
            }
            // leave the loop
            break
          }
        }
        prev = ordered[i];
      }

      try {
        var full = extras.concat(list).concat([{ key: [] }]);
        var rooted = d3.stratify()
          .id( function(d) { return ['root'].concat(key_acc(d)) } )
          .parentId( function(d) {
            return key_acc(d).length == 0
              ? []
              : ['root'].concat( key_acc(d).slice(0,-1) )
          })
          ( full );
        return rooted;
      }
      catch(e) {
        console.log(e)
      }
    };

    return _chart;
};
