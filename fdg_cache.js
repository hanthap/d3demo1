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
        .select("*")
      //  .eq("hue_id", "A")
        ;

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

    RunSim(); 

} // end AfterLoad()

//-------------------------------------------------------------------------------

static AddFrameNode() {
    // add a new frame node to the cache
    const nodeId = prompt("Enter a unique ID for the new frame node:", nodes.length+1 );
    if (nodeId === null || nodeId.trim() === "") {
        alert("Node ID cannot be empty.");
        return;
    }   
    var d = {
        node_id: nodeId.trim(),
        x: 0,
        y: 0,
        r: 10,
        descriptor: `New node: ${nodeId}`,
        is_group: true,
        hue_id: 'M',
        node_mass: 20
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

    Node.ToFrame(d);

}

//-------------------------------------------------------------------------------


static ToCSV(data, columns) {
  const header = columns.join(",");
  const rows = data.map(d =>
    columns.map(col => JSON.stringify(d[col] ?? "")).join(",")
  );
  return [header, ...rows].join("\n");
}

//-------------------------------------------------------------------------------

static DownloadCSV(object_list, filename = "nodes.csv") {
   // list column names based on attributes in the trimmed extract
const columns = [...new Set(object_list.flatMap(obj => Object.keys(obj)))];

const csv = Cache.ToCSV(object_list, columns);

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

//-------------------------------------------------------------------------------

static DownloadJSON(data, filename = "nodes.json") {
  const json = JSON.stringify(data, null, 2);  
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
//-------------------------------------------------------------------------------

static Download() {
    // only keep the persistent attributes
    const trimmed_nodes = nodes.map(d => (
    {
    node_id: d.node_id,
    descriptor: d.descriptor,
    selected: d.selected,
    show_label: d.show_label,
    has_shape: d.has_shape,
    hue_id: d.hue_id,
    node_mass: d.node_mass,
    show_label: d.show_label,
    fx: d.fx,
    fy: d.fy
    }
    ));
   // Cache.DownloadJSON(trimmed_nodes,"nodes.json");
    Cache.DownloadCSV(trimmed_nodes,"nodes.csv");

    const trimmed_links = links.map(d => (
        {
            id: d.id,   
            descriptor: d.descriptor,
            // DEBUG: are these sometimes incorrect for newly-created links?
            from_node_id: d.true_source.node_id,
            to_node_id: d.true_target.node_id,
            hue_id: d.hue_id,
            type_cde: d.type_cde,
            mass: d.mass,
            strength: Math.round(d.strength*1000)/1000,
            selected: d.selected
        } ) );
   // Cache.DownloadJSON(trimmed_links,"links.json");
    Cache.DownloadCSV(trimmed_links,"links.csv");

}
//-------------------------------------------------------------------------------

static ReadLocalCsv() {
document.getElementById("fileInput").addEventListener("change", function() {
  const file = this.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const text = e.target.result;
    const data = d3.csvParse(text);
    // explicitly convert strings 
    const casted = data.map(d => ({
    ...d,
        selected: +d.selected,
        mass: +d.mass,
        strength: +d.strength
        }));

    console.log("Parsed CSV:", casted);
    };

  reader.readAsText(file);
}
)}
;




//-------------------------------------------------------------------------------

} // end of Cache class

//-------------------------------------------------------------------------------
