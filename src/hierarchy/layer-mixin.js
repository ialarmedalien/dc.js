dc.layerMixin = function ( _chart ) {

  _chart._layers = {};

  _chart.layer = function( name, selection, options ) {
    var _layer;
    if ( arguments.length === 1 ) {
      return this._layers[ name ];
    }

    // we are reattaching a previous layer, which the
    // selection argument is now set to.
    if ( arguments.length === 2 ) {

      if ( selection instanceof Layer ||
      'undefined' !== typeof selection.dataBind &&
      'undefined' !== typeof selection.insert ) {
        selection._chart = this;
        this._layers[ name ] = selection;
        return this._layers[ name ];
      }
      else {
        dcAssert( false, 'When reattaching a layer, the second argument must be a layer' );
      }
    }

    selection._chart = this;

    _layer = new Layer( selection, options );

    _layer.remove = function() {
      delete _chart._layers[ name ];
      return this;
    };

    this._layers[ name ] = _layer;

    return _layer;
  };

  _chart.drawLayers = function ( data ) {
    for (var layerName in this._layers) {
      this._layers[layerName].draw(data);
    }
  };

  return _chart;
};


function isSelection (maybe) {
  return !!(maybe && maybe._groups && maybe._parents);
}

var lifecycleRe = /^(enter|update|merge|exit)(:transition)?$/;

var dcAssert = function(test, message) {
  if (test) {
    return;
  }
  throw new Error("[d3.chart] " + message);
};

var Layer = function (base, options) {

  this._base = base;
  this._handlers = {};

  if ( options ) {
    // Set layer methods (required)
    this.dataBind = options.dataBind;
    this.insert = options.insert;

    // Bind events (optional)
    if ( 'events' in options ) {
      for ( var eventName in options.events ) {
        this.on( eventName, options.events[ eventName ] );
      }
    }
  }
};

Layer.prototype.dataBind = function() {
    dcAssert(false, "Layers must specify a `dataBind` method.");
  };

Layer.prototype.insert = function() {
    dcAssert(false, "Layers must specify an `insert` method.");
  };
Layer.prototype.on = function(eventName, handler, options) {
    options = options || {};

    dcAssert(
      lifecycleRe.test(eventName),
      "Unrecognized lifecycle event name specified to `Layer#on`: '" +
      eventName + "'."
    );

    if (!(eventName in this._handlers)) {
      this._handlers[eventName] = [];
    }
    this._handlers[eventName].push({
      callback: handler,
      chart: options.chart || null
    });
    return this;
  };

Layer.prototype.off = function(eventName, handler) {

    var handlers = this._handlers[eventName];
    var idx;

    dcAssert(
      lifecycleRe.test(eventName),
      "Unrecognized lifecycle event name specified to `Layer#off`: '" +
      eventName + "'."
    );

    if (!handlers) {
      return this._base;
    }

    if (arguments.length === 1) {
      handlers.length = 0;
      return this._base;
    }

    for (idx = handlers.length - 1; idx > -1; --idx) {
      if (handlers[idx].callback === handler) {
        handlers.splice(idx, 1);
      }
    }
    return this;
  };

Layer.prototype.draw = function ( data ) {
  // 'this' is the layer object
    var bound, entering, events, selection, method, handlers, eventName, idx,
      len;

    bound = this.dataBind.call(this._base, data);

    // Although `bound instanceof d3.selection` is more explicit, it fails
    // in IE8, so we use duck typing to maintain compatability.
    if (! bound || ! isSelection( bound )) {
      throw "Invalid selection defined by `Layer#dataBind` method.";
    }
    dcAssert(bound.enter, "Layer selection not properly bound.");

    entering = bound.enter();
    entering._chart = this._base._chart;

    events = [
      {
        name: "update",
        selection: bound
      },
      {
        name: "exit",
        // Although the `exit` lifecycle event shares its selection object
        // with the `update` and `merge` lifecycle events, the object's
        // contents will be modified when d3.chart invokes
        // `d3.selection.exit`.
        selection: bound,
        method: bound.exit
      },
      {
        name: "enter",
        selection: entering,
        method: this.insert
      },
      {
        name: "merge",
        // Although the `merge` lifecycle event shares its selection object
        // with the `update` lifecycle event, the object's contents will be
        // modified when d3.chart invokes the user-supplied `insert` method
        // when triggering the `enter` event.
        selection: entering.merge(bound)
      },
    ];

    for (var i = 0, l = events.length; i < l; ++i) {
      eventName = events[i].name;
      selection = events[i].selection;
      method = events[i].method;

      // Some lifecycle selections modify shared state, so they must be
      // deferred until just prior to handler invocation.
      if (typeof method === "function") {
        selection = method.call(selection, selection);
      }

      if (selection.empty()) {
        continue;
      }

      // Although `selection instanceof d3.selection` is more explicit,
      // it fails in IE8, so we use duck typing to maintain
      // compatibility.
      dcAssert ( selection && isSelection(selection),
        "Invalid selection defined for '" + eventName + "' lifecycle event.");

      handlers = this._handlers[eventName];

      if (handlers) {
        for (idx = 0, len = handlers.length; idx < len; ++idx) {
          console.log( 'running ' + eventName );
          // Attach a reference to the parent chart so the selection"s
          // `chart` method will function correctly.
          selection._chart = handlers[idx].chart || this._base._chart;
        //  selection.call(handlers[idx].callback, selection);
          handlers[idx].callback.call(selection);
        }
      }

      handlers = this._handlers[eventName + ":transition"];

      if (handlers && handlers.length) {
        selection = selection.transition();
        for (idx = 0, len = handlers.length; idx < len; ++idx) {
          console.log( 'running ' + eventName + ':transition' );
          selection._chart = handlers[idx].chart || this._base._chart;
          handlers[idx].callback.call(selection);
        //  selection.call(handlers[idx].callback, selection);
        }
      }
    }
  };


dc.clusterTreeMixin = function (chart) {

    var counter = 0;
    chart._d3.transition = d3.transition()
      .duration( chart.transitionDuration() )
      .delay( chart.transitionDelay() );

    chart.layers.links = chart.layers.base.append("g").classed("links", true);
    chart.layers.nodes = chart.layers.base.append("g").classed("nodes", true);

    chart.layer("nodes", chart.layers.nodes, {

      dataBind: function(nodes) {
        return this.selectAll(".node").data(nodes.descendants(), function(d) {
          return d._id || (d._id = ++counter);
        });
      },

      insert: function() {
        return this.append("g").classed("node", true);
      },

      events: {
        'update': function(){
          this.classed( 'expandable', function(d){ return d._children; });
        },

        'enter': function() {
          this.classed( 'leaf', function(d) { return ! d.children; });
          this.classed( 'expandable', function(d){ return d._children; });

          this.append("circle")
            .attr("r", 0);

          this.append("text")
            .attr("dy", ".35rem")
            .text(function(d) { return chart.label()(d.data) })
            .style("fill-opacity", 0);


          this.on("click", function(event) { chart.trigger("click:node", event); });
        },

        'merge': function() {
          // Set additional node classes as they may change during manipulations
          // with data. For example, a node is added to another leaf node, so
          // ex-leaf node should change its class from node-leaf to node-parent.
          this.classed( "leaf", function(d) { return ! d.children; });
          this.classed( 'expandable', function(d){ return d._children; });
        },

        'merge:transition': function() {
          this.select("circle")
            .attr("r", chart.nodeMarkerSize() || 6 );

          this.select("text")
            .style("fill-opacity", 1);
        },

        "exit:transition": function() {
          this(chart._d3.transition)
            .remove();

          this.select("circle")
            .attr("r", 0);

          this.select("text")
            .style("fill-opacity", 0);
        },
      }
    });


    chart.layer("links", chart.layers.links, {

      dataBind: function(nodes) {
        return this.selectAll(".link")
          .data(nodes.links(), function(d) {
            return d.target._id;
          });
      },

      insert: function() {
        return this.append("path").classed("link", true);
      },

      events: {
        "enter": function() {
          this
            .attr("d", function(d) {
              var o = { x: chart.source.x0, y: chart.source.y0 };
              return chart._d3.diagonal({ source: o, target: o });
            });
        },

        "merge:transition": function() {
          this(chart._d3.transition)
            .attr("d", chart._d3.diagonal);
        },

        "exit:transition": function() {
          this(chart._d3.transition)
            .attr("d", function(d) {
              var o = { x: chart.source.x, y: chart.source.y };
              return chart._d3.diagonal({ source: o, target: o });
            })
            .remove();
        },
      },
    });
  return chart;
};

dc.clusterTreeCartesianMixin = function (chart) {

    chart.layers.nodes.on("enter", function() {
      this
        .attr("transform", function(d) { return "translate(" + chart.source.y0 + "," + chart.source.x0 + ")"; });

      this.select("text")
        .attr("x", function(d) { return d.children ? -10 : 10; })
        .attr("text-anchor", function(d) { return d.children ? "start" : "end"; });
    });

    chart.layers.nodes.on("merge:transition", function() {
      this
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });
    });

    chart.layers.nodes.on("exit:transition", function() {
      this
        .attr("transform", function(d) { return "translate(" + chart.source.y + "," + chart.source.x + ")"; });
    });
    return chart;
};

dc.clusterTreeRadialMixin = function (chart) {

    chart.layers.nodes.on("enter", function() {
      this
        .attr("transform", function(d) { return "rotate(" + (chart.source.x0 - 90) + ")translate(" + chart.source.y0 + ")"; });

      this.select("text")
        .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
        .attr("transform",   function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; });
    });

    chart.layers.nodes.on("merge:transition", function() {
      this(chart._d3.transition)
        .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; });
    });

    chart.layers.nodes.on("exit:transition", function() {
      this
        .attr("transform", function(d) { return "rotate(" + (chart.source.x - 90) + ")translate(" + chart.source.y + ")"; });
    });

    return chart;

};
