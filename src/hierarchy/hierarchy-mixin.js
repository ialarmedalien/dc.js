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

    _chart = dc.hierarchyDataMixin(
      dc.hierarchyFilterMixin(
        dc.hierarchyClickHandlerMixin(
          _chart)));

    return _chart;
};


dc.collapsibleMixin = function (_chart) {
    var _collapsible = false;
    _chart.collapsible = function(bool) {
        if (!arguments.length) {
          return _collapsible;
        }
        _collapsible = bool;
        return _chart;
    };
    return _chart;
};


dc.hierarchyDataMixin = function (_chart) {

    /**
     * Prepare data for hierarchical graphs by formatting it and running it
     * through the chart layout function
     *
     * @method prepareData
     * @memberof dc.hierarchyDataMixin
     * @param {Array} [chartData] flat array of chart data objects
     * @param {Boolean} [emptyChart]
     * @returns {Object} [dataWithLayout] data formatted using the chart's layout
     */
    _chart.prepareData = function ( chartData, emptyChart ) {
        // stratify the chart data into the appropriate data structure
        var hierarchicalData = _chart.stratify( chartData ),
        dataWithLayout;
        // if we have data...
        if ( ! emptyChart ) {
            dataWithLayout = _chart.layoutData( hierarchicalData, _chart.layout() );
        } else {
            // just the root node
            dataWithLayout = _chart.layoutData( [], _chart.layout() );
        }
        return dataWithLayout;
    };

    // formatting data for a hierarchical graph
    // converts a flat array of data into a hierarchy using the key field
    // if there are missing parents, _chart.stratify will fill them in
    /**
     * Apply a layout to hierarchical data by running it through a supplied layout
     * function. This function may be overridden in child classes to apply
     * additional transforms to the laid-out data.
     *
     * @method layouData
     * @memberof dc.hierarchyDataMixin
     * @param {Object} [hierarchicalData] d3 hierarchy of chart data objects
     * @param {Function} [layout] function that applies a layout
     * @returns {Object} [dataWithLayout] data formatted using the chart's layout
     */
    _chart.layoutData = function ( hierarchicalData, layout ) {
        return layout( hierarchicalData );
    };

    _chart.hasNoData = function ( chartData ) {
        for (var i = 0; i < chartData.length; i++) {
            if ( _chart.valueAccessor()( chartData[i] ) !== 0 ) {
                return false;
            }
        }
        return true;
    };

    /**
     * Fill in the missing (inferred) ancestors in a hierarchy
     *
     * @method createMissingAncestors
     * @memberof dc.hierarchyMixin
     * @param {Array} [list] array of data objects
     * @param {function} [accessor] unique accessor for list items
     * @returns {Array} [all] array of data objects with all ancestors filled in
     */

    _chart.createMissingAncestors = function ( list, accessor ) {
        var all = [];
        // sort the list
        var ordered = list.map( function(x){
          return { data: x, ix: accessor(x).join('\0') };
        }).sort( function( x, y ) {
          return x.ix === y.ix ? 0 : x.ix > y.ix;
        })
        .map( function(x){
          return x.data;
        });
        var prev = { key: [] };
        for ( var i = 0; i < ordered.length; i++ ) {
          var curr = ordered[i];
          for ( var j = 0; j < curr.key.length - 1; j++ ) {
            if ( ! prev.key[j] || prev.key[j] !== curr.key[j] ) {
              for ( var x = 1; x < curr.key.length - j; x ++ ) {
                all.push( { key: curr.key.slice( 0, j+x ) } );
              }
              break;
            }
          }
          prev = ordered[i];
        }
        return all.concat(list);
    };

    /**
     * Convert a flat set of hierarchical data into a tree using d3.stratify
     *
     *
     * @method stratify
     * @memberof dc.hierarchyMixin
     * @param {Array} [list]
     */
    _chart.stratify = function ( list ) {
      var acc = _chart.keyAccessor(),
      full = _chart.createMissingAncestors( list, acc ),
      rooted;
      // try without a root as our data may already be nicely hierarchical
      try {
        rooted = d3.stratify()
          .id( function(d) { return acc(d); } )
          .parentId( function(d) {
            return acc(d).slice(0,-1);
          })
          ( full );
        return rooted;
      }
      catch(e) {
//        console.log(e);
      }
      // if that did not work, add a fake root.
      try {
        rooted = d3.stratify()
          .id( function(d) { return ['root'].concat(acc(d)); } )
          .parentId( function(d) {
            return acc(d).length === 0
              ? []
              : ['root'].concat( acc(d).slice(0,-1) );
          })
          ( full.concat([{ key: [] }]) );
        return rooted;
      }
      catch(e) {
        console.log(e);
      }
    };

    return _chart;
};

/**
 * Filter mixin for hierarchical graphs
 *
 * When filtering, the hierarchical chart creates instances of {@link dc.filters.HierarchyFilter HierarchyFilter}.
 *
 * @name hierarchyFilterMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @returns {dc.hierarchyFilterMixin}
 */
dc.hierarchyFilterMixin = function (_chart) {

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

    _chart.isSelectedElement = function (d) {
        return isPathFiltered( d.key );
    };

    function isPathFiltered (path) {
        for (var i = 0; i < _chart.filters().length; i++) {
            var currentFilter = _chart.filters()[i];
            if (currentFilter.isFiltered(path)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Retrieve the filters involving a certain path -- the filters may be a
     * parent or child of the path.
     *
     * @method filtersForPath
     * @memberof dc.hierarchyFilterMixin
     * @param {Object} [path]
     * @returns {Array} [filters] array of filter items
     */

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
    };

    /**
     * Filter a chart by a data item.
     *
     * The argument is the `data` object from the item clicked upon; the function
     * checks whether the item is currently filtered or not. If the item is not
     * currently filtered, a new dc.filters.hierarchyFilter is returned.
     *
     * @method filterOnDatum
     * @memberof dc.hierarchyFilterMixin
     * @param {Object} [d]
     * @returns {dc.filters.hierarchyFilter} [filter]
     */
    _chart.filterOnDatum = function (d) {
        var path = d.key;
        var filter = dc.filters.HierarchyFilter(path);

        // filters are equal to, parents or children of the path.
        var filters = _chart.filtersForPath(path);
        var exactMatch = false;
        var currentFilter;

        // clear out any filters that cover the path filtered.
        for (var i = filters.length - 1; i >= 0; i--) {
            currentFilter = filters[i];
            if (dc.utils.arraysIdentical(currentFilter, path)) {
                exactMatch = true;
            }
            _chart.filter(filters[i]);
        }
        if (!exactMatch) {
            return filter;
        }
        return undefined;
    };

    return _chart;

};

/**
 * ClickHandler mixin for hierarchical graphs
 *
 * Generic click handler, suitable for overriding.
 *
 * @name hierarchyClickHandlerMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @returns {dc.hierarchyClickHandlerMixin}
 */

dc.hierarchyClickHandlerMixin = function (_chart) {

    /**
     * Hierarchy click handling
     *
     * Calls `filterOnDatum` from the hierarchyFilterMixin to add/remove the
     * filter for an item. Triggers the chart group to be redrawn.
     *
     * @method __clickHandler
     * @memberof dc.hierarchyClickHandlerMixin
     * @param {Object} [d]
     */

    _chart.__clickHandler = function (d) {

        var new_filter = _chart.filterOnDatum( d );

        dc.events.trigger(function () {
            // if it is a new filter - put it in.
            if ( new_filter !== undefined ) {
                _chart.filter(new_filter);
            }
            _chart.redrawGroup();
        });
    };

    return _chart;

};
