import { fetchJson, basePath } from './api.js';

export async function drawGraph(container) {
  const data = await fetchJson(`${basePath()}/data/graph.json`);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 640 360');
  svg.setAttribute('id', 'graph');

  data.edges.forEach((edge) => {
    const from = data.nodes.find((n) => n.id === edge.from);
    const to = data.nodes.find((n) => n.id === edge.to);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x);
    line.setAttribute('y2', to.y);
    line.setAttribute('stroke', '#4e6185');
    svg.append(line);
  });

  data.nodes.forEach((node) => {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', node.type === 'article' ? 12 : 10);
    circle.setAttribute('fill', node.type === 'article' ? '#49c49b' : '#f2a65a');
    svg.append(circle);

    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', node.x + 14);
    text.setAttribute('y', node.y + 4);
    text.setAttribute('fill', '#ebeff8');
    text.setAttribute('font-size', '12');
    text.textContent = node.label;
    svg.append(text);
  });

  container.innerHTML = '';
  container.append(svg);
}
