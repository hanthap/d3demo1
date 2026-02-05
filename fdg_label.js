class Label extends Node {
  
    static UniqueId(d) { return Node.UniqueId(d); }
    static IsVisible(d) { return d.show_label && d.has_shape; }
    static FontColour(d) { return Node.ShowAsFrame(d) ? Node.FillColour(d) : "blue"; }
    static FontSize(d) { return Node.ShowAsFrame(d) ? 12 : 8; }
    static Width(d) { return Node.ShowAsFrame(d) ? Frame.Width(d) : Node.Width(d); } 
    static Height(d) { return 2 * d.r; }  
    static OffsetX(d) { return -Label.Width(d) / 2; }
    static OffsetY(d) { return -d.r; }
    static Classes(d) { 
        if ( Node.ShowAsFrame(d) ) return ["frameinfo"] ;
        return ( Node.HasMembers(d) ? [ "has_members"] : ["circleinfo"] );
    }
    static HtmlText(d) { return Node.UniqueId(d); }
    static SetAttributes(d) { // called via foreach
        d3.select(this).attr('transform', d => `translate(${Node.Centre(d).x},${Node.Centre(d).y})`);   
       }

}

function AppendLabels() {

gLabel.selectAll('g').remove(); // otherwise we get duplicates on data refresh
    
    const labels = gLabel.selectAll('g') 
        .data(nodes.filter(Label.IsVisible), Label.UniqueId)  
            .join('g')  // append a new group element bound to that datum
                .attr('id', Label.UniqueId) // for efficient upsert & delete of DOM bindings
                .style('pointer-events', 'none') // let mouse events pass through to circle
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
