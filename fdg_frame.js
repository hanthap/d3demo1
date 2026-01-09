

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
    x = d;
    d.selected ^= 1;

        // to do: make this recursive
    ChildrenOf(d).forEach( c => {
            c.selected = d.selected;
            ChildrenOf(c).forEach( gc => { gc.selected = d.selected } );
         } ) ; // set all children on or off
         ticked();

    }

//-------------------------------------------------------------------------------
// Y/N is this frame nested inside any others? (True <=> it's either a circle or a top-level superset frame)
// this is a frame AND so is at least one of its containers
    static IsNotNested(d) {
        return ( Node.ParentsOf(d)
            .filter(IsFrameShape)
            .length == 0
        );

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
      .data(sorted_frames, Node.UniqueId) 
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

//-------------------------------------------------------------------------------
// TO DO: decide whether a leaf node can ever be a frame shape
function IsFrameShape(d) {
    return false
    || HasVisibleChild(d) ;
}