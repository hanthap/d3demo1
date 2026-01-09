


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


//-------------------------------------------------------------------------------

function handleDrag(e,d) {
    // for real time visual feedback
    // simplistic boundary check
   simulation.stop(); // prevents crazy flicker while dragging
   simulationExclusion.stop(); 
    Node.BringToFront(e.subject);
   d.x = bounded(e.x, 3*radius-width/2, width/2-3*radius) 
   d.y = bounded(e.y, 3*radius-height/2, height/2-3*radius)
    ticked();
}

//-------------------------------------------------------------------------------

function handleDrop(e,d) {
    // console.log(e);
    // e.subject is [a reference to] the d3 datum object
    // 

    if ( e.sourceEvent.shiftKey ) {
        d.cogX = d.x;
        d.cogY = d.y;
        RunSim();
    } else {
        if ( !frozen ) {
            simulation.restart();
            simulationExclusion.restart();
        }
    }
    ticked();
}

//-------------------------------------------------------------------------------

function initDrag(e,d) { // assumes SVG element has been created
    // only active nodes can be dragged
    gNode.selectAll('rect').call(drag);
    gNode.selectAll('circle').call(drag);
}

//-------------------------------------------------------------------------------

let drag = d3.drag()
    .on( 'drag', handleDrag)
    .on( 'end', handleDrop)  
    ;
