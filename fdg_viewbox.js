            var width = window.innerWidth, height = window.innerHeight;
            var simulation;
     //       var simPassive;
    //        var simulationExclusion;
            var frozen = false;


            var x; // last clicked node
            var mouseover_d3selection = null;
            var mouseover_datum = null;
            var mouseover_dom_element = null;

//-------------------------------------------------------------------------------


class ViewBox{

static logicalSize = 500; // width and height in logical units
static lastDPR = window.devicePixelRatio;
static DragStartPos;

static OnResize() {
const sz = ViewBox.logicalSize;
  const W = parseFloat(svg.style("width"));
  const H = parseFloat(svg.style("height"));

  const s = Math.min(W, H);
  const scale = sz / s;

  const x0 = -sz/2;
  const y0 = -sz/2;

  svg.attr("viewBox", `${x0} ${y0} ${sz} ${sz}`);
  }

//-------------------------------------------------------------------------------

static WatchZoom() {
  const currentDPR = window.devicePixelRatio;
  if (currentDPR !== ViewBox.lastDPR) {
     ViewBox.lastDPR = currentDPR;
    ViewBox.OnResize();
  }
  requestAnimationFrame(ViewBox.WatchZoom);
}



//-------------------------------------------------------------------------------
// invoked from document regardless of selected element
static OnKeyDown(e) {
//   console.log('ViewBox.OnKeyDown',e);
 
   switch (e.key) {
    case 'Escape' : 
        // clear all highlights by removing the 'selected' class
        nodes.forEach( d => d.selected = 0 );
        links.forEach( d => d.selected = 0 );
        break;
    case 'End': // release any 'pegged' circles
        nodes.forEach( d => { d.fx = d.fy = null }  );
        break;
    case 'Shift':
        svg.classed("shift-down",true);
        break;
    case 'Control':
        svg.classed("ctrl-down",true);
        break;
    case 'Pause' :
        // toggle frozen
        if ( frozen ^= 1 )
            FreezeSim();
        else
            UnfreezeSim();
        break;
    case 's' : // Alt+s => export data as JSON & CSV
        if ( e.altKey ) {
            console.log(e);
            Cache.Download();
        }
        break;
    case 'Home' :
        frozen = false;
        RunSim();
        break;
    case 'Insert' :
      //  alert("Insert key pressed");
        Cache.AddFrameNode();
        break;
    }
    ticked();
}
//-------------------------------------------------------------------------------

static OnKeyUp(e) {
//  console.log('ViewBox.OnKeyUp',e);
    switch (e.key) {
    case 'Shift':
        svg.classed("shift-down",false);
        break;
    case 'Control':
        svg.classed("ctrl-down",false);
        break;
    }
}
//-------------------------------------------------------------------------------

static OnDragStart(e,d) {
    console.log('ViewBox.OnDragStart',e,d,this);
    const p = d3.pointer(e,svg.node());
    ViewBox.DragStartPos = p;
    ViewBox.SelectRect = gLabel
        .append('rect')
            .attr('x', p.x)
            .attr('y', p.y)
            .classed('drag_selector',true)
            ;

}

//-------------------------------------------------------------------------------

static DragRectIncludes(d) {
    // helper function to test if circle centre x,y is within drag rectangle
    const r = ViewBox.DragRectDims;
    if (r == null) return false;
  return (
    d.x >= r.x &&
    d.x <= r.x + r.width &&
    d.y >= r.y &&
    d.y <= r.y + r.height
  );
}

//-------------------------------------------------------------------------------

static OnDrag(e,d) {

    const [x1,y1] = d3.pointer(e,svg.node());
    const [x0,y0] = ViewBox.DragStartPos;
    const x = x0 < x1 ? x0 : x1;
    const y = y0 < y1 ? y0 : y1;
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);
    // store for use in DragRectIncludes()
    ViewBox.DragRectDims = {x, y, width, height};

    ViewBox.SelectRect
        .attr('x',x)
        .attr('y',y)
        .attr('width', width)
        .attr('height', height)
        ;

}

//-------------------------------------------------------------------------------


static OnDragEnd(e,d) {

    ViewBox.SelectRect.remove();
    ViewBox.SelectRect = null;
    ViewBox.DragRectDims = null;

    gNode.selectAll('circle.drag_selected')
        .classed( 'drag_selected', false )
        .each( d => { d.selected ^= 1 } ) // toggle selected flag
          ;

}

//-------------------------------------------------------------------------------


}

d3.select('body')
//  .on('keydown', ViewBox.OnKeyDown)
  .call(d3.drag()
            .on('start', Pointer.OnDragStart)
            .on('drag', Pointer.OnDrag)
            .on('end', Pointer.OnDragEnd)  
        );
  ;

const svg = d3.select('body').append('svg')
    .attr('width',window.innerWidth)
    .attr('height', window.innerHeight)
    // set origin to centre of svg
    .attr('viewBox', [-500, -500, 1000, 1000] ) // case-sensitive attribute name !!
    .on('contextmenu',e => e.preventDefault() ) // applies to all elements! => use Ctrl+Shift+I to open Console inspect
    .call(d3.drag()
            .on('start', ViewBox.OnDragStart)
            .on('drag', ViewBox.OnDrag)
            .on('end', ViewBox.OnDragEnd)  
        );

// group frames are passive shapes in the background
const gGroup = svg.append('g')
    .classed( 'group', true )
    ;

const gNode = svg.append("g"); // circles

// links are rendered in front of circles. 

    ;
// next the polyline edge arrows 
const gLink = svg.append('g')
    .classed( 'edge', true )
    ;
// overlay the invisible click zones
const gLinkZone = svg.append('g')
    .classed( 'linkzone', true )

    // a foreground layer eg for drag-select rect, pop-up annotations
const gLabel = svg.append('g')
    .classed( 'label', true )
    ;

const defs = svg.append("defs");

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

const context_menu = d3.select('body').append('div')
    .attr("id","context-menu") ; // let CSS do the rest




//-------------------------------------------------------------------------------

// used in ticked(), drag() to ensure objects never disappear out of viewport window
function bounded(x,a,b) {
    if ( x < a ) x = a;
    if ( x > b ) x = b;
    return x;
}
//-------------------------------------------------------------------------------

ViewBox.OnResize();
ViewBox.WatchZoom();

window.addEventListener("resize", ViewBox.OnResize);

// centralise all keypresses regardless of which element is selected
document.addEventListener("keydown", ViewBox.OnKeyDown);
document.addEventListener("keyup", ViewBox.OnKeyUp);

const menu = d3.select("#context-menu");


menu.on("click", function(event) {
  const action = event.target;
  console.log("Menu item Clicked:", action);
});

// hide the context menu when anything else is clicked
d3.select("body").on("click", () => {
  menu.style("display", "none");
});
