class Frame extends Node {

    static IsExclusive(d) {  
        // to decide whether non-members will be pushed out by active_exclusion force
        // TODO: a frame is exclusive iff it is in the foreground ??
        return ( d.is_group && HasVisibleChild(d) ); // for now, all frame rects are exclusive    
    }

    //-------------------------------------------------------------------------------

    static Visibility(d) {
        return HasVisibleChild(d) ? 'visible' : 'hidden'
    }

//-------------------------------------------------------------------------------
// returns point where the rendered boundary of rect d intersects a ray with angle theta (from atan2) and origin at centrepoint of d
// Partitions the space into 4 quadrants  Compares angles to determine which quadrant contains the ray and therefore 
// which one of the rect sides will contain the intersection point.

static ContactPoint(d,theta) { 

const
        t = theta * (180/Math.PI),  // just for clarity      
        crit_rad = Math.atan2(d.height,d.width), 
        c = crit_rad * (180/Math.PI), // range [0,90]

        v =   t < c -180 ?  { side: 'left',   dim: 'x', k: Frame.LeftOuter(d),   a: -theta } :
              t < 0-c ?     { side: 'top',    dim: 'y', k: Frame.TopOuter(d),    a: theta-Math.PI/2 } :
              t < c ?       { side: 'right',  dim: 'x', k: Frame.RightOuter(d),  a: theta+Math.PI } :
              t < 180-c ?   { side: 'bottom', dim: 'y', k: Frame.BottomOuter(d), a: -theta-Math.PI/2 } :
                            { side: 'left',   dim: 'x', k: Frame.LeftOuter(d),   a: -theta },


        point = v.dim == 'x' ? { x: v.k, y: Frame.Centre(d).y + ( d.width/2  * Math.tan(v.a) ) } :
                               { y: v.k, x: Frame.Centre(d).x + ( d.height/2 * Math.tan(v.a) ) } ;

  // TODO : what if the point falls at a rounded corner (within Frame.CornerRadius of that corner)
  // maybe a clip path can help? Except it would have to change with every tick

return point;

}

//-------------------------------------------------------------------------------
// extra space to push non-member circles further outside
static ExclusionBuffer(d) {
    return 25;
}


//-------------------------------------------------------------------------------
// reserved space for banner heading at top of frame
static BannerHeight(d) {
    return 30;
}

//-------------------------------------------------------------------------------
// reserved space for rotated heading at left of frame
static StubWidth(d) {
    return 30;
}
//-------------------------------------------------------------------------------
// default buffer for non-heading sides
    static Margin(d) { return 6 }; 

//-------------------------------------------------------------------------------

static OnMenuItemClick(e,d) {
    console.log('Frame.OnMenuItemClick',e,e.target);
}

//-------------------------------------------------------------------------------

static OnContextMenu(e,d) {

    e.preventDefault();

    menu
      .style("display", "block") 
      .style("left", e.pageX + "px")
      .style("top", e.pageY + "px")
      .html(`
        <div class="item"><b>Set: ${d.node_id}</b></div>
        <div class="item">${d.descriptor}</div>
      `)
      .on('click',Frame.OnMenuItemClick)
      ;

}

   //-------------------------------------------------------------------------------
    // set or unset the 'xhover' class for node d plus all its descendants

   static Hover( d, bHovering ) {

    const s = d3.selectAll('circle, rect') 
        .filter( e => d.descendants.includes(e) ) 
        .classed( 'xhover', bHovering ) ;

d3.selectAll('.region.whole') 
        .filter( e => d == e ) // not subsets
        .classed( 'xhover', bHovering ) ;

//console.log(bHovering,s);

    if ( Node.DraftLineFromD3Selection ) {
        s.classed("drafting", bHovering);
        } 
   }
   //-------------------------------------------------------------------------------

   static OnMouseOver(e, d) {
    // MouseOver also fires when entering any child element

        mouseover_d3selection = d3.select(this);
        mouseover_datum = d;
        mouseover_dom_element = this;
        //mouseover_d3selection.raise(); // frames must stay in nesting heirarchy
        Frame.Hover( d, true );
   }

   //-------------------------------------------------------------------------------

   static OnMouseOut(e, d) {

  //  console.log('Frame.OnMouseOut',e,d,this);
    if (e.toElement && e.toElement.localName == 'line') return; // better UX if we ignore frame mouseout passing over link line

    //if (e.button) return; //  ignore if still dragging 
        mouseover_d3selection.classed("valid_target",false);
        Frame.Hover( d, false );
        mouseover_d3selection = null;
        mouseover_datum = null;
        mouseover_dom_element = null;
   }

   //-------------------------------------------------------------------------------
// TODO: Save every descendant so we can restore expand-collapse config exactly as it was.
static ToCircle(d, bExploded, cXcY) {
    // replace the frame with a circle at cXcY, refresh attributes
    [d.cogX, d.cogY] = [d.x, d.y] = cXcY;
    if (d.locked) [d.fx, d.fy] = cXcY;
    d.is_group = 0; // render as circle

    if ( ! bExploded ) {  // default: 'implode' = soft-hide all contents & transplant connected links so they point to this container node
        d.descendants
            .filter( c => c != d ) 
            .filter( c => c.collapsed_into_node == null ) // no need to touch if already collapsed
            .forEach( c => { // for each descendant except self
                // TODO: Do NOT collapse until/unless ALL visible parents are now circles, not frames
                c.collapsed_into_node = d;
                // console.log(c);
                // for all in and out links, set this node d as the virtual/effective end point
                c.inLinks
                    //.filter(Link.ShowAsLine) //not sure if we need to exclude any?
                    .forEach( lnk => { lnk.target = d; } );
                c.outLinks
                    //.filter(Link.ShowAsLine)
                    .forEach( lnk => { lnk.source = d } );

                } );
        // TODO: recalculate and cache the 'effective' node-pair for links that reference a leaf node that is now hidden (as a descendant node)
        // if both ends now point to d then the link should not be rendered 
        // likewise, roll up the leaf-node mass values and change the 'effective' mass of this newly collapsed container


        }
    AppendFrameShapes();
    AppendLines();
    AppendNodes(); 

        // these might not be necessary
    Cache.RefreshAllDescendants();
    Cache.RefreshSortedNodes();
    Cache.ApplyFrameOrder();

    RefreshSimData(); 

}

   //-------------------------------------------------------------------------------

static DescendantShapesSVG(d) {
   return d3.selectAll('circle,rect').filter(e => d.descendants.slice(1).includes(e));
   // don't include non-SVG elements. getBBox() only works for SVG.
    }

   //-------------------------------------------------------------------------------

   static OnClick(e,f) {
    
   const cursor = window.getComputedStyle(this).cursor,
         cXcY = d3.pointer(e,svg.node());

    console.log('Frame.OnClick(e,f),this,cxcY',e,f,this,cXcY);

    switch ( cursor ) {
        case 'zoom-out' : // switch to a circle either collapsed, or (if ctrl key) 'exploded';
            Frame.ToCircle(f,e.ctrlKey,cXcY); 
            break;
        default: // toggle selected status, then cascade to all descendants
            f.selected ^= 1;
            AllDescendantsOf(f).forEach( c => {
                c.selected = f.selected;
                } );

            d3.selectAll('.whole')
                .filter(n => f.descendants.includes(n)) // or .has(f) ??
                .classed('selected',f.selected) ;

            break;
    }

    ticked();

    }

    //-------------------------------------------------------------------------------

    static SetCentroid(f,[x,y],burst=false) {

        f.descendants.forEach(n => { n.cogX = x, n.cogY = y });
        if (burst) { // start from a 'singularity', repulsion forces will create the desired effect
            f.descendants.forEach(n => { n.x = x, n.y = y });
        }

        if (f.locked) { // move the frame box fx,fy so its centre is at x,y
            f.fx = f.x = x - f.width/2;
            f.fy = f.y = y - f.height/2;
        }

        // TODO: if we don't explicitly recreate forceX & forceY while dragging, the children 
        // don't move and neither does the floating parent frame?
        simulation
            .force( 'cogX', d3.forceX( Node.COGX )
                .strength( Node.ForceX ) )
            .force( 'cogY', d3.forceY( Node.COGY )
                .strength( Node.ForceY ) );

    }


    //-------------------------------------------------------------------------------

    static SetLocked(d,element,status=null) {
        d.locked = status == null ? d.locked ^ 1 : status & 1 ;
        d3.select(element)
            .attr('rx',Frame.CornerRadius)
            .attr('ry',Frame.CornerRadius)
            .classed('locked',d.locked)
        ;
      }

    //-------------------------------------------------------------------------------

    // because smartphone doesn't have a shift key
   static OnDblClick(e,d) { //  show as a circle, hiding children
        if ( e.ctrlKey ) 
            Frame.SetLocked(d,this);
        else  
            Frame.ToCircle(d, false, d3.pointer(e,svg.node())); // true => implode
        Node.Activate(d.descendants);
        ticked();

   }

   //-------------------------------------------------------------------------------

    static Centre(d) { return { x: d.x + d.width/2, y: d.y + d.height/2 }    }

    static LeftOuter(d) { return d.x }; 
    static LeftInner(d) { return d.x + Frame.StubWidth(d) }; 

    static TopOuter(d) { return d.y };
    static TopInner(d) { return d.y + Frame.BannerHeight(d) }; 

    static RightOuter(d) { return d.x + d.width }; 
    static RightInner(d) { return d.x + d.width - Frame.Margin(d) }; 
    
    static BottomOuter(d) { return d.y + d.height };
    static BottomInner(d) { return d.y + d.height - Frame.Margin(d) }; 
 
    static WidthOuter(d) { return d.width } ;
    static WidthInner(d) { return d.width - Frame.StubWidth(d) - Frame.Margin(d) } ;

    static HeightOuter(d) { return d.height } ;
    static HeightInner(d) { return d.height - Frame.BannerHeight(d) - Frame.Margin(d) } ;


    static CornerRadius(d) {  return d.locked ? 0 : 1.5 * radius ;};
   
    static TransformImageElement(d) { return `${d.img_transform}` ; }

    static TransformWhole(d) { return `translate(${d.x},${d.y})`; }

    static TransformStub(d) { return `translate(0,${d.height}) rotate(270)`; }

    
//-------------------------------------------------------------------------------
// final one-time adjustment for the clipped thumbnail image
// x,y offset from top left corner of the whole g element (which is determined by its rect)
    static TransformClippedImage(d) {
        return "translate(5,3) scale(0.08)";
    }

//-------------------------------------------------------------------------------

static OnTick() {
    gAllRegions.selectAll('.whole')
        // don't exclude locked frame just in case its being dragged
        .classed('drag_selected',ViewBox.DragRectIncludes)
        .attr('transform',Frame.TransformWhole);

    gAllRegions.selectAll('.rect')
        .attr('height',Frame.HeightOuter)
        .attr('width',Frame.WidthOuter);
}

//-------------------------------------------------------------------------------

// called by active_exclusion force
static Resize(d) {

    const scope = VisibleDescendantsOf(d); // other than self

    if ( !d.locked && scope.length ) { 

        const
            xMax = Math.max( ...scope.map( Node.RightOuter ) ) + Frame.Margin(d),
            xMin = Math.min( ...scope.map( Node.LeftOuter) ) - Frame.StubWidth(d),
            yMax = Math.max( ...scope.map( Node.BottomOuter ) ) + Frame.Margin(d),
            yMin = Math.min( ...scope.map( Node.TopOuter ) )  - Frame.BannerHeight(d);
        d.x = xMin,
        d.y = yMin ,
        d.width = xMax - xMin,
        d.height =yMax - yMin ;
    } };

 //------------------------------------------------------------

static OnDragStart(e,d) {
   const selThisNode = d3.select(this);
//   const selHits = ViewBox.HitTestSelection(e);
   svg.classed('left-mouse-down',true);

   const [x,y] = d3.pointer(e,svg.node());

    console.log('Frame.OnDragStart',e,d,this,selThisNode);
    Frame.DraggedFromInfo = 
        {   x: d.x, y: d.y, 
            w: d.width, h: d.height, 
            cx: d.x+d.width/2, cy: d.y+d.height/2,
            dx: x - d.x, dy: y - d.y
        };
    Frame.DraggedD3Selection = selThisNode.classed("dragging", true); 
    Node.BringToFront(Frame.DraggedD3Selection);
        
    ticked();
}
//-------------------------------------------------------------------------------

static OnDrag(e,d) {

const [x,y] = d3.pointer(e,svg.node());


if ( d.locked ) {
    // move the frame
            d.x = x - Frame.DraggedFromInfo.dx ; 
            d.y = y - Frame.DraggedFromInfo.dy ;

    // TODO: How to treat 'shared custody' child elements 'left behind' inside another locked rect?
    // Automatically show the 'problem' link as a line instead (with the left-behind node staying in its non-dragged container)
    // that involves creating a polyline, temporarily! Then deleting it as soon as we don't need it any more?
    // or is it better to create all polylines that only participate in sim & tick while they are visible?
    // just like other situations where Euler-diagram mode is disabled or unsupported
    // basically whenever there are 2+ parent nodes with Euler mode preferred, but contours/regions not able to intersect
    // also for each visible parent NOT in Euler mode, we treat the child-to-parent 'H' connection as a directed line instead.
    
} 

// regardless, we also induce all descendants to move en masse, by setting their COG
// (If d is unlocked then its frame contour moves with them...)

Frame.SetCentroid(d,[x,y]);



 ticked();
}

//-------------------------------------------------------------------------------

static OnDragEnd(e,d) {

    console.log('Frame.OnDragEnd',e,d,this);
    svg.classed('left-mouse-down',false);  // because OnDragEnd() blocks mouseup
   const cursor = window.getComputedStyle(this).cursor;

    Frame.DraggedD3Selection.classed("dragging", false); 
    Frame.DraggedD3Selection = null;
    Frame.ReformatAllLabels();

    ticked();

}

//-------------------------------------------------------------------------------

static HtmlNotes() {
    return`
                The foreignObject defines a fixed rectangular viewport for the HTML.
<ul>
<li> Inside that viewport, CSS behaves exactly like normal HTML.
<li>No special SVG rules apply — flexbox, grid, absolute positioning all work as expected.
<li>If you rotate the foreignObject, the centring still works, but the visual result depends on the transform order (which I can help you tune if needed).
</ul>            
The foreignObject defines a fixed rectangular viewport for the HTML.
<ol>
<li> Inside that viewport, CSS behaves exactly like normal HTML.
<li>No special SVG rules apply — flexbox, grid, absolute positioning all work as expected.
<li>If you rotate the foreignObject, the centring still works, but the visual result depends on the transform order (which I can help you tune if needed). -->
            - The foreignObject defines a fixed rectangular viewport for the HTML.
<li>Inside that viewport, CSS behaves exactly like normal HTML.
<li>No special SVG rules apply — flexbox, grid, absolute positioning all work as expected.
<li>If you rotate the foreignObject, the centring still works, but the visual result depends on the transform order (which I can help you tune if needed).
</ol>            
            - The foreignObject defines a fixed rectangular viewport for the HTML.
<ul>
<li>Inside that viewport, CSS behaves exactly like normal HTML.
<li>No special SVG rules apply — flexbox, grid, absolute positioning all work as expected.
<li>If you rotate the foreignObject, the centring still works, but the visual result depends on the transform order (which I can help you tune if needed). -->
</ul>
    `;
}

//-------------------------------------------------------------------------------

static ReformatAllLabels() {
// called after mouse click or drag end
gAllRegions.selectAll('.banner')
    .attr('width',Frame.WidthInner);

gAllRegions.selectAll('.stub')
    .attr('width',Frame.HeightInner)
    .attr('transform',Frame.TransformStub);

gAllRegions.selectAll('.body')
    .attr('width',Frame.WidthInner)
    .attr('height',Frame.HeightInner);

}

}

//-------------------------------------------------------------------------------

// Depth-first search to return a list of all descendants of a given start node
// called by Cache.RefreshAllDescendants()
// TODO: look at making this a static function of class Node (or Graph ?)


function AllDescendantsOf(start, visited = new Set(), result = []) {
  if (visited.has(start)) // avoid cycles
    return result;

  visited.add(start); 
  result.push(start);

  for (const child of ChildrenOf(start) || []) {
    AllDescendantsOf(child, visited, result);
  }
  return result;
}


//-------------------------------------------------------------------------------

function AllAncestorsOf(start, visited = new Set(), result = []) {
  if (visited.has(start)) // avoid cycles
    return result;

  visited.add(start); 
  result.push(start);

  for (const parent of ParentsOf(start) || []) {
    AllAncestorsOf(parent, visited, result);
  }
  return result;
}

//-------------------------------------------------------------------------------

function AppendFrameShapes() {

gAllRegions.selectAll('g').remove();

const selWholeRegions = 
    gAllRegions.selectAll('g') 
      .data(sorted_nodes.filter(Node.ShowAsFrame), 
        Node.UniqueId) 
    .join('g')  // top-level container
        .attr('id',Node.UniqueId)
        .classed('region whole',true)
        .classed('locked',d=>d.locked)
        .on('click',Frame.OnClick)
        .on('dblclick',Frame.OnDblClick)
        .on('mouseover',Frame.OnMouseOver) 
        .on('mouseout',Frame.OnMouseOut)
        .on("contextmenu",Frame.OnContextMenu)
        .call(d3.drag()
            .on('start',Frame.OnDragStart)
            .on('drag',Frame.OnDrag)
            .on('end',Frame.OnDragEnd)  
            )
        ;

selWholeRegions
    .append('rect')
        .classed('region rect',true)
        .attr('rx',Frame.CornerRadius)
        .attr('ry',Frame.CornerRadius)
        .attr('fill',Node.FillColour) 

const selThumbnails = selWholeRegions
    .filter(d => d.img_src > "" )
    .append('g')
        .classed('image clipped',true) 
        .attr('clip-path',"url(#cropCircle)")
        .attr('transform',Frame.TransformClippedImage)  
            .append('image') 
                .classed('image raw',true) 
                .attr('href',d => d.img_src)
                .attr('width',CROP_CIRCLE_DIAMETER)
                .attr('height',CROP_CIRCLE_DIAMETER)
                .attr('transform', Frame.TransformImageElement) // same as for Node unclipped 
                ;


const selBanners = selWholeRegions
    .filter(d => d.descriptor > "")
    .append('foreignObject')
        .classed('fob banner',true)
        .attr('x',Frame.StubWidth)
        .attr("width",Frame.WidthInner) 
        .attr('height',Frame.BannerHeight)
        .append('xhtml:div')
            .html(d => d.descriptor) ;

const selStubs = selWholeRegions
    .filter(d => d.tag > "")
    .append('foreignObject')
        .classed('fob stub',true)
        .attr('height',Frame.StubWidth)
        .attr('width',Frame.HeightInner) 
        .attr('transform',Frame.TransformStub)
        .append('xhtml:div')
            .html(d => d.tag) ;

const selNotes = selWholeRegions
    .filter(d => d.descriptor > "")
    .append('foreignObject')
        .classed('fob body scrollable',true)
        .attr('x',Frame.StubWidth)
        .attr('y',Frame.BannerHeight)
        .attr("width",Frame.WidthInner) 
        .attr('height',Frame.HeightInner)
        .append('xhtml:div')
            .html(Frame.HtmlNotes) ;




}
//---------------------------------------------------------------------------------
function GetCombinedBBox( sel ) {
    const boundingBoxes = sel.nodes().map(shape => shape.getBBox());

    const combinedBBox = boundingBoxes.reduce((acc, bbox) => ({
        x: Math.min(acc.x, bbox.x),
        y: Math.min(acc.y, bbox.y),
        width: Math.max(acc.x + acc.width, bbox.x + bbox.width) - Math.min(acc.x, bbox.x),
        height: Math.max(acc.y + acc.height, bbox.y + bbox.height) - Math.min(acc.y, bbox.y)
    }));

    return combinedBBox;

}

