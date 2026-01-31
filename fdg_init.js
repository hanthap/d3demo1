            var width = window.innerWidth, height = window.innerHeight;
            var simulation;
            var simPassive;
            var simulationExclusion;
            var frozen = false;


            var x; // last clicked node
            var mouseover_object = null;

//-------------------------------------------------------------------------------


class MainWindow{

static logicalSize = 500; // width and height in logical units
static lastDPR = window.devicePixelRatio;
static DragStartPos;

static OnResize() {
const sz = MainWindow.logicalSize;
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
  if (currentDPR !== MainWindow.lastDPR) {
     MainWindow.lastDPR = currentDPR;
    MainWindow.OnResize();
  }
  requestAnimationFrame(MainWindow.WatchZoom);
}


static OnDragStart(e,d) {
   // console.info("MainWindow.OnDragStart");

        MainWindow.DragStartPos = { x: e.x, y: e.y };
        console.info(MainWindow.DragStartPos);
        MainWindow.SelectRect = gLabel.append('rect');
        MainWindow.SelectRect
            //.attr('x', e.x)
          //  .attr('y', e.y)
            .attr('width','30')
            .attr('height','30')
            .style('fill-opacity','1')
            ;



}

static OnDrag(e,d) {
 //   console.info("MainWindow.OnDrag");
 //           console.info([e.x, e.y]);
        MainWindow.SelectRect
            .attr('width', e.x - MainWindow.DragStartPos.x)
            .attr('height', e.y - MainWindow.DragStartPos.y)
            ;


}

static OnDragEnd(e,d) {
 //   console.info("MainWindow.OnDragEnd");
        console.info( { x: e.x, y: e.y } );
}

//-------------------------------------------------------------------------------


}


let mw_drag = d3.drag()
    .on('start', MainWindow.OnDragStart)
    .on('drag', MainWindow.OnDrag)
    .on('end', MainWindow.OnDragEnd)  
    ;



            var svg = d3.select('body').append('svg')
                .attr('width',window.innerWidth)
                .attr('height', window.innerHeight)
                // set origin to centre of svg
                .attr('viewBox', [-500, -500, 1000, 1000] ) // case-sensitive attribute name !!
                .call(mw_drag);

            // group frames are passive shapes in the background
            const gGroup = svg.append('g')
                .classed( 'group', true )
                ;

            const gNode = svg.append("g"); // circles

            // links are rendered in front of circles. 
            
            // first the extended click zones, for better visual feedback & easier clicking
            const gLinkZone = svg.append('g')
                .classed( 'linkzone', true )
                ;
            // then the polyline edge arrows themselves (with events passing through)
            const gLink = svg.append('g')
                .classed( 'edge', true )
                ;
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

// create an SVGPoint for future math - but do we even need it?
// const pt = svg.node().createSVGPoint(); 
// get point in global SVG space

const supabaseClient = supabase.createClient(
    APP_CONFIG.supabaseUrl,
    APP_CONFIG.supabaseAnonKey
);


//-------------------------------------------------------------------------------

// used in ticked(), drag() to ensure objects never disappear out of viewport window
function bounded(x,a,b) {
    if ( x < a ) x = a;
    if ( x > b ) x = b;
    return x;
}
//-------------------------------------------------------------------------------


// function cursorPoint_deprecated(evt) {
//     pt.x = evt.clientX; pt.y = evt.clientY;
//     return pt.matrixTransform(svg.getScreenCTM().inverse());
//     }


MainWindow.OnResize();
MainWindow.WatchZoom();

window.addEventListener("resize", MainWindow.OnResize);

