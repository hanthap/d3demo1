// encapsulate default handling of user interactions involving mouse (drag, select) 
class Pointer {

static dragging_DOM_element = null;
static dragging_d3_selection = null;
static dragging_datum = null;

//-------------------------------------------------------------------------------

static OnMouseDown(e,d) {
  console.log('Pointer.OnMouseDown',e,d,this);
  svg.classed('left-mouse-down',true);

}

//-------------------------------------------------------------------------------

static OnMouseUp(e,d) {
  console.log('Pointer.OnMouseUp',e,d,this);
  svg.classed('left-mouse-down',false);

}
//---------------------------------------------------------------------------

static OnMouseOver(e,d) {
    console.log('Pointer.OnMouseOver',d,e,this);
}

//---------------------------------------------------------------------------

static OnMouseExit(e,d) {
    console.log('Pointer.OnMouseExit',d,e,this);
}
//---------------------------------------------------------------------------
static OnDragStart(e) { 

    Pointer.dragging_DOM_element = this;
    const d = e.sourceEvent.srcElement.__data__;
    Pointer.dragging_datum = d;
    Pointer.dragging_d3_selection = d3.selectAll('rect,circle,line')
        .filter(o => o === d)
        .classed('dragging',true);

    console.log('Pointer.OnDragStart',e,this,Pointer.dragging_d3_selection,Pointer.dragging_datum);

}
//---------------------------------------------------------------------------
static OnDrag(e,d) {}
//---------------------------------------------------------------------------
static OnDragEnd(e,d) {

    Pointer.dragging_d3_selection.classed('dragging',false);
    console.log('Pointer.OnDragEnd',e,d,this,Pointer.dragging_d3_selection,Pointer.dragging_datum);


}
//---------------------------------------------------------------------------


}