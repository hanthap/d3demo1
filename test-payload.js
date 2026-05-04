
var ont, selPara;
// graph = Object.values(Workspace.graphs)[0];

function main() {
    embellish_graph(current_graph) ;
    embellish_path(current_graph) ;
    console.log(current_graph);

}
// const wbExtra = parsed_json.setPrototype('Workbook');
// wbExtra.restorePrototypes();
// console.log(wbExtra);

// -------------------------------------------------------------------------

function embellish_graph(graph) {

graph
  .addLayer('Person',['Party','individual'])
  .addLayer('child_of',['son_of','daughter_of'])
  .addLayer('parent_of',['father_of','mother_of'])
  .addLayer('reports_to',['employee_of','works_for'])
  .addLayer('Variable',['measure'])
  .addLayer('Policy')
  .addLayer('Model',['ModelClass'])
  .addLayer('part_of',['belongs_to_class'])
  .bindAllLayers();

const node_spec = { id: 'pl32983', name: 'Peter Luckock', description: 'Inventor' };

const node_type = graph.getNodeType('Person'); // might default if 'Person' is not already registered
const new_node = graph.addNode(node_spec,node_type);


const img = graph.addImage('peter.svg');
new_node.setImage(img);

const link_type = graph.getLinkType('child_of'); // might default if 'belongs_to' is not already registered

const nodes = graph.nodeData(),
      _baseFrom = nodes[3].base,
      _baseTo = new_node.base,
      _baseType = link_type,
      // used by Relation constructor to assign xid
      sourceEntity = _baseFrom.keyId(),
      targetEntity = _baseTo.keyId(),
      predicate = 'reports_to',
      xid = predicate,
      relationSpec = {_baseFrom,_baseTo,_baseType, sourceEntity,targetEntity,predicate};
  
graph.addLink(relationSpec,link_type);

console.log(graph);

}


// -------------------------------------------------------------------------


function embellish_path(graph) {

    const 
        links1 = graph.linkData().filter(d => d.y < 0.4),
        links2 = graph.linkData().filter(d => d.y > 0.6),
        links3 = graph.linkData().filter(d => d.y > 0.2 && d.y < 0.7);

        link = links1[0],

    graph
        .addPath(links1)
        .addPath(links2)
        .addPath(links3);
    const edge = graph.addHyperEdge([link]);


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
edge.addJunction(); 

const path = Object.values(graph.paths)[0];
path.addHyperEdge(edge);

const members = edge.getMembers();
console.log(members);
}