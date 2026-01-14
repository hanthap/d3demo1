var radius = 16;
var nodes = [];

var mapNodes; // key,value lookup dict
var active_frames = []; // frames in scope of active exclusion
var active_circles = []; // circles in scope of active exclusion
var sorted_nodes = []; // flat array determines the z-order, especially of frame rects

// Lookup Node.Colour using SRCE_CDE
var sourcePalette = d3.scaleOrdinal()
    .domain( [ 'G', 'R', 'B', 'M', 'C', 'Y'])
//    .range( [ 'green', 'red', 'blue', 'magenta', 'cyan', 'yellow' ] );
    .range( [ '0,255,0', '255,0,0', '0,0,255', '255,0,255', '0,255,255', '1,1,0' ] );

//-------------------------------------------------------------------------------

class Node {

    constructor( d ) {
        this.d = d;
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
        return Node.IsActive(d) ? 'visible' : 'hidden'
        // Overloaded in Frame subclass
    }

    //-------------------------------------------------------------------------------

    static FillColour(d) {
            return 'rgb(' + sourcePalette(d.SRCE_CDE) + ')';
    }

    //-------------------------------------------------------------------------------

    static TitleText(d) {
        if ( d.NODE_TXT ) {
            return d.NODE_TXT.replace(/\|/g,'\n');
        }
    }

   //-------------------------------------------------------------------------------

    static OnClick( k, d ) {
       // mouseover_object = d; // redundant
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
    // d.xhover = 0; // deprecated
    d.has_shape = 1; // 1 <=> node should be bound to a DOM element (visible or not) 
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
    return d3.selectAll(types).filter(e => e === d ); // .filter() handles whatever you throw at it.
    }

//-------------------------------------------------------------------------------

static BringToFront( d ) {
     Node.GetSelection( d ).raise(); 
    }

//-------------------------------------------------------------------------------

static Centre(d) {
    if ( Node.ShowAsFrame(d) ) return { 'x': ( d.x + d.width/2), 'y': (d.y +  d.height/2) };
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
        mouseover_object = d;
    }

//-------------------------------------------------------------------------------

static OnMouseOut(e,d) {
        if ( e.button) return; //  ignore if still dragging 
            mouseover_object = null;           
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
// Y/N is this a 'top-level' ('root') node, within the graph context? 
    static IsNotNested(d) {
        return ( Node.ParentsOf(d)
            .filter(Node.ShowAsFrame)
            .length == 0
        );

    }

//-------------------------------------------------------------------------------
// Decide whether we want a DOM shape element (visible or not) to be bound to this node 

    static HasShape(d) {
        // TO DO: exclude all descendants of a collapsed group/set i.e if any visible ancestor has Node.ShowAsFrame(d) == False
        return d.has_shape;
    }

//-------------------------------------------------------------------------------

    static ShowAsFrame(d) {
        return d.IS_GROUP && Node.HasShape(d) && HasVisibleChild(d);
    }

//-------------------------------------------------------------------------------

    static ShowAsCircle(d) {
        return Node.HasShape(d) && !Node.ShowAsFrame(d);
    }

//-------------------------------------------------------------------------------

    static IsActive(d) { // participates in force simulations
        return Node.ShowAsCircle(d);
    }


static OnDragStart(e,d) {
    simulation.stop(); // prevents crazy flicker while dragging
    simulationExclusion.stop(); 
    Node.BringToFront(e.subject);
}
//-------------------------------------------------------------------------------

static OnDrag(e,d) {
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

static OnDragEnd(e,d) {

    if ( e.sourceEvent.shiftKey ) {
        d.cogX = d.x;
        d.cogY = d.y;
        } 

    if ( !frozen ) {
        RunSim();
        }
}


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

// function IsStackedLeaf(d) {
//     p = ParentOf(d);
//     return ( p.stacked && d != LeadingChildOf(p));
// }

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


//-------------------------------------------------------------------------------
// if we only create circles for nodes that are initially active, how to switch from passive to active later in the session?
// might be easier up front to create a circle for every node in scope and decide whether to show or hide using CSS attributes
function AppendShapes(rs) {
 
// TO DO: create a mini 'g' group for each node, then append circle & foreignObject as siblings inside that group

    // create & bind the SVG visual elements
    circles = gNode.selectAll('circle') // in case we've already got some
        .data(nodes.filter(Node.ShowAsCircle), Node.UniqueId) // optional 2nd arg = stable key 
            .join('circle')  // append a new circle shape bound to that datum
                .attr('id', Node.UniqueId) // for efficient upsert & delete of DOM bindings
                .attr('r',Node.Radius)
                .attr('fill',Node.FillColour)
               // .style('fill','rgb(1,0,0)')
                .on('mouseover',Node.OnMouseOver) // called at each transition, including nested elements, unlike mouseenter
                .on('mouseout',Node.OnMouseOut) // ditto, unlike mouseexit
                .on('click',Node.OnClick)
                .on('dblclick',Node.OnDblClick)
                .call(drag) // attach d3's special listener object
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
            return ( d.inLinks.filter( Link.IsHier ).map( e => e.source ) )
    } else return [];

}

//-------------------------------------------------------------------------------

function VisibleChildrenOf(d) {
        return ChildrenOf(d).filter(IsVisibleNode);
}

//-------------------------------------------------------------------------------

function VisibleDescendantsOf(d) {
   // return d.descendants.filter( IsVisibleNode );
   return d.descendants.filter( Node.IsActive ); // inlcudes frames?
}

//-------------------------------------------------------------------------------

function LeadingChildOf(d) {
        c = ChildrenOf(d);
        return ( c.length ? c[0] : d ); // self-contained?
}

//-------------------------------------------------------------------------------
function HasStackedParent(d) {  // if visible we'll use a different colour
// parent is currently stacked // TO DO and has 2+ non-hidden children
    return ( d.outLinks.filter(Link.IsHier).filter( e => e.target.stacked).length );
    // at least one outward edge points to a node that is stacked
}

//-------------------------------------------------------------------------------
function ParentOf(d) {
    if ( d.outLinks ) {
        t = d.outLinks.filter( Link.IsHier );
        // if more than 1, just pick the first for now.. might need to take a different approach
        return( t.length ? t[0].target : d ); 
    } else return d;
}


//-------------------------------------------------------------------------------



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

// function initDrag(e,d) { // assumes SVG element has been created
//     // only active nodes can be dragged
//     gNode.selectAll('circle').call(drag);
// }

//-------------------------------------------------------------------------------
// drag & drop are synthetic events managed by d3. ".on()" only listens for raw DOM events
// d3's drag listener is applied to circle elements via d3 selection ".call(drag)" method.
let drag = d3.drag()
    .on('start', Node.OnDragStart)
    .on('drag', Node.OnDrag)
    .on('end', Node.OnDragEnd)  
    ;
