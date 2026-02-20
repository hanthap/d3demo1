var links = [];
class Link {


    static UniqueId(d) {
        return d.id;
    }

//-------------------------------------------------------------------------------

static AppendDatum(d,i) {

try { 
    // bind Link to its live vertex objects
    d.source = Node.GetFromID( d.from_node_id );
    d.target = Node.GetFromID( d.to_node_id );
    d.distance = 20 * Math.random();
    d.strength = 0.4 * Math.random();
    d.opacity = Math.random();
    d.id = 'L' + i; // unique identifier
   // console.log(d);
    return d; // only if we didn't throw an error eg 'no such node'
} catch ( e ) {
        console.log(e)
    }
}


//-------------------------------------------------------------------------------

// Given 2 nodes (circle or frame) calculate the shortest line segment from perimeter to perimeter, with a break at the visual midpoint (for a central arrowhead marker)
// this ensures the line's endpoints will coincide with the outer perimeter of each shape.
// TO DO: handle scenario where source node overlaps the destination (or vice versa)


static PolyLinePointTuple( d ) {

    const cp = Link.ContactPoints(d);

    // visual midpoint = half-way along the visible line segment, NOT half-way between node centres
    var xMid = ( cp.p0.x + cp.p1.x ) / 2; 
    var yMid = ( cp.p0.y + cp.p1.y ) / 2;

    return { 'start': { 'x': cp.p0.x , 'y': cp.p0.y },
             'mid' :  { 'x': xMid,     'y': yMid },
             'end':   { 'x': cp.p1.x , 'y': cp.p1.y  }
            };
}
//-------------------------------------------------------------------------------

static PolyLinePointString( d ) {
    let t = Link.PolyLinePointTuple(d);
    return `${t.start.x},${t.start.y} ${t.mid.x},${t.mid.y} ${t.end.x},${t.end.y}`
}

//-------------------------------------------------------------------------------

static StrokeColour(d) { 

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
      return d.link_mass ? d.link_mass / 20 : 1.2; // to do: need a better formula for link mass => stroke width
}

//-------------------------------------------------------------------------------

static TitleText(d) {
// to do: in case either node is stacked look for any links that are obscured by this one and display their info too
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
// d3selection.each(f) invokes f(d) for each DOM element (accessed via 'this') with d = its bound datum

static OnTick() {
   gLinkZone.selectAll('line').each( LinkZone.SetAttributes ); 
   gLink.selectAll('polyline').each( Link.SetAttributes ); 
}

//-------------------------------------------------------------------------------
// Repeated per link, per tick, via selectAll('polyline').each(Link.SetAttributes) 
static SetAttributes(d)   {
    this.setAttribute('points', Link.PolyLinePointString(d) ); 
}

 //-------------------------------------------------------------------------------
    // to do: handle multiple containership hierarchies => need a priority order in case of 
static IsHier(d) {
    return ( false 
        || ( 'H').includes( d.type_cde )
    );

}

//-------------------------------------------------------------------------------
// TO DO: are there any non-hierarchical "circle-within-frame" links that should be hidden?
static ShowAsLine(d) {
    return ( Node.HasShape(d.source) && Node.HasShape(d.target) );
}
//-------------------------------------------------------------------------------
// Exclude self-self links (eg a collapsed frame linking to itself)
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
    c0 = Node.Centre(d.source), // careful with rect
    c1 = Node.Centre(d.target),
    t =  Link.Theta(c0,c1),
    p0 = Node.ContactPoint(d.source,t.theta_out),
    p1 = Node.ContactPoint(d.target,t.theta_in); 
    return { p0, p1 };
    }


//-------------------------------------------------------------------------------


static Matches(d) {
return links.filter( e => ( e.source == d.source && e.target == d.target ) || 
( e.source == d.target && e.target == d.source)
 )


}



}
//-------------------------------------------------------------------------------

function IsActiveLink(d) {
    return true;
}

//-------------------------------------------------------------------------------

function AppendLines() {

    gLinkZone.selectAll('line') 
        .data(links.filter(Link.VisibleLine),Link.UniqueId)
        .join('line')
        .attr('id', Link.UniqueId)
        .classed('linkzone',true)
        .on('click',LinkZone.OnClick)
        .on('mouseover',LinkZone.OnMouseOver)
        .on('mouseout',LinkZone.OnMouseOut)

        .on('mousedown',ViewBox.OnMouseDown)
        .on('mouseup',ViewBox.OnMouseUp)


        .on('contextmenu',LinkZone.OnContextMenu)
    //    .style('stroke-width',LinkZone.StrokeWidth) // TBC - maybe leave it to CSS
        .call(d3.drag()
            .on('start',LinkZone.OnDragStart)
            .on('drag',LinkZone.OnDrag)
            .on('end',LinkZone.OnDragEnd)  
            ) 
        // .append('title').text(Link.TitleText)
        ;

    gLink.selectAll('polyline') 
        .data(links.filter(Link.VisibleLine),Link.UniqueId)
        .attr('id', Link.UniqueId)
        .join('polyline') 
        .classed('arrow',true)
        .style('stroke',Link.StrokeColour)
        .style('stroke-width',Link.StrokeWidth)
        .style('fill', Link.FillColour ); // for the arrowhead
        ;

}


//=====================================================================================================================

class LinkZone extends Link {

static SetAttributes(d)   {
    
    let t = Link.PolyLinePointTuple(d);
    this.setAttribute('x1',t.start.x);
    this.setAttribute('y1',t.start.y);
    this.setAttribute('x2',t.end.x);
    this.setAttribute('y2',t.end.y);

}

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
console.log([x,y],cp,h0,h1);
    return ( h0 > h1 ) ? { far: s, near: t } : { far: t, near: s };

}


//-------------------------------------------------------------------------------

static OnClick(e,d) {
    
   const style = window.getComputedStyle(this);
   const p = d3.pointer(e,svg.node());
   const sel = d3.select(this);

    switch ( style.cursor ) {
        case 'grab' : 
            const ends = LinkZone.ChooseEnds(d,p);
            console.log('LinkZone.OnClick(grab)',d,this,p,ends,sel);
            sel
                .classed(ends.far.class,true)
                .classed(ends.near.class,false);

            // which connection point is closer to the click? That's the one we are about to detach and drag
            break;
        default : 
            d.selected ^= 1;
            d.source.selected = d.selected;
            d.target.selected = d.selected;
            break;

    }
    
    console.log('LinkZone.OnClick',e,d,this,Link.Matches(d));


    ticked();
}

//-------------------------------------------------------------------------------

static OnMenuItemClick(e,d) {
    console.log('LinkZone.OnMenuItemClick',e,e.target);
}

//-------------------------------------------------------------------------------

static OnContextMenu(e,d) {

    e.preventDefault();

    const a = Link.Matches(d);

    const sub = a.map( e => `<div class="item">${e.true_source.node_id} → ${e.true_target.node_id}: ${e.descriptor}</div>`).join("\n");


    menu
      .style("display", "block")
      .style("left", e.pageX + "px")
      .style("top", e.pageY + "px")
      .html(`
        <div class="item"><b>Link: ${d.source.node_id} ↔ ${d.target.node_id}</b> (${a.length})</div>${sub}`)
      .on('click',LinkZone.OnMenuItemClick)
      ;

}

//-------------------------------------------------------------------------------

static Hover( d, bHovering ) {

    if ( Node.DragStartPos ) return; // don't react if user is dragging a circle
 
    gLink.selectAll('polyline')
        .filter( p => p == d ) // bound to the same datum 
        .classed( 'xhover', bHovering ) // for CSS dash-array
        .each(d => { mouseover_datum = bHovering ? d : null })
        .style('stroke', Link.StrokeColour )  
        .style('fill', Link.FillColour );  // for arrowhead

    gNode.selectAll("circle")
        .filter( c => c == d.source || c == d.target )
        .classed( 'xhover', bHovering );

    gGroup.selectAll("rect") // frame
        .filter( r => r == d.source || r == d.target )
        .classed( 'xhover', bHovering );
        // TO DO : apply to all nested frames and circles
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
    Pointer.dragging_DOM_element = this;
    Pointer.dragging_datum = d;
    Pointer.dragging_d3_selection = d3.selectAll('line,polyline')
        .filter(o => o === d)
       .classed('dragging',true);
    console.log('LinkZone.OnDragStart',e,d,this,Pointer.dragging_d3_selection,Pointer.dragging_datum);
    ticked();
}
//---------------------------------------------------------------------------
static OnDrag(e,d) {}
//---------------------------------------------------------------------------
static OnDragEnd(e,d) {

    Pointer.dragging_d3_selection.classed('dragging',false);
    console.log('LinkZone.OnDragEnd',e,d,this,Pointer.dragging_d3_selection,Pointer.dragging_datum);
    ticked();

}


//-------------------------------------------------------------------------------




}

class DraftLink extends Link {

static FromD3Selection;
static FromDatum;
static LineElement;


//-------------------------------------------------------------------------------
// Use this eg when drafting a semi-detached line, from a node to the pointer's current (x,y) coords
static EndPoints(from_node,to_point) {

    const 
    c = Node.Centre(from_node), 
    t = Link.Theta(c,to_point),
    from_cp = Node.ContactPoint(from_node,t.theta_out)
    return { p0: from_cp, p1: to_point };
    }

//-------------------------------------------------------------------------------

static OnDragStart(e,d,d3selection) {
    // TO DO: set CSS classes (and cursor shapes) for all layers, according to whether drop is allowable
    console.log('DraftLink.OnDragStart',e,d,d3selection);
    DraftLink.FromD3Selection = d3selection.classed("drafting", true); 
    DraftLink.FromDatum = d;
    const p = Node.Centre(d);
    DraftLink.LineElement = gLabel
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
        // "snap to" draw draft line between contact points
            mouseover_d3selection.classed("valid_target",true); // this can be done in advance, in OnDragStart()
            const draft_link = { source: DraftLink.FromDatum, target: mouseover_datum };
            var cp = Link.ContactPoints(draft_link) ;
        } 
    else { //not hovering over a node => redraw line to end at pointer position
            const [x,y] = d3.pointer(e,svg.node()),
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

static OnDragEnd() {

    // TO DO: use cursor shape to decide whether to drop or ignore
    // then clear all temp classes

    // only create a link to a valid node
    if ( mouseover_datum && "node_id" in mouseover_datum ) {

        const lnk = {
            true_source: DraftLink.FromDatum,
            true_target: mouseover_datum,
            source: DraftLink.FromDatum,
            target: mouseover_datum,
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

    }

    DraftLink.LineElement.remove();
    DraftLink.FromD3Selection.classed("drafting", false);
    DraftLink.FromD3Selection = null;
    DraftLink.FromDatum = null;
    DraftLink.LineElement= null;


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