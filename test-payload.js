
var graph, ont, selPara;
graph = Object.values(Workspace.graphs)[0];

function main() {
    embellish_graph(graph) ;
    embellish_path(graph) ;
    console.log(graph);

}

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
    const edge = new HyperEdge(link);
    graph.addHyperEdge(edge);


}