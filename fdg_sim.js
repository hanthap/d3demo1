
// no need to drop and recreate the simulation. Just feed it latest data

function RefreshSimData() {
  simulation.nodes(nodes.filter(Node.IsActive));
  simulation.force('link').links(links.filter(Link.ShowAsLine));

}

//-------------------------------------------------------------------------------

function UnfreezeSim() {
    if ( simulation) simulation.restart(); 
    if ( simulationExclusion ) simulationExclusion.restart();
} 

//-------------------------------------------------------------------------------

function StopSim() {
    if ( simulation) { simulation.stop(); }
    if ( simulationExclusion ) { simulationExclusion.stop(); }
}

//-------------------------------------------------------------------------------

function RunSim() {
    // to do: override default settings that influence movement for the first few seconds
    // just for the currently-active subset of nodes controlling the animation

    // first kill any previous sims
    StopSim() ;

    simulation = d3.forceSimulation(nodes.filter(Node.IsActive))

        .force('collide', d3.forceCollide().radius(Node.CollideRadius))
    
        // electrostatic forces attract/repel based on charge 
        .force('electrostatic', d3.forceManyBody().strength(Node.Charge))

        // in case we want to add a per-node centroid, eg as an 'attractor' for specific node clusters
        // for now, they just help keep nodes near the centre of the window
        .force( 'cogX', d3.forceX( Node.COGX ).strength( Node.ForceX ) )
        .force( 'cogY', d3.forceY( Node.COGY ).strength( Node.ForceY ) )

        // each edge typically acts as a spring between 2 specific nodes (like a covalent bond)
  
        .force('link', d3.forceLink()
            .links(links.filter(Link.ShowAsLine)) // d3.forceLink() requires that each link datum has a 'source' and 'target' property, which are references to node objects
            .distance(Link.Distance)
            .strength(Link.Strength)
            .iterations(2)
            )
        .alphaTarget(0.6) // freeze if/when alpha drops below this threshold
        .alphaDecay(0.2)  // zero => never freeze, keep responding to drag events
        .on('tick',ticked)
        ;
        // separate simulation to handle frame/circle exclusion forces
        simulationExclusion = d3.forceSimulation() 
          .force("active_exclusion", active_exclusion) 
          .alphaTarget(0.6) // freeze if/when alpha drops below this threshold
          .alphaDecay(0.6)
         ;

    ticked();

    // the simulation starts running by default - we don't always want it to
    if (frozen) 
            StopSim() ;

}

//-------------------------------------------------------------------------------

function ticked() { // invoked just before each 'repaint' so we can decide exactly how to render

// only now can we decide where to position the frames, working from leaf (innermost) to root (outermost)
[...sorted_nodes].reverse().filter( Node.ShowAsFrame ) // filter because sorted_nodes actually includes non-frame nodes... 
.forEach( d => {
    // TO DO: assuming nodes are correctly pre-sorted, I thought we should only need to look at visible children, not all descendants
    // BUT NO!!! Switching to Children only causes strange side-effect, where other frames expand in the same dimension, by 50%.
    // Including descendants prevents this problem, not sure exactly why. 
    // It's NOT because of zombie simulations still running.
    visible_children = VisibleDescendantsOf(d); 
    if ( visible_children.length ) {

      // PROBLEM: outer superset has to wait until all innersets have been positioned & sized

        xMax = Math.max( ...visible_children.map( Node.Right ) ); // generate a list of right boundaries, then get the max value
        xMin = Math.min( ...visible_children.map( Node.Left ) );
        yMax = Math.max( ...visible_children.map( Node.Bottom ) );
        yMin = Math.min( ...visible_children.map( Node.Top ) );

        // TO DO add buffer margin around nested subsets
        d.x = xMin; 
        d.y = yMin;
        d.width = xMax - xMin;
        d.height =yMax - yMin ;
    } } );
    
// TO DO : If a 'container' node is empty it should be rendered as a circle(?), not hidden

   gLinkZone.selectAll('line').each( LinkZone.SetAttributes ); 
   gLink.selectAll('polyline').each( Link.SetAttributes ); 
   gLabel.selectAll('g').each( Label.SetAttributes ); 

    gNode.selectAll('circle')
         .attr('cx', Node.BoundedX ) 
         .attr('cy', Node.BoundedY )
        // NOTE the following adjustments are only required if/when static data is modified, typically after a user click, not on
        .classed('selected', d => d.selected)
        .classed( 'drag_selected', ViewBox.DragRectIncludes )
        .attr('visibility', Node.Visibility )
        ;

    gGroup.selectAll('rect')
        .attr('x', Frame.Left ) 
        .attr('y', Frame.Top )
        .attr('height', Frame.Height )
        .attr('width', Frame.Width )
        // The following adjustments are only required when static data is modified, typically after a user click
        .classed('selected', d => d.selected)  
        .attr('visibility', Frame.Visibility )
     ;
};

//----------------------------------------------------------------

// Custom force to push out non-member circle nodes
function active_exclusion(alpha) {
// return active_exclusion;

// [...sorted_nodes].reverse()
sorted_nodes.filter(Frame.IsExclusive).forEach( n => { // outer loop 
  const c0 = Frame.Centre(n); 
  sorted_nodes.filter(Node.IsExclusive).forEach( m => { // inner loop
  if ( !(n.descendants.includes(m)) ) { // circle m is NOT a descendant of frame n 
      const 
        c1 = Node.Centre(m),
        dx = c1.x - c0.x,
        dy = c1.y - c0.y,
        theta_out = Math.atan2( dy,  dx),
        theta_in =  Math.atan2(-dy, -dx),
        p0 = Frame.ContactPoint(n,theta_out),
        p1 = Node.ContactPoint(m,theta_in),  
        h0 = Math.hypot( p0.x - c0.x, p0.y - c0.y ) + Node.CollideRadius(n), // frame centre to frame edge
        h1 = Math.hypot( p1.x - c0.x, p1.y - c0.y ) - Node.CollideRadius(m); // frame centre to circle edge

        if ( h0 > h1 ) { // overlapping shapes
          // hardcoded 0.5 by experimentation
          const 
            nudge_factor = 0.5 * (h0 - h1) * alpha; // for smooth animation
            m.x += Math.cos( theta_out ) * nudge_factor;
            m.y += Math.sin( theta_out ) * nudge_factor;
          };



        };
      }
    );
  }
);
  ticked();

  return active_exclusion; // return self, enabling a chain of forces if needed

}

