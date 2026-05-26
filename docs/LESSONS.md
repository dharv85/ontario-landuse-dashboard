# Lessons Learned

## Data Acquisition

### Ontario GeoHub ArcGIS REST API
- GeoHub pages are JavaScript-rendered SPAs — web scraping gets empty pages. Go straight to the ArcGIS REST endpoints instead.
- The ArcGIS REST API paginates at 100 features max per request. Use `resultOffset` and `resultRecordCount` to page through.
- **Geometry simplification is critical**: full-resolution municipal boundaries = ~21MB per 100 features (140MB+ total). Using `maxAllowableOffset=0.005` in the query reduces this to ~170KB per 100 features (5MB total) with minimal visual quality loss at dashboard zoom levels.
- The OLCC ImageServer (land cover raster) was down on 2026-05-23. Always have fallback plans for government data services.

### Statistics Canada
- Census data tables can be enormous. Table 98-10-0456 is 100MB zipped, 2.3GB uncompressed CSV.
- Table numbering matters: 98-10-0591 is occupation (NOC), 98-10-0592 is industry by CD, 98-10-0456 is industry by CSD. Read the metadata carefully before downloading.
- Streaming extraction + filtering (unzip -p piped to Python) avoids writing multi-GB files to disk.
- Census Subdivision (CSD) geography aligns well with Ontario lower-tier municipalities, but naming conventions differ (Stats Can uses "Ottawa", GeoHub uses "CITY OF OTTAWA"). Normalize both sides for matching.

### Name Matching Between Datasets
- Achieved 98.5% match rate (675/685) by stripping municipal type prefixes ("Township of", "City of", etc.) and normalizing to uppercase.
- Remaining 10 unmatched are edge cases: multi-part names ("Gordon / Barrie Island"), counties listed as municipalities, and alternate naming ("The Nation Municipality").

## Technical

### Web Performance
- 5MB GeoJSON is acceptable for initial load with gzip compression (~1MB over the wire).
- Leaflet handles 685 polygon features smoothly with simplified geometries.
- Chart.js provides good-looking charts with minimal configuration.

### Architecture
- Single-page app with no build tools works well for a project of this scope.
- Pre-processing data into a single GeoJSON with all properties embedded simplifies the client code significantly — no joins needed at runtime.
- CDN-hosted libraries (Leaflet, Chart.js) avoid bundling complexity.

### Voice/Audio Generation
- macOS `say` command + `ffmpeg` is a viable pipeline for generating styled TTS audio clips
- Pitch shifting (`asetrate`), EQ, and echo in ffmpeg can create distinctive character voices
- Web Speech API (`speechSynthesis`) quality varies wildly across browsers — pre-generated audio is more reliable

### Round Table Review Approach
- Having fictional experts review the dashboard surfaced 9 concrete improvements across UX, data viz, accessibility, and geographic accuracy
- Most impactful: opacity slider (Victor), compare mode (Kay), scatter plot (Feynman), northern Ontario context (Thompson), scale bar (Dangermond)

## Deployment
(To be filled during GCP setup)
