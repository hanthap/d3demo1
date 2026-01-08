// fdg_graph.js
// A simple force directed graph implementation
// Nodes and edges are stored in maps for efficient access
// Each node has a unique id and can store arbitrary data
// Each edge connects two nodes and can also store arbitrary data
// Methods are for operations that depend on both nodes and edges

class Graph {

    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }

static CacheAllDescendants() {
// for each node, find all its descendants and save as list in node datum
// useful eg for efficient collision detection where subsets may be nested

    nodes.forEach( d => { d.descendants = AllDescendantsOf(d) } )
    // CAVEAT: to avoid side effects AllDescendantsOf() must not save directly to d.descendants

}

    //-------------------------------------------------------------------------------

static CacheAllExclusiveNodes() {
        // called from fdg_init.js after all nodes and links have been loaded
        // upddate the global active_frames[] and active_circles[] arrays
        active_frames = nodes.filter( Frame.IsExclusive );    
        active_circles = nodes.filter( Node.IsExclusive );    

 }


static ReorderFrameShapes() {
    // ensure that existing frame shapes are rendered with superset containers behind their nested subsets.
    gGroup.selectAll('rect') 
        .data(nodes.filter(IsFrameShape), Node.UniqueId)  
        .sort( (a,b) => d3.ascending( a.zIndex, b.zIndex ) ); // lower zIndex at back   
    }

}


function bfs(start, graph) {
  const visited = new Set();
  const queue = [start];

  visited.add(start);

  while (queue.length > 0) {
    const node = queue.shift();
    console.log(node);

    for (const child of graph[node] || []) {
      if (!visited.has(child)) {
        visited.add(child);
        queue.push(child);
        }
      }
    }
  return visited;
};
