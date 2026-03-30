            var width = window.innerWidth, height = window.innerHeight;
            var simulation;
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
const 
    sz = ViewBox.logicalSize,
    W = parseFloat(svg.style("width")),
    H = parseFloat(svg.style("height")),

    s = Math.min(W, H),
    scale = sz / s,

    x0 = -sz/2,
    y0 = -sz/2;

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

static OnWheel(e,d) {
 //   console.log('Node.OnWheel(e,d)',e,d);
    gNode.selectAll('circle')
    .filter(d => d.selected )
    .each( d => d.r *= ( 1 + e.wheelDelta / 1200 ) )
    .attr( 'r', d => d.r );

    gNode.selectAll('.image-group') // nested g elements with a non-empty image tag
        .filter(d => d.selected )
        .attr('transform',Label.TransformGroupElement) // the nested g and its image
    ;
    // update the collision force directly. This actually works!
   simulation.force('collide', d3.forceCollide().radius(Node.CollideRadius));
    ticked();
}

//-------------------------------------------------------------------------------
// invoked from document regardless of selected element
static OnKeyDown(e) {
 const 
    capslock = e.getModifierState("CapsLock")
 
 ;
 
   switch (e.key) {
    case 'a' :
    case 'A' :
        if ( e.ctrlKey) { // Ctrl+A => Select All
        nodes.forEach( d => d.selected = 1 );
        links.forEach( d => d.selected = 1 );
        }
        break;


// CTRL+B randomise bg_fill colour of each selected node, individually
//  - a 'lazy' way to add/change distinguishing features 
// ditto for 'random' icons?
// TODO CTRL+SHIFT+B choose 1 colour and apply that colour to all selected nodes
// except where the source image is a brand logo
    case 'b' : 
    case 'B' :
        if ( e.ctrlKey) { 
            function randomHex24() {
                const n = Math.floor(Math.random() * (1 << 24)); // 0 to 2^24 - 1
                return "#" + n.toString(16).padStart(6, "0");
            }

        nodes
            .filter( d => d.selected )
            .forEach(d=>d.bg_fill = randomHex24());

        }
        AppendLabels();
        AppendFrames();
        
        break;


    case 'Escape' : 
        // clear all highlights by removing the 'selected' class
        nodes.forEach( d => d.selected = 0 );
        links.forEach( d => d.selected = 0 );
        svg.selectAll('*').classed('selected',false) // not enough for polylines
        gLink.selectAll('polyline') // line colours are resistant to class-driven CSS grey filter
            .style('stroke', Link.StrokeColour )  
            .style('fill', Link.FillColour ); 
       // svg.classed('disabled',true);

        gGroup.selectAll('.frame-whole')
          //  .classed('selected', false)  
            .classed('disabled', true)
            ;

        break;

    case 'End': // release any 'pegged' circles
        nodes.forEach( d => { d.fx = d.fy = null }  );
        break;

    case 'Shift':
        FreezeSim();
        svg.classed("shift-down",true);
        break;

    case 'Control':
        svg.classed("ctrl-down",true);
        break;

    case 'CapsLock' :
        frozen = ! capslock; // will be toggled in next line
    case 'ScrollLock' :    
    case 'Pause' :
        // toggle frozen
        if ( frozen ^= 1 ) {
            FreezeSim();
            svg.classed("shift-down",true);
        }
        else {
            UnfreezeSim();
            svg.classed("shift-down",false);
        }
        break;

    case 'S' : 
    case 's' : // Alt+S => export data as JSON & CSV
        if ( e.altKey ) {
            console.log(e);
            // TODO: keyboard modifiers decide whether to download just the current selection
            Cache.Download();
        }
        break;


        // TODO Shift+Cmd+. shows hidden folders in MacOS. Maybe use the same for showing hidden nodes?
    case ' ' :
        svg.classed("space-bar",!svg.classed("space-bar"));
        // TODO: toggle visibility of unselected lines & nodes
        // shift+space add/remove them from the simulation as well
        break;


    case 'Home' :
        frozen = false;
        RunSim();
        break;

    case 'Insert' : 
        // TODO: sticky insert/overtype mode?
        // if hovering over space => create node
        // if hovering inside a frame => create child node
        // if hovering over a line => splice a new node
        // else if 2 or more nodes are selected, encapsulate them in a new frame
        const selNodes = gNode.selectAll('circle').filter(d => d.selected);
        Node.Create([0,0,20,20],selNodes);
        break;

    default:
        console.log('ViewBox.OnKeyDown',e);
        break;

    }
    ticked();
}
//-------------------------------------------------------------------------------

static OnKeyUp(e) {
//  console.log('ViewBox.OnKeyUp',e);

 const capslock = e.getModifierState("CapsLock");

switch (e.key) {
    // case 'Meta':
    //     svg.classed("meta-down",false);
    //     break;

    case 'Shift':
        if (!capslock) {
            svg.classed("shift-down",false);
            if (!frozen) UnfreezeSim();
        }

        break;
    case 'Control':
        svg.classed("ctrl-down",false);
        break;

    }
}

//-------------------------------------------------------------------------------

static OnMouseDown(e,d) {
 //   console.log('ViewBox.OnMouseDown',e,d,this);
    svg.classed('left-mouse-down',true);

}


//-------------------------------------------------------------------------------
// seems that d3 drag OnDragEnd event prevents mouseup?
static OnClick(e,d) {
    console.log('ViewBox.OnClick',e,d,this);
    svg.classed('left-mouse-down',false);
        body.classed('crosshair',false);

if ( e.ctrlKey && e.shiftKey ) {
    // set centre of gravity here, for all unlocked & visible & selected circle nodes
    const [x,y] = d3.pointer(e,svg.node());
    const a = nodes.filter(Node.ShowAsCircle).filter(d=>d.selected && !d.locked);
    console.log('ViewBox.OnClick a',a);
    a.forEach(d => { d.cogX = x; d.cogY = y; } )
        ;
    RefreshSimData();
    ticked();
    }

}


//-------------------------------------------------------------------------------

static OnDragStart(e,d) {
    body.classed('crosshair',true);
    svg.classed('left-mouse-down', true);
    console.log('ViewBox.OnDragStart',e,d,this);
    const p = d3.pointer(e,svg.node());
    ViewBox.DragStartPos = p;
    ViewBox.SelectRect = gForeground
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

        svg.classed('left-mouse-down',false);
                body.classed('crosshair',false);
        if ( ViewBox.DragRectDims == null ) return; // click is treated as drag start

    if ( svg.classed("ctrl-down") ) {
        // create a new Frame using ViewBox.SelectRect

        const 
            selNodes = gNode.selectAll('circle')
                .filter(ViewBox.DragRectIncludes)
                .filter(Node.HasShape),
            f = Node.Create(ViewBox.DragRectDims,selNodes)           
            ;
            if (e.shiftKey) f.locked = 1;
    }

    // TODO These selections are not visible until simulation unfreezes
    gNode.selectAll('circle.drag_selected')
        .classed('drag_selected',false)
        .each( d => { d.selected ^= 1 } ) // toggle selected flag
          ;




    body.classed('crosshair',false);
    svg.classed('left-mouse-down', false);
    ViewBox.SelectRect.remove();
    ViewBox.SelectRect = null;
    ViewBox.DragRectDims = null;

    ticked();
}

//-------------------------------------------------------------------------------
// return a D3 selection with all SVG elements that contain the pointer coordinates
// used by Node.OnDragEnd(), OnDrag()
// https://en.wikipedia.org/wiki/Canonical_normal_form#Minterm


static HitTestSelection(e) { // used to determine the "minterm" at the given coords
//console.log('ViewBox.HitTestSelection(e)',e);
   // const [x, y] = d3.pointer(e); // must use screen space, not SVG space
    const [x, y] = [e.sourceEvent.clientX ,e.sourceEvent.clientY]; 
//console.log('ViewBox.HitTestSelection: d3.pointer(e)',x,y);
    
    const svgElements = document.elementsFromPoint(x, y)
        .filter(el => el instanceof SVGElement);
//console.log('ViewBox.HitTestSelection:svgElements',svgElements);
    const selHits = d3.selectAll(svgElements);

    return selHits;

}



}


body = d3.select('body')
//.on('mousedown', ViewBox.OnMouseDown)
//.on('mouseup', ViewBox.OnMouseUp)
.classed('wait',true)
;


//   .call(d3.drag()
//             .on('start', Pointer.OnDragStart)
//             .on('drag', Pointer.OnDrag)
//             .on('end', Pointer.OnDragEnd)  
//         );
  ;

const svg = body.append('svg')
    .attr('width',window.innerWidth)
    .attr('height', window.innerHeight)
    // set origin to centre of svg
    .attr('viewBox', [-500, -500, 1000, 1000] ) // case-sensitive attribute name !!
    .on('contextmenu',e => e.preventDefault() ) // applies to all elements! => use Ctrl+Shift+I to open Console inspect
    .on('mousedown',ViewBox.OnMouseDown)
    .on('click',ViewBox.OnClick)
        .on('wheel',ViewBox.OnWheel)

    .call(d3.drag()
            .on('start', ViewBox.OnDragStart)
            .on('drag', ViewBox.OnDrag)
            .on('end', ViewBox.OnDragEnd)  
        )
        ;



// static frames (eg swimlanes) stay in place, enforce strict boundary for floating nodes
// const gStatic = svg.append('g')    .classed( 'static', true );


// group frames are passive shapes in the background
const gGroup = svg.append('g')
    .classed( 'all-frames', true )
    ;

const gNode = svg.append('g') // circles = floating nodes
    .classed( 'all_circles', true );

// links are rendered in front of circles. 

// next the polyline edge arrows 
const gLink = svg.append('g')
    .classed( 'all-links', true )
    ;
// overlay the invisible click zones
const gLinkZone = svg.append('g')
    .classed( 'all-linkzones', true )

// new improved 
const gAllEdges = svg.append('g')
    .classed( 'all edges', true );

    // a foreground layer eg for drag-select rect, pop-up annotations
const gForeground = svg.append('g')
    .classed( 'foreground', true )
    ;



const defs = svg.append("defs");



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
document.addEventListener("mousedown", ViewBox.OnMouseDown);
document.addEventListener("mouseup", ViewBox.OnMouseUp);
const menu = d3.select("#context-menu");


menu.on("click", function(event) {
  const action = event.target;
  console.log("Menu item Clicked:", action);
});

// hide the context menu when anything else is clicked
d3.select("body").on("click", () => {
  menu.style("display", "none");
});
