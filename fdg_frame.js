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
// 
static ExclusionBuffer(d) {
    return 25;
}

//-------------------------------------------------------------------------------

static OnMenuItemClick(e,d) {
    console.log('Frame.OnMenuItemClick',e,e.target);
}

//-------------------------------------------------------------------------------

static OnContextMenu(e,d) {

    e.preventDefault();

    menu
      .style("display", "block") 
      .style("left", e.pageX + "px")
      .style("top", e.pageY + "px")
      .html(`
        <div class="item"><b>Set: ${d.node_id}</b></div>
        <div class="item">${d.descriptor}</div>
      `)
      .on('click',Frame.OnMenuItemClick)
      ;

}

   //-------------------------------------------------------------------------------
    // set or unset the 'xhover' class for node d plus all its descendants

   static Hover( d, bHovering ) {

    const s = d3.selectAll('circle, rect') 
        .filter( e => d.descendants.includes(e) ) 
        .classed( 'xhover', bHovering ) ;

d3.selectAll('.frameinfo') 
        .filter( e => d == e ) // not subsets
        .classed( 'xhover', bHovering ) ;

//console.log(bHovering,s);

    if ( Node.DraftLineFromD3Selection ) {
        s.classed("drafting", bHovering);
        } 
   }
   //-------------------------------------------------------------------------------

   static OnMouseOver(e, d) {
    // MouseOver also fires when entering any child element

        mouseover_d3selection = d3.select(this);
        mouseover_datum = d;
        mouseover_dom_element = this;
        //mouseover_d3selection.raise(); // frames must stay in nesting heirarchy
        Frame.Hover( d, true );
   }

   //-------------------------------------------------------------------------------

   static OnMouseOut(e, d) {

  //  console.log('Frame.OnMouseOut',e,d,this);
    if (e.toElement && e.toElement.localName == 'line') return; // better UX if we ignore frame mouseout passing over link line

    //if (e.button) return; //  ignore if still dragging 
        mouseover_d3selection.classed("valid_target",false);
        Frame.Hover( d, false );
        mouseover_d3selection = null;
        mouseover_datum = null;
        mouseover_dom_element = null;
   }

   //-------------------------------------------------------------------------------

static ToCircle(d, bExploded, cXcY) {
        // replace the frame with a circle at cXcY, refresh attributes
        [d.x, d.y] = cXcY;
        d.width = d.height = 2*d.r; // referred to by Node.ContactPoints()

        d.is_group = false; // OTOH, what do we really mean? It's still a group in the sense of being a container for other nodes, but it is no longer rendered as a frame. 

        if ( ! bExploded ) {  // default: 'implode' = hide its contents & transplant links so they point to this container node
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

static Create(selContents=null) {
    // add a new frame node to the cache to contain all currently-selected nodes (by default)
    // or selContents, if that's provided
 const 
    nodeId ='N' + Math.round( Math.random() * 1000000 ), 
    d = {
        node_id: nodeId,
        x: 0,
        y: 0,
        r: 10,
        descriptor: `New node: ${nodeId}`,
        is_group: true,
        has_shape: 1,
        hue_id: 'M',
        node_mass: 20,
        tag: '?'
    };
    Node.AppendDatum(d);
    nodes.push(d);
    mapNodes.set(d.node_id, d);
    
    const nodes_to_add = selContents ? selContents.data() : nodes.filter(n => n.selected );
    
    // TO DO    .filter( n is not an ancestor of d ) // prevent circular nesting
    // TO DO    .filter( n is a visible circle ) // prevent extra links to nested children

    nodes_to_add
        .forEach( n => Link.Create(n,d) ); // add new frame as parent of all currently selected nodes

    Cache.RefreshAllDescendants();    // descendants, per node
    Cache.RefreshSortedNodes(); 
    Cache.ApplyFrameOrder();

    Node.ToFrame(d);
    return d;

}

   //-------------------------------------------------------------------------------

static DescendantShapesSVG(d) {
   return d3.selectAll('circle,rect').filter(e => d.descendants.slice(1).includes(e));
   // don't include non-SVG elements. getBBox() only works for SVG.
    }

   //-------------------------------------------------------------------------------

   static OnClick(e,d) {

//    console.log('Frame.OnClick',e,d,this,Frame.DescendantShapesSVG(d));
//    const bb = GetCombinedBBox(Frame.DescendantShapesSVG(d));
//    console.log('GetCombinedBBox()',bb);
//    console.log(Frame.Coordinates(d));

   const cursor = window.getComputedStyle(this).cursor;

    switch ( cursor ) {
        case 'zoom-out' : // switch to a circle either collapsed, or (if ctrl key) 'exploded';
            Frame.ToCircle(d, e.ctrlKey, d3.pointer(e,svg.node())); 
            break;
        default: // toggle selected status
            d.selected ^= 1;

            ChildrenOf(d).forEach( c => {
                c.selected = d.selected;
                // TO DO: this only goes down to grandchildren. Should use d.descendants
                ChildrenOf(c).forEach( gc => { 
                        gc.selected = d.selected;
                    //    d3.select('rect').filter( o => o == gc).classed('selected',d.selected) ;
                    } );
                } ) ; // set all children on or off
            break;
    }

    ticked();

    }

    //-------------------------------------------------------------------------------

    // because smartphone doesn't have a shift key
   static OnDblClick(e,d) { //  show as a circle , hiding children
        Frame.ToCircle(d, false, d3.pointer(e,svg.node())); // true => implode
        ticked();

   }

   //-------------------------------------------------------------------------------

   // currently assumes that x, y, height & width are determined by visible child circles

   

   //-------------------------------------------------------------------------------


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

    static Margin(d) { return radius + 3*d.descendants.length }; // TO DO: make this a function of the number of descendants, or the size of the largest descendant, or something else that reflects the need for more space around larger frames.


 
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
      .data(sorted_nodes.filter(Node.ShowAsFloatingFrame), Node.UniqueId) 
        .join('rect') // one-step upsert|delete based on matching UniqueId
        .attr('id', Node.UniqueId) //primary key
        .attr('rx', Frame.CornerRadius)
        .attr('ry', Frame.CornerRadius)
        .attr('fill',Node.FillColour) 
        // gradients are static defs, so we can't set them per-node here
        .classed('frame',true)
        .on('click', Frame.OnClick)
        .on('dblclick', Frame.OnDblClick)
        .on('mouseover', Frame.OnMouseOver) 
        .on('mouseout', Frame.OnMouseOut)
        .on("contextmenu", Frame.OnContextMenu)
        ;


}
//---------------------------------------------------------------------------------
function GetCombinedBBox( sel ) {
    const boundingBoxes = sel.nodes().map(shape => shape.getBBox());

    const combinedBBox = boundingBoxes.reduce((acc, bbox) => ({
        x: Math.min(acc.x, bbox.x),
        y: Math.min(acc.y, bbox.y),
        width: Math.max(acc.x + acc.width, bbox.x + bbox.width) - Math.min(acc.x, bbox.x),
        height: Math.max(acc.y + acc.height, bbox.y + bbox.height) - Math.min(acc.y, bbox.y)
    }));

    return combinedBBox;

}

//------------------------------------------------------------------------------
// a StaticFrame isolates its descendants from all other floating nodes by enforcing a hard boundary 
// (Unlike a Frame, which passively moves to enclose all its descendants wherever they may wander
// So, potential use as swim lanes for process diagram. or sections of a Kanban board

// 25/2/26 Still TBD whether it's better to make static boundaries a property of Frame, rather than a whole subclass.
// Simulation and ticked() would still need to filter accordingly. 
// I'd like to generalise the concept of a fixed boundary that can be nested to arbitrary depth
// AND COLLAPSED to a small rect. as with circles except they don't float
// When expanded, any floating children are constrained BUT still LINK to other visible shapes.
// The whole bounding rect can be moved and resized by dragging. All contents move together as one.
// THIS seems like a good use case for nesting of g elements. 
// BUT then how to calibrate, translate & align exact x,y, coordinates in a shared simulation? 
// Given their 'native' coordinates will be relative to the innermost container?

class StaticFrame extends Frame {

// toggle between static and floating
// if static, fixed position and size are controlled by mouse drag
// could leverage the dragrect 

static Create(rectDims,selContents=null) {
    console.log('StaticFrame.Create(rectDims,selContents)',rectDims,selContents);
    // create a new node for the static frame, and return its datum?
    const f = Frame.Create(selContents); // f is added to nodes list
    // now tweak datum so it's treated correctly by simulation etc....
    // eg f.rect = selRect.node fx, fy, width, height, no rounding at corner
    console.log('StaticFrame.Create(rectDims,selContents) returns f=',f);
    f.fx = rectDims.x;
    f.fy = rectDims.y;
    f.width = rectDims.width;
    f.height = rectDims.height;
    f.static = 1;

    }

}

//-------------------------------------------------------------------------------


function AppendStaticFrameShapes() {
    gStatic.selectAll('rect') 
      .data(sorted_nodes.filter(Node.ShowAsStaticFrame), Node.UniqueId) 
        .join('rect') 
        .attr('id', Node.UniqueId)
        .attr('fill',Node.FillColour) 
        .classed('staticframe',true)
        .on('click', StaticFrame.OnClick)
        .on('dblclick', StaticFrame.OnDblClick)
        .on('mouseover', StaticFrame.OnMouseOver) 
        .on('mouseout', StaticFrame.OnMouseOut)
        .on("contextmenu", StaticFrame.OnContextMenu)
        ;


}