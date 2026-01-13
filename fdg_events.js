


//-------------------------------------------------------------------------------

function handleKeyDown(d) {
    // console.log(event)
    switch (event.key) {
    case 'Escape' : 
        // clear all highlights by removing the 'selected' class
        nodes.forEach( d => d.selected = 0 );
        break;
    case 'End':
    case 'Pause' :
        // toggle frozen
        if ( frozen ^= 1 )
            simulation.stop();
        else
            simulation.restart();
        break;
    case 'Home' :
        simulation.stop();
        frozen = false;
        RunSim(); // re-initialise
        break;
    }
    ticked();
}



//-------------------------------------------------------------------------------
// problem with conflicting frames of reference
// how to translate from DOM to SVG coordinates
// d3 scale continuous scales

//-------------------------------------------------------------------------------

function handleDragStart(e,d) {
    simulation.stop(); // prevents crazy flicker while dragging
    simulationExclusion.stop(); 
    Node.BringToFront(e.subject);
}
//-------------------------------------------------------------------------------

function handleDrag(e,d) {
    // for real time visual feedback
    // simplistic boundary check
 //  simulation.stop(); // prevents crazy flicker while dragging
//   simulationExclusion.stop(); 
//    Node.BringToFront(e.subject);
    d.x = e.x;
    d.y = e.y;
   //d.x = bounded(e.x, 3*radius-width/2, width/2-3*radius) 
   //d.y = bounded(e.y, 3*radius-height/2, height/2-3*radius)

    ticked();
}

//-------------------------------------------------------------------------------

function handleDrop(e,d) {

    if ( e.sourceEvent.shiftKey ) {
        d.cogX = d.x;
        d.cogY = d.y;
        } 

    if ( !frozen ) {
        RunSim();
        }
}

//-------------------------------------------------------------------------------

function initDrag(e,d) { // assumes SVG element has been created
    // only active nodes can be dragged
    gNode.selectAll('circle').call(drag);
}

//-------------------------------------------------------------------------------
// drag & drop are synthetic events managed by d3. ".on()"" only listens for raw DOM events
// d3's drag listener is applied to circle elements via d3 selection ".call(drag)" method.
let drag = d3.drag()
    .on( 'start', handleDragStart)
    .on( 'drag', handleDrag)
    .on( 'end', handleDrop)  
    ;
