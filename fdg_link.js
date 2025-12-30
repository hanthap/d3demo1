class Link {

static PolyLinePoints( d ) {
    var dDest = d.target, dOrig = d.source;

    var yDelta = dDest.y - dOrig.y ;
    var xDelta = dDest.x - dOrig.x;
    var h = Math.hypot(xDelta,yDelta); // hypotenuse = distance between centres
    // move to the perimeter of the "from" circle
    var xStart = dOrig.x + ( xDelta * dOrig.r / h ); 
    var yStart = dOrig.y + ( yDelta * dOrig.r / h );

    // move to the perimeter of the "to" circle
    var xEnd = dDest.x - ( xDelta * dDest.r / h );
    var yEnd = dDest.y - ( yDelta * dDest.r / h );

    // visual midpoint = half-way along the visible path, NOT half-way between node centres
    var xMid = ( xStart + xEnd ) / 2; 
    var yMid = ( yStart + yEnd ) / 2;

  return `${xStart},${yStart} ${xMid},${yMid} ${xEnd},${yEnd}`
}


}



var links = [];
var filteredLinks = [];

// Lookup LinkColour using EDGE_CDE
var edgePalette = d3.scaleOrdinal()
    .domain( [ 'OCH', 'ME', 'FZ', 'D' ])
    .range( [ 'blue', 'green', 'grey', 'pink', 'orange' ]);


 //-------------------------------------------------------------------------------
    // to do: handle multiple containership hierarchies => need a priority order in case of 
function IsHierLink(d) {
    return ( false 
      //  || ( 'ME').includes( d.EDGE_CDE )
        || ( 'H').includes( d.EDGE_CDE )
        // to do: a Golden ID with exactly 2 visible nodes COULD be more simply represented as a connecting line
        // instead of a frame rectangle
    );

}




//-------------------------------------------------------------------------------

function LinkScope(d) {
// a link is in scope if both vertices are in scope
    return ( NodeScope(d.source) && NodeScope(d.target) );
}


//-------------------------------------------------------------------------------

function AppendLinkDatum(d) {

try { 
    // bind to its live vertex objects
    d.source = Node.GetFromID( d.FROM_NODE_ID );
    d.target = Node.GetFromID( d.TO_NODE_ID );
    d.distance = 10;
    d.strength = 0.1;
   // console.log(d);
    return d; // only if we didn't throw an error eg 'no such node'
} catch ( e ) {
        console.log(e)
    }
}


//-------------------------------------------------------------------------------
// to do: in case either node is stacked look for any links that are obscured by this one and display their info too
function LinkInfo(d) {
    try {
        return d.EDGE_TXT + '\n\nFrom: ' + Node.TitleText(d.source) + '\n\nTo: ' + Node.TitleText(d.target);
    } catch (e) { console.log(e);  };
}

//-------------------------------------------------------------------------------

function LinkColour(d) { // drives stroke colour
    try {
        return edgePalette( d.EDGE_CDE );
    } catch (e) { };
}

//-------------------------------------------------------------------------------

function LinkThickness(d) { // drives stroke-width
    try {
        return d.EDGE_MASS / 20;
    } catch (e) { };
}


function LinkZoneThickness(d) { // drives stroke-width
    try {
        return 20 + d.EDGE_MASS / 20;
    } catch (e) { };
}
//-------------------------------------------------------------------------------

function IsActiveLink(d) {
    return true;
}

//-------------------------------------------------------------------------------

function LinkStrength(d) {
    return 0.1;
}

//-------------------------------------------------------------------------------

function LinkDistance(d) {
    return IsHierLink(d) ? 0 : d.distance ;
}


//-------------------------------------------------------------------------------

function AppendLines(rs) {
    links = rs;
   // console.log(links);
    filteredLinks = links;
    gLinkZone.selectAll('line')
        .data(filteredLinks.filter(LinkScope))
        .join('line')
        .on('click',handleClickLinkZone)
        .on('mouseover',handleMouseOverLinkZone)
        .on('mouseout',handleMouseOutLinkZone)
        .attr('stroke-width',LinkZoneThickness)
        .append('title') // simpler tooltip using HTML elements
        .text(LinkInfo)
        ;
    // gLink.selectAll('line')
    //     .data(filteredLinks.filter(LinkScope))
    //     .join('line') // create a line element bound to datum (in its __datum__ element)
    //     .on('click',handleClickLinkZone)    
    //     .attr('stroke',LinkColour)
    //     .attr('stroke-width',LinkThickness)
    //     ;

    gLink.selectAll('polyline')
        .data(filteredLinks.filter(LinkScope))
        .join('polyline') // create a polyline element bound to datum (in its __datum__ element)
        .on('click',handleClickLinkZone)    
        .attr('stroke',LinkColour)
        .attr('stroke-width',LinkThickness)
        ;



}

//-------------------------------------------------------------------------------
// a function we can invoke with gLinkZone.selectAll('line'). Called twice per link, per animation
// TO DO: optimize to avoid double calls
function SetLineAttributes(d)   {
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
