var radius = 8;

// Lookup Node.Colour using SRCE_CDE
var sourcePalette = d3.scaleOrdinal()
    .domain( [ 'G', 'R', 'B', 'M', 'C', 'Y', 'K'])
//    .range( [ 'green', 'red', 'blue', 'magenta', 'cyan', 'yellow', 'black' ] );
    .range( [ '0,255,0', '255,0,0', '0,0,255', '255,0,255', '0,255,255', '255,255,0', '0,0,0' ] );

//-------------------------------------------------------------------------------

class Node {

    static DragStartPos;
    static DraggedD3Selection;
    static DraggedFromD3Selection;
    static DraggedFromParentFrames;


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
        return d.width; 
    }
    //-------------------------------------------------------------------------------

    static Height(d) {
        return d.height; 
    }

    //-------------------------------------------------------------------------------

static InnerRect(d) {
    if (Node.ShowAsFrame(d)) return { 
            left: d.x + Frame.StubWidth(d), 
            top: d.y + Frame.BannerHeight(d),
            right: d.x + d.width - Frame.Margin(d),
            bottom: d.y + d.height - Frame.Margin(d)
    }
    else return OuterRect(d);

}

    //-------------------------------------------------------------------------------

static OuterRect(d) {
    if (Node.ShowAsFrame(d)) return { 
            left: d.x, 
            top: d.y,
            right: d.x + d.width,
            bottom: d.y + d.height
    } 
    else return {
            left: Node.LeftOuter(d),
            top: Node.TopOuter(d),
            right: Node.RightOuter(d),
            bottom: Node.BottomOuter(d)

    }
}

    //-------------------------------------------------------------------------------


static TopInner(d) {
    if ( Node.ShowAsFrame(d) ) return d.y + Frame.BannerHeight(d); 
    else return (Node.Centre(d).x - Node.HalfWidth(d));
}

static TopOuter(d) {
    if ( Node.ShowAsFrame(d) ) return d.y; // already adjusted
    else  return (Node.Centre(d).y - Node.HalfHeight(d));
}

static LeftInner(d) {
    if ( Node.ShowAsFrame(d) ) return d.x + Frame.StubWidth(d); 
    else return (Node.Centre(d).x - Node.HalfWidth(d));
}

static LeftOuter(d) {
    if ( Node.ShowAsFrame(d) ) return d.x; 
    else return (Node.Centre(d).x - Node.HalfWidth(d));
}

static BottomInner(d) {
    if ( Node.ShowAsFrame(d) ) return d.y + d.height - Frame.Margin(d); 
    else return (Node.Centre(d).y + Node.HalfHeight(d));
}

static BottomOuter(d) {
    if ( Node.ShowAsFrame(d) ) return d.y + d.height; 
    else return (Node.Centre(d).y + Node.HalfHeight(d));
}

static RightInner(d) {
    if ( Node.ShowAsFrame(d) ) return d.x + d.width - Frame.Margin(d); 
    else return (Node.Centre(d).x + Node.HalfWidth(d));
}

static RightOuter(d) {
    if ( Node.ShowAsFrame(d) ) return d.x + d.width; 
    else return (Node.Centre(d).x + Node.HalfWidth(d));
}

    //-------------------------------------------------------------------------------

    static HalfWidth(d)  {  // horizontal distance from centre to left/right edge
        return d.width/2 ;
    }

    //-------------------------------------------------------------------------------

    static HalfHeight(d)  {  
        return d.height/2 ;
    }

   //-------------------------------------------------------------------------------

    static ContactPoint(d,theta) {  

        if ( Node.HasMembers(d) ) { 
            return RectNode.ContactPoint(d,theta);
        } else {
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
        <div class="item"><b>${d.tag}</b></div>
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
            // DEBUG: if the element is already in foreground, the whole event happens twice 
            // appearance is the toggle doesn't happen 
            // EndDrag event happens AND the OnClick ) 

        const cursor = window.getComputedStyle(this).cursor;

        switch ( cursor ) {

            case 'zoom-in' : // implies we know there are child nodes i.e. Node.HasMembers(d)
                Node.ToFrame(d);
                Frame.SetCentroid(d,d3.pointer(k,selViewport.node()),true);
                Node.Activate([d]);
                break;

            default: // toggle foreground/selected status
                d.selected ^= 1;
                Node.Activate([d],d.selected);
                clicked_d3selection // should be the 'whole' <g>
                    .classed('selected', d => d.selected);
                if (!d.selected) { // deselection always propagates to all links, even collapsed nodes
                    const links_to_be_deselected = links.filter(lnk => { return ( lnk.source === d || lnk.target === d ) } );
                    Link.Activate(links_to_be_deselected,0);
                }


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

    static OnTick() { 
        gAllNodes
            .selectAll('.whole')
            .attr('transform',d => `translate(${d.x},${d.y})`);
        }

//-------------------------------------------------------------------------------

    static TransformImageElement(d) { return d.img_transform; }

//-------------------------------------------------------------------------------

    static TransformClippedImage(d) { 
        // resize in sync with radius, even for rect nodes

        const 
            w = Node.Width(d), h = Node.Height(d), // cater for rectangular frames as well as circular nodes
            r = h < w ? h/2 : w/2, // scale to fit inside smaller dimension of the label
            scale = r / CROP_CIRCLE_RADIUS, 
            offset = -r;
        return `translate(${offset}, ${offset}) scale(${scale})`;
}

//-------------------------------------------------------------------------------
// TODO:  handle case where node d is an element of the intersection A 
//      and more than one of those supersets is collapsed to an apparent circle
   
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

// TODO: unhide ALL immediate children in their current state (collapsed or expanded)
// (Frame.ToCircle() will hide ONLY the immediate children that have NO OTHER expanded parent Euler contour (visible or cloaked)

// TODO: for a locked+collapsed rect, do NOT rely on its position on screen when deciding whether it's a child subframe.
// its location is fixed/arbitrary and does not IMPLY membership of that 'containing' zone/contour
// (however, it MAY be a member that DOES influence the floating contour. All depends on data )

static ToFrame(d) {

    console.log('Node.ToFrame(d)',d);

    if ( Node.HasMembers(d) || d.locked ) {
        d.is_group = 1;
        d.has_shape = 1; 
        d.width = d.savedWidth;
        d.height = d.savedHeight;

        d.descendants 
            .filter(c => c != d ) 
            // TODO: c.collapsed_into_node should be ALL the apparent circles that include node c ?
            .filter( c => c.collapsed_into_node == d ) // only unpack these ones, NOT every descendant
            .forEach( c => { 
                c.collapsed_into_node = null; 
                // ask both 'true' end nodes for their lowest VISIBLE ancestor
                c.inLinks.forEach( lnk => { lnk.target = Node.ApparentCircle(lnk.true_target); } );
                c.outLinks.forEach( lnk => {lnk.source = Node.ApparentCircle(lnk.true_source); } );
                });

        Cache.RefreshAllDescendants();
        Cache.RefreshSortedNodes(); 
        Cache.ApplyFrameOrder();                

        AppendFrameShapes();
        AppendNodes();
        AppendLines(); 
        RefreshSimData();
        if (!frozen) UnfreezeSim();
    }
}

   //-------------------------------------------------------------------------------

static OnDblClick(e,d) {
    Node.ToFrame(d);
    Frame.SetCentroid(d,d3.pointer(e,selViewport.node()),true);
    Node.Activate([d]);
    ticked();
}

//-------------------------------------------------------------------------------

static AppendDatum(d) {
    d.charge = 10; 
    d.cogX = 0;
    d.cogY = 0;
    d.weight = 0.2;
    //  d.r = Math.sqrt(d.mass) * radius / 10; // size proportional to weight
    d.r = 16; 
    d.width = 2 * d.r;
    d.height = 2 * d.r;
    d.selected = 0;
    d.show_label = 1; // default to showing labels
    d.has_shape = 1; // 1 <=> node should be bound to a DOM element (visible or not) 
    d.collapsed_into_node = null;
    d.is_group = 0;
    d.outLinks = [];
    d.inLinks = [];
    d.descendants = [d];
    d.ancestors = [d];
    d.locked = 0; 
    d.x = d.y = 0;
    if (!d.bg_fill) d.bg_fill = 'white';
    if (!d.img_src) d.img_src = 'tba.svg';
    return d;
}

//-------------------------------------------------------------------------------
// called by DraftLink.OnDragEnd(), ViewBox.OnDragEnd()
static Create( {x,y,width,height}, selNodes=null) {

//debugger;

    const d = Node.AppendDatum({ node_id : 'N' + Math.round( Math.random() * 1000000 ) });
    if (x) { d.cogX = d.x = x; d.cogY = d.y = y; }
    if (width) { d.width = width; d.height = height; d.r = width/2; };
    Node.Activate([d]); 

    nodes.push(d);
    mapNodes.set(d.node_id, d);
    AppendNodes();
   
    // TODO    .filter( n is not in d.ancestors ) // prevent circular nesting
    // TODO    .filter( n is not a descendant of any other selected node ) // prevent extra links to nested children
    if ( selNodes ) { 
        d.is_group = 1;
        selNodes.data().forEach(n => Link.Create(n,d)); // each node n is added as child/part of the new node d
        Node.ToFrame(d);
        Node.Activate([d]);
    }
else { // new empty node
Cache.RefreshAllDescendants();    // descendants & ancestors, per node - seems to work now
Cache.RefreshSortedNodes();  // sometimes enough to exclude from frames, why sometimes hang?
Cache.ApplyFrameOrder();

    //    AppendFrameShapes();
    //     AppendLines(); 
    //     AppendNodes();
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

static BringToFront(d) {
  //  console.debug('Node.BringToFront');
     Node.GetD3Selection(d).raise(); 
}

//-------------------------------------------------------------------------------

static Centre(d) {
    if ( Node.ShowAsFrame(d) ) return Frame.Centre(d); // DIY polymorphism
    else return { 'x': d.x, 'y': d.y };  
}

//-------------------------------------------------------------------------------

static CollideRadius(d) { // called by d3.forceCollide().radius(...)
    //return d.r + 20; // +3 = extra to allow for stroke-width of circle element 
    return d.r  + 4;
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
    // to decide whether this node's circle is in scope of Simulation.forceEuler()
    return d.has_shape && Node.ShowAsCircle(d);
    }

//-------------------------------------------------------------------------------

static ParentsOf(d) {
    return d.outLinks
        .filter(Link.IsHier)
        .map(e => e.target);
}

//-------------------------------------------------------------------------------

static LockedParentFramesOf(d) {
    return d.outLinks
        .filter(Link.IsHier)
        .map(e => e.target)
        .filter(f => f.is_group) // not collapsed
        .filter(f => f.locked) 
        ;
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
    return d.has_shape;
}


//-------------------------------------------------------------------------------

// see also Frame.ToCircle()
// TODO: DO NOT soft-hide a node until/unless ALL its parents are circles, not Frames
// if some of its parents are collapsed, those H-links will become visible just as for an exploded view

static IsVisible(d) {
    return ( Node.HasShape(d) && d.collapsed_into_node == null);
}

//-------------------------------------------------------------------------------
    static ShowAsFrame(d) {
        try {
        return d.is_group 
            && Node.HasShape(d) 
            && ( d.locked || HasVisibleChild(d) ) 
            && d.collapsed_into_node == null;
        } catch (e) { return false }
    }

//-------------------------------------------------------------------------------

    static ShowAsCircle(d) {
        return Node.HasShape(d) 
            && !Node.ShowAsFrame(d) 
            && d.collapsed_into_node == null;
    }

//-------------------------------------------------------------------------------

    static IsActive(d) { // participates in force simulations
        return Node.ShowAsCircle(d) && ( d.selected || Simulation.IncludeCloakedElements );
    }

    static HasMembers(d) { // typically, a circle that represents a collapsed (non-empty) set
        return ChildrenOf(d).length > 0 ;
    }

    static IsLeaf(d) { // visible or not, but still affects the simulation (directly or via rollup subtotal)
        return ChildrenOf(d).length == 0 ;
    }

// pre-drop sanity check. If false then the dragging circle c shouild have "no-drop" cursor
    static WouldAcceptAsChild(n,c) { 
        // TODO : check that n is not a descendant of c (circular)
        // TODO : check that c is not already a child of n (avoid duplicates)
        // TODO : what kind of predicate will we be creating? 
        // IGNORE if n == c OR n.children contains c
        // if new parent is a descendant of old parent or vice versa, then REPLACE the target node
        // else, ADD a new 'H' link
        return true;
    }

//-------------------------------------------------------------------------------

    static PreferredZone(d) {
        // return the coords of a rect that represents the intersection of INNER rects for 
        // node d's parent frames (if any) that are locked and material/real
        // if there's no such overlap then drop constraints one by one until a candidate is found.
        return null;    
    const 
        lpf = Node.LockedParentFramesOf(d),
        //rlist = lpf.forEach(f => )

     //   Node.InnerRect(d.target),

        p = Node.InnerRect(d.target),
        left =  c.left < p.left ? p.left : 
                c.right > p.right ? p.right - Node.OuterWidth(d.source) :
                c.left,
        top =   c.top < p.top ? p.top :
                c.bottom > p.bottom ? p.bottom - Node.OuterHeight(d.source) :
                c.top,
        x = left + Node.HalfWidth(d.source),
        y = top + Node.HalfHeight(d.source);

    return { x, y };
    }

//-------------------------------------------------------------------------------

    static PreferredCentroid(n) {
        // given its current location, what's the nearest centroid for node n within Node.PreferredZone(n)
        // adjusting for the size & shape of n so that n would appear fully inside that zone
        // or at least not crossing the zone's top & left boundaries (in case they're banner & stub edges) 

        const pz = Node.PreferredZone(n);
        if (pz) {
            const 
                c = Node.OuterRect(n),
                left = c.left < pz.left ? pz.left : 
                    c.right > pz.right ? pz.right - Node.OuterWidth(n) :
                    c.left,
                top = c.top < pz.top ? pz.top :
                    c.bottom > pz.bottom ? pz.bottom - Node.OuterHeight(n) :
                    c.top,
                x = left + Node.HalfWidth(n),
                y = top + Node.HalfHeight(n);
            return {x,y};
        } 
        else // no preferred zone 
            return Node.Centre(n);


    }
//-------------------------------------------------------------------------------

static OnDragStart(e,d) {
    const selHits = ViewBox.HitTestSelection(e);
   console.log('Node.OnDragStart',e,d,this,selHits);

    d.fx = e.x; // fix the node position.. 
    d.fy = e.y;     
    const selThisNode = d3.select(this);
 
   svg.classed('left-mouse-down',true);

   if ( e.sourceEvent.shiftKey ) {
        DraftLink.OnDragStart(e,d,selThisNode);
        }

   else {
        Node.DraggedFromD3Selection = selHits;
        Node.DraggedFromParentFrames = Node.DraggedFromD3Selection
            .filter(Node.ShowAsFrame)
            .filter(f => ChildrenOf(f).includes(d))
            .data();
        Node.DraggedD3Selection = selThisNode.classed("dragging", true); 
   //     console.log('OnDragStart: Node.DraggedFromD3Selection',selHits, Node.DraggedFromD3Selection, Node.DraggedFromParentFrames );
        Node.BringToFront(Node.DraggedD3Selection);
        }

    ticked();
}
//-------------------------------------------------------------------------------

static OnDrag(e,d) {
// TODO: uppdate mouseover ref using HitTestSelection - see below

// TODO: check if droppable at this location. If not, then set class so node d appears grey with 'no-drop' cursor
// for example, if the target dropzone coincides with another unrelated frame.  
// Override this by pressing Ctrl key and it displays as droppable cursor & colour? (i.e. creates a non-empty intersection)

if ( false ) {
    const 
        selHits = ViewBox.HitTestSelection(e).filter(Node.ShowAsFrame),
        f = selHits.data().at(1); 

        // TODO: If dragged node d is now outside of the innermost locked frame, => "no drop" cursor

/*         const bCanDropHere = 
            Node.WouldAcceptChild(f,d) && 
            ( Node.IsWithinBounds(d) || e.ctrlKey ) // ctrl means 'do the non-default behaviour' typically changing more than just layout/visibility
            ;    // shift means 'don't ask for confirmation'
 */

if ( f ) 
        Node.DraggedD3Selection.classed("no-drop", !Node.WouldAcceptAsChild(f,d) );
}

    if (DraftLink.LineElement) DraftLink.OnDrag(e);
    else { 
        // update the x, y as well, so the circle moves even if the simulation is frozen
        d.x = d.fx = Math.round(e.x*1000)/1000; 
        d.y = d.fy = Math.round(e.y*1000)/1000;
    }
    ticked();
}

//-------------------------------------------------------------------------------
// TODO: for a locked+collapsed rect, do NOT rely on its position on screen when deciding whether it's a child.
// its location is fixed/arbitrary and does not IMPLY membership of that 'containing' zone/contour
// (however, it MAY be a member that DOES influence the floating contour. All depends on data)

static OnDragEnd(e,d) {

    console.log('Node.OnDragEnd',e,d,this);
    svg.classed('left-mouse-down',false);  // because OnDragEnd() blocks mouseup
    const cursor = window.getComputedStyle(this).cursor;

    const 
        selHits = ViewBox.HitTestSelection(e)
            .filter(Node.ShowAsFrame)
            .filter(f => Node.WouldAcceptAsChild(f,d)),
        valid_recipients  = selHits.data(); 

        // TODO exclude 'grandparent' recipients with a descendant in selHits

  console.log('Node.OnDragEnd(e,d) selHits,f,d',selHits,valid_recipients,d);
    // TODO: drop node d into the intersection of multiple overlapping Euler regions
    // BUT EXCLUDING any superset regions

// set the dropped node's COG to current pointer x,y
//UNLESS we've been dragging a new link.. 
 if (!DraftLink.LineElement) {
    //const [x,y] = d3.pointer(e,selViewport.node());
    const {x,y} = Node.PreferredCentroid(d);  // in case there are locked frames to consider
    d.cogX = x; 
    d.cogY = y;

    simulation
        .force('cogX',d3.forceX(Node.COGX)
            .strength(Node.ForceX))
        .force('cogY',d3.forceY(Node.COGY)
            .strength(Node.ForceY));
 }


    switch (cursor) {

       // case 'cell' : 
        default:
            if (e.sourceEvent.shiftKey) { //shiftkey 'feels right' here
                
                if (Node.DraggedFromParentFrames) { // remove old links
                    // disconnect node from any parent frames captured at start of drag
                    const links_to_be_deleted = links
                        .filter(Link.IsHier)
                        .filter(lnk => lnk.source === d) 
                        .filter(lnk => Node.DraggedFromParentFrames.includes(lnk.target));
                    Cache.DeleteLinks(links_to_be_deleted);
                } 
// TODO: DEBUG - is this where new duplicated links are sometimes created?
                // create new hierarchical links - use the default 'nestable predicate' of each f
                valid_recipients.forEach(f => Link.Create(d,f));
                // TODO: make this more efficient
                Cache.RefreshNodeInOutLinks(); // important!
                Cache.RefreshAllDescendants();    // descendants, per node
                Cache.RefreshSortedNodes(); 
                Cache.ApplyFrameOrder();
                AppendLines();

                RefreshSimData();
            }
        break;
    }

// TODO : clean up these lines...
    if (Node.DraggedD3Selection) {  
        console.log('OnDragEnd: Node.DraggedFromD3Selection, Node.DraggedFromParentFrames',Node.DraggedFromD3Selection, Node.DraggedFromParentFrames );
        Node.DraggedD3Selection.classed("dragging", false);
        Node.DraggedD3Selection = null;
        Node.DraggedFromD3Selection = null;
        Node.DraggedFromParentFrames = null; 
        }

    if (DraftLink.LineElement) DraftLink.OnDragEnd(e);

    if ( ! ( e.sourceEvent.ctrlKey || d.locked ) ) {
            d.fx = d.fy = null; // locked or Crtl key => node 'stays put'
        }

    ticked();

}

//-------------------------------------------------------------------------------

static Activate(arr,status=1) {
    arr.forEach(n => n.selected = status); 
    if (arr && arr.length) {
        d3.selectAll('.node.whole, .region.whole')
        .filter(n => arr.includes(n))
        .classed('selected',true)
        ;
        }
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

function ChildrenOf(d) {
    if (d.inLinks) {
            return (d.inLinks.filter(Link.IsHier).map(e => e.true_source))
    } else return [];

}
//-------------------------------------------------------------------------------

function ParentsOf(d) {
    if (d.ourLinks) {
            return (d.outLinks.filter(Link.IsHier).map(e => e.true_target))
    } else return [];

}
//-------------------------------------------------------------------------------

function VisibleChildrenOf(d) {
        return ChildrenOf(d).filter(Node.IsVisible);
}

//-------------------------------------------------------------------------------

function VisibleDescendantsOf(d) {
   return d.descendants.filter(c => c != d).filter(Node.IsVisible); 
}

//----------------------------------------------------------------

function AppendNodes() {

gAllNodes.selectAll('g').remove(); // otherwise we get duplicates on data refresh
// which seems odd, i thought join('g') would handle all that

const selWholeNodes = gAllNodes.selectAll('g') 
    .data( nodes
            .filter(Node.ShowAsCircle) 
            .filter(Node.IsVisible) // to be improved using d.collapsed_into_node
          ,Node.UniqueId)  
    .join('g') 
        .attr('id',Node.UniqueId)
        .classed('node whole',true)
        ;

selWholeNodes
    .classed('empty',Node.IsLeaf)
    .classed('selected',d => d.selected)
    .classed('locked',d => d.locked)
    .on('mouseover',Node.OnMouseOver) 
    .on('mouseout',Node.OnMouseOut) 
    .on('click',Node.OnClick)
    .on('dblclick',Node.OnDblClick)
    .on('contextmenu',Node.OnContextMenu)
    .call(d3.drag()
        .on('start', Node.OnDragStart)
        .on('drag', Node.OnDrag)
        .on('end', Node.OnDragEnd)  
        )
        ;

selWholeNodes
    .filter(Node.HasMembers)
    .append('rect')
        .classed('contour',true)
        .attr('x',d => -d.r)
        .attr('y',d => -d.r * 0.75)
        .attr('width',d => d.r * 2)
        .attr('height',d => d.r * 1.5)
        .attr('fill',Node.FillColour);

selWholeNodes
    .filter(Node.IsLeaf)
    .append('circle')
        .classed('circle',true)
        .attr('r',Node.Radius)
        .attr('fill',Node.FillColour);

selWholeNodes
    .filter(d => d.img_src > "" )
    .append('g') 
        .classed('image clipped',true)
        .attr('transform',Node.TransformClippedImage) // scale changes with every mouse wheel event
        .attr('clip-path',d => Node.HasMembers(d) ? 'url(#cropContour)' : 'url(#cropCircle)')
        .append('image') 
            .classed('image raw',true)
            .attr('href',d => d.img_src)
            .attr('width',CROP_CIRCLE_DIAMETER)
            .attr('height',CROP_CIRCLE_DIAMETER)
            .attr('transform', Node.TransformImageElement)  // one-time, position and scale the image relative to its crop circle
            ;


}

//----------------------------------------------------------------

// generic clip path for jpg/svg inside node circles, before dynamic re-sizing
// 

//const CROP_CIRCLE_CX = 150, CROP_CIRCLE_R = 150;

const 
    CROP_CIRCLE_RADIUS = 150, 
    CROP_CIRCLE_DIAMETER = CROP_CIRCLE_RADIUS * 2,
    cropCircle = defs
        .append("clipPath")
            .attr("id","cropCircle") 
            .append("circle")
                .attr("cx",CROP_CIRCLE_RADIUS) 
                .attr("cy",CROP_CIRCLE_RADIUS)
                .attr("r",CROP_CIRCLE_RADIUS),
    cropContour = defs
        .append("clipPath")
            .attr("id","cropContour") 
            .append("rect")
                .attr("width",CROP_CIRCLE_DIAMETER) 
                .attr("height",CROP_CIRCLE_DIAMETER*0.75)
                   
    ;
