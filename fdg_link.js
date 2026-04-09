var links = [];
class Link {


    static UniqueId(d) {
        return d.id;
    }

//-------------------------------------------------------------------------------

static AppendDatum(d,i) {
    d.source = Node.GetFromID(d.from_node_id);
    d.target = Node.GetFromID(d.to_node_id);
    d.distance = 20; 
    d.strength = 0; 
    d.opacity = (2 + Math.random()) / 3 ;
    d.id = 'L' + Math.round( Math.random() * 1000000 ); // unique identifier
    return d;
}

//-------------------------------------------------------------------------------

    static Create(child, parent) {
        console.log('Link.Create(child, parent)',child,parent)
    // create a new hierarchical link from child 'belongs to' parent
    // TODO:  skip if child is already a member of parent, or if parent is already an ancestor of child (to prevent circular nesting)
    const newLink = {
        source: child,
        target: parent, 
        true_source: child, 
        true_target: parent,
        to_node_id: parent.node_id,
        from_node_id: child.node_id,
        type_cde: "H",
        distance: 20,
        strength: 0, 
        id: 'L' + Math.round( Math.random() * 1000000 ),
        descriptor: null,
        opacity: 1,
        tag: 'belongs to'
    };
    links.push(newLink);
    child.outLinks.push(newLink);
    parent.inLinks.push(newLink);
}

//-------------------------------------------------------------------------------

// Given a link datum, get the coordinates of both endpoints, plus the visual midpoint
// various uses eg to populate attributes for a line or polyline shape

static PolyLinePointTuple( d ) {

    const 
        cp = Link.ContactPoints(d),
        // visual midpoint = half-way along the visible line segment
        xMid = ( cp.p0.x + cp.p1.x ) / 2,
        yMid = ( cp.p0.y + cp.p1.y ) / 2;

    return { 'start': { 'x': cp.p0.x , 'y': cp.p0.y },
             'mid' :  { 'x': xMid,     'y': yMid },
             'end':   { 'x': cp.p1.x , 'y': cp.p1.y  }
            };
}
//-------------------------------------------------------------------------------
// generate a string in the required format for SVG "polyline"
static PolyLinePointString( d ) {
    const t = Link.PolyLinePointTuple(d);
    return `${t.start.x},${t.start.y} ${t.mid.x},${t.mid.y} ${t.end.x},${t.end.y}`
}

//-------------------------------------------------------------------------------

static StrokeColour(d) { 
    return `rgb(${sourcePalette(d.hue_id)})`;

   let rgb = ( d.selected ) ? sourcePalette( d.hue_id ) :
        d == mouseover_datum ? '0,0,0' : '192,192,192'; // black or grey if not selected

   let alpha = ( d == mouseover_datum ) ? 1 : d.opacity;

   //   But, cleaner looking arrow+line if opacity stays at 1
   return `rgba(${rgb},${alpha})`;

}

//-------------------------------------------------------------------------------

static FillColour(d) { // drives arrowhead colour
    return Link.StrokeColour(d);
}

//-------------------------------------------------------------------------------
// eg to distinguish 'corroborated' vs 'tentative' connections

static Opacity(d) {
    return d.opacity;
}

//-------------------------------------------------------------------------------

static StrokeWidth(d) { // stroke-width of visible polyline
      return d.link_mass ? d.link_mass / 20 : 1; // TODO: need a better formula for link mass => stroke width
}

//-------------------------------------------------------------------------------

static TitleText(d) {
// TODO: in case either node is stacked look for any links that are obscured by this one and display their info too
    try {
        return d.descriptor + '\n\nFrom: ' + Node.TitleText(d.true_source) + '\n\nTo: ' + Node.TitleText(d.true_target);
    } catch (e) { console.log(e);  };
}

//-------------------------------------------------------------------------------
// how rigidly the distance is enforced
static Strength(d) {  // callback for d3.forceLink()
    return 0 ; // no effect, by default
}

//-------------------------------------------------------------------------------

static Distance(d) { // callback for d3.forceLink()
    return 0; //d.distance;
}

//-------------------------------------------------------------------------------

static OnTick() {
   gAllEdges.selectAll('polyline')
       .attr('points',Link.PolyLinePointString); 
}

 //-------------------------------------------------------------------------------

 static IsHier(d) {
    return ( 'H' == d.type_cde );
}

//-------------------------------------------------------------------------------
// TODO: are there any non-hierarchical "circle-within-frame" links that should be hidden?
static ShowAsLine(d) {
// only non-hierarchical links are visible when current target is a frame
    if ( Node.ShowAsFrame(d.target) && Link.IsHier(d) ) return false;
    else return ( Node.IsVisible(d.source) && Node.IsVisible(d.target) );
}
//-------------------------------------------------------------------------------
// Exclude self-self links (eg a collapsed frame linking to itself)

// Render a line from source to target UNLESS it's a 'H' link and target is showing as a frame rect.
// TODO: DO NOT soft-hide a node until/unless ALL its parents are circles, not Frames

static VisibleLine(d) {
    if ( Link.IsHier(d) && Node.ShowAsFrame(d.target) ) return false;
    return ( Link.ShowAsLine(d) && ( d.target != d.source ));

}
//-------------------------------------------------------------------------------
// generalised formula: aX + bY + c = 0 (immune to divide-by=zero)
// NOT USED - instead use theta 
static LineGeneralForm(d) {
    const 
        cDest = Node.Centre(d.target),
        cOrig = Node.Centre(d.source),
        a = cOrig.y - cDest.y,
        b = cDest.x - cOrig.x,
        c = -(a * cOrig.x + b * cOrig.y);

  return { a, b, c };
}

//-------------------------------------------------------------------------------

// geometry we can pre-compute once per link, before nodes find the intersection with their own boundary
// NOTE we stick with screen coordinates througout, so 'top' y is less than 'bottom' y (and angle is flipped accordingly)

static Theta(c0,c1) {

const
    dx = c1.x - c0.x,
    dy = c1.y - c0.y,
    theta_out = Math.atan2( dy,  dx),
    theta_in =  Math.atan2(-dy, -dx),
    deg_out = theta_out * (180 / Math.PI), // range [-180,+180] 
    deg_in = theta_in * (180 / Math.PI) // range [-180,+180] 
    ; 
        
const info = 
{
    c0, c1, dx, dy, theta_in, theta_out, deg_out, deg_in
};

return info;

}

//-------------------------------------------------------------------------------
static ContactPoints(d) {

    const 
    c0 = Node.Centre(d.source), 
    c1 = Node.Centre(d.target),
    t =  Link.Theta(c0,c1),
    p0 = Node.ContactPoint(d.source,t.theta_out),
    p1 = Node.ContactPoint(d.target,t.theta_in); 
    return { p0, p1 };
    }


//-------------------------------------------------------------------------------
// list all links that connect the same pair of nodes, in either direction

static Matches(d) {

    return links.filter( e => 
    (e.source == d.source && e.target == d.target) || 
    (e.source == d.target && e.target == d.source)
 )

}

//-------------------------------------------------------------------------------

static SwapEnds(d) {
    const tt = d.true_target, t = d.target;
    d.true_target = d.true_source;
    d.target = d.source;
    d.true_source = tt;
    d.source = t;
    d.descriptor = 'R:' + d.descriptor;
}

//-------------------------------------------------------------------------------
// force link Y to "take a detour" via node X (e.g. when X is a new elbow connector)

static InsertNode(lnk,node) {
    console.log('Link.InsertNode(lnk,node)',lnk,node);
    const new_lnk = { ...lnk };
    new_lnk.id =  'L' + 100000 + Math.round( 100000 * Math.random() );

    console.log('Bind new_link.source & true_source to node');
    new_lnk.source = new_lnk.true_source = node;

    console.log('Bind (old) link.target & true_target to node');
    lnk.target = lnk.true_target = node;

    links.push(new_lnk);

    }

//-------------------------------------------------------------------------------

static Activate(arr, status=1) {
    gAllEdges
        .selectAll('.whole')
        .filter(lnk => { return arr.includes(lnk) } )
        .classed('selected',status)
        .each(lnk => lnk.selected = status)
        ; 

    if (status) // selection ALWAYS propagates to both ends of each link
        arr.forEach(lnk => Node.Activate([lnk.source,lnk.target]));

    return status;

}

//-------------------------------------------------------------------------------

}
//-------------------------------------------------------------------------------

function IsActiveLink(d) {
    return true;
}

//=====================================================================================================================

function AppendLines() {

const selWholeEdges =
    gAllEdges.selectAll('.whole') 
        .data(Cache.VisibleLines(),Link.UniqueId)
        .join('g')
        .attr('id',Link.UniqueId)
        .classed('edge whole',true)
        .classed('selected',d => d.selected)
        .on('click',LinkZone.OnClick)
        .on('mouseover',LinkZone.OnMouseOver)
        .on('mouseout',LinkZone.OnMouseOut)
        .on('mousedown',ViewBox.OnMouseDown)
        .on('mouseup',ViewBox.OnMouseUp)
        .on('contextmenu',LinkZone.OnContextMenu)
        .call(d3.drag()
            .on('start',LinkZone.OnDragStart)
            .on('drag',LinkZone.OnDrag)
            .on('end',LinkZone.OnDragEnd)  
            ) 
        ;

const selNewEdges = selWholeEdges.filter( function() { return this.children.length === 0 } ) ;

selNewEdges.append('polyline')
        .classed('edge line arrow',true)         
        .style('stroke-width',Link.StrokeWidth)
        .style('stroke',Link.StrokeColour)
        .style('fill',Link.FillColour); // for the arrowhead

// edge zone ensures a clickable width of at least n pixels as defined in CSS
selNewEdges.append('polyline')
        .classed('edge zone',true); // CSS handles everything

}


//=====================================================================================================================

class LinkZone extends Link {


//-------------------------------------------------------------------------------

static StrokeWidth(d) { // width of extended click zone

        return Link.StrokeWidth(d) + 8;

}

//-------------------------------------------------------------------------------
// Given an arbitrary clickpoint p=(x,y), decide which of the link's pair of connection points is nearer (free to move) vs farther (fixed)
// useful for copy+paste or cut+paste while preserving all relevant attributes except for the disconnected node

static ChooseEnds(d,[x,y]) {

    const 
    
    cp = Link.ContactPoints(d),  // p0, p1 

    h0 = Math.hypot(cp.p0.x - x, cp.p0.y - y),
    h1 = Math.hypot(cp.p1.x - x, cp.p1.y - y),
    
    s = { 
        node: d.source,
        point: cp.p0,
        class: 'fixed-source',
        end: 'source' },
    t = {
        node: d.target,
        point: cp.p1,
        class: 'fixed-target',
        end: 'target' }
        ;
//console.log([x,y],cp,h0,h1);
    return ( h0 > h1 ) ? { far: s, near: t } : { far: t, near: s };

}

//-------------------------------------------------------------------------------

static OnClick(e,d) {

    // CAVEAT this event is ONLY AND ALWAYS fired after OnDragEnd, even if there was no actual drag movement.
    // Therefore we put most of the logic into OnDragEnd() 

    d.selected ^= 1;
    Link.Activate([d],d.selected);

    ticked();
}

//-------------------------------------------------------------------------------

static OnMenuItemClick(e,d) {
    console.log('LinkZone.OnMenuItemClick',e,e.target);
}

//-------------------------------------------------------------------------------

static OnContextMenu(event,d) {

    event.preventDefault();

    const a = Link.Matches(d);

    const sub = a.map( lnk => `<div class="item">${lnk.true_source.tag} ${lnk.tag} ${lnk.true_target.tag}: ${lnk.descriptor}</div>`).join("\n");


    menu
      .style("display", "block")
      .style("left", event.pageX + "px")
      .style("top", event.pageY + "px")
      .html(`
        <div class="item"><b>Link: ${d.source.tag} ↔ ${d.target.tag}</b> (${a.length})</div>${sub}`)
      .on('click',LinkZone.OnMenuItemClick)
      ;

}

//-------------------------------------------------------------------------------

static Hover( d, bHovering ) {

    if ( Node.DragStartPos ) return; // don't react if user is dragging a circle
 
    gAllEdges.selectAll('.line') //  TODO change to single select()
        .filter( p => p == d ) // bound to the same datum 
        .classed( 'xhover', bHovering ) // for CSS dash-array
        // TODO surely there's a clearer way to set mouseover_datum = d
        .each(d => { mouseover_datum = bHovering ? d : null })
        .style('stroke', Link.StrokeColour )  
        .style('fill', Link.FillColour );  // for arrowhead

    gAllNodes.selectAll('.whole.node')
        .filter( c => c == d.source || c == d.target )
        .classed( 'xhover', bHovering );

    gAllRegions.selectAll('.whole.region') 
        .filter( r => r == d.source || r == d.target )
        .classed( 'xhover', bHovering );
        // TODO : apply to all nested frames and circles
}

//-------------------------------------------------------------------------------

static OnMouseOver(e,d) {
    LinkZone.Hover( d, true );
}

//-------------------------------------------------------------------------------

static OnMouseOut(e,d) {
    LinkZone.Hover( d, false );
}

//---------------------------------------------------------------------------

static OnDragStart(e,d) { 
  Link.dragged = false;
  const style = window.getComputedStyle(this);
  const p = d3.pointer(e,selViewport.node());

    switch ( style.cursor ) {

        case 'grabbing' : 
            // un-hitch whichever end is nearer the mouseclick
            const ends = LinkZone.ChooseEnds(d,p);
            // TODO: replace 'circle,rect' with '.whole' ?
            const selFixedNode = d3.select('circle,rect').filter(n => n == ends.far.node );
            DraftLink.OnDragStart(e, ends.far.node, selFixedNode, d );
            // TODO temporarily hide the existing 'link whole' 
            break;

    }
    ticked();
}
//---------------------------------------------------------------------------
static OnDrag(e,d) {
    Link.dragged = true; // it moved
    DraftLink.OnDrag(e);
}
//---------------------------------------------------------------------------
static OnDragEnd(e,d) {
    DraftLink.OnDragEnd(e);
    ticked();

}


//-------------------------------------------------------------------------------




}

class DraftLink {

static FromD3Selection;
static FromDatum;
static LineElement;
static OrigLinkDatum; // the link we will be updating at the end, if all goes well


//-------------------------------------------------------------------------------
// Use this eg when drafting a semi-detached line, from a node to the pointer's current (x,y) coords
static EndPoints(from_node,to_point) {

    const 
        c = Node.Centre(from_node), 
        t = Link.Theta(c,to_point),
        from_cp = Node.ContactPoint(from_node,t.theta_out);
    return { p0: from_cp, p1: to_point };
    }

//-------------------------------------------------------------------------------

static OnDragStart(e,dFromNode,selFromNode,dOrigLink=null) {

    // TODO: set CSS classes (and cursor shapes) for all layers, according to whether drop is allowable
    console.log('DraftLink.OnDragStart',e,dFromNode,selFromNode);
    DraftLink.FromD3Selection = selFromNode.classed("drafting", true); 
    DraftLink.FromDatum = dFromNode;
    DraftLink.OrigLinkDatum = dOrigLink;
    const p = Node.Centre(dFromNode);
    DraftLink.LineElement = gForeground
        .append('line')
        .attr('x1', p.x)
        .attr('y1', p.y)
        .attr('x2', p.x) // zero length from centre of start node
        .attr('y2', p.y)
        .classed('drafting',true)
    ;

}

//-------------------------------------------------------------------------------

static OnDrag(e) {
        
    if ( mouseover_d3selection == DraftLink.FromD3Selection ) return; // exclude starting circle

    if ( mouseover_datum && "node_id" in mouseover_datum )  {
        // "snap to" draw draft line between pair of contact points
            mouseover_d3selection.classed("valid_target",true); // this could be done in advance, in OnDragStart()
            const draft_link = { source: DraftLink.FromDatum, target: mouseover_datum };
            var cp = Link.ContactPoints(draft_link) ;
        } 
    else { // not hovering over a node => redraw semi-detached line to end at pointer position
            const [x,y] = d3.pointer(e,selViewport.node()),
            p = {x,y};
            var cp = DraftLink.EndPoints(DraftLink.FromDatum,p); 
        }

    DraftLink.LineElement
        .attr('x1', cp.p0.x)
        .attr('y1', cp.p0.y)
        .attr('x2', cp.p1.x)
        .attr('y2', cp.p1.y);

}

//-------------------------------------------------------------------------------

static OnDragEnd(e) {

    // TODO: use cursor shape to decide whether to drop or ignore
    // then clear all temp classes
    console.log('DraftLink.OnDragEnd(e)',e);

    const [x,y] = d3.pointer(e,selViewport.node());

    if ( e.sourceEvent.shiftKey ) { // bypass confirmation prompt, go ahead & commit

        const lnk = {
            true_source: DraftLink.FromDatum,
            source: DraftLink.FromDatum,
            id: 'L' + 100000 + Math.round( 100000 * Math.random() ), // unique identifier
            descriptor: null,
            hue_id: 'B',
            type_cde: 1,
            mass: 0,
            strength: 0,
            selected: 1,
            opacity: 1,
            type_cde: '1', // not 'H' 
            tag: '?',
            has_shape: 1,

            from_node_id: '?',
            to_node_id: '?'

            }

        if ( mouseover_datum && "node_id" in mouseover_datum ) { // over valid node => update original link
            lnk.target = lnk.true_target = mouseover_datum;
            }
        if ( mouseover_datum && "source" in mouseover_datum ) { // over valid link => split that link and insert a new node
            // create a new 'elbow' connector node
            // TODO: add the new node as a child of any visible euler regions intersecting with the pointer location
            lnk.target = lnk.true_target = Node.Create({x,y,width:8,height:8});
            lnk.target.fx = x; lnk.target.fy = y; // user expects the node to stay where it's put
            lnk.img_src = null; // TODO give it a suitable icon, e.g. 'AND' gate?
            lnk.descriptor = `New link from ${Node.Tag(lnk.true_source)} to ${Node.Tag(lnk.true_target)}`
            // also, 'splice in' the new elbow connector into the existing (mouseover) link
            Link.InsertNode(mouseover_datum,lnk.target);
            }


        else if ( mouseover_datum == null ) { // over empty space => create a new node & link to it
            lnk.target = lnk.true_target = Node.Create({x,y,width:20,height:20});
            lnk.descriptor = `New link from ${Node.Tag(lnk.true_source)} to ${Node.Tag(lnk.true_target)}`
        }

        if ( DraftLink.OrigLinkDatum ) { // we started by dragging an existing link 
            const reverse = DraftLink.OrigLinkDatum.true_target == DraftLink.FromDatum ;
            if (reverse)
                DraftLink.OrigLinkDatum.true_source = DraftLink.OrigLinkDatum.source = lnk.target;    
            else
                DraftLink.OrigLinkDatum.true_target = DraftLink.OrigLinkDatum.target = lnk.target;    
            Link.Activate([DraftLink.OrigLinkDatum],1); 
        }
        else { // save & activate the new link + both its end nodes
            links.push(lnk);
            Link.Activate([lnk],1); 
            }
        Cache.RefreshNodeInOutLinks(); 
        // TODO: Also refresh hierarchies, only required if Link.IsHier(lnk)
        AppendLines();
        RefreshSimData();
        console.log(lnk);
        }

    if (DraftLink.LineElement) DraftLink.LineElement.remove();
    if (DraftLink.FromD3Selection) DraftLink.FromD3Selection.classed("drafting", false);
    svg.classed('left-mouse-down',false); // because OnDragEnd() blocks mouseup?
    DraftLink.FromD3Selection = null;
    DraftLink.FromDatum = null;
    DraftLink.LineElement= null;
    DraftLink.OrigLinkDatum =null;

}
//-------------------------------------------------------------------------------

}

//-------------------------------------------------------------------------------



const arrow = defs
    .append("marker")
    .attr("id","arrow") //  to invoke this polyline marker and apply it to multiple instances
    // these attributes cannot be set using CSS
    .attr("markerWidth",6)
    .attr("markerHeight",6)
    .attr("refX",3) // anchor at 3 = 6/2 so the centre of the arrow is at the exact centre of the polyline
    .attr("refY",2)
    .attr("orient","auto")
    .attr("markerUnits","strokeWidth") // should inherit
        .append("polygon")
        .attr("class","arrowhead")
        .attr("points","0 0, 6 2, 0 4");


const bullet = defs
    .append("marker")
    .attr("id","bullet") //  to invoke this circle marker and apply it to multiple instances
    // these attributes cannot be set using CSS
    .attr("markerWidth",6)
    .attr("markerHeight",6)
    .attr("refX",3) // anchor at 3 = 6/2 so the centre of the bullet is at the exact centre of the line
    .attr("refY",3)
 //   .attr("orient","auto")
    .attr("markerUnits","strokeWidth") // should inherit
        .append("circle")
        .attr("class","bullet")
        .attr("cx","3")
        .attr("cy","3")
        ;

