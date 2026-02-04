// fdg_graph.js
// A simple force directed graph implementation
// Nodes and edges are stored in maps for efficient access
// Each node has a unique id and can store arbitrary data
// Each edge connects two nodes and can also store arbitrary data
// Methods are for operations that depend on both nodes and edges

class Cache {

    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }

static RefreshAllDescendants() {
// for each node, find all its descendants and save as list in node datum
// useful eg for efficient collision detection where subsets may be nested

    nodes.forEach( d => { d.descendants = AllDescendantsOf(d) } )
    // CAVEAT: to avoid side effects AllDescendantsOf() must not save directly to d.descendants

}

  //-------------------------------------------------------------------------------


static RefreshSortedNodes() {

    let root_nodes = nodes.filter(Node.IsNotNested); 
    sorted_nodes = FlattenByGeneration(root_nodes); // global, in fdg_nodes.js
}

static ApplyFrameOrder() {
    // ensure that existing frame shapes are rendered with superset containers behind their nested subsets.
    gGroup.selectAll('.frame') 
        .data(sorted_nodes, Node.UniqueId) // sorted_nodes initialised by Cache.RefreshSortedNodes()
        .order();

}

}

//-------------------------------------------------------------------------------
// Called by Cache.RefreshSortedNodes() 

function FlattenByGeneration(roots) {
  const result = new Set(); // prevent duplicates, preserves insertion order
  const queue = [...roots];   // start with top-level objects

  while (queue.length > 0) {
    const node = queue.shift();
    result.add(node);
    let clist = ChildrenOf(node);
    if ( clist && clist.length > 0 ) {
      queue.push(...clist);
     }
    }
 
  return [...result]; // convert set to array 
 }


