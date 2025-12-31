var radius = 16;
var nodes = [];
var mapNodes; // key,value lookup dict

// Lookup NodeColour using SRCE_CDE
var sourcePalette = d3.scaleOrdinal()
    .domain( [ 'XDX', 'OCR', 'GHI' ])
    .range( [ 'green', 'red', 'blue' ]);

//-------------------------------------------------------------------------------

class Node {

    constructor( NODE_ID, NODE_TYPE, NODE_MASS, SRCE_CDE, CUST_TYPE_CDE, EDGE_CDE, NODE_TXT ) {
        this.NODE_ID = NODE_ID;
        this.NODE_TYPE = NODE_TYPE;
        this.NODE_MASS = NODE_MASS;
        this.SRCE_CDE = SRCE_CDE;
        this.CUST_TYPE_CDE = CUST_TYPE_CDE;
        this.EDGE_CDE = EDGE_CDE;
        this.NODE_TXT = NODE_TXT;
    }

    //-------------------------------------------------------------------------------

    static Radius(d) {
        return d.r;
    }

    //-------------------------------------------------------------------------------

    static BoundedX(d) {
        d.x = bounded(d.x, 3*radius-width/2, width/2-3*radius); 
        return d.x;
    }

    //-------------------------------------------------------------------------------


    static BoundedY(d) {
        d.y = bounded(d.y, 3*radius-height/2, height/2-3*radius); 
        return d.y;
    }

    //-------------------------------------------------------------------------------

    static Visibility(d) {
        return IsActiveNode(d) ? 'visible' : 'hidden'
        // what if it's a frame rect? Then we look at whether there's a visible child.
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

    static OnClick( k, d ) {
        x = this;
        console.log(d); // the d3 datum
        console.log(k); // the click event
        console.log(this); // the DOM element (circle)

        // use loc.x and loc.y here

        // fill colour now done with 
        currentobject = d;
        // toggle 'selected' status of the clicked node
        d.selected =  ! d.selected

        // optionally, toggle the selected status of directly linked neighbours
        if ( k.ctrlKey ) {
            d.inLinks.forEach ( f => f.source.selected ^= 1 );
            d.outLinks.forEach ( f => f.target.selected ^= 1 );
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
    ticked()
   }



//-------------------------------------------------------------------------------

static AppendDatum(d,i) {
  //  d.index = i; // this can be misleading
    d.charge = -40;
    d.cogX = 0;
    d.cogY = 0;
    d.weight = 0.1;
    d.r = d.NODE_MASS * radius / 35; // size proportional to weight
    d.height = 2 * d.r;
    d.width = 2 * d.r;
    d.stacked = 0;
    d.selected = 0;
    d.xhover = 0;
    return d;
}

//-------------------------------------------------------------------------------
// called from AppendLinkDatum() in fdg_link.js
static GetFromID( NODE_ID ) {
    return ( mapNodes.get(NODE_ID) );
    }

//-------------------------------------------------------------------------------
// 
static Centre(d) {
    if ( IsFrameShape(d) ) return [ ( d.x + d.width/2), (d.y + d.height/2) ]
    else if ( IsRectShape(d) ) return [ ( d.x + d.width/2), (d.y + d.height/2) ];
    else return [ d.x, d.y ];  
}


//-------------------------------------------------------------------------------

//function CollideRadius(d) { 
static CollideRadius(d) { // called by d3.forceCollide().radius(...)
    return d.r + 10; // +3 = extra to allow for stroke-width of circle element 
}

//-------------------------------------------------------------------------------

// function NodeCharge(d) {
static Charge(d) { // called by d3.forceManyBody().strength(...)
    return d.charge;
}



}
//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------

// after each tick we have to expressly assign new values to SVG attributes, otherwise nothing changes
// we can adjust the data here as well eg set velocity to zero
// to do: if the node is a container, we should allow for extra border
// to do: needs to allow for extra border around any nested container

function NodeHalfWidth(d)  {  // horizontal distance from centre to left/right edge
    return d.r;

}
function NodeHalfHeight(d)  {  
    return d.r;

}

function RightBoundary(d) {
    return (Node.Centre(d)[0] + NodeHalfWidth(d));
}

function LeftBoundary(d) {
    return (Node.Centre(d)[0] - NodeHalfWidth(d));
}

function BottomBoundary(d) {
    return (Node.Centre(d)[1] + NodeHalfHeight(d));
}

function TopBoundary(d) {
    return (Node.Centre(d)[1] - NodeHalfHeight(d));
}

function IsStackedLeaf(d) {
    p = ParentOf(d);
    return ( p.stacked && d != LeadingChildOf(p));
}

//-------------------------------------------------------------------------------
// to do: return true iff node d is a member of { a, descendants of a } including
// need to make this recursive
function HasAncestor(a,d) {
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
/*

TO DO: allow for multiple parallel hierarchies, each of which can be represented 
each hierarchy could be defined by a group of link types eg 'GOLDEN', 
frame shapes are colour-coded with round square 
When multiple hierarchies are stackable we need to set priority rules to 
BUG: HHOLD stacks & unstacks nicely but only when OCH hierarchy is disabled, something to do with


*/
function IsFrameShape(d) {
    return false
    || ( 'GENH' ).includes( d.CUST_TYPE_CDE ) // households
    || ( 'GRP').includes( d.CUST_TYPE_CDE ) // ultimate parents
    || ( 'OCH').includes( d.SRCE_CDE ) // golden ids
    || ( ( 'AF').includes( d.SRCE_CDE ) && HasVisibleChild(d)  ) // does this work?
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



//-------------------------------------------------------------------------------
// if we only create circles for nodes that are initially active, how to switch from passive to active later in the session?
// might be easier up front to create a circle for every node in scope and decide whether to show or hide using CSS attributes
function AppendShapes(rs) {
    nodes = rs; // the 'master' array used by d3 to render shapes
    // we also want to access each datum via its unique NODE_ID string
    mapNodes = new Map ( nodes.map( x => ( [x.NODE_ID, x ]) ) );

    // create the SVG visual element
    gNode.selectAll('circle') // in case we've already got some
        .data(nodes.filter(IsRoundedShape)) // see comment above - how best to hide a circle when its group is visible and vice versa
            .join('circle')  // append a new circle shape bound to that datum
                .on('mouseover',handleMouseOverNode) // for popup if implemented
                .on('mouseout',handleMouseOutNode)
                .on('click',Node.OnClick)
                .on('dblclick',Node.OnDblClick)
                .attr('r',Node.Radius)
                .attr('fill',Node.FillColour)

// DO THESE 2 LINES WORK HERE OR ONLY IN TICKED() ??
                .attr('cx', Node.BoundedX ) // if this is a callback, why do we need to pass it again on each tick
                .attr('cy', Node.BoundedY )

                .append('title') // auto tooltip lacks the option to set format with CSS - not even font size
                // can we append a custom element that supports CSS eg (stackoverflow)
                   .text(Node.TitleText)
                ;
    gNode.selectAll('rect') // in case we've already got some
        .data(nodes.filter(IsRectShape))
            .join('rect') // append a new rect shape bound to that datum
                .classed('leaf',true)
                .on('mouseover',handleMouseOverNode) // for popup if implemented
                .on('mouseout',handleMouseOutNode)
                .on('click',Node.OnClick)
                .on('dblclick',Node.OnDblClick)
                .attr('width',d => d.width)
                .attr('height',d => d.height)
                .attr('fill',Node.FillColour)
                .append('title') 
                  .text(Node.TitleText)
                ;
}

//-------------------------------------------------------------------------------

    // this might have to wait until we've finished loading edges as well

function AppendFrameShapes() {
    console.log(nodes.filter(IsFrameShape));
    gGroup.selectAll('rect') // in case we've already got some
        .data(nodes.filter(IsFrameShape)) // for each datum in scope
            .join('rect') // append a new rectangular frame bound to this 
            .attr('rx', d => IsRoundedShape(d) ? 2*radius : 0 ) // for rounded corners
            .attr('ry', d => IsRoundedShape(d) ? 2*radius : 0 ) 
            .classed('frame',true)
            .on('click', handleClickFrame)
            .on('mouseover', handleMouseOverFrame) // for popup
            .on('mouseout', handleMouseOutFrame)
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
function IsAtVertexOf(  e, n ) {
    return HasAncestor( e.source, n ) || HasAncestor( e.target, n );
}

