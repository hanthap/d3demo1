var radius = 8;
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
    static DraggedD3Selection;


    constructor( d ) {
        this.d = d;
        d.obj = this; 
        }

    //-------------------------------------------------------------------------------

    static UniqueId(d) {
        return d.node_id;
    }

    //-------------------------------------------------------------------------------

    static Tag(d) {
        return d.tag > "" ? d.tag : d.node_id;
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
    // prevent the shape from crossing the perimeter of the SVG viewport
    static BoundedX(d) {
        // bounded node centre needs to consider node's radius as well as the static viewport width, adjusted for corner radius of rounded frame



     //   d.x = bounded(d.x, d.r - width/2 - 2*radius, width/2-3*radius); 
        return d.x;
    }

    //-------------------------------------------------------------------------------

    static BoundedY(d) {
        // bounded node centre needs to consider node's radius as well as the static viewport height, adjusted for corner radius of rounded frame
      //  d.y = bounded(d.y, d.r - height/2 - 2*radius, height/2-3*radius); 
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
        else {
            // where does the ray intersect the circle?
            return {
                // TODO: adjust for stroke width
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
            return d.bg_fill ? d.bg_fill : 'rgb(' + sourcePalette(d.hue_id) + ')';
    }

    //-------------------------------------------------------------------------------

    static TitleText(d) {
        return (
            d.legal_text ? d.legal_text : 
            d.descriptor ? d.descriptor.replace(/\|/g,'\n') :
            '??' )
        }
//-------------------------------------------------------------------------------

static OnMenuItemClick(e,d) {
    console.log('Node.OnMenuItemClick',e,e.target);
}
//-------------------------------------------------------------------------------

static ImageSource(d) { 
    return d.img_src;
};

//-------------------------------------------------------------------------------

static ImageAlt(d) { return d.tag };

//-------------------------------------------------------------------------------

static OnContextMenu(e,d) {

    e.preventDefault();

    menu
      .style("display", "block")
      .style("left", e.pageX + "px")
      .style("top", e.pageY + "px")
      .html(`
        <div class="item"><b>Node: ${d.node_id}</b></div>
        <div class="item">${d.descriptor}</div>
      `)
        .append('div').classed('item',true)
        .style('background', Node.FillColour(d))
        .append("img")
            .style('width', '150px')
            .style('height', 'auto')
            .attr("src", Node.ImageSource(d))
            .attr("alt", Node.ImageAlt(d)) // mandatory
       //     .attr("width", '40px') automatic, if we specify height
            .attr("height", '80px')
  
      .on('click',Node.OnMenuItemClick)
      ;

}


   //-------------------------------------------------------------------------------

    static OnClick( k, d ) {

        console.log('Node.OnClick',k,d,this);

        let clicked_d3selection = d3.select(this);  
            // DEBUG: if the element is already in foreground , the whole event happens twice 
            // appearance is the toggle doesn't happen 
            // EndDrag event happens AND the OnClick ) 

        const cursor = window.getComputedStyle(this).cursor;

        switch ( cursor ) {

            case 'zoom-in' : // implies we know there are child nodes i.e. Node.HasMembers(d)
                Node.ToFrame(d);
                break;

            default: // toggle foreground/selected status
                d.selected ^= 1;
                clicked_d3selection
                    .classed('selected', d => d.selected)
                    .classed('disabled', d => !d.selected) // for grayscaling unselected nodes
                break;
            }
     
        // optionally, cascade the selected status to all direct links and their bound nodes
        // DEBUG why are the resulting selections inverted for nodes vs links?
        if ( k.shiftKey ) {
            d.inLinks.forEach ( f => { f.selected = f.source.selected = d.selected } );
            d.outLinks.forEach ( f => { f.selected = f.target.selected = d.selected } );

        }
       if (!frozen) UnfreezeSim();
       ticked();

    }

   //-------------------------------------------------------------------------------

static OnMouseDown(e,d) {
    // this is bypassed by OnDragStart() 
//   console.log('Enter Node.OnMouseDown');
//   Node.BringToFront(e.subject);
//      console.log('Exit Node.OnMouseDown');
}

   //-------------------------------------------------------------------------------
// TODO:  handle case where node d is an element of the intersection A 
//      and more than one of those supersets is collapsed to an apparent circle
//   
static ApparentCircle(d) {
    // find the currently visible circle that encapsulates this node d, and return its datum
    // working up through all ancestors, stop at the first one that is visible and not a frame
    // drives the current virtual endpoints of a link's line
    // TODO: DEFEND AGAINST LOOPS
    for ( var n in d.ancestors ) {
        if ( Node.IsVisible(n) ) return n; // TODO : what if the first one we find is a frame rect? 
    }
    return d;

}

   //-------------------------------------------------------------------------------

// zoom in (expand, unpack) a collapsed node so it appears as a frame with visible child nodes

// TODO DEBUG: any nested node should reappear just as it was when its parent frame d was last collapsed 
// Instead, it is displayed in "exploded" configuration, as a circle linked to its children. => is_group was clobbered with a 0?
// TODO DEBUG: after collapsing & expanding a locked frame, the child circles have large positive y coordinates (off screen)

static ToFrame(d) {

    console.log('Node.ToFrame(d)',d);

    if ( Node.HasMembers(d) ) {
        d.is_group = 1;
        d.has_shape = 1; 
        d.descendants // TODO: should be all descendants that were visible just before last collapse event - but how can we tell?

            .filter(c => c != d ) 
            // TODO: c.collapsed_into_node should be ALL the apparent circles that include node c
            .filter( c => c.collapsed_into_node == d ) // only unpack these ones, NOT every descendant
            .forEach( c => { 
                console.log(c);
           //   c.soft_hide = 0;
              c.collapsed_into_node = null; 
                // ask both 'true' end nodes for their lowest VISIBLE ancestor
                c.inLinks.forEach( lnk => { lnk.target = Node.ApparentCircle(lnk.true_target); } );
                c.outLinks.forEach( lnk => {lnk.source = Node.ApparentCircle(lnk.true_source); } );
                });

    Cache.RefreshAllDescendants();
    Cache.RefreshSortedNodes(); 
    Cache.ApplyFrameOrder();                

        AppendFrameShapes();
        AppendLabels();
        AppendLines(); 
        RefreshSimData();
        if (!frozen) UnfreezeSim();
    }
}

   //-------------------------------------------------------------------------------

static OnDblClick(e,d) {
    Node.ToFrame(d);
    ticked();
}

//-------------------------------------------------------------------------------

static AppendDatum(d,i) {
    d.charge = 10; // 5 - ( 10 * Math.random()); // repulsive or attractive force
    d.cogX = 0;
    d.cogY = 0;
    d.weight = 0.2;
    //  d.r = Math.sqrt(d.mass) * radius / 10; // size proportional to weight
    d.r = 16; 
    d.height = 2 * d.r;
    d.width = 2 * d.r;
    d.selected = 0;
    d.show_label = 1; // default to showing labels
    d.has_shape = 1; // 1 <=> node should be bound to a DOM element (visible or not) 
   // d.soft_hide = 0; // to decide which descendants will be visible on re-expanding a collapsed frame
   d.collapsed_into_node = null;
  //  d.is_group = 0; // DOES THIS HELP ???
    d.outLinks = [];
    d.inLinks = [];
    d.locked = 0; 
    d.x = d.y = 0;
    // TODO: what if this node is inside a collapsed container? What if there are 2+ parent containers? Do we pro-rate the values?
    return d;
}

//-------------------------------------------------------------------------------
// called by DraftLink.OnDragEnd(), ViewBox.OnDragEnd()
static Create( {x,y,width,height}, selNodes=null) {

//debugger;

    const 

        nodeId = 'N' + Math.round( Math.random() * 1000000 ),
        d = {
            node_id: nodeId,
            x,
            y,
            r: 10,
            width,
            height,
            descriptor: `New node: ${nodeId}`,
            is_group: 0,
            selected: 1,
            has_shape: 1,
            hue_id: null,
            node_mass: 20,
            tag: '?',
            legal_text: null,
            img_src: 'tba.svg',
            bg_fill: 'white',
            locked: 0,
            fx: x,
            fy: y
            };
    d.descendants = [d]; 
    d.ancestors = [d];
    Node.AppendDatum(d);
    nodes.push(d);
    mapNodes.set(d.node_id, d);
    AppendLabels();
   
    // TODO    .filter( n is not in d.ancestors ) // prevent circular nesting
    // TODO    .filter( n is not a descendant of any other selected node ) // prevent extra links to nested children
    if ( selNodes ) {
        d.is_group = 1;
        selNodes.data().forEach( n => Link.Create(n,d) ); // each node n is added as child/part of the new node d
        Node.ToFrame(d);
    }
else { // new empty node
Cache.RefreshAllDescendants();    // descendants & ancestors, per node - seems to work now
Cache.RefreshSortedNodes();  // sometimes enough to exclude from frames, why sometimes hang?
Cache.ApplyFrameOrder();

    //    AppendFrameShapes();
    //     AppendLines(); 
    //     AppendLabels();
       RefreshSimData();
    //     if (!frozen) UnfreezeSim();


}
    console.log('Node.Create() return d=',d);
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
    return d3.selectAll(types).filter(e => e === d ); 
}

//-------------------------------------------------------------------------------

static BringToFront( d ) {
  //  console.debug('Node.BringToFront');
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
    return d.r  + 10;
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
// TODO never raise the circle shape to block its label+image group
static OnMouseOver(e,d) {
        mouseover_dom_element = this; 
        mouseover_datum = d;
        mouseover_d3selection = d3.select(this);
   //     mouseover_d3selection.raise(); 

//        console.log('Node.OnMouseOver',d,e,mouseover_d3selection);


    }

//-------------------------------------------------------------------------------

static OnMouseOut(e,d) {

//        console.log('Node.OnMouseOut',d,e,mouseover_d3selection);

    // TODO: when dragging over LinkZone, we lose :hover style. Need to manage .xhover class explicitly when dragging
     if ( Node.DragStartPos || e.button ) {
            return; //  ignore if still dragging 
     }
     if ( mouseover_d3selection ) {
        //console.log(mouseover_d3selection);
            mouseover_d3selection.classed("valid_target",false);
     }

    mouseover_dom_element = null;
    mouseover_datum = null;
    mouseover_d3selection = null;           

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
    // TODO: exclude all descendants of a collapsed group/set i.e if any visible ancestor has Node.ShowAsFrame(d) == False
    try {
    return d.has_shape;
    } catch { debugger }
}


//-------------------------------------------------------------------------------

// see also Frame.ToCircle()
// TODO: DO NOT soft-hide a node until/unless ALL its parents are circles, not Frames
// if one of its parents is collapsed, that H-link will become visible just as for an exploded view

static IsVisible(d) {
    return ( Node.HasShape(d) && d.collapsed_into_node == null);
}

//-------------------------------------------------------------------------------
    static ShowAsFrame(d) {
        try {
        return d.is_group && Node.HasShape(d) && HasVisibleChild(d) && d.collapsed_into_node == null;
        } catch (e) { return false }
    }

//-------------------------------------------------------------------------------

    static ShowAsCircle(d) {
        return Node.HasShape(d) && !Node.ShowAsFrame(d) && d.collapsed_into_node == null;
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

// pre-drop sanity check. If false then the dragging circle c shouild have "no-drop" cursor
    static WouldAcceptChild(n,c) { 
        // TODO : check that n is not a descendant of c (circular)
        // TODO : check that c is not already a child of n (avoid duplicates)
        // IGNORE if n == c OR n.children contains c
        // if new parent is a descendant of old parent or vice versa, then REPLACE the target node
        // else, ADD a new 'H' link
        return true;
    }

//-------------------------------------------------------------------------------

static OnDragStart(e,d) {
    console.log('Node.OnDragStart',e,d,this);

    d.fx = e.x; // fix the node position.. 
    d.fy = e.y;     
    const selThisNode = d3.select(this);
 
   svg.classed('left-mouse-down',true);

   if ( e.sourceEvent.shiftKey ) {
        DraftLink.OnDragStart(e,d,selThisNode);
        }

   else {
        Node.DraggedD3Selection = selThisNode; // .classed("dragging", true); // add special CSS styling
        Node.BringToFront(Node.DraggedD3Selection);
        }

    ticked();
}
//-------------------------------------------------------------------------------

static OnDrag(e,d) {
// TODO: uppdate mouseover ref using document.elementsFromPoint(x, y) - see below

     const [x, y] = d3.pointer(e); // must use screen space, not SVG space

     const hits = document.elementsFromPoint(x, y)
         .filter(el => el instanceof SVGElement);

     const svgElement = hits;
// //    console.log('svgElement',hits, svgElement);

    const selHits = d3.selectAll(svgElement).filter(Node.ShowAsFrame),
        f = selHits.data().at(1); 

        // TODO: If dragged node d is now outside of the innermost locked frame, => "no drop" cursor

/*         const bCanDropHere = 
            Node.WouldAcceptChild(f,d) && 
            ( Node.IsWithinBounds(d) || e.ctrlKey ) // ctrl means 'do the non-default behaviour' typically changing more than just layout/visibility
            ;    // shift means 'don't ask for confirmation'
 */

if ( f ) 
        Node.DraggedD3Selection.classed("no-drop", !Node.WouldAcceptChild(f,d) );

    if ( DraftLink.LineElement ) DraftLink.OnDrag(e);
    else { 
        d.x = d.fx = Math.round(e.x*1000)/1000; // update the x, y as well, so the circle moves even if the simulation is frozen
        d.y = d.fy = Math.round(e.y*1000)/1000;
    }
    ticked();
}

//-------------------------------------------------------------------------------

static OnDragEnd(e,d) {
    console.log('Node.OnDragEnd',e,d,this);

   // d3.select(this).classed('left-mouse-down',false); // because OnDragEnd() blocks mouseup?
        svg.classed('left-mouse-down',false);

   const cursor = window.getComputedStyle(this).cursor;

    const [x, y] = d3.pointer(e); // document.elementsFromPoint must use screen space, not SVG space

    const 
        svgElement = document.elementsFromPoint(x, y)
            .filter(el => el instanceof SVGElement)
        , selHits = d3.selectAll(svgElement)
        , f = selHits.data().at(1); // for now, just the top-most SVG element's datum

    console.log('d3.select(selHits), f,d',selHits,f,d);
    // TODO: drop node d into the intersection of multiple overlapping frames
    // excluding any superset frames

    switch ( cursor ) {

        case 'cell' : 
            if (  Node.ShowAsFrame(f) && Node.WouldAcceptChild(f,d) ) {
                Link.Create(d,f);
                // TODO: make this more efficient
                Cache.RefreshAllDescendants();    // descendants, per node
                Cache.RefreshSortedNodes(); 
                Cache.ApplyFrameOrder();
                }
        break;

        default:
            break;
    }

// TODO : clean up these lines...
    if ( Node.DraggedD3Selection ) {  
      //  Node.DraggedD3Selection.classed("dragging", false);
        Node.DraggedD3Selection = null;
        }

    if ( DraftLink.LineElement ) DraftLink.OnDragEnd(e);

    if ( ! e.sourceEvent.ctrlKey ) {
            d.fx = d.fy = null; // Crtl key => node 'stays put'
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
        // TODO : if the target circle is in foreground it now receives the original click event. We need to prevent that somehow.
        e.sourceEvent.stopImmediatePropagation(); // seems to have no effect

    }

 else if ( !frozen ) {
    UnfreezeSim();
    }

  console.debug('Exit Node.OnDragEnd');
*/
}

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

function ChildrenOf(d) {
    if ( d.inLinks ) {
            return ( d.inLinks.filter( Link.IsHier ).map( e => e.true_source ) )
    } else return [];

}
//-------------------------------------------------------------------------------

function ParentsOf(d) {
    if ( d.ourLinks ) {
            return ( d.outLinks.filter( Link.IsHier ).map( e => e.true_target ) )
    } else return [];

}
//-------------------------------------------------------------------------------

function VisibleChildrenOf(d) {
        return ChildrenOf(d).filter(Node.IsVisible);
}

//-------------------------------------------------------------------------------

function VisibleDescendantsOf(d) {
   return d.descendants.filter( Node.IsVisible ); 
}


