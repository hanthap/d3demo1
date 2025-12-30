            var width = window.innerWidth, height = window.innerHeight;
            var simulation;
            var simPassive;
            var frozen = false;

            var fencePosts = [];


            var x; // last clicked node
            const shape = "circle";
            var currentobject = null;


            var svg = d3.select('body').append('svg')
                .attr('width',width)
                .attr('height',height)
                // set origin to centre of svg
                .attr('viewBox', [-500, -500, 1000, 1000] ) // case-sensitive attribute name !!
                // interesting behaviour when window resizes - ALMOST good
                .attr('style', 'max-width:100%; height:auto; height:intrinsic;')

            // groups are passive shapes in the background
            const gGroup = svg.append('g')
                .classed( 'group', true )
                ;

            const gLinkZone = svg.append('g')
                .classed( 'linkzone', true )
                ;

            const gLink = svg.append('g')
                .classed( 'edge', true )
                ;

            const gNodeAR = svg.append('g'); // arrangements
            
            
            const gNode = svg.append("g"); // involved parties

            const defs = svg.append("defs");

            const pattern = defs
                .append("pattern")
                .attr("id", "green-pattern")
                .attr("height",1)
                .attr("width",0.05);

            const arrow = defs
                .append("marker")
                .attr("id","arrow") //  to invoke as polyline marker
                .attr("markerWidth",6)
                .attr("markerHeight",6)
                .attr("refX",6)
                .attr("refY",2)
                .attr("orient","auto")
                    .append("polygon")
                    .attr("points","0 0, 6 2, 0 4")
                    .attr("class","arrowhead");


// find your root SVG element
var svg = document.querySelector('svg');
// create an SVGPoint for future math
var pt = svg.createSVGPoint();
// get point in global SVG space

const supabaseClient = supabase.createClient(
    APP_CONFIG.supabaseUrl,
    APP_CONFIG.supabaseAnonKey
);


//-------------------------------------------------------------------------------

// used in ticked(), drag() to ensure objects never disappear out of frame
function bounded(x,a,b) {
    if ( x < a ) x = a;
    if ( x > b ) x = b;
    return x;
}




function cursorPoint(evt) {
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
    }