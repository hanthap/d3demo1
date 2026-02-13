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

    static DragStartPos;

    constructor( d ) {
        this.d = d;
        d.obj = this; 
        }

    //-------------------------------------------------------------------------------

    static UniqueId(d) {
        return d.node_id;
    }

    //-------------------------------------------------------------------------------

    static Radius(d) {
        return d.r;
    }

    //-------------------------------------------------------------------------------

static Coordinates(d) {
    const s = Node.GetD3Selection(d);
    if (s) {
    const b = s.node().getBBox();
    return { 
            xmin: b.x,
            ymin: b.y,
            xmax : b.x + b.width,
            ymax : b.y + b.height,
            xmid : b.x + b.width/2,
            ymid : b.y + b.height/2,
            width : b.width,
            height : b.height,
            node_id: d.node_id
            };
        }

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
    
static Right(d) {
    return (Node.Centre(d).x + Node.HalfWidth(d));
}

static Left(d) {
    return (Node.Centre(d).x - Node.HalfWidth(d));
}

static Bottom(d) {
    return (Node.Centre(d).y + Node.HalfHeight(d));
}

static Top(d) {
    return (Node.Centre(d).y - Node.HalfHeight(d));
}

    //-------------------------------------------------------------------------------

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
            return 'rgb(' + sourcePalette(d.hue_id) + ')';
    }

    //-------------------------------------------------------------------------------

    static TitleText(d) {
        if ( d.descriptor ) {
            return d.descriptor.replace(/\|/g,'\n');
        }
    }
   //-------------------------------------------------------------------------------

    static OnClick( k, d ) {

        // toggle 'selected' status of the clicked node
        console.log('enter Node.OnClick');
        console.log(d);

        // TO DO: isn't there a simpler way to get this?
        let clicked_element = gNode   
            .selectAll('circle')
            .filter(c => c == d);
        
            console.log(clicked_element);
            // DEBUG: if the element is already in foreground , the whole event happens twice 
            // appearance is the toggle doesn't happen 
            // EndDrag event happens AND the OnClick ) 

        if ( k.ctrlKey && Node.HasMembers(d) ) {      
            //Frame.ToCircle(d, true, d3.pointer(e)); // true => collapse
            //clicked_element.attr('visibility', Node.Visibility);
            // TO DO remove the associated label for each child
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
        UnfreezeSim();
       ticked();

        console.log('exit Node.OnClick');


    }

   //-------------------------------------------------------------------------------

static OnMouseDown(e,d) {
   console.log('Enter Node.OnMouseDown');
   Node.BringToFront(e.subject);
      console.log('Exit Node.OnMouseDown');
}

   //-------------------------------------------------------------------------------

// expand a collapsed node so it appears as a frame with visible child nodes
static ToFrame(d) {
    if ( Node.HasMembers(d) ) {
          d.is_group = true;
          d.has_shape = 1;  // do we need this?
          // are there some descendants we still need to hide?
          d.descendants.filter(c => c != d).forEach( c => { 
                    console.log(c);
                    c.has_shape = 1; 
                    // for in and out lines, restore the true endpoints
                    // importantly, we already have true_source and true_target stored in each link
                    c.inLinks.forEach( lnk => { lnk.target = lnk.true_target; } );
                    c.outLinks.forEach( lnk => {lnk.source = lnk.true_source; } );
            });
            AppendShapes(); 
            AppendFrameShapes();
            AppendLines();
            AppendLabels();
            RefreshSimData();
            UnfreezeSim();

        }

}

   //-------------------------------------------------------------------------------

static OnDblClick(e,d) {
    Node.ToFrame(d);
    ticked();
   }

//-------------------------------------------------------------------------------

static AppendDatum(d,i) {
    d.charge = 5 - ( 10 * Math.random()); // repulsive or attractive force
    d.cogX = 0;
    d.cogY = 0;
    d.weight = 0.1;
 //   d.r = Math.sqrt(d.mass) * radius / 10; // size proportional to weight
    d.r = 10 + 20 * Math.random(); // random radius between 10 and 30
    d.height = 2 * d.r;
    d.width = 2 * d.r;
    d.selected = 0;
    d.show_label = 1; // default to showing labels
    d.has_shape = 1; // 1 <=> node should be bound to a DOM element (visible or not) 
    d.outLinks = [];
    d.inLinks = [];
    // TO DO: what if this node is inside a collapsed container? What if there are 2+ parent containers? Do we pro-rate the values?
    return d;
}

//-------------------------------------------------------------------------------
// called from AppendLinkDatum() in fdg_link.js
static GetFromID( node_id ) {
    return ( mapNodes.get(node_id) );
    }

//-------------------------------------------------------------------------------
// return a d3 selection of all {circles & rects} bound to node datum d
static GetD3Selection( d, types="circle, rect" ) {
    return d3.selectAll(types).filter(e => e === d ); // .filter() handles whatever you throw at it.
    }

//-------------------------------------------------------------------------------

static BringToFront( d ) {
    console.debug('Node.BringToFront');
     Node.GetD3Selection( d ).raise(); 
    }

//-------------------------------------------------------------------------------

static Centre(d) {
    if ( Node.ShowAsFrame(d) ) return Frame.Centre(d); // DIY polymorphism
    else return { 'x': d.x, 'y': d.y };  
}

//-------------------------------------------------------------------------------

static CollideRadius(d) { // called by d3.forceCollide().radius(...)
    //return d.r + 20; // +3 = extra to allow for stroke-width of circle element 
    return d.r  + 1;
}

//-------------------------------------------------------------------------------

static Charge(d) { // called by d3.forceManyBody().strength(...)
    return 0;
    return d.charge;
}

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

static ForceY(d) { // passed to d3.forceY().strength()
    return (width/height) * d.weight;
}

//-------------------------------------------------------------------------------*/

static OnMouseOver(e,d) {
        mouseover_d3selection = Node.GetD3Selection(d);
    }

//-------------------------------------------------------------------------------

static OnMouseOut(e,d) {
    // TO DO: when dragging over LinkZone, we lose :hover style. Need to manage .xhover class explicitly when dragging
     if ( Node.DragStartPos || e.button ) {
            return; //  ignore if still dragging 
     }
     if ( mouseover_d3selection ) {
        //console.log(mouseover_d3selection);
            mouseover_d3selection.classed("valid_target",false);
            mouseover_d3selection = null;           
     }
    }

//-------------------------------------------------------------------------------
    
static IsExclusive(d) {
    // to decide whether this node's circle is in scope of active_exclusion force
    // return ( d.has_shape && !HasVisibleChild(d)  ); 
    return d.has_shape && Node.ShowAsCircle(d);
    }

//-------------------------------------------------------------------------------

static ParentsOf(d) {
    return d.outLinks.filter(n => n.type_cde == 'H' ).map(e => e.target);
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

static IsVisible(d) {
    return ( Node.HasShape(d) );
}

//-------------------------------------------------------------------------------

    static ShowAsFrame(d) {
        return d.is_group && Node.HasShape(d) && HasVisibleChild(d);
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

//-------------------------------------------------------------------------------

static OnDragStart(e,d) {
    console.log('Enter Node.OnDragStart');
    console.log(e);
    console.log(d);

    d.fx = e.x; // fix the node position
    d.fy = e.y;     

   if ( e.sourceEvent.shiftKey) {
       Node.DraftLineFromElement = d3.select(e.sourceEvent.target); 
        console.log(`Shift+DragStart => start creating a new link from node ${d.id}`);
         Node.DraftLineFromElement.classed("drafting", true);
         const p = Node.Centre(d);
         ViewBox.DraftLine = gLabel
        .append('line')
            .attr('x1', p.x)
            .attr('y1', p.y)
            .attr('x2', e.x)
            .attr('y2', e.y)
            .classed('drafting',true)
            ;
   }
   else {
    Node.DraggedElement = d3.select(e.sourceEvent.target); 
    Node.DraggedElement.classed("dragging", true); // add special CSS styling
    Node.BringToFront(Node.DraggedElement);
    }
   console.log('Exit Node.OnDragStart');
ticked();
}
//-------------------------------------------------------------------------------

static OnDrag(e,d) {

    // TO DO : ignore MouseOver with Links = so the dashed outline always stays with the circle being dragged (or perhaps with the circle it's dragged over)

    if ( ViewBox.DraftLine ) {
            ViewBox.DraftLine
                .attr('x2', e.x)
                .attr('y2', e.y)
        // TO DO : highlight the mouseover_d3selection shape element (but only if it's a valid link target)
        if ( mouseover_d3selection && // we're hovering somewhere
            mouseover_d3selection != Node.DraftLineFromElement // exclude starting circle
         ) {
                console.log(mouseover_d3selection);
                mouseover_d3selection.classed("valid_target",true);
         }

    }
   else {
    d.x = d.fx = Math.round(e.x*1000)/1000; // update the x, y as well, so the circle moves even if the simulation is frozen
    d.y = d.fy = Math.round(e.y*1000)/1000;
   }
    ticked();
}

//-------------------------------------------------------------------------------

static OnDragEnd(e,d) {
console.log(e);

    if ( e.sourceEvent.shiftKey) {
        console.log('finish creating link');
        const lnk = {
            true_source: e.subject,
            true_target: e.sourceEvent.target.__data__,
            source: e.subject,
            target: e.sourceEvent.target.__data__,
            id:  'L' + 10000 + Math.round( 10000 * Math.random() ), // unique identifier
            descriptor: null,
            hue_id: 'B',
            type_cde: 1,
            mass: 100,
            strength: 0,
            selected: 1,
            opacity: 1
        };
        lnk.descriptor = `New link from ${lnk.true_source.node_id} to ${lnk.true_target.node_id}`
        console.log(lnk);
        links.push(lnk);
        AppendLines();
        // DEBUG: If the target is a frame, the line doesn't show until the frame is collapsed to circle

   }
   if ( ! e.sourceEvent.ctrlKey ) {
        d.fx = d.fy = null; // Crtl key => node 'stays put'
    }

if ( ViewBox.DraftLine ) {  
    ViewBox.DraftLine.remove();
    ViewBox.DraftLine = null;

}
if ( Node.DraftLineFromElement ) {
    Node.DraftLineFromElement.classed("drafting", false);
    Node.DraftLineFromElement = null;
}

if ( Node.DraggedElement ) {  
    Node.DraggedElement.classed("dragging", false);
    Node.DraggedElement = null;
}
ticked();


 /*
 const p = Node.DragStartPos;
 Node.DragStartPos = null; 
 console.debug('Node.OnDragEnd');

  const dx = e.x - p[0];
  const dy = e.y - p[1];
  const dist = Math.hypot(dx, dy);
  const CLICK_THRESHOLD = 3; // pixels

  if (dist < CLICK_THRESHOLD) {
        console.debug('Manually calling Node.OnClick');
        Node.OnClick(e,d);
        // TO DO : if the target circle is in foreground it now receives the original click event. We need to prevent that somehow.
        e.sourceEvent.stopImmediatePropagation(); // seems to have no effect

    }

 else if ( !frozen ) {
    UnfreezeSim();
    }

  console.debug('Exit Node.OnDragEnd');
*/
}

//-------------------------------------------------------------------------------

static AddLinkToParent(child, parent) {
    // create a new hierarchical link from child to parent
    // TO DO:  skip if child is already a member of parent, or if parent is already an ancestor of child (to prevent circular nesting)
    const newLink = {
        source: child,
        target: parent, 
        true_source: child, // store the true source and target for when we need to restore them after a collapse/expand operation
        true_target: parent,
        to_node_id: parent.node_id,
        from_node_id: child.node_id,
        type_cde: "H",
        distance: 20 * Math.random(),
        strength: 0.4 * Math.random(),
        id: 'L' + links.length + 1, // unique identifier
        descriptor: `New link: ${child.node_id} ∈ ${parent.node_id}`,
        opacity: 1
    };
    links.push(newLink);
    child.outLinks.push(newLink);
    parent.inLinks.push(newLink);
}
//-------------------------------------------------------------------------------

}

 //-------------------------------------------------------------------------------

// which nodes do we care about? include active & passive nodes
function NodeScope(d) {
    return true;
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
function AppendShapes() {

    // create & bind the SVG visual elements
    circles = gNode.selectAll('circle')
        .data(nodes.filter(Node.ShowAsCircle), Node.UniqueId) 
            .join('circle') 
                .attr('id', Node.UniqueId) 
                .attr('r',Node.Radius)
                .attr('fill',Node.FillColour)
                .classed('has_members',Node.HasMembers)
                .on('mouseover',Node.OnMouseOver) 
                .on('mouseout',Node.OnMouseOut) 
                .on('mousedown',Node.OnMouseDown) 
                .on('click',Node.OnClick)
                .on('dblclick',Node.OnDblClick)
                .call(d3.drag()
                    .on('start', Node.OnDragStart)
                    .on('drag', Node.OnDrag)
                    .on('end', Node.OnDragEnd)  
                    ) 
                ;

       circles
                .append('title') // auto tooltip lacks the option to set format with CSS - not even font size
                   .text(Node.TitleText)
                ;

}




//-------------------------------------------------------------------------------

function ChildrenOf(d) {
    if ( d.inLinks ) {
            return ( d.inLinks.filter( Link.IsHier ).map( e => e.source ) )
    } else return [];

}

//-------------------------------------------------------------------------------

function VisibleChildrenOf(d) {
       // return ChildrenOf(d).filter(IsVisibleNode);
        return ChildrenOf(d).filter(Node.HasShape);
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

