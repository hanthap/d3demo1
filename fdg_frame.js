

class Frame extends Node {

    static IsExclusive(d) {  
        // to decide whether non-members will be pushed out by active_exclusion force
        return ( HasVisibleChild(d) ); // for now, all frame rects are exclusive    
    }

    //-------------------------------------------------------------------------------

    static Visibility(d) {
        return HasVisibleChild(d) ? 'visible' : 'hidden'
    }

   //-------------------------------------------------------------------------------
    // set or unset the 'xhover' class for node d plus all its descendants

   static Hover( d, bHovering ) {

    d3.selectAll('circle, rect') 
        .filter( e => d.descendants.includes(e) ) 
        .classed( 'xhover', bHovering ) ;
    } 

   //-------------------------------------------------------------------------------

   static OnMouseOver(e, d) {
    // MouseOver also fires when entering any child element
        Frame.Hover( d, true );
   }

   //-------------------------------------------------------------------------------

   static OnMouseOut(e, d) {
    if ( e.button) return; //  ignore if still dragging 
        Frame.Hover( d, false );
   }

   //-------------------------------------------------------------------------------

   
   static OnClick(e,d) {

    if ( ! e.ctrlKey ) {

        d.selected ^= 1;

        ChildrenOf(d).forEach( c => {
            c.selected = d.selected;
            // TO DO: this only goes down to grandchildren. Should use d.descendants
            ChildrenOf(c).forEach( gc => { gc.selected = d.selected } );
            } ) ; // set all children on or off

    }

    if ( e.ctrlKey ) { // TEST ONLY
        // collapse the frame into a circle, refresh attributes
        // set circle node's x & y to logical coordinates of the click event
        [d.x, d.y] = d3.pointer(e);

        d.IS_GROUP = false;

        // should be all descendants
        ChildrenOf(d).forEach( c => { c.has_shape = 0 } );

        AppendShapes(); 
        AppendFrameShapes();
        AppendLines();
        RefreshSimData(); // does this work?
            // RunSim(); // this does too much 
            // restarting sims doesn't help
            //simulation.restart();
            // simulationExclusion.restart();
        // NOTE! Calling RunSim() here has unwanted side-effects, in that any further dragging ANY circle causes others to move in real time, with flicker
        // movement seems to be consistent with the main sim's centre force
        // BUT, not doing so means the new circle is inert until a drag-drop is completed. after which all is back to normal. Go figure!
        // simply re-expanding does NOT fix the problem. But clicking THAT inert circle does - ONLY for THAT collapsed circle. 
        // Others remain inert until clicked
        
        }         

    ticked();

    }



    static RectX(d) { return d.x - radius }; // extra margin to accommodate rounded corners

    static RectY(d) { return d.y - radius };

    static RectHeight(d) { return d.height + 2*radius } ;

    static RectWidth(d) { return d.width + 2*radius } ;


}

//-------------------------------------------------------------------------------

function BoxesOverlap( boxA, boxB ) {
        // boxA and boxB are DOM elements with getBBox() method
        a = boxA.getBBox();
        b = boxB.getBBox();
        return !( a.x + a.width < b.x || 
                  a.x > b.x + b.width || 
                  a.y + a.height < b.y ||
                  a.y > b.y + b.height );
    }

//-------------------------------------------------------------------------------

// Depth-first search to return a list of all descendants of a given start node
// called by Graph.CacheAllDescendants()
// TO DO: look at making this a static function of class Node (or Graph ?)


function AllDescendantsOf(start, visited = new Set(), result = []) {
  if (visited.has(start)) // avoid cycles
    return result;

  visited.add(start); 
  result.push(start);

  for (const child of ChildrenOf(start) || []) {
    AllDescendantsOf(child, visited, result);
  }
  return result;
}


//-------------------------------------------------------------------------------

    // this has to wait until we've finished loading graph data, & cached derived variables
function AppendFrameShapes() {
    gGroup.selectAll('rect') // in case we've already got some
      .data(sorted_nodes.filter(Node.ShowAsFrame), Node.UniqueId) 
        .join('rect') // append a new rectangular frame bound to this node datum
        .attr('id', Node.UniqueId)
        .attr('rx', 2*radius ) // for rounded corners
        .attr('ry', 2*radius ) 
        .attr('fill',Node.FillColour) // same as if it was a collapsed circle
        // gradients are static defs, so we can't set them per-node here
        .classed('frame',true) // CSS selectors can use ".frame" 
        .on('click', Frame.OnClick)
        .on('mouseover', Frame.OnMouseOver) 
        .on('mouseout', Frame.OnMouseOut)
        .append('title')
            .text(Node.TitleText)
        ;




}
