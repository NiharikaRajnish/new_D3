let width = 1500;
let height = 600;

let svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

let nodes = [];
let links = [];

let color = d3.scaleOrdinal(d3.schemeCategory10);

let simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-250))
 
    .on("tick", ticked);

function update() {
    // Update links
    let link = svg.selectAll(".link")
        .data(links, d => `${d.source.id}-${d.target.id}`);

    link.exit().remove();

    link.enter().append("line")
        .attr("class", "link")
        .merge(link);

    // Update nodes
    let node = svg.selectAll(".node")
        .data(nodes, d => d.id);

    node.exit().remove();

    let nodeEnter = node.enter().append("circle")
        .attr("class", "node")
        .attr("r", 5)
        .attr("fill", d => color(d.type))
        .call(d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded));

    nodeEnter.append("title")
        .text(d => d.name);

    node.merge(nodeEnter);

    // Update labels
    let label = svg.selectAll("text")
        .data(nodes, d => d.id);

    label.exit().remove();

    label.enter().append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .merge(label)
        .text(d => d.name);

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();
}

function ticked() {
    svg.selectAll(".link")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    svg.selectAll(".node")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    svg.selectAll("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y);
}

function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

function downloadCSV() {
    let csvContent = "ID,name,alternative title,target URL,type,isPartOf,assesses,comesAfter\n";
    nodes.forEach(node => {
        csvContent += `${node.id},${node.name},${node.alternativeTitle},${node.targetURL},${node.type},${node.isPartOf || ""},${node.assesses || ""},${node.comesAfter || ""}\n`;
    });

    let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    if (link.download !== undefined) {
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "network_data.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
            parseCSV(contents);
        };
        reader.readAsText(file);
    }
}

function parseCSV(data) {
    const parsedData = d3.csvParse(data);

    const nodeMap = new Map();
    nodes = parsedData.map(d => {
        const node = {
            id: +d.ID,
            name: d.name,
            alternativeTitle: d['alternative title'],
            targetURL: d['target URL'],
            type: d.type,
            isPartOf: d.isPartOf,
            assesses: d.assesses,
            comesAfter: d['comesAfter']
        };
        nodeMap.set(node.id, node);
        return node;
    });

    links = [];
    nodes.forEach(node => {
        if (node.isPartOf) {
            links.push({ source: node.id, target: +node.isPartOf });
        }
        if (node.assesses) {
            links.push({ source: node.id, target: +node.assesses });
        }
        if (node.comesAfter) {
            links.push({ source: node.id, target: +node.comesAfter });
            console.log(node.id + " " + node.comesAfter)
        }
    });

    // Find nodes named "start" and "end"
    let startNode = nodes.find(node => node.name === "Start");
    let endNode = nodes.find(node => node.name === "End");

    // Update positions of "start" and "end" nodes
    if (startNode) {
        startNode.fx = 60; // Set x position to the left side
        startNode.fy = height / 2; // Set y position to the vertical center
    }
    if (endNode) {
        endNode.fx = width-60; // Set x position to the right side
        endNode.fy = height / 2; // Set y position to the vertical center
    }

    update();
}


// Event listeners for buttons
document.getElementById('add-node').addEventListener('click', () => {
    const id = nodes.length ? nodes[nodes.length - 1].id + 1 : 1;
    const name = `Node ${id}`;
    nodes.push({ id, name, alternativeTitle: "", targetURL: "", type: "default" ,x: width / 2, y: height / 2 });
    update();
});

document.getElementById('remove-node').addEventListener('click', () => {
    if (nodes.length) {
        const nodeToRemove = nodes.pop();
        links = links.filter(l => l.source.id !== nodeToRemove.id && l.target.id !== nodeToRemove.id);
        update();
    }
});

document.getElementById('add-link').addEventListener('click', () => {
    const sourceId = prompt("Enter the source node ID:");
    const targetId = prompt("Enter the target node ID:");

    const sourceNode = nodes.find(node => node.id == sourceId);
    const targetNode = nodes.find(node => node.id == targetId);

    targetNode.comesAfter = sourceId;

    if (sourceNode && targetNode) {
        links.push({ source: sourceNode, target: targetNode });
        update();
    } else {
        alert("Invalid node ID(s). Please try again.");
    }
});

document.getElementById('remove-link').addEventListener('click', () => {
    if (links.length) {
        links.pop();
        update();
    }
});

document.getElementById('download-csv').addEventListener('click', downloadCSV);
document.getElementById('file-input').addEventListener('change', handleFileSelect);