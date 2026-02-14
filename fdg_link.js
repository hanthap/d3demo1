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

// Given 2 circle nodes with different radii, calculate the shortest line segment from perimeter to perimeter, with a break at the visual midpoint (for a central arrowhead marker)
// this ensures the line's terminal arrowhead will just touch the outer perimeter of the destination node.
// TO DO: adjust for non-circular nodes. If the circle is inside the rect, the line goes to the nearest outer edge of the rect, not the centre
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
// eg to distinguish 'certain/evidence-based' vs 'tentative/subjective' connections

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
// how strongly the distance is enforced
static Strength(d) {  // callback for d3.forceLink()
    return 0.05 ; // Math.random();
}

//-------------------------------------------------------------------------------

static Distance(d) { // callback for d3.forceLink()
    return d.distance;
}

//-------------------------------------------------------------------------------
// d3selection.each(f) invokes f(d) for each DOM element (accessed via 'this') with d = its bound datum

static OnTick() {
   gLinkZone.selectAll('line').each( LinkZone.SetAttributes ); 
   gLink.selectAll('polyline').each( Link.SetAttributes ); 
}

//-------------------------------------------------------------------------------
// Called per link, per tick, via selectAll('polyline').each( Link.SetAttributes ) 
static SetAttributes(d)   {
    // selection.each(d) => this: the DOM element, d: the d3 datum
    // don't show link from child to its parent container frame
    if ( Link.IsHier(d) && Node.ShowAsFrame(d.target) ) 
        this.setAttribute('visibility','hidden'); // hidden element still generates mouseexit !
    else {
        this.setAttribute('visibility','visible');
        this.setAttribute('points', Link.PolyLinePointString(d) ); 
        d3.select(this) // convert DOM element to d3 selection
            .classed('selected',d.selected)
            .classed('arrow',true)
            .style('stroke', Link.StrokeColour ) 
            .style('fill', Link.FillColour );  // for arrowhead

    }
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


    Link.IsHier(d) && Node.ShowAsFrame(d.target) 
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
// NOTE we stick with screen coordinates througout, so 'top' y is less than 'bottom' y (and amgle is flipped accordingly)

static Theta(d) {

const
        c0 = Node.Centre(d.source), // careful with rect
        c1 = Node.Centre(d.target),
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

    const t = Link.Theta(d),
    p0 = Node.ContactPoint(d.source,t.theta_out),
    p1 = Node.ContactPoint(d.target,t.theta_in); 
    return { p0, p1 };
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
        .attr('id', Link.UniqueId) // for efficient upsert & delete of DOM bindings
        .classed('linkzone',true) // for CSS styling of the extended click zone
        .on('click',LinkZone.OnClick)
        .on('mouseover',LinkZone.OnMouseOver)
        .on('mouseout',LinkZone.OnMouseOut)
        .style('stroke-width',LinkZone.StrokeWidth)
        .append('title') // simpler tooltip using HTML elements
            .text(Link.TitleText)
        ;

    gLink.selectAll('polyline') // this layer ignores mouse events, so they pass through to LinkZone
        .data(links.filter(Link.VisibleLine),Link.UniqueId)
        .attr('id', Link.UniqueId) // for efficient upsert & delete of DOM bindings
        .join('polyline') 
        .style('stroke',Link.StrokeColour)
        .style('stroke-width',Link.StrokeWidth)
        ;

}


//=====================================================================================================================

class LinkZone extends Link {

static SetAttributes(d)   {

    // this = the HTML SVG element, d = the d3 datum
    // don't show link from child to its parent container - 
    // TO DO: should we also hide a direct shortcut link from grandchild to grandparent container?

    // if ( Link.IsHier(d) && Node.ShowAsFrame(d.target) ) 
    //     this.setAttribute('visibility','hidden');
    // else {
        this.setAttribute('visibility','visible');
        let t = Link.PolyLinePointTuple(d);
        this.setAttribute('x1',t.start.x);
        this.setAttribute('y1',t.start.y);
        this.setAttribute('x2',t.end.x);
        this.setAttribute('y2',t.end.y);
       d3.select(this).classed('selected',d.selected);
   // }
}

//-------------------------------------------------------------------------------

static StrokeWidth(d) { // width of extended click zone

        return Link.StrokeWidth(d) + 8;

}

//-------------------------------------------------------------------------------

static OnClick(e,d) {
    console.log('Link.OnClick',e,d,this);

    d.selected ^= 1;
    d.source.selected = d.selected;
    d.target.selected = d.selected;
    ticked();
}

//-------------------------------------------------------------------------------


//-------------------------------------------------------------------------------

static Hover( d, bHovering ) {

    if ( Node.DragStartPos ) return; // don't react if user is dragging a circle
 
    gLink.selectAll('polyline')
        .filter( p => p == d ) // bound to the same datum 
        .classed( 'xhover', bHovering ) // for CSS dash-array
        .each(d => { mouseover_datum = bHovering ? d : null })
        ;


    gNode.selectAll("circle")
        .filter( c => c == d.source || c == d.target )
        .classed( 'xhover', bHovering );

    gGroup.selectAll("rect") // frame
        .filter( c => c == d.source || c == d.target )
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

}