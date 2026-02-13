// encapsulate default handling of user interactions involving mouse (drag, select) 
class Pointer {

//---------------------------------------------------------------------------

static OnMouseOver(e,d) {
    console.log('Pointer.OnMouseOver',d,e);
}

//---------------------------------------------------------------------------

static OnMouseExit(e,d) {
    console.log('Pointer.OnMouseExit',d,e);
}
//---------------------------------------------------------------------------
static OnDragStart(e,d) {
console.log(e);


}
//---------------------------------------------------------------------------
static OnDrag(e,d) {}
//---------------------------------------------------------------------------
static OnDragEnd(e,d) {
console.log(e);


}
//---------------------------------------------------------------------------


}