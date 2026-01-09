var radius = 16;
var nodes = [];
var mapNodes; // key,value lookup dict
var active_frames = []; // frames in scope of active exclusion
var active_circles = []; // circles in scope of active exclusion
var sorted_frames = []; // determines the z-order of frame rects

// Lookup NodeColour using SRCE_CDE
var sourcePalette = d3.scaleOrdinal()
    .domain( [ 'G', 'R', 'B', 'M', 'C', 'Y'])
    .range( [ 'green', 'red', 'blue', 'magenta', 'cyan', 'yellow' ] );

//-------------------------------------------------------------------------------

class Node {

    constructor(  ) {
        }

    //-------------------------------------------------------------------------------

    static UniqueId(d) {
        return d.NODE_ID;
    }

    //-------------------------------------------------------------------------------

    static Radius(d) {
        return d.r;
    }
    //-------------------------------------------------------------------------------

    static Width(d) {
        return 2*d.r; // TO DO: handle frame shapes
    }
    //-------------------------------------------------------------------------------

    static Height(d) {
        return 2*d.r; // TO DO: handle frame shapes
    }

    //-------------------------------------------------------------------------------

    static BoundedX(d) {
        // bounded node centre needs to consider node's radius as well as the static viewport width, adjusted for corner radius of rounded frame
        d.x = bounded(d.x, d.r - width/2 - 2*radius, width/2-3*radius); 
        return d.x;
    }

    //-------------------------------------------------------------------------------

    static BoundedY(d) {
        // bounded node centre needs to consider node's radius as well as the static viewport height, adjusted for corner radius of rounded frame
        d.y = bounded(d.y, d.r - height/2 - 2*radius, height/2-3*radius); 
        return d.y;
    }

    //-------------------------------------------------------------------------------

    static HalfWidth(d)  {  // horizontal distance from centre to left/right edge
        return d.r ;
    }

    //-------------------------------------------------------------------------------

    static HalfHeight(d)  {  
        return d.r ;
    }

    //-------------------------------------------------------------------------------

    static Visibility(d) {
        return IsActiveNode(d) ? 'visible' : 'hidden'
        // Overloaded in Frame subclass
    }

    //-------------------------------------------------------------------------------

    static FillColour(d) {
        try {
            return sourcePalette( d.SRCE_CDE );
        } catch (e) { };
    }

    //-------------------------------------------------------------------------------

    static TitleText(d) {
        if ( d.NODE_TXT ) {
            return d.NODE_TXT.replace(/\|/g,'\n');
        }
    }

    //-------------------------------------------------------------------------------

    static OnMouseDown( e, d ) {
     //   Node.BringToFront(d);
      //  console.log(d);
    }

   //-------------------------------------------------------------------------------

    static OnClick( k, d ) {
       // console.log(d); // the d3 datum
       // console.log(k); // the click event
        console.log(k.target.getBBox()); // the DOM element (circle) - not a D3 selection object
        console.log(mno_rect.getBBox()); 
        console.log(BoxesOverlap(k.target, mno_rect)); 
        // Oddly, this works if BoxesOverlap() is defined outside a class, but not if it's a static method of a class. 

        // fill colour now done with CSS
        currentobject = d;
        // toggle 'selected' status of the clicked node
        d.selected ^= 1;

        // optionally, propagate the selected status to directly linked neighbours
        if ( k.ctrlKey ) {
            d.inLinks.forEach ( f => { f.source.selected = d.selected } );
            d.outLinks.forEach ( f => { f.target.selected = d.selected } );
        }

        if ( k.shiftKey ) {
            // stack/unstack the parent node (affecting all its subnodes)
            d.inLinks.forEach ( f => f.source.selected ^= 1 );
            d.outLinks.forEach ( f => f.target.selected ^= 1 );
            p = ParentOf(d);
            p.stacked ^= 1; // toggle
            // try catch because p could have no children => slice[1] returns undefined
            try {
                ChildrenOf(p).slice(1).forEach( c => ( c.stacked = p.stacked ));
            } catch { }
            simulation.stop();
            RunSim();
            }

        ticked();

    }


   //-------------------------------------------------------------------------------

static OnDblClick(e,d) {
    // console.log(d)
    // ParentOf(d).stacked = true
    ticked();
   }

//-------------------------------------------------------------------------------

static AppendDatum(d,i) {
    d.charge = -40;
    d.cogX = 0;
    d.cogY = 0;
    d.weight = 0.1;
    d.r = d.NODE_MASS * radius / 35; // size proportional to weight
    d.height = 2 * d.r;
    d.width = 2 * d.r;
    d.stacked = 0; // deprecated
    d.selected = 0;
    d.xhover = 0; // deprecated
    d.closed = 0; // 1 <=> node is a set container, but now collapsed & displayed as a circle (with rolled-up subtotal weights etc)
    // TO DO: what if this node is inside a collapsed container? What if there are 2+ parent containers? Do we pro-rate the values?
    return d;
}

//-------------------------------------------------------------------------------
// called from AppendLinkDatum() in fdg_link.js
static GetFromID( NODE_ID ) {
    return ( mapNodes.get(NODE_ID) );
    }

//-------------------------------------------------------------------------------
// return a d3 selection of all {circles & rects} bound to node datum d
static GetSelection( d, types="circle, rect" ) {
    return d3.selectAll(types).filter(e => e.NODE_ID === Node.UniqueId(d));
    }

//-------------------------------------------------------------------------------

static BringToFront( d ) {
     Node.GetSelection( d ).raise(); 
    }

//-------------------------------------------------------------------------------

static Centre(d) {
    if ( IsFrameShape(d) ) return { 'x': ( d.x + d.width/2), 'y': (d.y +  d.height/2) };
    else if ( IsRectShape(d) ) return { 'x': ( d.x + d.width/2), 'y': (d.y + d.height/2) };
    else return { 'x': d.x, 'y': d.y };  
}

//-------------------------------------------------------------------------------

static CollideRadius(d) { // called by d3.forceCollide().radius(...)
    return d.r + 20; // +3 = extra to allow for stroke-width of circle element 
}

//-------------------------------------------------------------------------------

static Charge(d) { // called by d3.forceManyBody().strength(...)
    return d.charge;
}

//-------------------------------------------------------------------------------

static OnMouseOver(e,d) {
        // fill colour now done with CSS ":hover"
        currentobject = d;
    }

//-------------------------------------------------------------------------------

static OnMouseOut(e,d) {
        if ( e.button) return; //  ignore if still dragging 
            // fill colour now done with CSS ":hover"
            currentobject = null;           
    }

//-------------------------------------------------------------------------------

static IsExclusive(d) {
    // to decide whether this node's circle is in scope of active_exclusion force
    return ( !HasVisibleChild(d) ); // for now, all leaf nodes may be excluded
    }

//-------------------------------------------------------------------------------

static ParentsOf(d) {
    return d.outLinks.filter(n => n.EDGE_CDE == 'H' ).map(e => e.target);
}

//-------------------------------------------------------------------------------




}

//-------------------------------------------------------------------------------

// after each tick we have to expressly assign new values to SVG attributes, otherwise nothing changes
// we can adjust the data here as well eg set velocity to zero
// to do: if the node is a container, we should allow for extra border
// to do: needs to allow for extra border around any nested container



function RightBoundary(d) {
    return (Node.Centre(d).x + Node.HalfWidth(d));
}

function LeftBoundary(d) {
    return (Node.Centre(d).x - Node.HalfWidth(d));
}

function BottomBoundary(d) {
    return (Node.Centre(d).y + Node.HalfHeight(d));
}

function TopBoundary(d) {
    return (Node.Centre(d).y - Node.HalfHeight(d));
}

function IsStackedLeaf(d) {
    p = ParentOf(d);
    return ( p.stacked && d != LeadingChildOf(p));
}

//-------------------------------------------------------------------------------
// to do: return true iff node d is a member of { a, descendants of a } including
// need to make this recursive
function HasAncestor_DEPRECATED(a,d) {
    return ( d.outLinks.filter( e => IsHierLink(e) && e.target == a ).length ); // simplistic and non-recursive
}
   
 //-------------------------------------------------------------------------------

// which nodes do we care about? include active & passive nodes
function NodeScope(d) {
    return true;
    // return ( 'OCH', 'ME', 'FZ').includes( d.EDGE_CDE )
}

//-------------------------------------------------------------------------------

function IsRectShape(d) {
    return d.NODE_TYPE == 'AR';
}

//-------------------------------------------------------------------------------

function IsRoundedShape(d) {
    return d.NODE_TYPE == 'ID';
}

//-------------------------------------------------------------------------------
// TO DO: decide whether a leaf node can ever be a frame shape
function IsFrameShape(d) {
    return false
    || HasVisibleChild(d) ;
}

//-------------------------------------------------------------------------------

function HasVisibleChild(d) {
    return ( VisibleChildrenOf(d).length > 0 );
}

//-------------------------------------------------------------------------------

function IsVisibleNode(d) {
    p = ParentOf(d);
    return ( (!p.stacked) || d == LeadingChildOf(p) );
}

//-------------------------------------------------------------------------------
// only active (unstacked) nodes will drive the simulation

function IsActiveNode(d) {
    return ( NodeScope(d) && IsVisibleNode(d) && !IsFrameShape(d) );
}

//-------------------------------------------------------------------------------
// if we only create circles for nodes that are initially active, how to switch from passive to active later in the session?
// might be easier up front to create a circle for every node in scope and decide whether to show or hide using CSS attributes
function AppendShapes(rs) {
    nodes = rs; // the 'master' array used by d3 to render shapes
    // we also want to access each datum via its unique NODE_ID string
    mapNodes = new Map ( nodes.map( x => ( [x.NODE_ID, x ]) ) );

// TO DO: create a mini 'g' group for each node, then append circle & foreignObject as siblings inside that group

    // create the SVG visual element
    circles = gNode.selectAll('circle') // in case we've already got some
        .data(nodes.filter(IsRoundedShape), Node.UniqueId) // optional 2nd arg = stable key 
            .join('circle')  // append a new circle shape bound to that datum
                .attr('id', Node.UniqueId) // for easy lookup later
                .attr('r',Node.Radius)
                .attr('fill',Node.FillColour)

                .on('mouseover',Node.OnMouseOver) // called at each transition, including nested elements, unlike mouseenter
                .on('mouseout',Node.OnMouseOut) // ditto, unlike mouseexit
//                .on('mousedown',Node.OnMouseDown)
                .on('click',Node.OnClick)
                .on('dblclick',Node.OnDblClick)

// DO THESE 2 LINES WORK HERE OR ONLY IN TICKED() ??
                .attr('cx', Node.BoundedX ) // if this is a callback, why do we need to pass it again on each tick
                .attr('cy', Node.BoundedY ) // could be because it writes back to d.x and d.y ?
                ;

// works ok - title can be nested inside circle element
       circles
                .append('title') // auto tooltip lacks the option to set format with CSS - not even font size
                // can we append a custom element that supports CSS eg (stackoverflow)
                   .text(Node.TitleText)
                ;

    // TO DO: these should NOT be nested inside circle elements. Circles and ForeignObjkect need to be SIBLINGS inside a mini SVG node 'g' group
        circles
            .append("foreignObject") // add a second child element per node-group. 
                .attr("x", d => -d.r) // relative to parent 'g' element
                .attr("y", d => -d.r)
                .attr("width", Node.Width)
                .attr("height", Node.Height)
                .append("xhtml:div") // add a grandchild DIV element inside the foreignObject - we need the strictness of XHTML when inside an SVG 
                    .classed("circleinfo", true)   // for CSS styling  
                    .html(Node.TitleText);


}

//-------------------------------------------------------------------------------

    // this might have to wait until we've finished loading edges as well
    // TO DO: handle nested frames in correct sequence to ensure conntainers are in back of their contents
function AppendFrameShapes() {
//    console.log(nodes.filter(IsFrameShape));
    gGroup.selectAll('rect') // in case we've already got some
  //      .data(nodes.filter(IsFrameShape), Node.UniqueId)  // TO DO: ensure they are in correct z-order
      .data(sorted_frames, Node.UniqueId)  // TO DO: ensure they are in correct z-order

            .join('rect') // append a new rectangular frame bound to this node datum
            .attr('id', Node.UniqueId)
            .attr('rx', 2*radius ) // for rounded corners
            .attr('ry', 2*radius ) 
           .attr('fill',Node.FillColour) // same as if it was a collapsed circle
           // gradients are static defs, so we can't set them per-node here
            .classed('frame',true)
            .on('click', Frame.OnClick)
            .on('mouseover', Frame.OnMouseOver) 
            .on('mouseout', Frame.OnMouseOut)
            .append('title')
                .text(Node.TitleText)
            ;




}




//-------------------------------------------------------------------------------

function ChildrenOf(d) {
    if ( d.inLinks ) {
            return ( d.inLinks.filter( IsHierLink ).map( e => e.source ) )
    } else return [];

}

//-------------------------------------------------------------------------------

function VisibleChildrenOf(d) {
        return ChildrenOf(d).filter(IsVisibleNode);
}

//-------------------------------------------------------------------------------

function VisibleDescendantsOf(d) {
   // return d.descendants.filter( IsVisibleNode );
   return d.descendants.filter( IsActiveNode ); // inlcudes frames?
}

//-------------------------------------------------------------------------------

function LeadingChildOf(d) {
        c = ChildrenOf(d);
        return ( c.length ? c[0] : d ); // self-contained?
}

//-------------------------------------------------------------------------------
function HasStackedParent(d) {  // if visible we'll use a different colour
// parent is currently stacked // TO DO and has 2+ non-hidden children
    return ( d.outLinks.filter(IsHierLink).filter( e => e.target.stacked).length );
    // at least one outward edge points to a node that is stacked
}

//-------------------------------------------------------------------------------
function ParentOf(d) {
    if ( d.outLinks ) {
        t = d.outLinks.filter( IsHierLink );
        // if more than 1, just pick the first for now.. might need to take a different approach
        return( t.length ? t[0].target : d ); 
    } else return d;
}




//-------------------------------------------------------------------------------

// true if n is [a descendant of] either of the vertices of edge e
function IsAtVertexOf_DEPRECATED(  e, n ) {
    return HasAncestor( e.source, n ) || HasAncestor( e.target, n );
}

//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------


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
// Y/N is this frame nested inside any others? (True <=> it's either a circle or a top-level superset frame)
// this is a frame AND so is at least one of its containers
    static IsNotNested(d) {
        return ( Node.ParentsOf(d)
            .filter(IsFrameShape)
            .length == 0
        );

    }



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
