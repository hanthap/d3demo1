class Label extends Node {

    static OnClick(e,d) {}
    static OnDblClick(e,d) {}
    static OnMouseOver(e,d) {}
    static OnMouseOut(e,d) {}
    static UniqueId(d) { return Node.UniqueId(d); }
    static IsVisible(d) { return d.show_label; }
    static FontColour(d) { return "blue"; }
    static SetAttributes(d) { // called via foreach
        d3.select(this).attr('transform', d => `translate(${d.x},${d.y})`);   
        }

}

function AppendLabels() {
 

    // create & bind the SVG visual elements
    const labels = gLabel.selectAll('g') 
        .data(nodes.filter(Label.IsVisible), Label.UniqueId)  
            .join('g')  // append a new group element bound to that datum
                .attr('id', Label.UniqueId) // for efficient upsert & delete of DOM bindings
                .classed("circleinfo", true)   // for CSS styling  
           //     .on('mouseover',Label.OnMouseOver) // called at each transition, including nested elements, unlike mouseenter
          //      .on('mouseout',Label.OnMouseOut) // ditto, unlike mouseexit
          //      .on('click',Label.OnClick)
         //       .on('dblclick',Label.OnDblClick)
                ;

    // ForeignObject need to be inside the node's 'g' element to move with it
        labels
            .append("foreignObject") // add a child element per node-group. 
                .classed("circleinfo", true)   // for CSS styling  
                .attr("x", d => -d.r) // relative to parent 'g' element
                .attr("y", d => -d.r)
                .attr("width", Node.Width)
                .attr("height", Node.Height)
                .append("xhtml:div") // add a grandchild DIV element inside the foreignObject - we need the strictness of XHTML when inside an SVG 
                    .classed("circleinfo", true) 
                    .style('color',Label.FontColour)
                    .html(Node.UniqueId);

}
