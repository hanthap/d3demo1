var radius = 16;
var nodes = [];

var mapNodes; // key,value lookup dict
var active_frames = []; // frames in scope of active exclusion
var active_circles = []; // circles in scope of active exclusion
var sorted_nodes = []; // flat array determines the z-order, especially of nested frame rects

// Lookup Node.Colour using SRCE_CDE
var sourcePalette = d3.scaleOrdinal()
    .domain( [ 'G', 'R', 'B', 'M', 'C', 'Y', 'K'])
//    .range( [ 'green', 'red', 'blue', 'magenta', 'cyan', 'yellow', 'black' ] );
    .range( [ '0,255,0', '255,0,0', '0,0,255', '255,0,255', '0,255,255', '255,255,0', '0,0,0' ] );

//-------------------------------------------------------------------------------

class Node {

    constructor( d ) {
        this.d = d;
        d.obj = this; 
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
        return 2*d.r; 
    }
    //-------------------------------------------------------------------------------

    static Height(d) {
        return 2*d.r; 
    }

    //-------------------------------------------------------------------------------
    // prevent the shape from crossing the perimeter of the SVG viewport
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

    static ContactPoint(d,theta) {  
        if ( Node.ShowAsFrame(d) ) { //  DIY polymorphism 
            return Frame.ContactPoint(d,theta);
        }
        if ( Node.ShowAsCircle(d) ) {
            // where does the ray intersect the circle?
            return {
                // TO DO: adjust for stroke width
                    x: d.x + d.r * Math.cos(theta),
                    y: d.y + d.r * Math.sin(theta)
            };

        }
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
        let clicked_element = gNode   
            .selectAll('circle')
            .filter(c => c == d);

        if ( k.ctrlKey && Node.HasMembers(d) ) {      
            clicked_element.attr('visibility', Node.Visibility);
            Node.ToFrame(d);
        } else { // toggle foreground/selected status
            d.selected ^= 1;
            clicked_element.classed('selected', d => d.selected)
        }


        // optionally, propagate the selected status to all directly-linked neighbours
        if ( k.shiftKey ) {
            clicked_element.classed('blink_me',true); // test
            d.inLinks.forEach ( f => { f.source.selected = d.selected } );
            d.outLinks.forEach ( f => { f.target.selected = d.selected } );
        }

       ticked();

    }

   //-------------------------------------------------------------------------------

// expand a collapsed node so it appears as a frame with visible child nodes
static ToFrame(d) {

    if ( Node.HasMembers(d) ) {

            d.IS_GROUP = true;

            // should this be all descendants?
            ChildrenOf(d).forEach( c => { c.has_shape = 1 } );
            AppendShapes(); 
            AppendFrameShapes();
            AppendLines();
            RefreshSimData();
        }

}

   //-------------------------------------------------------------------------------

static OnDblClick(e,d) {
    Node.ToFrame(d);
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
    d.selected = 0;
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

/*-------------------------------------------------------------------------------

// NOTE: d3.forceX(), d3.forceY() are not needed

//-------------------------------------------------------------------------------

static COGX(d) { // passed to d3.forceX()
    return d.cogX;
}

//-------------------------------------------------------------------------------

static COGY(d) { // passed to d3.forceY()
    return d.cogY;
} 

//-------------------------------------------------------------------------------

static ForceX(d) { // passed to d3.forceX().strength()
    return d.weight;
}

//-------------------------------------------------------------------------------

static ForceY(d) { // passed to d3.forceX().strength()
    return (width/height) * d.weight;
}

//-------------------------------------------------------------------------------*/

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

    static HasMembers(d) { // typically, a circle that represents a collapsed (non-empty) set
        return ChildrenOf(d).length > 0 ;
    }

    static IsLeaf(d) { // visible or not, but still affects the simulation (directly or via rollup subtotal)
        return ChildrenOf(d).length == 0 ;
    }


static OnDragStart(e,d) {
    simulation.stop(); // prevents crazy flicker while dragging
    simulationExclusion.stop(); 
    Node.BringToFront(e.subject);
}
//-------------------------------------------------------------------------------

static OnDrag(e,d) {
    d.x = e.x;
    d.y = e.y;
    ticked();
}

//-------------------------------------------------------------------------------

static OnDragEnd(e,d) {

    if ( !frozen ) {
        UnfreezeSim();
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
// AppendShapes is not just for initial setup. Called after user interaction, also handles update & delete.
// might be easier up front to create a circle for every node in scope and decide whether to show or hide using CSS attributes
function AppendShapes() {
 
// TO DO: create a mini 'g' group for each node, then append circle & foreignObject as siblings inside that group

    // create & bind the SVG visual elements
    circles = gNode.selectAll('circle') // in case we've already got some
        .data(nodes.filter(Node.ShowAsCircle), Node.UniqueId) // optional 2nd arg = stable key 
            .join('circle')  // append a new circle shape bound to that datum
                .attr('id', Node.UniqueId) // for efficient upsert & delete of DOM bindings
                .attr('r',Node.Radius)
                .attr('fill',Node.FillColour)
                .classed('has_members',Node.HasMembers)
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
   return d.descendants.filter( Node.IsActive ); // includes frames?
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
// drag & drop are synthetic events managed by d3. ".on()" only listens for 'raw' DOM events
// d3's drag listener is applied to circle elements via d3 selection ".call(drag)" method.

let drag = d3.drag()
    .on('start', Node.OnDragStart)
    .on('drag', Node.OnDrag)
    .on('end', Node.OnDragEnd)  
    ;
