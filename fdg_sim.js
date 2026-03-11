
// no need to drop and recreate the simulation. Just feed it latest data

function RefreshSimData() {
  simulation.nodes(nodes.filter(Node.ShowAsCircle));
  simulation.force('link').links(links.filter(Link.ShowAsLine));
}

//-------------------------------------------------------------------------------

function UnfreezeSim() {
    if (simulation) simulation.restart(); 
}  

//-------------------------------------------------------------------------------

function FreezeSim() {
    if (simulation) simulation.stop(); 
    }

//-------------------------------------------------------------------------------

function RunSim() {
    // TODO: override default settings that influence movement for the first few seconds
    // just for the currently-active subset of nodes controlling the animation

    // first kill any previous sims
    FreezeSim();

    simulation = d3.forceSimulation(nodes.filter(Node.IsActive))
        
      // putting this first =>  better exclusion but less likely to settle
        .force("active_exclusion", active_exclusion) 

        .force('collide', d3.forceCollide().radius(Node.CollideRadius))
    
        // electrostatic forces attract/repel based on charge 
       .force('electrostatic', d3.forceManyBody()
          .strength(4) // negative => repulsive
          .distanceMin(20) // minimum distance at which force applies
          .distanceMax(50)  // maximum distance at which force applies
          .theta(0.8) //  lower value => smoother, more accurate (but more costly)
        )

       .force('center', d3.forceCenter()
        .strength(0.05) 
      ) 


        // in case we want to add a per-node centroid, eg as an 'attractor' for specific node clusters
        // for now, they just help keep nodes near the centre of the window

        .force( 'cogX', d3.forceX( Node.COGX )
            .strength( Node.ForceX ) )
        .force( 'cogY', d3.forceY( Node.COGY )
            .strength( Node.ForceY ) )

        // each edge typically acts as a spring between 2 specific nodes (like a covalent bond)
  
        .force('link', d3.forceLink()
            .links(links.filter(Link.ShowAsLine)) 
            .distance(Link.Distance)
            .strength(Link.Strength) 
            .iterations(1) // per tick. More => stronger effect, more repulsion?
            )


        .alphaTarget(0.3) // freeze if/when alpha drops below this threshold
        .alphaDecay(0.1)  // zero => never freeze, keep responding to drag events
        .on('tick',ticked)
        ;

    ticked();

    // the simulation starts running by default - we don't always want it to
    if (frozen) 
            FreezeSim();

}



//-------------------------------------------------------------------------------

function ticked() { // invoked just before each 'repaint' so we can decide exactly how to render

  // propagate latest coordinates to each bound DOM element  
    Frame.OnTick(); // TODO: might be better to invoke this during active_exclusion
    Link.OnTick(); 
    Label.OnTick();

    gNode.selectAll('circle,g') // TODO this is a bit hacky, but it means we can apply the same classes to both circles and their nested image groups, without having to duplicate the code for each type of element
         .attr('cx', Node.BoundedX ) 
         .attr('cy', Node.BoundedY )
        .classed('drag_selected', ViewBox.DragRectIncludes )
        // DEBUG: why is this still necessary, given we only need to toggle selected class after a user click?
        .classed('selected', d => d.selected)  
        .classed('disabled', d => !d.selected)  
        ;

    gGroup.selectAll('.frame-rect')
        .attr('x', Frame.Left ) 
        .attr('y', Frame.Top )
        .attr('height', Frame.Height )
        .attr('width', Frame.Width );

     gGroup.selectAll('.frame-banner')
      .attr('transform',Frame.TransformGroupElement) 
 ;     


};

//----------------------------------------------------------------
// TODO: maybe nudge circles towards the centre of their parent frames too?

// TODO: do NOT exclude a collapsed circle IF it has any "descendants in common" with thie frame
// instead, try to position it so it straddles the boundary, suggesting a non-empty intersection. 
// This bit could be tricky!
// likewise, can we adjust the collision force for when multiple ancestors are collapsed circles
// Maybe set collision radius to zero, just for collapsed sets that are known to have 'hybrid' descendants
// and then handle it with this custom force...?

// Custom force to expel non-member circle nodes
function active_exclusion(alpha) {
// this gives a smooth,'organic' feel - BUT the 'true' perpendicular distance is not being optimised.
// Instead, it uses the trigonometric distance between a pair of contact points (on a line between centres)
// result: the visual gap is smaller that expected, most notably toward the ends of an elongated frame rect
// and circles seem to drift away from the 'obvious' spot. 

const frame_set = new Set(sorted_nodes.filter(Frame.IsExclusive).reverse());
const circle_set = new Set(sorted_nodes.filter(Node.IsExclusive));

const nIterations = 3; // per tick

for(i=0; i < nIterations; i++) {

  frame_set.forEach( f => { // outer loop 
    const c0 = Frame.Centre(f); 
    circle_set.forEach( m => { // inner loop
    if ( f.descendants.includes(m) ) { // circle m is a descendant of frame n 
        if ( f.locked ) { // all descendants must stay inside a locked frame
        // if m is not fully inside rect n then put it back, by changing its midpoint coords
          if ( Node.Right(m) > Frame.Right(f) ) m.x = Frame.Right(f) - Node.HalfWidth(m);
          if ( Node.Left(m) < Frame.Left(f) ) m.x = Frame.Left(f) + Node.HalfWidth(m);
          if ( Node.Bottom(m) > Frame.Bottom(f) ) m.y = Frame.Bottom(f) - Node.HalfHeight(m);
          // save top boundary to last so as to ensure the frame banner stays visible
          if ( Node.Top(m) < Frame.Top(f) + Frame.BannerHeight(f) ) m.y = Frame.Top(f) + Frame.BannerHeight(f) + Node.HalfHeight(m);
        }
    }
    else { // circle m is NOT a descendant of frame f, so gently nudge it outside
        const 
          c1 = Node.Centre(m),
          dx = c1.x - c0.x,
          dy = c1.y - c0.y,
          theta_out = Math.atan2( dy,  dx),
          theta_in =  Math.atan2(-dy, -dx),
          p0 = Frame.ContactPoint(f,theta_out),
          p1 = Node.ContactPoint(m,theta_in),  
          h0 = Math.hypot( p0.x - c0.x, p0.y - c0.y )  + Frame.ExclusionBuffer(f), // frame centre to frame edge
          h1 = Math.hypot( p1.x - c0.x, p1.y - c0.y ) //  - Node.CollideRadius(m); // frame centre to circle edge
        ;
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
};

  return active_exclusion; // return self, enabling a chain of forces if needed

}

//----------------------------------------------------------------
// THIS ALMOST WORKS, using perpendicular escape vectors 
// BUT circles jitter in proportion to their distance from origin. 
// Suspected root cause: inconsistent xy scales depending on context?

function active_exclusion_WIP(alpha) {

const frame_set = new Set(sorted_nodes.filter(Frame.IsExclusive).reverse());
const circle_set = new Set(sorted_nodes.filter(Node.IsExclusive));

const nIterations = 3; // per tick

for(i=0; i < nIterations; i++) {

  frame_set.forEach( n => { // outer loop 
    const 
      r0 = Node.Coordinates(n);

    circle_set.forEach( m => { // inner loop
    if ( !(n.descendants.includes(m)) ) { // circle m is NOT a descendant of frame n 
        const r1 = Node.Coordinates(m);
        const v = expel_vector(r0,r1);

          if ( v.area ) { // overlapping shapes
            const 
              nudge_factor = 0.002 * v.area * alpha; // for smooth animation
              m.x += v.x * nudge_factor;
              m.y += v.y * nudge_factor;
            };

          };
        }
      );
    }
  );
};

  return active_exclusion; // return self, enabling a chain of forces if needed

}

//----------------------------------------------------------------------------------------
function expel_vector(frame,circle) {

  // zero overlap => nothing TODO
  if ( circle.ymin > frame.ymax + 5|| 
      circle.ymax < frame.ymin - 5 ||
      circle.xmin > frame.xmax + 5|| 
      circle.xmax < frame.xmin - 5 ) return { x: 0, y: 0, area: 0 };

// non-zero overlap => need to look in all 4 directions to decide the shortest way out
const 
  right = frame.xmax - circle.xmin,
  left =  frame.xmin - circle.xmax,
  down =  frame.ymax - circle.ymin,
  up =  frame.ymin - circle.ymax,
  x = right + left < 0 ? right : left, // |right incursion| > |left incursion| => faster exit towards left edge 
  y = down + up < 0 ? down : up,
  xabs = Math.abs(x),
  yabs = Math.abs(y),
  area = xabs * yabs;
  // move away in either the x or y direction (but not both)  
  return xabs < yabs ? 
        { x, y: 0, area } : 
        { x: 0, y, area }

}

//----------------------------------------------------------------------------------------
