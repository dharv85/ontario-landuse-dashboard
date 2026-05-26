const LANDCOVER_COLORS = {
    "Settlement": "#e74c3c",
    "Agriculture": "#f1c40f",
    "Forest": "#27ae60",
    "Water": "#3498db",
    "Wetland": "#1abc9c",
    "Natural Open": "#95a5a6",
};

const EMPLOYMENT_SECTOR_COLORS = {
    "Agriculture & Forestry": "#27ae60",
    "Mining & Extraction": "#7f8c8d",
    "Utilities": "#f39c12",
    "Construction": "#e67e22",
    "Manufacturing": "#3498db",
    "Wholesale Trade": "#9b59b6",
    "Retail Trade": "#e74c3c",
    "Transportation & Warehousing": "#1abc9c",
    "Information & Culture": "#2ecc71",
    "Finance & Insurance": "#2980b9",
    "Real Estate": "#8e44ad",
    "Professional & Technical": "#4f8cff",
    "Management": "#95a5a6",
    "Admin & Waste Management": "#bdc3c7",
    "Education": "#f1c40f",
    "Healthcare & Social": "#e91e63",
    "Arts & Recreation": "#ff6384",
    "Accommodation & Food": "#ff9f43",
    "Other Services": "#636e72",
    "Public Administration": "#0984e3",
};

const LANDCOVER_LEGEND = [
    { label: "Clear Open Water", color: "#0070ff" },
    { label: "Turbid Water", color: "#73b2ff" },
    { label: "Shoreline", color: "#d7c29e" },
    { label: "Mudflats", color: "#895a44" },
    { label: "Marsh", color: "#99c28c" },
    { label: "Swamp", color: "#267300" },
    { label: "Fen", color: "#6e8b3d" },
    { label: "Bog", color: "#4a5b34" },
    { label: "Heath", color: "#c4d236" },
    { label: "Sparse Treed", color: "#a8d08f" },
    { label: "Treed Upland", color: "#4ea82e" },
    { label: "Deciduous Treed", color: "#1b7a0a" },
    { label: "Mixed Treed", color: "#2d8c1e" },
    { label: "Coniferous Treed", color: "#014f01" },
    { label: "Plantations", color: "#6b9952" },
    { label: "Hedge Rows", color: "#39e639" },
    { label: "Disturbance", color: "#e64c00" },
    { label: "Sand / Gravel / Mine", color: "#a0a0a0" },
    { label: "Bedrock", color: "#585858" },
    { label: "Community / Built-up", color: "#0000a0" },
    { label: "Agriculture", color: "#e6d200" },
];

let map, geojsonLayer, dashboardData;
let landcoverTileLayer, satelliteTileLayer, labelsTileLayer, riversLayer;
let employmentChart, landcoverChart, scatterChart, compareChart;
let selectedFeature = null;
let selectedLayer = null;
let compareFeature = null;
let layerState = { satellite: true, boundaries: true, rivers: true };

const SELECTED_STYLE = { weight: 3, color: "#fff", opacity: 1, fillOpacity: 0.15, fillColor: "#fff" };
const COMPARE_STYLE = { weight: 3, color: "#fbbf24", opacity: 1, fillOpacity: 0.15, fillColor: "#fbbf24" };
const HOVER_STYLE = { weight: 3, color: "#fff", opacity: 1, fillOpacity: 0.1, fillColor: "#fff" };

function initMap() {
    map = L.map("map", {
        center: [49.5, -84],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
    });

    satelliteTileLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: '&copy; Esri, Maxar, Earthstar Geographics', maxZoom: 18 }
    ).addTo(map);

    landcoverTileLayer = L.tileLayer(
        "https://ws.lioservices.lrc.gov.on.ca/arcgis1061a/rest/services/OFAT/OFAT_Land_Cover/MapServer/tile/{z}/{y}/{x}",
        { attribution: '&copy; Ontario MNRF', maxZoom: 18, opacity: 0.85 }
    ).addTo(map);

    map.createPane("rivers");
    map.getPane("rivers").style.zIndex = 450;

    map.createPane("labels");
    map.getPane("labels").style.zIndex = 650;
    map.getPane("labels").style.pointerEvents = "none";

    labelsTileLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        { maxZoom: 18, pane: "labels" }
    ).addTo(map);

    // #1 — Scale bar (Dangermond)
    L.control.scale({ position: "bottomright", imperial: false }).addTo(map);

    map.on("moveend", onMapMoveEnd);
}

// ---- Helpers ----

function getDominantLandcover(lc) {
    if (!lc) return "Forest";
    let max = 0, dominant = "Forest";
    for (const [key, val] of Object.entries(lc)) {
        if (val > max) { max = val; dominant = key; }
    }
    return dominant;
}

function getDominantEmployment(emp) {
    if (!emp || Object.keys(emp).length === 0) return null;
    let max = 0, dominant = null;
    for (const [key, val] of Object.entries(emp)) {
        if (val > max) { max = val; dominant = key; }
    }
    return dominant;
}

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + " million";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toLocaleString();
}

function getTotalEmployment(props) {
    if (!props.employment) return 0;
    return Object.values(props.employment).reduce((a, b) => a + b, 0);
}

// ---- Map styling ----

function styleFeature(feature) {
    const props = feature.properties;
    const isSelected = selectedFeature && selectedFeature.properties.MUNID === props.MUNID;
    const isCompare = compareFeature && compareFeature.properties.MUNID === props.MUNID;

    if (isSelected) return SELECTED_STYLE;
    if (isCompare) return COMPARE_STYLE;
    return { fillColor: "transparent", weight: 1.8, opacity: 1, color: "#000", fillOpacity: 0 };
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: (e) => {
            e.target.setStyle(HOVER_STYLE);
            e.target.bringToFront();
            showHoverInfo(feature.properties);
        },
        mouseout: (e) => {
            geojsonLayer.resetStyle(e.target);
            document.getElementById("hover-info").style.display = "none";
        },
        click: (e) => {
            if (e.originalEvent.shiftKey && selectedFeature) {
                setCompare(feature, e.target);
            } else {
                selectMunicipality(feature, e.target);
            }
        },
    });
}

function showHoverInfo(props) {
    const box = document.getElementById("hover-info");
    const totalEmp = getTotalEmployment(props);
    const dominant = getDominantLandcover(props.landcover);

    box.textContent = "";
    const h = document.createElement("h3");
    h.textContent = props.MUNICIPAL_NAME;
    box.appendChild(h);

    const rows = [
        ["Upper Tier", props.UPPER_TIER_MUNICIPALITY || "Single Tier"],
        ["Type", props.MUNICIPAL_TYPE || "N/A"],
        ["Total Employed", formatNumber(totalEmp)],
        ["Dominant Land Cover", dominant],
    ];
    for (const [label, value] of rows) {
        const row = document.createElement("div");
        row.className = "stat-row";
        const s1 = document.createElement("span");
        s1.textContent = label;
        const s2 = document.createElement("span");
        s2.className = "value";
        s2.textContent = value;
        row.appendChild(s1);
        row.appendChild(s2);
        box.appendChild(row);
    }
    if (selectedFeature) {
        const hint = document.createElement("div");
        hint.className = "compare-hint";
        hint.textContent = "Shift+Click to compare";
        box.appendChild(hint);
    }
    box.style.display = "block";
}

// ---- Selection & Compare (#7 — Kay) ----

function selectMunicipality(feature, layer) {
    compareFeature = null;
    selectedFeature = feature;
    selectedLayer = layer;
    geojsonLayer.resetStyle();
    if (layer) {
        layer.setStyle(SELECTED_STYLE);
        layer.bringToFront();
    }
    document.getElementById("compare-info").style.display = "none";
    updateSidebar(feature.properties);
    updateCharts(feature.properties);
}

function setCompare(feature, layer) {
    if (feature.properties.MUNID === selectedFeature.properties.MUNID) return;
    compareFeature = feature;
    geojsonLayer.resetStyle();
    if (layer) {
        layer.setStyle(COMPARE_STYLE);
        layer.bringToFront();
    }
    if (selectedLayer) {
        selectedLayer.setStyle(SELECTED_STYLE);
        selectedLayer.bringToFront();
    }
    showCompare();
}

function showCompare() {
    const a = selectedFeature.properties;
    const b = compareFeature.properties;
    const cInfo = document.getElementById("compare-info");
    cInfo.style.display = "block";

    document.getElementById("compare-name").textContent = b.MUNICIPAL_NAME;
    document.getElementById("compare-sub").textContent =
        `${b.MUNICIPAL_TYPE || ""} · ${b.UPPER_TIER_MUNICIPALITY || "Single Tier"}`;

    const totalB = getTotalEmployment(b);
    document.getElementById("compare-employed").textContent = formatNumber(totalB);
    document.getElementById("compare-top-sector").textContent = getDominantEmployment(b.employment) || "N/A";
    document.getElementById("compare-dominant-lc").textContent = getDominantLandcover(b.landcover);
    document.getElementById("compare-settlement").textContent =
        (b.landcover ? (b.landcover["Settlement"] || 0) : 0).toFixed(1) + "%";

    updateCompareChart(a, b);
}

function updateCompareChart(a, b) {
    const sectors = Object.keys(EMPLOYMENT_SECTOR_COLORS);
    const valsA = sectors.map(s => (a.employment && a.employment[s]) || 0);
    const valsB = sectors.map(s => (b.employment && b.employment[s]) || 0);

    // normalize to percentages
    const totalA = valsA.reduce((x, y) => x + y, 0) || 1;
    const totalB = valsB.reduce((x, y) => x + y, 0) || 1;
    const pctA = valsA.map(v => (v / totalA * 100));
    const pctB = valsB.map(v => (v / totalB * 100));

    const sorted = sectors.map((s, i) => ({ s, a: pctA[i], b: pctB[i] }))
        .sort((x, y) => (y.a + y.b) - (x.a + x.b))
        .slice(0, 10);

    const ctx = document.getElementById("compareChart").getContext("2d");
    if (compareChart) compareChart.destroy();

    compareChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: sorted.map(x => x.s),
            datasets: [
                {
                    label: a.MUNICIPAL_NAME,
                    data: sorted.map(x => x.a),
                    backgroundColor: "rgba(255,255,255,0.7)",
                    borderRadius: 2,
                },
                {
                    label: b.MUNICIPAL_NAME,
                    data: sorted.map(x => x.b),
                    backgroundColor: "rgba(251,191,36,0.7)",
                    borderRadius: 2,
                },
            ],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: "#9ba1b0", font: { size: 11 } } },
                title: {
                    display: true, text: "Employment % — Comparison (Top 10)",
                    color: "#9ba1b0", font: { size: 11, weight: "normal" }, align: "start",
                },
                tooltip: {
                    callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` },
                },
            },
            scales: {
                x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ba1b0", font: { size: 11 }, callback: v => v.toFixed(0) + "%" } },
                y: { grid: { display: false }, ticks: { color: "#9ba1b0", font: { size: 11 } } },
            },
        },
    });
}

function clearSelection() {
    selectedFeature = null;
    compareFeature = null;
    geojsonLayer.resetStyle();
    document.getElementById("selected-info").style.display = "none";
    document.getElementById("compare-info").style.display = "none";
    document.getElementById("placeholder-info").style.display = "block";
    if (compareChart) { compareChart.destroy(); compareChart = null; }
    updateChartsForExtent();
}

// ---- Sidebar ----

function updateSidebar(props) {
    document.getElementById("placeholder-info").style.display = "none";
    document.getElementById("selected-info").style.display = "block";

    document.getElementById("muni-name").textContent = props.MUNICIPAL_NAME;
    document.getElementById("muni-sub").textContent =
        `${props.MUNICIPAL_TYPE || ""} · ${props.UPPER_TIER_MUNICIPALITY || "Single Tier"}`;

    const totalEmp = getTotalEmployment(props);
    document.getElementById("stat-employed").textContent = formatNumber(totalEmp);
    document.getElementById("stat-dominant-lc").textContent = getDominantLandcover(props.landcover);
    document.getElementById("stat-top-sector").textContent = getDominantEmployment(props.employment) || "N/A";

    const settPct = props.landcover ? (props.landcover["Settlement"] || 0) : 0;
    document.getElementById("stat-settlement").textContent = settPct.toFixed(1) + "%";
}

// ---- Charts (#5 — Victor: animate transitions) ----

function updateCharts(props) {
    updateEmploymentChart(props.employment, props.MUNICIPAL_NAME);
    updateLandcoverChart(props.landcover, props.MUNICIPAL_NAME);
}

function updateEmploymentChart(employment, title) {
    if (!employment || Object.keys(employment).length === 0) {
        if (employmentChart) employmentChart.destroy();
        employmentChart = null;
        return;
    }

    const sorted = Object.entries(employment)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

    const labels = sorted.map(([k]) => k);
    const values = sorted.map(([, v]) => v);
    const colors = sorted.map(([k]) => EMPLOYMENT_SECTOR_COLORS[k] || "#666");

    const chartTitle = title ? `Employment — ${title}` : "Employment by Sector (Map Extent)";

    if (employmentChart && employmentChart.data.labels.length === labels.length) {
        employmentChart.data.labels = labels;
        employmentChart.data.datasets[0].data = values;
        employmentChart.data.datasets[0].backgroundColor = colors.map(c => c + "cc");
        employmentChart.data.datasets[0].borderColor = colors;
        employmentChart.options.plugins.title.text = chartTitle;
        employmentChart.update("active");
        return;
    }

    const ctx = document.getElementById("employmentChart").getContext("2d");
    if (employmentChart) employmentChart.destroy();

    employmentChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors.map(c => c + "cc"),
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 3,
            }],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: "easeInOutQuart" },
            plugins: {
                legend: { display: false },
                title: { display: true, text: chartTitle, color: "#9ba1b0", font: { size: 12, weight: "normal" }, align: "start" },
                tooltip: {
                    backgroundColor: "#222533", titleColor: "#e8eaed", bodyColor: "#9ba1b0",
                    borderColor: "#2e3347", borderWidth: 1,
                    callbacks: { label: (ctx) => `  ${ctx.raw.toLocaleString()} workers` },
                },
            },
            scales: {
                x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ba1b0", font: { size: 11 }, callback: (v) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v } },
                y: { grid: { display: false }, ticks: { color: "#9ba1b0", font: { size: 11 } } },
            },
        },
    });
}

// #2 — Label as "Estimated" (Dangermond + Feynman)
function updateLandcoverChart(landcover, title) {
    if (!landcover) return;

    const labels = Object.keys(landcover);
    const values = Object.values(landcover);
    const colors = labels.map(l => LANDCOVER_COLORS[l] || "#666");

    const chartTitle = title
        ? `Land Cover (Estimated) — ${title}`
        : "Land Cover Composition — Estimated (Map Extent)";

    if (landcoverChart) {
        landcoverChart.data.labels = labels;
        landcoverChart.data.datasets[0].data = values;
        landcoverChart.data.datasets[0].backgroundColor = colors.map(c => c + "cc");
        landcoverChart.options.plugins.title.text = chartTitle;
        landcoverChart.update("active");
        return;
    }

    const ctx = document.getElementById("landcoverChart").getContext("2d");

    landcoverChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors.map(c => c + "cc"),
                borderColor: "#222533",
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "55%",
            animation: { duration: 600, easing: "easeInOutQuart" },
            plugins: {
                legend: { position: "right", labels: { color: "#9ba1b0", font: { size: 11 }, padding: 8, boxWidth: 12, boxHeight: 12 } },
                title: { display: true, text: chartTitle, color: "#9ba1b0", font: { size: 12, weight: "normal" }, align: "start" },
                tooltip: {
                    backgroundColor: "#222533", titleColor: "#e8eaed", bodyColor: "#9ba1b0",
                    borderColor: "#2e3347", borderWidth: 1,
                    callbacks: { label: (ctx) => `  ${ctx.label}: ${ctx.raw.toFixed(1)}%` },
                },
            },
        },
    });
}

// #8 — Scatter plot: land use vs employment (Feynman)
function updateScatterPlot() {
    if (!dashboardData) return;

    const points = dashboardData.features
        .filter(f => f.properties.has_employment && f.properties.landcover)
        .map(f => {
            const p = f.properties;
            const agLand = p.landcover["Agriculture"] || 0;
            const emp = p.employment || {};
            const total = Object.values(emp).reduce((a, b) => a + b, 0) || 1;
            const agEmp = ((emp["Agriculture & Forestry"] || 0) / total) * 100;
            const dominant = getDominantLandcover(p.landcover);
            return { x: agLand, y: agEmp, name: p.MUNICIPAL_NAME, dominant };
        });

    const colorMap = {
        "Agriculture": "#f1c40f", "Forest": "#27ae60", "Settlement": "#e74c3c",
        "Water": "#3498db", "Wetland": "#1abc9c", "Natural Open": "#95a5a6",
    };

    const ctx = document.getElementById("scatterChart").getContext("2d");
    if (scatterChart) scatterChart.destroy();

    scatterChart = new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [{
                data: points,
                backgroundColor: points.map(p => (colorMap[p.dominant] || "#666") + "99"),
                borderColor: points.map(p => colorMap[p.dominant] || "#666"),
                borderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 7,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: "Does More Farmland = More Farming Jobs?",
                    color: "#e8eaed", font: { size: 13, weight: "600" }, align: "start",
                },
                tooltip: {
                    backgroundColor: "#222533", titleColor: "#e8eaed", bodyColor: "#9ba1b0",
                    borderColor: "#2e3347", borderWidth: 1,
                    callbacks: {
                        title: (items) => items[0].raw.name,
                        label: (ctx) => [
                            `  Farmland: ${ctx.raw.x.toFixed(1)}%`,
                            `  Ag. jobs: ${ctx.raw.y.toFixed(1)}%`,
                        ],
                    },
                },
            },
            scales: {
                x: {
                    title: { display: true, text: "% of Land That Is Farmland (estimated)", color: "#9ba1b0", font: { size: 11 } },
                    grid: { color: "rgba(255,255,255,0.05)" },
                    ticks: { color: "#9ba1b0", font: { size: 11 }, callback: v => v + "%" },
                    min: 0,
                },
                y: {
                    title: { display: true, text: "% of Jobs in Agriculture", color: "#9ba1b0", font: { size: 11 } },
                    grid: { color: "rgba(255,255,255,0.05)" },
                    ticks: { color: "#9ba1b0", font: { size: 11 }, callback: v => v + "%" },
                    min: 0,
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const name = points[idx].name;
                    geojsonLayer.eachLayer((layer) => {
                        if (layer.feature.properties.MUNICIPAL_NAME === name) {
                            selectMunicipality(layer.feature, layer);
                            map.fitBounds(layer.getBounds(), { padding: [50, 50] });
                        }
                    });
                }
            },
        },
    });
}

// ---- Extent aggregation ----

function getVisibleFeatures() {
    const bounds = map.getBounds();
    const visible = [];
    if (!geojsonLayer) return visible;
    geojsonLayer.eachLayer((layer) => {
        if (bounds.contains(layer._cachedCenter)) visible.push(layer.feature);
    });
    return visible;
}

function aggregateEmployment(features) {
    const totals = {};
    for (const f of features) {
        const emp = f.properties.employment;
        if (!emp) continue;
        for (const [sector, val] of Object.entries(emp)) {
            totals[sector] = (totals[sector] || 0) + val;
        }
    }
    return totals;
}

function aggregateLandcover(features) {
    const totals = {};
    let count = 0;
    for (const f of features) {
        const lc = f.properties.landcover;
        if (!lc) continue;
        count++;
        for (const [type, pct] of Object.entries(lc)) {
            totals[type] = (totals[type] || 0) + pct;
        }
    }
    if (count > 0) {
        for (const key of Object.keys(totals)) totals[key] = totals[key] / count;
    }
    return totals;
}

function updateChartsForExtent() {
    const visible = getVisibleFeatures();
    updateEmploymentChart(aggregateEmployment(visible), null);
    updateLandcoverChart(aggregateLandcover(visible), null);
    updateExtentStats(visible);
}

function updateExtentStats(features) {
    const totalEmp = features.reduce((sum, f) => sum + getTotalEmployment(f.properties), 0);
    document.getElementById("extent-muni-count").textContent = features.length;
    document.getElementById("extent-total-emp").textContent = formatNumber(totalEmp);
}

function onMapMoveEnd() {
    if (!selectedFeature) updateChartsForExtent();
}

// ---- Search ----

function setupSearch() {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase().trim();
        results.innerHTML = "";
        if (query.length < 2) { results.style.display = "none"; return; }

        const matches = [];
        geojsonLayer.eachLayer((layer) => {
            const name = layer.feature.properties.MUNICIPAL_NAME || "";
            if (name.toLowerCase().includes(query))
                matches.push({ name, feature: layer.feature, layer });
        });
        matches.sort((a, b) => a.name.localeCompare(b.name));

        if (!matches.length) { results.style.display = "none"; return; }

        results.style.display = "block";
        for (const m of matches.slice(0, 15)) {
            const div = document.createElement("div");
            div.className = "search-result-item";
            div.textContent = m.name;
            div.addEventListener("click", () => {
                selectMunicipality(m.feature, m.layer);
                map.fitBounds(m.layer.getBounds(), { padding: [50, 50] });
                results.style.display = "none";
                input.value = m.name;
            });
            results.appendChild(div);
        }
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-container")) results.style.display = "none";
    });
}

// ---- Layer toggles + #6 opacity slider (Victor) ----

function setupLayerToggles() {
    document.querySelectorAll('.filter-btn[data-mode]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.mode;
            if (mode === "satellite") {
                layerState.satellite = !layerState.satellite;
                btn.classList.toggle("active", layerState.satellite);
                if (layerState.satellite) { satelliteTileLayer.addTo(map); satelliteTileLayer.bringToBack(); }
                else map.removeLayer(satelliteTileLayer);
            } else if (mode === "boundaries") {
                layerState.boundaries = !layerState.boundaries;
                btn.classList.toggle("active", layerState.boundaries);
                if (layerState.boundaries) geojsonLayer.addTo(map);
                else map.removeLayer(geojsonLayer);
            } else if (mode === "rivers") {
                layerState.rivers = !layerState.rivers;
                btn.classList.toggle("active", layerState.rivers);
                if (riversLayer) {
                    if (layerState.rivers) riversLayer.addTo(map);
                    else map.removeLayer(riversLayer);
                }
            }
        });
    });

    // Opacity slider for land cover
    const slider = document.getElementById("lc-opacity-slider");
    if (slider) {
        slider.addEventListener("input", () => {
            const val = parseFloat(slider.value);
            landcoverTileLayer.setOpacity(val);
            document.getElementById("lc-opacity-value").textContent = Math.round(val * 100) + "%";
        });
    }
}

// ---- Legend ----

function buildLegend() {
    const container = document.getElementById("legend-items");
    container.innerHTML = "";

    const groups = [
        { name: "Water", items: LANDCOVER_LEGEND.slice(0, 2) },
        { name: "Wetland", items: LANDCOVER_LEGEND.slice(2, 8) },
        { name: "Forest & Trees", items: LANDCOVER_LEGEND.slice(8, 16) },
        { name: "Other Natural", items: LANDCOVER_LEGEND.slice(16, 19) },
        { name: "Human", items: LANDCOVER_LEGEND.slice(19) },
    ];

    for (const g of groups) {
        const groupDiv = document.createElement("div");
        groupDiv.className = "legend-group";
        groupDiv.innerHTML = `<div class="legend-group-label">${g.name}</div>`;
        for (const item of g.items) {
            groupDiv.innerHTML += `<div class="legend-item"><div class="legend-color" style="background:${item.color}"></div><span>${item.label}</span></div>`;
        }
        container.appendChild(groupDiv);
    }
}

// ---- Rivers (#9 — Thompson) ----

const MAJOR_RIVERS = {
    type: "FeatureCollection",
    features: [
        { type: "Feature", properties: { name: "St. Lawrence River" }, geometry: { type: "LineString", coordinates: [[-75.0,45.0],[-74.5,44.85],[-74.0,44.7],[-73.5,44.6],[-73.0,44.5]] } },
        { type: "Feature", properties: { name: "Ottawa River" }, geometry: { type: "LineString", coordinates: [[-79.5,46.3],[-79.0,46.2],[-78.5,46.0],[-78.0,45.8],[-77.5,45.6],[-77.0,45.5],[-76.5,45.5],[-76.0,45.5],[-75.7,45.45],[-75.4,45.42]] } },
        { type: "Feature", properties: { name: "French River" }, geometry: { type: "LineString", coordinates: [[-80.0,46.0],[-79.8,46.05],[-79.6,46.1],[-79.4,46.05],[-79.2,46.0]] } },
        { type: "Feature", properties: { name: "Albany River" }, geometry: { type: "LineString", coordinates: [[-86.0,51.2],[-85.5,51.1],[-85.0,51.0],[-84.5,50.8],[-84.0,50.7],[-83.5,50.9],[-83.0,51.0],[-82.5,51.2],[-82.2,51.3]] } },
        { type: "Feature", properties: { name: "Moose River" }, geometry: { type: "LineString", coordinates: [[-82.5,50.5],[-82.0,50.6],[-81.5,50.8],[-81.0,51.0],[-80.7,51.2],[-80.6,51.3]] } },
        { type: "Feature", properties: { name: "Severn River" }, geometry: { type: "LineString", coordinates: [[-89.0,53.5],[-88.5,53.6],[-88.0,53.8],[-87.5,54.0],[-87.0,54.2],[-86.5,54.5],[-86.0,55.0],[-85.8,55.3]] } },
        { type: "Feature", properties: { name: "Trent River" }, geometry: { type: "LineString", coordinates: [[-78.9,44.8],[-78.5,44.6],[-78.0,44.4],[-77.6,44.2],[-77.4,44.1]] } },
        { type: "Feature", properties: { name: "Grand River" }, geometry: { type: "LineString", coordinates: [[-80.5,43.9],[-80.4,43.7],[-80.3,43.5],[-80.25,43.3],[-80.1,43.1],[-79.95,43.0]] } },
        { type: "Feature", properties: { name: "Thames River" }, geometry: { type: "LineString", coordinates: [[-81.3,43.1],[-81.1,43.0],[-80.9,42.9],[-80.7,42.8],[-80.6,42.65],[-80.8,42.5],[-81.2,42.35],[-81.5,42.3],[-82.0,42.3]] } },
        { type: "Feature", properties: { name: "Attawapiskat River" }, geometry: { type: "LineString", coordinates: [[-86.5,52.0],[-86.0,52.1],[-85.5,52.2],[-85.0,52.3],[-84.5,52.5],[-84.0,52.7],[-83.5,52.8],[-82.5,52.9]] } },
        { type: "Feature", properties: { name: "Winisk River" }, geometry: { type: "LineString", coordinates: [[-88.0,53.0],[-87.5,53.2],[-87.0,53.5],[-86.5,53.7],[-86.0,54.0],[-85.5,54.5],[-85.2,55.0]] } },
        { type: "Feature", properties: { name: "Mississagi River" }, geometry: { type: "LineString", coordinates: [[-83.5,47.5],[-83.3,47.3],[-83.1,47.1],[-82.9,46.9],[-82.7,46.7],[-82.5,46.5],[-82.3,46.3]] } },
        { type: "Feature", properties: { name: "Spanish River" }, geometry: { type: "LineString", coordinates: [[-82.5,47.0],[-82.2,46.8],[-81.9,46.6],[-81.6,46.4],[-81.4,46.2],[-81.7,46.15]] } },
    ],
};

function loadRivers() {
    riversLayer = L.geoJSON(MAJOR_RIVERS, {
        pane: "rivers",
        style: {
            color: "#5BA3E6",
            weight: 2,
            opacity: 0.7,
            dashArray: null,
        },
        onEachFeature: (feature, layer) => {
            layer.bindTooltip(feature.properties.name, {
                permanent: false, direction: "center",
                className: "river-tooltip",
            });
        },
    }).addTo(map);
}

// ---- Tabs ----

function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("tab-" + btn.dataset.tab).classList.add("active");

            if (btn.dataset.tab === "dashboard") {
                if (employmentChart) employmentChart.resize();
                if (landcoverChart) landcoverChart.resize();
            }
        });
    });
}

// ---- Init ----

async function loadData() {
    try {
        const response = await fetch("data/dashboard_data.geojson");
        if (!response.ok) throw new Error("Failed to load data: " + response.status);
        dashboardData = await response.json();
    } catch (err) {
        const loading = document.getElementById("loading");
        loading.querySelector("p").textContent = "Error loading data. Please refresh the page.";
        loading.querySelector(".dot-loader").style.display = "none";
        return;
    }

    geojsonLayer = L.geoJSON(dashboardData, {
        style: styleFeature,
        onEachFeature: onEachFeature,
    }).addTo(map);

    geojsonLayer.eachLayer((layer) => {
        layer._cachedCenter = layer.getBounds().getCenter();
    });

    map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });

    buildLegend();
    updateChartsForExtent();
    updateScatterPlot();
    loadRivers();

    const loading = document.getElementById("loading");
    loading.classList.add("hidden");
    setTimeout(() => loading.remove(), 300);
}

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    setupSearch();
    setupLayerToggles();
    setupTabs();

    document.getElementById("clear-btn").addEventListener("click", clearSelection);
    document.getElementById("legend-toggle").addEventListener("click", () => {
        document.getElementById("map-legend").classList.toggle("collapsed");
    });

    loadData();
});
