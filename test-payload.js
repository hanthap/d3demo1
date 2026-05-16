
var ont, selPara;
// graph = Object.values(Workspace.graphs)[0];

function main() {
    embellish_graph(current_graph) ;
    embellish_path(current_graph) ;
    console.log(current_graph);
    current_view = current_graph.views.default;
}
// const wbExtra = parsed_json.setPrototype('Workbook');
// wbExtra.restorePrototypes();
// console.log(wbExtra);

// -------------------------------------------------------------------------

function embellish_graph(graph) {

graph
  .addTemplate('Person',['Party','individual'])
  .addTemplate('child_of',['son_of','daughter_of'])
  .addTemplate('parent_of',['father_of','mother_of'])
  .addTemplate('reports_to',['employee_of','works_for'])
  .addTemplate('Variable',['measure'])
  .addTemplate('Policy')
  .addTemplate('Model',['ModelClass'])
  .addTemplate('part_of',['belongs_to_class','part-of','partOf'])
  .bindAllTemplates();

const node_spec = { id: 'pl32983', name: 'Peter Luckock', description: 'Inventor' };

const node_type = graph.getTypeSpec('Person'); // might default if 'Person' is not already registered
const new_node = graph.addVertex(node_spec).setTypeSpec(node_type);



const img = graph.addImage('peter.svg');
new_node.setImage(img);

const link_type = graph.getTypeSpec('child_of'); // might default if 'belongs_to' is not already registered

 const nodes = graph.nodeData(),
     datumFrom = nodes[3];
graph.addEdge(datumFrom,new_node,link_type);


const 
    l1 = graph.getTemplate('child_of').nesting,
    l2 = graph.getTemplate('part_of').nesting,
    l3 = graph.getTemplate('parent_of').nesting;
l1.enabled = true;
l1.reversed = true;
l2.enabled = true;
l2.reversed = true;
l3.enabled = true;

graph.refreshAllCaches();

console.log(graph);

}


// -------------------------------------------------------------------------


function embellish_path(graph) {

    const 
        links1 = graph.linkData().filter(d => d.y < 0.4),
        links2 = graph.linkData().filter(d => d.y > 0.6),
        links3 = graph.linkData().filter(d => d.y > 0.2 && d.y < 0.7);

        link = links1[0];

    graph
    .addPathSpec(links1)
    .addPathSpec(links2)
    .addPathSpec(links3);

//const existing_node = graph.nodeData()[8];
 const existing_node = null;

const jnode = link.interjectVertex(existing_node,graph);

console.log('existing_node,jnode',existing_node,jnode);

const anode = graph.nodeData()[10],
      pnode = anode.addEnclosure(graph);
console.log('anode.addEnclosure() => pnode',anode,pnode);




    //  junction = link.interjectVertex() (also creates hyperedge or updates existing one)
    //    link.interjectVertex(node) 


// select a link and give it an elbow 
// if the selected link is already part of a hyperedge, then add the new elbow and its extra sub-link
// else, create a new hyperedge out of all 3 components

// drag & drop one end of an existing link
// if dropping onto a link, then give that link a new elbow (see above) and continue
// if dropping onto a junction, then 
// then update the dragged link;
//  if it's part of a hyperedge, 
// (continue as for )
// also 


// if both ends are junction nodes, then merge their hyperedges into one. 



// create a new junction node J and insert it at the midpoint of L 
// given an existing vertex node V, insert it as-is at the midpoint of L without removing its other connections)
// 

// create a hyperedge from a given set of nodes (converting them all to junctions)
// if the new
// automatically all their in & out links are bound to the new hyperedge 
// if they're already 
// convert a link to a hyperedge  (create a junction node and insert it)

const path = Object.values(graph.paths)[0];

graph.views.default.appendData(graph);
graph.views.default.addPathSpec(path);
current_view = graph.views.default;
const n = current_view.nodeData()[1];
Object.setPrototypeOf(n,D3NodeDatumRW.prototype);



}