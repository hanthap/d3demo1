var radius = 16;
var nodes = [];
var mapNodes; // key,value lookup dict
var active_frames = []; // frames in scope of active exclusion
var active_circles = []; // circles in scope of active exclusion
var sorted_nodes = []; // flat array determines the z-order, especially of frame rects

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
        // Node.BringToFront(d);
      //  console.log(d);
    }

   //-------------------------------------------------------------------------------

    static OnClick( k, d ) {
        currentobject = d;
        // toggle 'selected' status of the clicked node
        d.selected ^= 1;

        // optionally, propagate the selected status to directly linked neighbours
        if ( k.ctrlKey ) {
            d.inLinks.forEach ( f => { f.source.selected = d.selected } );
            d.outLinks.forEach ( f => { f.target.selected = d.selected } );
        }

       ticked();

    }

   //-------------------------------------------------------------------------------

static OnDblClick(e,d) {
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
        currentobject = d;
    }

//-------------------------------------------------------------------------------

static OnMouseOut(e,d) {
        if ( e.button) return; //  ignore if still dragging 
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
