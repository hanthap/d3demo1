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

        labels 
            .append('g')
                // transform="translate(0, 0) scale(1.2)" opacity="0.5"
                .attr('transform',"translate(-50, -50) scale(0.25)")

                // .attr('opacity',0.5) // adds a lot of CPU work
                .attr('clip-path','url(#cropCircle)')
                .append('image')
                    .attr('href',"tara.jpg")
                    .attr('width',300)
                    .attr('height',300)
             //       .attr('transform',"translate(0, 0) scale(1)")
                    ;

}

// circular clip path for photo inside node
const cropCircle = defs
    .append("clipPath")
        .attr("id","cropCircle") 
        .append("circle")
            .attr("cx","150")
            .attr("cy","150")
            .attr("r","100")
;