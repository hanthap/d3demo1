// encapsulate default handling of user interactions involving mouse (drag, select) 
class Pointer {

//---------------------------------------------------------------------------

static OnMouseOver(e,d) {
    console.log('Pointer.OnMouseOver',d,e,this);
}

//---------------------------------------------------------------------------

static OnMouseExit(e,d) {
    console.log('Pointer.OnMouseExit',d,e,this);
}
//---------------------------------------------------------------------------
static OnDragStart(e,d) {
console.log('Pointer.OnDragStart',e,d,this);


}
//---------------------------------------------------------------------------
static OnDrag(e,d) {}
//---------------------------------------------------------------------------
static OnDragEnd(e,d) {
console.log('Pointer.OnDragEnd',e,d,this);


}
//---------------------------------------------------------------------------


}