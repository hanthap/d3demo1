// fdg_cache.js
// Nodes and edges are stored in maps for efficient access
// Each node has a unique id and can store arbitrary data
// Each edge connects two nodes and can also store arbitrary data


//-------------------------------------------------------------------------------

const supabaseClient = supabase.createClient(
    APP_CONFIG.supabaseUrl,
    APP_CONFIG.supabaseAnonKey
);


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
    sorted_nodes = Cache.FlattenByGeneration(root_nodes); // global, in fdg_nodes.js
}

static ApplyFrameOrder() {
    // ensure that existing frame shapes are rendered with superset containers behind their nested subsets.
    gGroup.selectAll('.frame') 
        .data(sorted_nodes, Node.UniqueId) // sorted_nodes initialised by Cache.RefreshSortedNodes()
        .order();

}

//-------------------------------------------------------------------------------
// Called by Cache.RefreshSortedNodes() 

static FlattenByGeneration(roots) {
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
 
static async LoadData() {
    // this queues both promises (and their associated "then" statements) via parallel threads

    const nodePromise = supabaseClient
        .from("nodes")
        .select("*");

    let { data: nodelist, node_error } = await nodePromise; 

      if (node_error) {
        console.error(node_error);
        return;
      }

       nodelist.forEach(Node.AppendDatum);
       nodes = nodelist;

    // before calling Link.AppendDatum() we need to enable Node.GetFromID()
       mapNodes = new Map ( nodes.map( x => ( [x.node_id, x ]) ) );


    const linkPromise = supabaseClient
        .from("edges")
        .select("*");

    let { data: linklist, error: link_error } = await linkPromise; 

    if (link_error) {
        console.error(link_error);
        return;
      }
    links = linklist;
    links.forEach(Link.AppendDatum);

    Cache.AfterLoad();
}


//-------------------------------------------------------------------------------
// final init steps that have to wait until nodes AND links are both populated 
static AfterLoad() {
    
    // collect all immediate links into/out of each node regardless of type
    nodes.forEach( d => { 
        d.inLinks  = links.filter( x => ( x.to_node_id   == d.node_id ) ); 
        d.outLinks = links.filter( x => ( x.from_node_id == d.node_id ) );
    } );

// store true source/target references in each link
links.forEach( d => {
    d.true_source = d.source;
    d.true_target = d.target;
} );

    // precompute & store lists
    Cache.RefreshAllDescendants();    // descendants, per node
  //  Cache.RefreshAllExclusiveNodes(); // circles and frames in scope of active_exclusion force
    Cache.RefreshSortedNodes();       // z-order of nested frames

    AppendShapes(); 
    AppendFrameShapes(); 
    AppendLines();
    AppendLabels();


    // 'null' simulation - lazy one-time pragma just to ensure inactive nodes are correctly registered with d3
    simPassive = d3.forceSimulation(nodes.filter(NodeScope)).stop();

    RunSim(); 

} // end AfterLoad()

static AddFrameNode() {
    // add a new frame node to the cache
    const nodeId = prompt("Enter a unique ID for the new frame node:", nodes.length+1 );
    if (nodeId === null || nodeId.trim() === "") {
        alert("Node ID cannot be empty.");
        return;
    }   
    var d = {
        node_id: nodeId,
        x: 0,
        y: 0,
        r: 50,
        descriptor: nodeId,
        IS_GROUP: true
    };
    Node.AppendDatum(d);
    nodes.push(d);
    mapNodes.set(d.node_id, d);
 
    nodes.filter(n => n.selected )
    // TO DO    .filter( n is not an ancestor of d ) // prevent circular nesting
    // TO DO    .filter( n is a visible circle ) // prevent extra links to nested children
        .forEach( n => Node.AddLinkToParent(n,d) ); // add new frame as parent of all currently selected nodes

    Cache.RefreshAllDescendants();    // descendants, per node
    Cache.RefreshSortedNodes(); 
    Cache.ApplyFrameOrder();

    AppendShapes(); 
    // AppendFrameShapes(); 
    AppendLines();
    AppendLabels();
    RefreshSimData();
}
}
