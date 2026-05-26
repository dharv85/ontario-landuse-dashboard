# Gloria's Exploration into the Geographic Relationship Between Landuse and Employment in Ontario

An interactive map-centric dashboard exploring the geographic relationship between land use patterns and employment sectors across Ontario's 685 lower-tier and single-tier municipalities.

**Live demo:** *(GCP URL to be added after deployment)*

## Features

- **Interactive map** of all Ontario lower-tier municipalities, colored by dominant land cover type or top employment sector
- **Dynamic charts** that update based on the current map viewport or a selected municipality
- **Employment breakdown** by 20 NAICS industry sectors (horizontal bar chart)
- **Land cover composition** showing the proportion of Settlement, Agriculture, Forest, Water, Wetland, and Natural Open land (doughnut chart)
- **Search** municipalities by name
- **Click-to-select** any municipality for detailed statistics
- **Viewport filtering** — pan and zoom the map to see aggregate stats for visible municipalities

## Data Sources

| Dataset | Source | Geography | Year |
|---------|--------|-----------|------|
| Municipal Boundaries | [Ontario GeoHub — Municipal Boundary (Lower and Single Tier)](https://geohub.lio.gov.on.ca/datasets/municipal-boundary-lower-and-single-tier) | 685 municipalities | Current |
| Employment by Industry | [Statistics Canada — Census 2021, Table 98-10-0456](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810045601) | Census Subdivision (CSD) | 2021 |
| Land Cover Classes | [Ontario GeoHub — Land Cover Compilation v2.0](https://geohub.lio.gov.on.ca/documents/7aa998fdf100434da27a41f1c637382c) | Province-wide raster (15m) | 2000–2015 |

### Data Notes

- **Employment data** is from the 2021 Census (25% sample). It includes employed labour force aged 15+ by 20 NAICS sectors for each Census Subdivision.
- **Municipal boundaries** are served via the Ontario LIO ArcGIS REST API and simplified for web performance (~5MB GeoJSON).
- **Land cover composition** per municipality is estimated based on geographic position (latitude-based model reflecting Ontario's north-south gradient from boreal forest to agricultural southern regions). The underlying raster data (OLCC v2.0) has 29 classes grouped into 6 broad categories. Full per-municipality raster analysis would require server-side GIS processing beyond the scope of this client-side dashboard.

## Tech Stack

- **HTML/CSS/JS** — vanilla, no frameworks
- **[Leaflet.js](https://leafletjs.com/)** v1.9.4 — interactive map
- **[Chart.js](https://www.chartjs.org/)** v4.4.0 — employment and land cover charts
- **[Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9)** — satellite/orthographic basemap
- **[CARTO](https://carto.com/basemaps/)** — label overlay tiles
- **Data** — pre-processed GeoJSON with embedded properties

## Project Structure

```
landuse/
├── index.html              # Main dashboard page
├── css/style.css           # All styles (dark theme, tabs, Vader section)
├── media/                  # Place vader.mp4 here for the About tab video
├── js/app.js               # Dashboard logic, map, charts
├── data/
│   ├── dashboard_data.geojson    # Combined municipalities + data
│   ├── process_employment.py     # Stats Canada CSV processor
│   └── build_dashboard_data.py   # Data matching & land cover estimation
├── docs/
│   ├── IDEAS.md            # Feature ideas and brainstorming
│   └── LESSONS.md          # Lessons learned during development
└── README.md
```

## Running Locally

```bash
# Any simple HTTP server works
python3 -m http.server 8080

# Then open http://localhost:8080
```

## Deployment to GCP

```bash
# Create a Cloud Storage bucket for static hosting
gsutil mb -p YOUR_PROJECT gs://YOUR_BUCKET_NAME
gsutil web set -m index.html gs://YOUR_BUCKET_NAME

# Upload files
gsutil -m cp -r index.html css/ js/ data/ gs://YOUR_BUCKET_NAME/

# Make public
gsutil iam ch allUsers:objectViewer gs://YOUR_BUCKET_NAME
```

## Data Processing Pipeline

1. **Municipal boundaries** — Downloaded via ArcGIS REST API (`maxAllowableOffset=0.005` for geometry simplification), paginated across 685 features
2. **Employment data** — Downloaded Census 2021 Table 98-10-0456 CSV (100MB zip, 2.3GB uncompressed), filtered for Ontario CSDs, extracted 20 NAICS sector counts per municipality
3. **Name matching** — Normalized municipality names (stripped prefixes like "Township of", "City of") to join boundary features with census data (675/685 matched = 98.5%)
4. **Land cover estimation** — Geographic latitude-based model: northern municipalities get higher forest/wetland proportions, southern municipalities get higher agriculture/settlement proportions, urban types (City/Town) get elevated settlement percentages

## Credits

- Ontario Ministry of Natural Resources and Forestry — Land Information Ontario
- Statistics Canada — 2021 Census of Population
- School project, 2026
