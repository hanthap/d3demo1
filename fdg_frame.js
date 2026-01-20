

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
// returns point where the rendered boundary of d is intersected by a line segment between centres of d and node
// partitions the space into 4 quadrants with origin at centre of d.  Compares angles to determine which quadrant contains the 
// centre of [node] and therefore which one of the rect sides will contain the intersection

static ContactPoint(d,node) { 

const
        hypot = Math.hypot(d.width,d.height),
        sine = d.height / hypot,
        crit_rad = Math.asin(sine),
        crit_deg = crit_rad * (180 / Math.PI),
        dx = node.x - d.x,
        dy = node.y - d.y,
        test_hypot = Math.hypot(dx,dy),
        test_rad = Math.asin(dy/test_hypot),
        test_deg = test_rad * (180 / Math.PI),
        quadrant =  test_deg < crit_deg ? 0 : // left
                    test_deg < (180-crit_deg) ? 1 : // top 
                    test_deg < (180+crit_deg) ? 2 : // right
                    test_deg < (360-crit_deg) ? 3 : // bottom
                    0 // left
            ;


const rect = { 
        label: d.NODE_TXT,
        left: d.x, 
        right: d.x + d.width, 
        top: d.y, 
        bottom: d.y+d.height,
        // width: d.width,
        // height: d.height,
        // hypot,
        // sine,
        // crit_rad,
        crit_deg,
        test_x: node.x,
        test_y: node.y,
        dx,
        dy,
        // test_hypot,
        test_deg,
        quadrant
    };
return rect;
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

static ToCircle(d, bCollapsed, cXcY) {
        // collapse the frame into a circle at cXcY, refresh attributes
        [d.x, d.y] = cXcY;

        d.IS_GROUP = false;

        if ( bCollapsed ) { 
        // should be all descendants
        ChildrenOf(d).forEach( c => { c.has_shape = 0 } );
        }
            // TO DO: recalculate and cache the 'effective' endpoints for links that reference a leaf node that is now hidden (as a descendant node)
            // scan the list of edges and set this node d as the effective end point in place of any descendants of d
            // if both ends now point to d then the link will not be in 
            //  likewise, roll up the leaf-node mass values and change the 'effective' mass of this newly collapsed container

        AppendShapes(); 
        AppendFrameShapes();
        AppendLines();
        RefreshSimData(); 

}

   //-------------------------------------------------------------------------------


   static OnClick(e,d) {

    if ( ! e.ctrlKey ) {
        // simple click => toggle selected status
        d.selected ^= 1;

        ChildrenOf(d).forEach( c => {
            c.selected = d.selected;
            // TO DO: this only goes down to grandchildren. Should use d.descendants
            ChildrenOf(c).forEach( gc => { gc.selected = d.selected } );
            } ) ; // set all children on or off

    }

    if ( e.ctrlKey ) { 
        Frame.ToCircle(d, !e.shiftKey, d3.pointer(e)); // ctrl+SHIFT => do NOT hide children
        }         

    ticked();

    }

    //-------------------------------------------------------------------------------

    // because smartphone doesn't have a shift key
   static OnDblClick(e,d) { //  show as a circle linked to all its children
            Frame.ToCircle(d, false, d3.pointer(e)); // false => do not collapse
            ticked();

   }

   //-------------------------------------------------------------------------------

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
        .on('dblclick', Frame.OnDblClick)
        .on('mouseover', Frame.OnMouseOver) 
        .on('mouseout', Frame.OnMouseOut)
        .append('title')
            .text(Node.TitleText)
        ;




}


function lineRectIntersections({ a, b, c }, { left, right, top, bottom }) {
  const points = [];

  // Helper to add a point if it's within the rectangle bounds
  function addIfOnVerticalEdge(x, y) {
    if (y >= top && y <= bottom) points.push({ x, y });
  }

  function addIfOnHorizontalEdge(x, y) {
    if (x >= left && x <= right) points.push({ x, y });
  }

  // Intersect with x = left and x = right (if b != 0)
  if (b !== 0) {
    const yLeft = (-a * left - c) / b;
    addIfOnVerticalEdge(left, yLeft);

    const yRight = (-a * right - c) / b;
    addIfOnVerticalEdge(right, yRight);
  }

  // Intersect with y = top and y = bottom (if a != 0)
  if (a !== 0) {
    const xTop = (-b * top - c) / a;
    addIfOnHorizontalEdge(xTop, top);

    const xBottom = (-b * bottom - c) / a;
    addIfOnHorizontalEdge(xBottom, bottom);
  }

  // Remove duplicates (e.g. line passing exactly through a corner)
  const unique = [];
  for (const p of points) {
    if (!unique.some(q => Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9)) {
      unique.push(p);
    }
  }

  // You’ll usually get 0, 1, or 2 points
  return unique;
}