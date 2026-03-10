class Label extends Node {
  
    static UniqueId(d) { return Node.UniqueId(d); }
    static IsVisible(d) { return d.show_label && d.has_shape; }
    static FontColour(d) { return Node.ShowAsFrame(d) ? Node.FillColour(d) : "blue"; }
    static FontSize(d) { return Node.ShowAsFrame(d) ? 12 : 8; }
    static Width(d) { return Node.ShowAsFrame(d) ? Frame.Width(d) : Node.Width(d); } 
    static Height(d) { return Node.ShowAsFrame(d) ? Frame.Height(d) : Node.Height(d); }  
    static OffsetX(d) { return -Label.Width(d) / 2; }
    static OffsetY(d) { return -Label.Height(d) / 2; }
    static Classes(d) { 
        if ( Node.ShowAsFrame(d) ) return ["frameinfo"] ;
        return ( Node.HasMembers(d) ? [ "has_members"] : ["circleinfo"] );
    }
    static HtmlText(d) { return Node.Tag(d); }
    static SetAttributes(d) { 
       this.setAttribute('transform',`translate(${Node.Centre(d).x},${Node.Centre(d).y})`);
       }
    static OnTick() { 
            gNode.selectAll('.label').each(Label.SetAttributes)
            ;
            }
    static TransformImageElement(d) { return d.img_transform; }

// THIS MIGHT BE A SUSPECT

    static TransformGroupElement(d) { 
        // TODO: for expanded frames, allow logo to be at top (dedicated header) or centre (background)
        // 'top header mode' would need special treatment by active-exclusion force
        // banner header would exclude child shapes from first x pixels of frame
        // resize with cicle's radius
        const 
            w = Label.Width(d), h = Label.Height(d), // cater for rectangular frames as well as circular nodes
            r = h < w ? h/2 : w/2, // scale to fit inside smaller dimension of the label
            scale = r / CROP_CIRCLE_RADIUS, 
            offset = -r;
        return `translate(${offset}, ${offset}) scale(${scale})`;

}
}

//----------------------------------------------------------------

function AppendLabels() {

// This has superseded the AppendNodes function. Will need to change names later to reflect this.

gNode.selectAll('g').remove(); // otherwise we get duplicates on data refresh
// which seems odd, i thought join('g') would handle all that
    
const gTop = gNode.selectAll('g') 
    .data( nodes
            .filter(Node.ShowAsCircle) 
            .filter(Node.IsVisible) // to be improved using d.collapsed_into_node
          ,Label.UniqueId)  
    .join('g')  // all elements of the label (circle, image, HTML content) 
        .attr('id', Label.UniqueId)
        .classed('labelmain',true)
        .classed('disabled',true)
        ;

gTop
    .classed('has_members',Node.HasMembers)
    .on('mouseover',Node.OnMouseOver) 
    .on('mouseout',Node.OnMouseOut) 
    .on('click',Node.OnClick)
    .on('dblclick',Node.OnDblClick)
    .on('contextmenu',Node.OnContextMenu)
    .call(d3.drag()
        .on('start', Node.OnDragStart)
        .on('drag', Node.OnDrag)
        .on('end', Node.OnDragEnd)  
        )
        ;
    ;

gTop
    .append('circle')
        .attr('id',Node.UniqueId) 
        .attr('r',Node.Radius)
        .attr('fill',Node.FillColour)


// TODO: special WYSIWYG interactive zoom & pan of each individual image so it's always centred in crop circle
// eg using 'right-ctrl-down' or 'function-down' 


gTop
    .filter(d => d.img_src > "" )
    .append('g') 
    // TODO - this extra group is needed to apply the clip-path to both the image and its transform, 
    // but it does add an extra level of nesting  - not sure if it's worth trying to avoid it?
    // Maybe we can apply the clip-path to the label's main 'g' element instead, and then use a nested 'g' 
    // just for the image transform?
        .classed('label',true)
    //  .attr("class", Label.Classes) // let CSS handle the rest
        .append('g')
            .classed("image-group",true) // or "image-clipped"
            .attr('transform',Label.TransformGroupElement) // changes with every re-size tick (mouse wheel event)
            .attr('clip-path','url(#cropCircle)')
            .append('image') 
                .attr('href',d => d.img_src)
                .attr('width',CROP_CIRCLE_DIAMETER)
                .attr('height',CROP_CIRCLE_DIAMETER)
                .attr('transform', Label.TransformImageElement)  // one-time, position and scale the image relative to its crop circle
                ;
// TODO: subset filter for circles that (also) have HTML content, so we don't add the foreignObject if it's not needed.
// if there's an image, it will appear behind the HTML content
return;
labels 
    .filter(d => d.show_label) 
    .append("foreignObject") // add a child element per node-group. 
        .attr("x", Label.OffsetX) // relative to parent 'g' element, centred on node (x,y)
        .attr("y", Label.OffsetY)
        .attr("width", Label.Width)
        .attr("height", Label.Height)
        .append("xhtml:div") // add a grandchild DIV element inside the foreignObject - we need the strictness of XHTML when inside an SVG 
            .attr("class", Label.Classes) // let CSS handle the rest
            .style('color',Label.FontColour)
        //       .style('font-size',Label.FontSize)  
        //       .html(Label.HtmlText) 
            ;

}

//----------------------------------------------------------------

// generic clip path for jpg/svg inside node circles, before dynamic re-sizing
// 

const CROP_CIRCLE_CX = 150, CROP_CIRCLE_R = 150;

const 
    CROP_CIRCLE_RADIUS = 150, 
    CROP_CIRCLE_DIAMETER = CROP_CIRCLE_RADIUS * 2,
    cropCircle = defs
        .append("clipPath")
            .attr("id","cropCircle") 
            .append("circle")
                .attr("cx",CROP_CIRCLE_RADIUS) 
                .attr("cy",CROP_CIRCLE_RADIUS)
                .attr("r",CROP_CIRCLE_RADIUS)
    ;
