import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const maxOpacityFreq = 10;
const maxColorFreq = 100;
const attempts = 200;
const color = d3.scaleLinear([maxOpacityFreq, 30, maxColorFreq], ["steelblue", "yellow", "red"]).clamp(true);
const pc = d3.format(".1%");
const num = d3.format("0.1f");

const width = 10;
const height = 15;

const result = await fetch("llmrandom.json").then((r) => r.json());
const data = Object.entries(result)
  .map(([key, val]) => {
    const [model, temp, n] = key.split(",");
    return { model, temp, n: n, val };
  })
  .sort((a, b) => a.n - b.n);
const uniformData = [];
["O", "C", "G"].forEach((model) => {
  d3.range(0, 1.001, 0.1).forEach((temp) => {
    d3.range(0, attempts).forEach((n) => {
      uniformData.push({ model, temp, n, val: n % 100 });
    });
  });
});

const maxFreq = Object.fromEntries(
  d3
    .groups(
      data,
      (d) => d.model,
      (d) => d.val,
    )
    .map(([key, vals]) => [key, d3.max(vals, (d) => d[1].length)]),
);

const allFreq = Object.fromEntries(d3.groups(data, (d) => d.val).map(([key, vals]) => [key, vals.length]));
const uniformFreq = Object.fromEntries(d3.groups(uniformData, (d) => d.val).map(([key, vals]) => [key, vals.length]));

const layer = (el, tag, cls, data) =>
  el
    .selectAll(`${tag}.${cls}`)
    .data(data ?? ((d) => [d]))
    .join(tag)
    .attr("class", cls);

function draw({ model, n }) {
  const freq = {};
  const current = {};
  for (const d of data) {
    if (d.n > n) break;
    if (d.model == model) {
      freq[d.temp] = freq[d.temp] || {};
      freq[d.temp][d.val] = 1 + (freq[d.temp][d.val] || 0);
      current[d.temp] = d.val;
    }
  }

  const grid = [];
  const valFreq = {};
  for (const temp in freq)
    for (const val in freq[temp]) {
      grid.push({ key: `${temp}:${val}`, temp, val, freq: freq[temp][val] });
      valFreq[val] = (valFreq[val] || 0) + freq[temp][val];
    }

  d3.selectAll(`.freq-grid[data-model="${model}"]`).each(function () {
    const rects = layer(d3.select(this), "rect", "freq", grid)
      .attr("x", (d) => +d.val * width + 0.5)
      .attr("y", (d) => +d.temp * height * 10 + 0.5)
      .attr("width", width - 1)
      .attr("height", height - 1)
      .attr("stroke", (d) => (d.val == current[d.temp] ? "black" : "none"))
      .attr("stroke-opacity", 0.5)
      .attr("fill", (d) => color(d.freq))
      .attr("fill-opacity", (d) => (d.freq < maxOpacityFreq ? (d.freq + 1) / maxOpacityFreq : 1));
    layer(rects, "title", "tooltip").text(
      (d) => `${d.val} came up ${pc(d.freq / attempts)} of the time at temperature ${d.temp}`,
    );
    // Label the top
    layer(d3.select(this), "text", "num", Object.keys(valFreq))
      .attr("x", (d) => (+d + 0.5) * width + 0.5)
      .attr("y", (d) => height * 11 + (+d % 2 ? 3 : 18))
      .attr("dominant-baseline", "hanging")
      .attr("text-anchor", "middle")
      .text((d) => d);
  });

  drawBarChart(`.freq-bar[data-model="${model}"]`, { model, freq: valFreq, max: maxFreq[model] });
}

function drawBarChart(el, { freq, max }) {
  // Draw a bar chart of valFreq on .freq-bar
  layer(d3.select(el), "rect", "bar", Object.entries(freq))
    .attr("x", (d) => +d[0] * width + 0.5)
    .attr("y", (d) => height * 11 - (d[1] / max) * height * 10)
    .attr("width", width - 1)
    .attr("height", (d) => (d[1] / max) * height * 10)
    .attr("fill", "steelblue");
  // Add a transparent background bar for each number with a title tooltip showing the value and frequency
  layer(d3.select(el), "rect", "bar-bg", d3.range(0, 101))
    .attr("x", (d) => +d * width + 0.5)
    .attr("y", 0)
    .attr("width", width - 1)
    .attr("height", height * 11)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .append("title")
    .text((d) => (d in freq ? `${d} came up ${pc(freq[d] / attempts / 11)} of the time` : `${d} never came up`));
  // Get the top 5 values
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  // Add a text label above each bar for the top 5 values
  layer(d3.select(el), "text", "bar-label", top.slice(0, 10))
    .attr("x", (d) => (+d[0] + 0.5) * width)
    .attr("y", (d) => height * 11 - (d[1] / max) * height * 10 - 3)
    .attr("dominant-baseline", "bottom")
    .attr("text-anchor", "middle")
    .text((d) => d[0]);
}

// Draw temperature gridlines
d3.selectAll(".freq-grid").each(function () {
  layer(d3.select(this), "text", "temp", d3.range(0, 1.001, 0.1))
    .attr("x", 1050)
    .attr("y", (d) => (d + 0.05) * height * 10)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "end")
    .text((d) => d.toFixed(1));
  layer(d3.select(this), "path", "grid", d3.range(0, 1.001, 0.1)).attr("d", (d) => `M0,${d * height * 10}H1000`);
});

// Draw overall legend
layer(d3.select(".legend-box"), "rect", "legend-mark", d3.range(0, maxColorFreq))
  .attr("x", (d) => d * width)
  .attr("width", width)
  .attr("height", width)
  .attr("fill", (d) => color(d))
  .attr("fill-opacity", (d) => (d < maxOpacityFreq ? (d + 1) / maxOpacityFreq : 1));
layer(d3.select(".legend-box"), "text", "legend-label", [0, maxOpacityFreq, maxColorFreq])
  .attr("x", (d) => (d + 0.5) * width)
  .attr("y", width + 5)
  .attr("dominant-baseline", "hanging")
  .attr("text-anchor", "middle")
  .text((d) => pc(d / attempts));

drawBarChart(`.freq-bar[data-model="ALL"]`, { freq: allFreq, max: d3.max(Object.values(allFreq)) });

const multipleRows = layer(
  d3.select("#multiples-body"),
  "tr",
  "multiple",
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((d) => {
    const actual = d3.rollup(
      Object.entries(allFreq),
      (entries) => d3.sum(entries, (d) => d[1]),
      ([val]) => (+val % d == 0 ? "multiple" : "other"),
    );
    const expected = d3.rollup(
      Object.entries(uniformFreq),
      (entries) => d3.sum(entries, (d) => d[1]),
      ([val]) => (+val % d == 0 ? "multiple" : "other"),
    );
    const preference = actual.get("multiple") / expected.get("multiple");
    return { multiple: d, preference };
  }),
);
layer(multipleRows, "th", "multiple-label")
  .classed("text-end", true)
  .text((d) => d.multiple);
layer(multipleRows, "td", "multiple-freq")
  .classed("text-end", true)
  .classed("text-success", (d) => d.preference > 4)
  .classed("text-danger", (d) => d.preference < 0.2)
  .text((d) => (d.preference > 1 ? `${num(d.preference)}x more` : `${num(1 / d.preference)}x less`));

const endswithRows = layer(
  d3.select("#endswith-body"),
  "tr",
  "endswith",
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
    const actual = d3.rollup(
      Object.entries(allFreq),
      (entries) => d3.sum(entries, (d) => d[1]),
      ([val]) => (+val % 10 == d ? "endswith" : "other"),
    );
    const expected = d3.rollup(
      Object.entries(uniformFreq),
      (entries) => d3.sum(entries, (d) => d[1]),
      ([val]) => (+val % 10 == d ? "endswith" : "other"),
    );
    const preference = actual.get("endswith") / expected.get("endswith");
    return { endswith: d, preference };
  }),
);
layer(endswithRows, "th", "endswith-label")
  .classed("text-end", true)
  .text((d) => d.endswith);
layer(endswithRows, "td", "endswith-freq")
  .classed("text-end", true)
  .classed("text-success", (d) => d.preference > 4)
  .classed("text-danger", (d) => d.preference < 0.2)
  .text((d) => (d.preference > 1 ? `${num(d.preference)}x more` : `${num(1 / d.preference)}x less`));

// Draw initial state. When the input changes, redraw the grid.
d3.select("#iter")
  .on("input", function () {
    const n = +this.value;
    ["O", "C", "G"].forEach((model) => draw({ model, n }));
  })
  .dispatch("input");

// Play button animation
(function () {
  const $iter = d3.select("#iter");
  const $play = d3.selectAll(".play");
  const max = +$iter.property("max");
  const step = +$iter.property("step") || 1;
  let interval;
  $play.on("click", function () {
    if (!this.classList.contains("playing")) {
      $play.classed("playing", true).select("i").classed("bi-play", false).classed("bi-pause", true);
      if (+$iter.property("value") == max) $iter.property("value", 0);
      interval = d3.interval(() => {
        let n = +$iter.property("value");
        if (n == max) {
          $play.classed("playing", false).select("i").classed("bi-play", true).classed("bi-pause", false);
          interval.stop();
        } else {
          n = n + step;
          $iter.property("value", n).dispatch("input");
        }
      }, 100);
    } else {
      $play.classed("playing", false).select("i").classed("bi-play", true).classed("bi-pause", false);
      interval.stop();
    }
  });
})();
