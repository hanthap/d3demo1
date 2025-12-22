

//-------------------------------------------------------------------------------

function RunSim() {
    // to do: override default settings that influence movement for the first few seconds
    // just for the currently-active subset of nodes controlling the animation
    simulation = d3.forceSimulation(nodes.filter(IsActiveNode))

        // nodes can touch but should not overlap
        // d3.forceCollide() is a built-in algorithm that works for circles based on centre & radius, 
        // but rects don't have a radius and their x,y coords are top left corner, not centre.
        // a physically accurate algorithm for rectangles is very complex
        // see https://observablehq.com/@lvngd/rectangular-collision-detection
        // so instead we use many-body repulsion as a workaround
        // or maybe a one-body translation (after-the-fact exclusion), without momentum etc
        .force('collide', d3.forceCollide().radius(CollideRadius))
    
        // electrostatic forces attract/repel based on charge 
        .force('my-charge', d3.forceManyBody()
            .strength(NodeCharge))

        // default centre is (0,0) within the viewBox coords
        // d3.forceCenter() tries to keep the overall centre of mass in a fixed location
        .force('centre', d3.forceCenter().strength(1))

        // a centre of gravity helps to avoid explosive repulsion (& can also be used as an anchor for related groups clusters)
        .force('cogX', d3.forceX( d => d.cogX )
            .strength( d => d.weight ))
        .force('cogY', d3.forceX( d => d.cogY )
            .strength( d => (width/height) * d.weight ))

        // each edge can act as a spring between 2 nodes (like a covalent bond)
        .force('my-link', d3.forceLink()
            .distance(LinkDistance)
            .strength(LinkStrength)
            .links(filteredLinks.filter(LinkScope))
            .iterations(2)
            )
        .alphaTarget(0.3) // freeze if/when alpha drops below this threshold
        .alphaDecay(0.1)  // zero => never freeze, keep responding to drag events
        .on('tick',ticked)
        ;
    ticked();
    // the simulation starts running by default - we don't always want it to
    if (frozen) simulation.stop();
    initDrag();
}



//-------------------------------------------------------------------------------

function ticked() { // invoked just before each 'repaint' so we can decide exactly how to render
// attr() takes a function as second argument
// the datum (updated with new coordinates) is passed by reference to that function

// tweaking the datum for each container to ensure that its minimum bounding rectangle always 
// unstacked nodes are free to wander hence we want the frame to move and 

// first stacked nodes are obscured by continuously shunting them under 
// expect nested frames (stacked subgroup rectangles) will stay with their leading
// works OK except the parent frame picks up the 

nodes.filter( IsStackedLeaf ).forEach( d => {
        [d.x, d.y] = NodeCentre( LeadingChildOf( ParentOf(d) ) ); 
    } );

// TO DO: if stacking results in frames that look empty we should move them to the 
// eg after collapsing all ME IDs under their Ult Parent. All their OCH frames look empty

// only now can we decide where to put the frames
nodes.filter( IsFrameShape ).forEach( d => {
    visible_children = VisibleChildrenOf(d);
    if ( visible_children.length ) {
        xMax = Math.max( ...visible_children.map( RightBoundary ) );
        xMin = Math.min( ...visible_children.map( LeftBoundary ) );
        yMax = Math.max( ...visible_children.map( BottomBoundary ) );
        yMin = Math.min( ...visible_children.map( TopBoundary ) );
        d.x = xMin; // [d.x, d.y] are the coords as read and updated by the simulation -- whereas we 
        d.y = yMin;
        d.width = xMax - xMin;
        d.height = yMax - yMin;
    } } );
    
// TO DO : what happens when the IP owns (only) the container AR node? Does the line disappear?
// less likely if a container IP jointly owns an AR.
// always stay within internal boundary, but without avoiding edge

    gLinkZone.selectAll('line').each( SetLineAttributes ); // "each()" is a d3 method. The passed function can receive 3 inputs: d (the datum), i (counter) *AND* the HTML DOM (SVG) element itself, via 'this';
    gLink.selectAll('line').each( SetLineAttributes );


    gNode.selectAll('circle')
        .each( SetCircleAttributes )
        .attr('cx', d => { d.x = bounded(d.x, 3*radius-width/2, width/2-3*radius); return d.x } )
        .attr('cy', d => { d.y = bounded(d.y, 3*radius-height/2, height/2-3*radius); return d.y } )
        // NOTE the following adjustments are only required if/when static data is modified, typically after a user click, not on
        .classed('selected', d => d.selected)
        .classed('head', HasStackedParent)
        .attr('visibility', d => IsActiveNode(d) ? 'visible' : 'hidden' )
        .attr('fill',NodeColour)
        ;

    gNode.selectAll('rect')
        .attr('x', d => { d.x = bounded(d.x, 3*radius-width/2, width/2-3*radius); return d.x } )
        .attr('y', d => { d.y = bounded(d.y, 3*radius-height/2, height/2-3*radius); return d.y } )
        .attr( 'height', d => d.height )
        .attr( 'width', d => d.width )
        .classed('selected', d => d.selected)
        .classed('head', HasStackedParent)
        .attr('visibility', d => IsActiveNode(d) ? 'visible' : 'hidden' )
        .attr('fill',NodeColour)
        ;
// to do: what about group frames with no visible child node 

    gGroup.selectAll('rect')
        .attr('x', d => d.x - radius )
        .attr('y', d => d.y - radius )
        // NOTE the following adjustments are only required if/when static data is modified, typically after a user click
        .attr( 'height', d => d.height + 2*radius )
        .attr( 'width', d => d.width + 2*radius )
        .classed('selected', d => d.selected)  
        .attr('visibility', d => HasVisibleChild(d) ? 'visible' : 'hidden' )
     ;
};