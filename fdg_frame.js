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
        t = theta * (180 / Math.PI),  // just for clarity      
        crit_rad = Math.atan2( Frame.Height(d), Frame.Width(d) ), // allow for outer margin
        c = crit_rad * (180 / Math.PI), // range [0,90]

        v =   t < c -180 ?  { side: 'left',   dim: 'x', k: Frame.LeftOuter(d),   a: -theta } :
              t < 0-c ?     { side: 'top',    dim: 'y', k: Frame.TopOuter(d),    a: theta-Math.PI/2 } :
              t < c ?       { side: 'right',  dim: 'x', k: Frame.RightOuter(d),  a: theta+Math.PI } :
              t < 180-c ?   { side: 'bottom', dim: 'y', k: Frame.BottomOuter(d), a: -theta-Math.PI/2 } :
                            { side: 'left',   dim: 'x', k: Frame.LeftOuter(d),   a: -theta },


        point = v.dim == 'x' ? { x: v.k, y: Frame.Centre(d).y + ( Frame.HalfWidth(d)  * Math.tan(v.a) ) } :
                               { y: v.k, x: Frame.Centre(d).x + ( Frame.HalfHeight(d) * Math.tan(v.a) ) } ;

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
    return 20;
}

//-------------------------------------------------------------------------------
// reserved space for rotated heading at left of frame
static StubWidth(d) {
    return 20;
}
//-------------------------------------------------------------------------------
// default buffer for non-heading sides
    static Margin(d) { return 0 }; 

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

d3.selectAll('.frameinfo') 
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
        [d.x, d.y] = cXcY;

        d.is_group = 0; // render as circle

        if ( ! bExploded ) {  // default: 'implode' = soft-hide all contents & transplant connected links so they point to this container node
            d.descendants
                .filter( c => c != d ) 
                .filter( c => c.collapsed_into_node == null ) // no need to touch if already collapsed
                .forEach( c => { // for each descendant except self
                  //  c.soft_hide = 1;  // DEPRECATED
                    // TODO: Do NOT collapse until/unless ALL visible parents are now circles, not nodes
                    c.collapsed_into_node = d;
                    console.log(c);
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
        AppendLabels(); // now includes circles 


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

   static OnClick(e,d) {

    // TODO: debug - sometimes, just clicking a frame triggers Node.Create() - but why?


        console.log('Frame.OnClick',e,d,this);
        //    const bb = GetCombinedBBox(Frame.DescendantShapesSVG(d));
        //    console.log('GetCombinedBBox()',bb);
        //    console.log(Frame.Coordinates(d));

   const cursor = window.getComputedStyle(this).cursor;

    switch ( cursor ) {
        case 'zoom-out' : // switch to a circle either collapsed, or (if ctrl key) 'exploded';
            Frame.ToCircle(d, e.ctrlKey, d3.pointer(e,svg.node())); 
            break;
        default: // toggle selected status, then cascade to all descendants
            d.selected ^= 1;
            AllDescendantsOf(d).forEach( c => {
                c.selected = d.selected;
                } );
            gGroup.selectAll('.frame-whole')
                .filter(f => d.descendants.includes(f)) // or .has(f) ??
                .classed('selected', d => d.selected)  
                .classed('disabled', d => !d.selected)
                ;
            break;
    }

    ticked();

    }

    //-------------------------------------------------------------------------------

    static SetLocked(d,element,status=null) {
        d.locked = status == null ? d.locked ^ 1 : status & 1 ;
        d3.select(element)
            .attr('rx', Frame.CornerRadius)
            .attr('ry', Frame.CornerRadius)
            .classed('locked',d.locked)
        ;
      }

    //-------------------------------------------------------------------------------

    // because smartphone doesn't have a shift key
   static OnDblClick(e,d) { //  show as a circle , hiding children
        if ( e.ctrlKey ) 
            Frame.SetLocked(d,this);
        else  
            Frame.ToCircle(d, false, d3.pointer(e,svg.node())); // true => implode
        
        d.selected = 1;
        d.descendants.forEach(c => c.selected = 1);



        ticked();

   }

   //-------------------------------------------------------------------------------

    static Centre(d) { return { x: d.x + d.width/2, y: d.y + d.height/2 }    }

    static Left(d) { return d.x - Frame.Margin(d) }; 
    static LeftInner(d) { return d.x + Frame.StubWidth(d) }; 
    static LeftOuter(d) { return d.x }; 

   static Top(d) { return d.y - Frame.Margin(d) };
    static TopOuter(d) { return d.y };

//  TODO avoid unwanted side effects when used by Frame.ContactPoint()
// Frames must clearly distinguish between 'inner' and 'outer' boundaries. 
 
    static Right(d) { return d.x + d.width + Frame.Margin(d) }; 
    static RightOuter(d) { return d.x + d.width }; 

    static Bottom(d) { return d.y + d.height + Frame.Margin(d) };
    static BottomOuter(d) { return d.y + d.height };
 
    static Width(d) { return d.width + 2*Frame.Margin(d) } ;
    static WidthOuter(d) { return d.width } ;

    static Height(d) { return d.height + 2*Frame.Margin(d) } ;
    static HeightOuter(d) { return d.height } ;

    // static HalfWidth(d)  { return d.width/2 + Frame.Margin(d) };
       static HalfWidth(d)  { return d.width/2 };

//    static HalfHeight(d) { return d.height/2 + Frame.Margin(d) };
    static HalfHeight(d) { return d.height/2 };

    static CornerRadius(d) {  return d.locked ? 0 : 1.5 * radius ;};
   
    static TransformImageElement(d) { return `${d.img_transform}` ; }
//    static TransformImageElement(d) { return `${d.img_transform}` ; }

//-------------------------------------------------------------------------------
// called at each tick(), for each frame

static TransformGroupElement_XX(d) { 
        // resize with cicle's radius
        const 
            r = d.width, 
            scale = r / CROP_CIRCLE_RADIUS, 
            offset = -r;
        return `translate(${offset}, ${offset}) scale(${scale})`;

}


    static TransformGroupElement(d) { 
            const 
                xoffset = Frame.LeftOuter(d), 
                yoffset = Frame.TopOuter(d);
            return `translate(${xoffset}, ${yoffset})`;

    }
//-------------------------------------------------------------------------------

// called by Frame.OnTick()

static Resize(d) {

//    DO NOT use VisibleDescendantsOf(d) here
    const visible_children = VisibleChildrenOf(d); 

    if ( !d.locked && visible_children.length ) { 

        const
            xMax = Math.max( ...visible_children.map( Node.RightOuter ) ) + Frame.Margin(d),
            xMin = Math.min( ...visible_children.map( Node.LeftOuter) ) - Frame.StubWidth(d),
            yMax = Math.max( ...visible_children.map( Node.BottomOuter ) ) + Frame.Margin(d),
            yMin = Math.min( ...visible_children.map( Node.TopOuter ) )  - Frame.BannerHeight(d);
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

    console.log('Frame.OnDragStart',e,d,this,selThisNode);
    Frame.DraggedFromInfo = 
        {   x: d.x, y: d.y, 
            w: d.width, h: d.height, 
            cx: d.x+d.width/2, cy: d.y+d.height/2,
            dx: e.x - d.x, dy: e.y - d.y
        };
    Frame.DraggedD3Selection = selThisNode.classed("dragging", true); 
    Node.BringToFront(Frame.DraggedD3Selection);
        
    ticked();
}
//-------------------------------------------------------------------------------

static OnDrag(e,d) {

if ( d.locked ) {
    // move the rect 

} else {
// induce descendants to move, by setting their COG - let the unlocked frame float with them
const [x,y] = d3.pointer(e,svg.node());

    d.descendants.forEach(d => { 
            d.cogX = x - Frame.DraggedFromInfo.dx ; 
            d.cogY = y - Frame.DraggedFromInfo.dy }
        )
            simulation
                .force( 'cogX', d3.forceX( Node.COGX )
                    .strength( Node.ForceX ) )
                .force( 'cogY', d3.forceY( Node.COGY )
                    .strength( Node.ForceY ) );
    }

    ticked();
}

//-------------------------------------------------------------------------------

static OnDragEnd(e,d) {

    console.log('Frame.OnDragEnd',e,d,this);
    svg.classed('left-mouse-down',false);  // because OnDragEnd() blocks mouseup
   const cursor = window.getComputedStyle(this).cursor;

    Frame.DraggedD3Selection.classed("dragging", false); 
    Frame.DraggedD3Selection = null;

    ticked();

}

//-------------------------------------------------------------------------------

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

gGroup.selectAll('g').remove();

const gTop = 
    gGroup.selectAll('rect') 
      .data(sorted_nodes
        .filter(Node.ShowAsFrame), 
        Node.UniqueId) 
    .join('g')  // top-level container for all elements of the frame (rect, image, HTML content) 
        .attr('id', Node.UniqueId)
        .classed('frame-whole',true)
        ;

gTop
    .append('rect')
        .classed('frame-rect',true)
        .classed('locked',d=>d.locked)
        .attr('id', Node.UniqueId) 
        .attr('rx', Frame.CornerRadius)
        .attr('ry', Frame.CornerRadius)
        .attr('fill',Node.FillColour) 
// pointer events should go to (rounded) rect shape, not its parent g
        .on('click', Frame.OnClick)
        .on('dblclick', Frame.OnDblClick)
        .on('mouseover', Frame.OnMouseOver) 
        .on('mouseout', Frame.OnMouseOut)
        .on("contextmenu", Frame.OnContextMenu)
        .call(d3.drag()
            .on('start', Frame.OnDragStart)
            .on('drag', Frame.OnDrag)
            .on('end', Frame.OnDragEnd)  
            )
        ;

const gHeader = gTop
    .filter(d => d.img_src > "" )
    .append('g')
    .classed('frame-header',true) // this is the element that is transformed every tick
    ;
// TODO: cater for rotated frame-stub on left edge, not just frame-header

gHeader 
    .append('g') // extra level of grouping seems to help
        .classed("frame-image-whole",true) 
        .attr('transform','translate(3,3) scale(0.08)') 
        .append('g')
            .classed("frame-image-clipped",true) 
            .attr('transform',Frame.TransformGroupElement)  
            .attr('clip-path','url(#cropCircle)')
            .append('image') 
                .attr('href',d => d.img_src)
                .attr('width',CROP_CIRCLE_DIAMETER)
                .attr('height',CROP_CIRCLE_DIAMETER)
                .attr('transform', Frame.TransformImageElement)
                ;

gHeader
    .append('foreignObject')
        .classed('frame-foreignObject',true)
        .attr('x', d => Frame.StubWidth(d)+5)
        .attr('y', 4)
        .attr("width", Frame.WidthOuter) // should be inner
        .attr('height',d => Frame.BannerHeight(d)+5)
        .append('xhtml:div')
            .classed('frame-div',true)
            .html(Label.HtmlText) ;

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

