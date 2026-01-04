class Link {

//-------------------------------------------------------------------------------

static AppendDatum(d,i) {

try { 
    // bind Link to its live vertex objects
    d.source = Node.GetFromID( d.FROM_NODE_ID );
    d.target = Node.GetFromID( d.TO_NODE_ID );
    d.distance = 20;
    d.strength = 0.1;
   // console.log(d);
    return d; // only if we didn't throw an error eg 'no such node'
} catch ( e ) {
        console.log(e)
    }
}

//-------------------------------------------------------------------------------

// Given 2 circle nodes with different radii, calculate the shortest line segment from perimeter to perimeter, with a break at the visual midpoint (for a central arrowhead marker)
// this ensures the line's terminal arrowhead will just touch the outer perimeter of the destination node.
// TO DO: adjust for variable boundary stroke widths of source and target nodes
// TO DO: adjust for non-circular nodes. If the circle is inside the rect, the line goes to the nearest outer edge of the rect, not the centre

static PolyLinePoints( d ) {
    var dDest = d.target, dOrig = d.source;
    var cDest = Node.Centre2(dDest);
    var cOrig = Node.Centre2(dOrig);
  //  console.log(cDest);
  //  console.log(cOrig);
   // var yDelta = dDest.y - dOrig.y ;
   // var xDelta = dDest.x - dOrig.x;
    var yDelta = cDest.y - cOrig.y ;
    var xDelta = cDest.x - cOrig.x;
       console.log(cDest);
 
    var h = Math.hypot(xDelta,yDelta); // hypotenuse = distance between centres
    // move origin to the perimeter of the "from" circle
    var xStart = cOrig.x + ( xDelta * dOrig.r / h ); 
    var yStart = cOrig.y + ( yDelta * dOrig.r / h );

    // move target to the perimeter of the "to" circle (node)
    var xEnd = cDest.x - ( xDelta * dDest.r / h );
    var yEnd = cDest.y - ( yDelta * dDest.r / h );

    // visual midpoint = half-way along the visible line segment, NOT half-way between node centres
    var xMid = ( xStart + xEnd ) / 2; 
    var yMid = ( yStart + yEnd ) / 2;

  return `${xStart},${yStart} ${xMid},${yMid} ${xEnd},${yEnd}`
}


//-------------------------------------------------------------------------------

static StrokeColour(d) { // drives stroke colour
    try {
        return edgePalette( d.EDGE_CDE );
    } catch (e) { };
}


//-------------------------------------------------------------------------------

static StrokeWidth(d) { // stroke-width of visible polyline
    try {
        return d.EDGE_MASS / 20;
    } catch (e) { };
}


//-------------------------------------------------------------------------------

static ZoneWidth(d) { // width of extended click zone
    try {
        return 20 + d.EDGE_MASS / 40;
    } catch (e) { };
}


//-------------------------------------------------------------------------------

static TitleText(d) {
// to do: in case either node is stacked look for any links that are obscured by this one and display their info too
    try {
        return d.EDGE_TXT + '\n\nFrom: ' + Node.TitleText(d.source) + '\n\nTo: ' + Node.TitleText(d.target);
    } catch (e) { console.log(e);  };
}

//-------------------------------------------------------------------------------

static Strength(d) {  // callback for d3.forceLink()
    return 0.1;
}

//-------------------------------------------------------------------------------

static Distance(d) { // callback for d3.forceLink()
    return IsHierLink(d) ? 0 : d.distance ;
}



//-------------------------------------------------------------------------------

static OnClick(e,d) {
    // to do: should we toggle?
//     console.log(d.source)
//     sPoints = Link.PolyLinePoints(d);
//     console.log(sPoints)

    d.source.selected ^= 1;
    d.target.selected ^= 1;
    d.selected ^= 1;
    ticked();
}


    //-------------------------------------------------------------------------------

    static Hover( d, bHovering ) {

        gNode.selectAll("circle")
            .filter( c => c == d.source || c == d.target )
            .classed( 'xhover', bHovering );

        gNode.selectAll("rect") // leaf
            .filter( c => c == d.source || c == d.target )
            .classed( 'xhover', bHovering );

        gNode.selectAll("rect") // frame
            .filter( c => c == d.source || c == d.target )
            .classed( 'xhover', bHovering );
            // TO DO : make this recursive

    }

    //-------------------------------------------------------------------------------

    static OnMouseOver(e,d) {
        Link.Hover( d, true );
    }

    //-------------------------------------------------------------------------------

    static OnMouseOut(e,d) {
        Link.Hover( d, false );
    }

//-------------------------------------------------------------------------------
// a function we can invoke with gLinkZone.selectAll('line'). Called twice per link, per animation
// TO DO: optimize to avoid double calls

static SetAttributes(d)   {
    // this = the HTML SVG element, d = the d3 datum
    // don't show link from child to its parent container - TO DO: should we also hide a direct shortcut link from grandchild to grandparent container?
    if ( IsHierLink(d) && IsFrameShape(d.target) ) 
        this.setAttribute('visibility','hidden');
    else {
       this.setAttribute('visibility','visible');
       this.setAttribute('points', Link.PolyLinePoints(d) );
       d3.select(this).classed('selected',d.selected); // classed() is a d3 extension; only needed once per user click
       d3.select(this).classed('arrow',true);
    }
}




}


var links = [];
var filteredLinks = [];

// Lookup Link.Colour using EDGE_CDE
var edgePalette = d3.scaleOrdinal()
    .domain( [ 'OCH', 'ME', 'FZ', 'D' ])
    .range( [ 'blue', 'green', 'grey', 'pink', 'orange' ]);


 //-------------------------------------------------------------------------------
    // to do: handle multiple containership hierarchies => need a priority order in case of 
function IsHierLink(d) {
    return ( false 
        || ( 'H').includes( d.EDGE_CDE )
    );

}


//-------------------------------------------------------------------------------

function LinkScope(d) {
// a link is in scope if both vertices are in scope
    return ( NodeScope(d.source) && NodeScope(d.target) );
}


//-------------------------------------------------------------------------------

function IsActiveLink(d) {
    return true;
}

//-------------------------------------------------------------------------------

function AppendLines(rs) {
    links = rs;
   // console.log(links);
    filteredLinks = links;
    gLinkZone.selectAll('line')
        .data(filteredLinks.filter(LinkScope))
        .join('line')
        .on('click',Link.OnClick)
        .on('mouseover',Link.OnMouseOver)
        .on('mouseout',Link.OnMouseOut)
        .attr('stroke-width',Link.ZoneWidth)
        .append('title') // simpler tooltip using HTML elements
        .text(Link.TitleText)
        ;

    gLink.selectAll('polyline')
        .data(filteredLinks.filter(LinkScope))
        .join('polyline') // create a polyline element bound to datum (in its __datum__ element)
        .on('click',Link.OnClick)     // can we let all events pass through to zone behind?
        .attr('stroke',Link.StrokeColour)
        .attr('stroke-width',Link.StrokeWidth)
        ;

}

