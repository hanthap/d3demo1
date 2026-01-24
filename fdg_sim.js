
// no need to drop and recreate the simulation. Just feed it latest data

function RefreshSimData() {
  simulation.nodes(nodes.filter(Node.IsActive));
  simulation.force('link').links(links.filter(Link.ShowAsLine));

}

//-------------------------------------------------------------------------------

function UnfreezeSim() {
    simulation.restart(); 
    simulationExclusion.restart(); 
} 

//-------------------------------------------------------------------------------

function RunSim() {
    // to do: override default settings that influence movement for the first few seconds
    // just for the currently-active subset of nodes controlling the animation

    // first kill any previous sims
    if ( simulation) { simulation.stop(); }
    if ( simulationExclusion ) { simulationExclusion.stop(); }

    simulation = d3.forceSimulation(nodes.filter(Node.IsActive))

        .force('collide', d3.forceCollide().radius(Node.CollideRadius))
    
        // electrostatic forces attract/repel based on charge 
        .force('elecrtrostatic', d3.forceManyBody().strength(Node.Charge))

        // default centre is (0,0) within the viewBox coords
        // d3.forceCenter() tries to keep the overall centre of mass in a fixed location
        .force('centre', d3.forceCenter().strength(1))
        
        // push out any non-member circle nodes
//        .force("active_exclusion", active_exclusion) 

        // in case we want to add a per-node centroid, eg as an 'attractor' for specific node clusters
//        .force( 'cogX', d3.forceX( Node.COGX ).strength( Node.ForceX ) )
//        .force( 'cogY', d3.forceY( Node.COGY ).strength( Node.ForceY ) )

        // each edge typically acts as a spring between 2 specific nodes (like a covalent bond)
        .force('link', d3.forceLink()
            .distance(Link.Distance)
            .strength(Link.Strength)
            .links(links.filter(Link.ShowAsLine))
            .iterations(2)
            )
        .alphaTarget(0.6) // freeze if/when alpha drops below this threshold
        .alphaDecay(0.2)  // zero => never freeze, keep responding to drag events
        .on('tick',ticked)
        ;
    ticked();

        // adding this extra collide sim helps reduce overlap and jitter?
          simulationExclusion = d3.forceSimulation() 
          .force("active_exclusion", active_exclusion) 
          .alphaTarget(0.6) // freeze if/when alpha drops below this threshold
          .alphaDecay(0.8)
         ;

    // the simulation starts running by default - we don't always want it to
    if (frozen) 
        simulation.stop();
        simulationExclusion.stop();

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

        xMax = Math.max( ...visible_children.map( RightBoundary ) ); // generate a list of right boundaries, then get the max value
        xMin = Math.min( ...visible_children.map( LeftBoundary ) );
        yMax = Math.max( ...visible_children.map( BottomBoundary ) );
        yMin = Math.min( ...visible_children.map( TopBoundary ) );

        // TO DO add buffer margin around nested subsets
        d.x = xMin; 
        d.y = yMin;
        d.width = xMax - xMin;
        d.height =yMax - yMin ;
    } } );
    
// TO DO : If a 'container' node is empty it should be rendered as a circle(?), not hidden


   gLinkZone.selectAll('line').each( LinkZone.SetAttributes ); 
   gLink.selectAll('polyline').each( Link.SetAttributes ); 


    gNode.selectAll('circle')
         .attr('cx', Node.BoundedX ) 
         .attr('cy', Node.BoundedY )

        // NOTE the following adjustments are only required if/when static data is modified, typically after a user click, not on
        .classed('selected', d => d.selected)
        .attr('visibility', Node.Visibility )
        ;

// to do: what about group frames with no visible child node - these should probably be shown as circles?

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

//-------------------------------------------------------------------------------

// Custom force to push out non-member circle nodes - needs work!
function active_exclusion(alpha) {

  const padding = 2; // extra gap between rect and circle
  var nudge_factor;                   
  // full cartesian join, filtered for efficiency
  // for each visible container frame rect with active exclusion enabled

  // return active_exclusion; // disabled for now, need to define active_frames and active_circles arrays first

  active_frames.forEach( n => { // outer loop
  var // TO DO : use getBBox() instead. The d3 datum values do not allow for the outer margin for rounded corners
    nx1 = Frame.Left(n), 
    nx2 = Frame.Right(n),
    ny1 = Frame.Top(n), 
    ny2 = Frame.Bottom(n);

  // for visible circle nodes with active exclusion enabled
  
  active_circles.forEach( m => { // inner loop
    if ( !(n.descendants.includes(m)) ) // circle m is NOT a descendant of frame n 
      { 
        // do the rect and circle overlap?
        try {
          var
              x_int = segInt( m.x, m.x+m.width, nx1, nx2), // horizontal intersection
              y_int = segInt( m.y, m.y+m.height, ny1, ny2), // vertical intersection
              [x,y] = [x_int[2], y_int[2]],
              overlap_area = x * y ; 

        } catch (e) { 
            console.log(e);
            overlap_area = 0 
            }

      if (overlap_area) { // the 2 rects actually do overlap

          nudge_factor = 2 * alpha; // for smooth animation
          [x,y] = escape_vector( m, n ); // "shortest way out" 
          m.x -= padding + x * nudge_factor; // nudge m away from n 
          m.y -= padding + y * nudge_factor; // nudge m away from n 
        }
      }
    });
  });
  ticked();

  return active_exclusion; // return self, enabling a chain of forces if needed

}

//----------------------------------------------------------------

// what's the 'shortest way out'?
// TO DO: make sure the frame rect is stationary while the node is nudged outwards
// this was originally written for scenario where both nodes could move

function escape_vector( m, n ) {
  
  // Which list item has the smallest absolute value?
  x = [n.x-(m.x+m.width), (n.x+n.width)-m.x ] ;
  x = x.reduce((min, num) => Math.abs(num) < Math.abs(min) ? num : min );

  y = [n.y-(m.y+m.height), (n.y+n.height)-m.y ] ;
  y = y.reduce((min, num) => Math.abs(num) < Math.abs(min) ? num : min );

  return Math.abs(x) < Math.abs(y) ? [-x,0] : [0,-y]

}

//--------------------------------------------------------------------

// does the line segment a1-a2 intersect with b1-b2 ?

function segInt(a1, a2, b1, b2) {
    // Ensure a1 <= a2 and b1 <= b2
    var leftBound = Math.max(a1, b1),
      rightBound = Math.min(a2, b2);
    // Check if there's an actual intersection
    return (leftBound <= rightBound) ? [leftBound, rightBound, (rightBound-leftBound) ] : [null,null,0];
}

//-------------------------------------------------------------------------------

