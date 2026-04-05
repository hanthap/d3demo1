class RectNode extends Node {
//-------------------------------------------------------------------------------
// returns point where the rendered boundary of rect d intersects a ray with angle theta (from atan2) and origin at centrepoint of d
// Partitions the space into 4 quadrants  Compares angles to determine which quadrant contains the ray and therefore 
// which one of the rect sides will contain the intersection point.

static ContactPoint(d,theta) { 

const
        t = theta * (180/Math.PI),  // use degrees, just for clarity      
        crit_rad = Math.atan2(d.height,d.width), 
        c = crit_rad * (180/Math.PI), // range [0,90]

        v =   t < c -180 ?  { side: 'left',   dim: 'x', k: Node.LeftOuter(d),   a: -theta } :
              t < 0-c ?     { side: 'top',    dim: 'y', k: Node.TopOuter(d),    a: theta-Math.PI/2 } :
              t < c ?       { side: 'right',  dim: 'x', k: Node.RightOuter(d),  a: theta+Math.PI } :
              t < 180-c ?   { side: 'bottom', dim: 'y', k: Node.BottomOuter(d), a: -theta-Math.PI/2 } :
                            { side: 'left',   dim: 'x', k: Node.LeftOuter(d),   a: -theta },


        point = v.dim == 'x' ? { x: v.k, y: Node.Centre(d).y + ( d.width/2  * Math.tan(v.a) ) } :
                               { y: v.k, x: Node.Centre(d).x + ( d.height/2 * Math.tan(v.a) ) } ;

  // TODO : what if the point falls at a rounded corner (within Frame.CornerRadius of that corner)
  // maybe a clip path can help? Except it would have to change with every tick

return point;

}

}
