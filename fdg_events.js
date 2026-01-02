
   

   //-------------------------------------------------------------------------------
    // set or unset the 'xhover' class for node d plus all its visible descendants

   function HoverFrame( d, bHovering ) {

    nList = VisibleDescendantsOf(d);
     nList.forEach( n => { 
            Node.GetSelection(n) // returns a d3 Selection wrapper
                .classed( 'xhover', bHovering )  ;
            } 
        );
    
   }

   //-------------------------------------------------------------------------------

   function handleMouseOverFrame(e, d) {
    // MouseOver also fires when entering any child element
        HoverFrame( d, true );
   }

   //-------------------------------------------------------------------------------

   function handleMouseOutFrame(e, d) {
    if ( e.button) return; //  ignore if still dragging 
        HoverFrame( d, false );
   }


   //-------------------------------------------------------------------------------

   function handleClickFrame(e,d) {
    x = d;
    d.selected ^= 1;
    // to do: if ctrl key set (x,y) at persistent centre of gravity for all child nodes
    // and increase their gravitational weight
    // the frame should naturally shrink as a result
    if ( e.ctrlKey )  {
        loc = cursorPoint(e);
        ChildrenOf(d).slice(1).forEach( c => {
            [ c.cogX, c.cogY ] = [ loc.x, loc.y ]
            c.weight = 1
        } ) ;
        simulation.stop();
        RunSim();
    }

    if ( e.shiftKey )  {
       // stack/unstack status of the frame node (affecting all its subnodes)
            ChildrenOf(d).slice(1).forEach( c  => ( c.stacked = d.stacked ));
            simulation.stop();
            RunSim();
        } 
    else 
        // to do: make this recursive
    ChildrenOf(d).forEach( c => {
            c.selected = d.selected;
            ChildrenOf(c).forEach( gc => { gc.selected = d.selected } );
         } ) ; // set all children on or off
         ticked();

    }


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
     Node.BringToFront(e.subject);
}

//-------------------------------------------------------------------------------

function handleDrag(e,d) {
    // for real time visual feedback
    // simplistic boundary check
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
    .on( 'start', handleDragStart)
    .on( 'end', handleDrop)  
    .on( 'drag', handleDrag)
    ;
