class Label extends Node {
  
    static UniqueId(d) { return Node.UniqueId(d); }
    static IsVisible(d) { return d.show_label && d.has_shape; }
    static FontColour(d) { return Node.ShowAsFloatingFrame(d) ? Node.FillColour(d) : "blue"; }
    static FontSize(d) { return Node.ShowAsFloatingFrame(d) ? 12 : 8; }
    static Width(d) { return Node.ShowAsFloatingFrame(d) ? Frame.Width(d) : Node.Width(d); } 
    static Height(d) { return Node.ShowAsFloatingFrame(d) ? Frame.Height(d) : Node.Height(d); }  
    static OffsetX(d) { return -Label.Width(d) / 2; }
    static OffsetY(d) { return -Label.Height(d) / 2; }
    static Classes(d) { 
        if ( Node.ShowAsFloatingFrame(d) ) return ["frameinfo"] ;
        return ( Node.HasMembers(d) ? [ "has_members"] : ["circleinfo"] );
    }
    static HtmlText(d) { return Node.Tag(d); }
    static SetAttributes(d) { 
       this.setAttribute('transform',`translate(${Node.Centre(d).x},${Node.Centre(d).y})`);
       }
    static OnTick() { gLabel.selectAll('.labelmain').each(Label.SetAttributes);  }

    static OnWheel(d) { 
        // TODO use d.r to update scale of image
    }


}

function AppendLabels() {

gLabel.selectAll('g').remove(); // otherwise we get duplicates on data refresh
// which seems odd, i thought join('g') would handle all that
    
    const labels = gLabel.selectAll('g') 
        .data(nodes.filter(Label.IsVisible), Label.UniqueId)  
            .join('g')  
                .attr('id', Label.UniqueId)
                .classed('labelmain',true)
                ;

// TODO: special WYSIWYG interactive zoom & pan of each individual image so it's always centred in crop circle
// eg using 'right-ctrl-down' or 'function-down' 
// as initial default can we obtain original height & width from the image file itself? 
//  Image.naturalWidth  and Image.naturalHeight work for JPG and SVG images
// having loaded each one, at least it's now in the browser cache. Any benefit in using the blob while it's in Javascript memory? 
// or should we just discard after calculating offset and scale?
    const scale = 0.15, // this is the one parameter that we want to adjust with wheel
        width = 2*CROP_CIRCLE_CX,
        height = width,
        xoffset = -CROP_CIRCLE_CX * scale,
        yoffset = xoffset,
        svg = "https://cdn.worldvectorlogo.com/logos/warner-music-international.svg",
        transform = `translate(${xoffset}, ${yoffset}) scale(${scale})`;

        labels
            .filter(d => d.img_src > "" )
            .append('g')
                .attr('transform',transform)
            //    .attr('opacity',0.5) // adds a lot of CPU work when debugging
                .attr('clip-path','url(#cropCircle)')
                .append('image')
                    .attr('href',d => d.img_src)
                   //  .attr('href',svg)
                    .attr('width',width)
                    .attr('height',height)
                  //  .attr('transform',"translate(0, 0) scale(1)")
                    .attr('transform',"scale(1)") // these 3 parameters would be stored in the node record
                    ;


        labels 
            .append("foreignObject") // add a child element per node-group. 
                .attr("x", Label.OffsetX) // relative to parent 'g' element, centred on node (x,y)
                .attr("y", Label.OffsetY)
                .attr("width", Label.Width)
                .attr("height", Label.Height)
                .append("xhtml:div") // add a grandchild DIV element inside the foreignObject - we need the strictness of XHTML when inside an SVG 
                    .attr("class", Label.Classes) // let CSS handle the rest
                    .style('color',Label.FontColour)
             //       .style('font-size',Label.FontSize)  
                    .html(Label.HtmlText) 
                    ;


}

// circular clip path for photo inside node
// 
const CROP_CIRCLE_CX = 150, CROP_CIRCLE_R = 150
cropCircle = defs
    .append("clipPath")
        .attr("id","cropCircle") 
        .append("circle")
            // these attributes work for LinkedIn mugshots, but not for arbitrary photos
            .attr("cx",CROP_CIRCLE_CX) 
            .attr("cy",CROP_CIRCLE_CX)
            .attr("r",CROP_CIRCLE_R)
;