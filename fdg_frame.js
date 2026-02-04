// TOP DO: Look at https://observablehq.com/@d3/d3-packenclose ; https://d3js.org/d3-hierarchy/pack#packEnclose
// maybe an enclosing circle will be more natural than enclosing rect?

class Frame extends Node {

    static IsExclusive(d) {  
        // to decide whether non-members will be pushed out by active_exclusion force
        // TO DO: a frame is exclusive iff it is in the foreground ??
        return ( HasVisibleChild(d) ); // for now, all frame rects are exclusive    
    }

    //-------------------------------------------------------------------------------

    static Visibility(d) {
        return HasVisibleChild(d) ? 'visible' : 'hidden'
    }

//-------------------------------------------------------------------------------
// returns point where the rendered boundary of rect d intersects a ray with angle theta (from atan2) and origin at centrepoint of d
// Partitions the space into 4 quadrants  Compares angles to determine which quadrant contains the ray and therefore 
// which one of the rect sides will contain the intersection point.

static ContactPoint(d,theta) { 

const
        t = theta * (180 / Math.PI),  // just for clarity      
        crit_rad = Math.atan2( Frame.Height(d), Frame.Width(d) ), // allow for outer margin
        c = crit_rad * (180 / Math.PI), // range [0,90]

        v =   t < c -180 ?  { side: 'left',   dim: 'x', k: Frame.Left(d),   a: -theta } :
              t < 0-c ?     { side: 'top',    dim: 'y', k: Frame.Top(d),    a: theta-Math.PI/2 } :
              t < c ?       { side: 'right',  dim: 'x', k: Frame.Right(d),  a: theta+Math.PI } :
              t < 180-c ?   { side: 'bottom', dim: 'y', k: Frame.Bottom(d), a: -theta-Math.PI/2 } :
                            { side: 'left',   dim: 'x', k: Frame.Left(d),   a: -theta },


        point = v.dim == 'x' ? { x: v.k, y: Frame.Centre(d).y + ( Frame.HalfWidth(d)  * Math.tan(v.a) ) } :
                               { y: v.k, x: Frame.Centre(d).x + ( Frame.HalfHeight(d) * Math.tan(v.a) ) } ;

  // TO DO : what if the point falls at a rounded corner (within Frame.CornerRadius of that corner)

return point;
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
    if (e.button) return; //  ignore if still dragging 
        Frame.Hover( d, false );
   }

   //-------------------------------------------------------------------------------

static ToCircle(d, bCollapsed, cXcY) {
        // replace the frame with a circle at cXcY, refresh attributes
        [d.x, d.y] = cXcY;
        d.width = d.height = 2*d.r; // referred to by Node.ContactPoints()

        d.IS_GROUP = false;

        if ( bCollapsed ) {  // hide its contents & transplant links so they point to this container node
            // should be all descendants other than self
            d.descendants.filter(c => c != d).forEach( c => { 
                    // for in and out lines, set this node d as the effective end point in place of any descendants of d
                    // importantly, we already have true_source and true_target stored in each link
                    c.inLinks.filter(Link.ShowAsLine).forEach( lnk => { 
                        lnk.target = d;
                        console.log(lnk);
                    
                    } );
                    c.outLinks.filter(Link.ShowAsLine).forEach( lnk => { lnk.source = d } );
                    c.has_shape = 0; // don't do this too soon as it influences Link.ShowAsLine()

                    console.log(c);
                } );
            // TO DO: recalculate and cache the 'effective' node-pair for links that reference a leaf node that is now hidden (as a descendant node)
            // if both ends now point to d then the link will not be in 
            // likewise, roll up the leaf-node mass values and change the 'effective' mass of this newly collapsed container




            }
        AppendShapes(); 
        AppendFrameShapes();
        AppendLines();
        AppendLabels();

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

   // currently assumes that x, y, height & width are determined by visible child circles

    static Centre(d) { return { x: d.x + d.width/2, y: d.y + d.height/2 }    }

    static Left(d) { return d.x - Frame.Margin(d) }; 

    static Top(d) { return d.y - Frame.Margin(d) };
 
    static Right(d) { return d.x + d.width + Frame.Margin(d) }; 

    static Bottom(d) { return d.y + d.height + Frame.Margin(d) };
 
    static Width(d) { return d.width + 2*Frame.Margin(d) } ;

    static Height(d) { return d.height + 2*Frame.Margin(d) } ;

    static HalfWidth(d)  { return d.width/2 + Frame.Margin(d) };

    static HalfHeight(d) { return d.height/2 + Frame.Margin(d) };

    static CornerRadius(d) { return 1.5 * radius ;};

    static Margin(d) { return radius };

 
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
// called by Cache.RefreshAllDescendants()
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
        .join('rect') // one-step upsert|delete based on matching UniqueId
        .attr('id', Node.UniqueId) //primary key
        .attr('rx', Frame.CornerRadius)
        .attr('ry', Frame.CornerRadius)
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

