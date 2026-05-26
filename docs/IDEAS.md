# Ontario Land Use & Employment Dashboard — Ideas & Notes

## Project Overview
A map-centric single-page dashboard showing land use in Ontario and the geographic relationship between land use types and employment sectors. Built as a school project.

## Core Features
- Interactive map of Ontario showing land cover data
- Lower-tier municipality boundaries overlay
- Dynamic charts that update based on:
  - Current map extent (viewport filtering)
  - Clicking a specific lower-tier municipality
- Employment data by sector cross-referenced with land use

## Data Sources
1. **Ontario Landcover Compilation** — Ontario GeoHub (geohub.lio.gov.on.ca)
2. **Ontario Lower Tier Municipal Boundaries** — Ontario GeoHub
3. **Employment by sector** — Statistics Canada (best available dataset TBD)

## Tech Stack
- **Frontend**: Single-pane HTML/CSS/JS (no framework)
- **Map**: Leaflet.js or MapLibre GL JS
- **Charts**: Chart.js or D3.js
- **Hosting**: GitHub Pages or GCP (Cloud Storage static site)
- **Repo**: GitHub (public)

## Architecture Decisions
- Single HTML file with linked CSS/JS for simplicity
- Client-side data processing (no backend needed)
- Pre-processed data files (GeoJSON/JSON) to avoid CORS and API rate limits
- Responsive layout: map takes ~60% width, charts panel ~40%

## Future Ideas
- Time series: compare land use changes over time if historical data available
- Heatmap mode for employment density
- Export/download filtered data as CSV
- Print-friendly view for school submission
- Accessibility: keyboard navigation, screen reader support for charts
- Tooltip with municipality details on hover
- Search/filter municipalities by name
- Legend with land cover type colors
- Comparison mode: select two municipalities side by side

## Lessons Learned
(To be filled as we build)

## Notes
- Ontario GeoHub uses ArcGIS Online — REST API endpoints available
- Stats Canada has a Web Data Service API for programmatic access
- Lower-tier municipalities ~ Census Subdivisions in Stats Canada terminology
- Need to handle the mapping between municipality names across datasets
