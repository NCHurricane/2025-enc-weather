// North Carolina County Map Module
import { fetchCurrentWeather, getWeatherIcon } from './weatherData.js';
import { safeSetHTML, createElement } from './utils.js';

// We'll need to include the topojson-client library
// Add this to your HTML: <script src="https://unpkg.com/topojson-client@3"></script>
// Or import it if using a bundler: import * as topojson from 'topojson-client';

export class NCCountyMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.width = options.width || 800;
        this.height = options.height || 600;
        this.countyData = null;
        this.weatherData = {};
        this.svg = null;
        this.projection = null;
        this.path = null;
        this.options = {
            defaultFill: '#f0f0f0',
            highlightFill: '#ffc107',
            strokeColor: '#fff',
            strokeWidth: 1,
            ...options
        };

        // Create a set of counties we want to highlight (from your siteConfig)
        this.targetCounties = new Set(
            (window.siteConfig?.counties || []).map(county => county.name.toLowerCase())
        );
    }

    // Initialize the map
    async init() {
        if (!this.container) {
            console.error(`Container with ID "${this.containerId}" not found`);
            return;
        }

        try {
            // Create SVG element with responsive viewBox
            this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svg.setAttribute('viewBox', '0 0 800 600');
            this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            this.svg.style.width = '100%';
            this.svg.style.height = 'auto';
            this.svg.style.display = 'block';
            this.container.appendChild(this.svg);

            // Add loading indicator
            const loadingText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            loadingText.setAttribute('x', '50%');
            loadingText.setAttribute('y', '50%');
            loadingText.setAttribute('text-anchor', 'middle');
            loadingText.setAttribute('dominant-baseline', 'middle');
            loadingText.setAttribute('fill', '#333');
            loadingText.textContent = 'Loading map...';
            this.svg.appendChild(loadingText);

            // Load county data
            await this.loadCountyData();

            // Remove loading indicator
            this.svg.removeChild(loadingText);

            // Draw the map
            this.drawMap();

            // Update with weather data
            await this.updateWeatherData();

            return true;
        } catch (error) {
            console.error('Error initializing NC county map:', error);
            return false;
        }
    }

    // Load TopoJSON county data
    async loadCountyData() {
        try {
            const response = await fetch('js/data/NC-county-topo.json');
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            this.countyData = await response.json();
            return true;
        } catch (error) {
            console.error('Error loading county data:', error);
            return false;
        }
    }


    // Draw the county map
    drawMap() {
        if (!this.countyData) return false;

        try {
            // Set up D3 projection (or use a basic transformation if D3 is not available)
            // This is a simplified version - with D3 you'd use d3.geoMercator() or similar
            this.setupProjection();

            // Create counties
            const counties = topojson.feature(this.countyData, this.countyData.objects.North_Carolina);

            // Group for all counties
            const countyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            countyGroup.setAttribute('class', 'counties');
            this.svg.appendChild(countyGroup);

            // Add each county as a path
            counties.features.forEach(county => {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const countyName = county.properties.name.toLowerCase();

                // Set attributes
                path.setAttribute('d', this.path(county));
                path.setAttribute('id', `county-${countyName}`);
                path.setAttribute('data-name', countyName);
                path.setAttribute('fill', this.targetCounties.has(countyName) ?
                    this.options.highlightFill : this.options.defaultFill);
                path.setAttribute('stroke', this.options.strokeColor);
                path.setAttribute('stroke-width', this.options.strokeWidth);

                // Add event listeners
                path.addEventListener('mouseover', () => this.handleCountyHover(county, path));
                path.addEventListener('mouseout', () => this.handleCountyOut(county, path));
                path.addEventListener('click', () => this.handleCountyClick(county));

                // Add to the group
                countyGroup.appendChild(path);
            });

            return true;
        } catch (error) {
            console.error('Error drawing map:', error);
            return false;
        }
    }

    // Set up projection and path generator
    // setupProjection() {
    //     if (window.d3) {
    //         // If D3 is available, use its projection capabilities
    //         this.projection = d3.geoMercator()
    //             .fitSize([this.width, this.height], topojson.feature(this.countyData, this.countyData.objects.North_Carolina));

    //         this.path = d3.geoPath().projection(this.projection);
    //     } else {
    //         // Simplified version without D3
    //         // Get the bounding box of all counties
    //         const features = topojson.feature(this.countyData, this.countyData.objects.North_Carolina);
    //         const bounds = this.getBoundingBox(features);

    //         // Create a simple scaling function for the coordinates
    //         const xScale = this.width / (bounds.maxX - bounds.minX);
    //         const yScale = this.height / (bounds.maxY - bounds.minY);

    //         // Create a simple path generator
    //         this.path = feature => {
    //             let pathData = '';

    //             if (feature.geometry.type === 'Polygon') {
    //                 feature.geometry.coordinates.forEach(ring => {
    //                     ring.forEach((coord, i) => {
    //                         const x = (coord[0] - bounds.minX) * xScale;
    //                         const y = (coord[1] - bounds.minY) * yScale;
    //                         pathData += (i === 0 ? 'M' : 'L') + x + ',' + y;
    //                     });
    //                     pathData += 'Z';
    //                 });
    //             } else if (feature.geometry.type === 'MultiPolygon') {
    //                 feature.geometry.coordinates.forEach(polygon => {
    //                     polygon.forEach(ring => {
    //                         ring.forEach((coord, i) => {
    //                             const x = (coord[0] - bounds.minX) * xScale;
    //                             const y = (coord[1] - bounds.minY) * yScale;
    //                             pathData += (i === 0 ? 'M' : 'L') + x + ',' + y;
    //                         });
    //                         pathData += 'Z';
    //                     });
    //                 });
    //             }

    //             return pathData;
    //         };
    //     }
    // }

    // Set up projection and path generator
    setupProjection() {
        if (window.d3) {
            // Create a GeoJSON feature that represents just Eastern NC
            const easternNC = {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "Polygon",
                    // These coordinates form a bounding box around Eastern NC
                    coordinates: [[
                        [-79.0, 34.8],  // Southwest corner
                        [-75.4, 34.8],  // Southeast corner
                        [-75.4, 36.5],  // Northeast corner
                        [-79.0, 36.5],  // Northwest corner
                        [-79.0, 34.8]   // Close the polygon
                    ]]
                }
            };

            // Use D3's fitSize to zoom to this region
            this.projection = d3.geoMercator()
                .fitSize([this.width, this.height], easternNC);

            this.path = d3.geoPath().projection(this.projection);
        } else {
            // For non-D3 version, just change the bounds
            // Eastern NC approximate bounds
            const easternMinLon = -79.0;
            const easternMaxLon = -75.4;
            const easternMinLat = 34.8;
            const easternMaxLat = 36.5;

            // Create a simple path generator using these bounds
            this.path = feature => {
                let pathData = '';

                // Transform the coordinates based on Eastern NC bounds
                const xScale = this.width / (easternMaxLon - easternMinLon);
                const yScale = this.height / (easternMaxLat - easternMinLat);

                if (feature.geometry.type === 'Polygon') {
                    feature.geometry.coordinates.forEach(ring => {
                        ring.forEach((coord, i) => {
                            const x = (coord[0] - easternMinLon) * xScale;
                            const y = this.height - (coord[1] - easternMinLat) * yScale; // Flip Y axis
                            pathData += (i === 0 ? 'M' : 'L') + x + ',' + y;
                        });
                        pathData += 'Z';
                    });
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(polygon => {
                        polygon.forEach(ring => {
                            ring.forEach((coord, i) => {
                                const x = (coord[0] - easternMinLon) * xScale;
                                const y = this.height - (coord[1] - easternMinLat) * yScale; // Flip Y axis
                                pathData += (i === 0 ? 'M' : 'L') + x + ',' + y;
                            });
                            pathData += 'Z';
                        });
                    });
                }

                return pathData;
            };
        }
    }

    // Get bounding box for features (simplified version)
    getBoundingBox(features) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        features.features.forEach(feature => {
            if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates.forEach(ring => {
                    ring.forEach(coord => {
                        minX = Math.min(minX, coord[0]);
                        minY = Math.min(minY, coord[1]);
                        maxX = Math.max(maxX, coord[0]);
                        maxY = Math.max(maxY, coord[1]);
                    });
                });
            } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygon => {
                    polygon.forEach(ring => {
                        ring.forEach(coord => {
                            minX = Math.min(minX, coord[0]);
                            minY = Math.min(minY, coord[1]);
                            maxX = Math.max(maxX, coord[0]);
                            maxY = Math.max(maxY, coord[1]);
                        });
                    });
                });
            }
        });

        return { minX, minY, maxX, maxY };
    }

    // Event Handlers
    handleCountyHover(county, pathElement) {
        const countyName = county.properties.name;
        pathElement.setAttribute('opacity', '0.8');

        // Show tooltip if we have weather data
        if (this.weatherData[countyName.toLowerCase()]) {
            this.showTooltip(county, this.weatherData[countyName.toLowerCase()]);
        }
    }

    handleCountyOut(county, pathElement) {
        pathElement.setAttribute('opacity', '1');
        this.hideTooltip();
    }

    handleCountyClick(county) {
        const countyName = county.properties.name.toLowerCase();

        // Find the county in our config
        const countyConfig = (window.siteConfig?.counties || [])
            .find(c => c.name.toLowerCase() === countyName);

        if (countyConfig && countyConfig.url) {
            window.location.href = countyConfig.url;
        }
    }

    // Tooltip functions
    showTooltip(county, weatherData) {
        // Remove any existing tooltip
        this.hideTooltip();

        const countyName = county.properties.name;

        // Create tooltip group
        const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tooltip.setAttribute('id', 'county-tooltip');
        tooltip.setAttribute('class', 'county-tooltip');

        // Find county centroid
        const centroid = this.findCentroid(county);

        // Background rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', centroid.x - 60);
        rect.setAttribute('y', centroid.y - 50);
        rect.setAttribute('width', '120');
        rect.setAttribute('height', '100');
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        rect.setAttribute('fill', 'rgba(0,0,0,0.7)');

        // County name
        const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.setAttribute('x', centroid.x);
        nameText.setAttribute('y', centroid.y - 30);
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('fill', 'white');
        nameText.setAttribute('font-weight', 'bold');
        nameText.textContent = countyName;

        // Temperature
        const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tempText.setAttribute('x', centroid.x);
        tempText.setAttribute('y', centroid.y);
        tempText.setAttribute('text-anchor', 'middle');
        tempText.setAttribute('fill', 'yellow');
        tempText.setAttribute('font-size', '18');
        tempText.setAttribute('font-weight', 'bold');
        tempText.textContent = `${weatherData.temp}°F`;

        // Condition
        const condText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        condText.setAttribute('x', centroid.x);
        condText.setAttribute('y', centroid.y + 25);
        condText.setAttribute('text-anchor', 'middle');
        condText.setAttribute('fill', 'white');
        condText.setAttribute('font-size', '12');
        condText.textContent = weatherData.condition;

        // Add elements to tooltip
        tooltip.appendChild(rect);
        tooltip.appendChild(nameText);
        tooltip.appendChild(tempText);
        tooltip.appendChild(condText);

        // Add tooltip to SVG
        this.svg.appendChild(tooltip);
    }

    hideTooltip() {
        const tooltip = document.getElementById('county-tooltip');
        if (tooltip) {
            tooltip.parentNode.removeChild(tooltip);
        }
    }

    // Find the centroid of a county
    findCentroid(county) {
        if (window.d3) {
            // Use D3's centroid calculation if available
            const centroidCoords = d3.geoCentroid(county);
            return {
                x: this.projection(centroidCoords)[0],
                y: this.projection(centroidCoords)[1]
            };
        } else {
            // Calculate a simple average of all coordinates
            let totalX = 0;
            let totalY = 0;
            let pointCount = 0;

            // Helper function to process a ring of coordinates
            const processRing = (ring) => {
                ring.forEach(coord => {
                    const features = topojson.feature(this.countyData, this.countyData.objects.North_Carolina);
                    const bounds = this.getBoundingBox(features);

                    const xScale = this.width / (bounds.maxX - bounds.minX);
                    const yScale = this.height / (bounds.maxY - bounds.minY);

                    const x = (coord[0] - bounds.minX) * xScale;
                    const y = (coord[1] - bounds.minY) * yScale;

                    totalX += x;
                    totalY += y;
                    pointCount++;
                });
            };

            if (county.geometry.type === 'Polygon') {
                county.geometry.coordinates.forEach(processRing);
            } else if (county.geometry.type === 'MultiPolygon') {
                county.geometry.coordinates.forEach(polygon => {
                    polygon.forEach(processRing);
                });
            }

            return {
                x: totalX / pointCount,
                y: totalY / pointCount
            };
        }
    }

    // Fetch and update weather data for counties
    async updateWeatherData() {
        try {
            // Get counties from siteConfig
            const counties = window.siteConfig?.counties || [];

            // Fetch weather data for each county
            for (const county of counties) {
                const weatherData = await fetchCurrentWeather(county.lat, county.lon);

                // Store weather data by county name (lowercase for consistency)
                this.weatherData[county.name.toLowerCase()] = weatherData;

                // Update county fill color based on temperature
                this.updateCountyFill(county.name, weatherData);

                // Add weather marker at county location
                this.addWeatherMarker(county, weatherData);
            }

            return true;
        } catch (error) {
            console.error('Error updating weather data:', error);
            return false;
        }
    }

    // Update county fill color based on temperature
    updateCountyFill(countyName, weatherData) {
        const countyPath = document.getElementById(`county-${countyName.toLowerCase()}`);
        if (!countyPath) return;

        // Simple temperature-based color scale (blue to red)
        const temp = parseFloat(weatherData.temp);
        if (isNaN(temp)) return;

        // Temperature ranges for color scale (adjust as needed)
        const minTemp = 20;  // Cold - blue
        const maxTemp = 100; // Hot - red

        // Calculate color (simple linear gradient from blue to red)
        let normalizedTemp = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
        const r = Math.round(normalizedTemp * 255);
        const b = Math.round((1 - normalizedTemp) * 255);
        const g = Math.round(100 - Math.abs(normalizedTemp - 0.5) * 100);

        const fillColor = `rgb(${r}, ${g}, ${b})`;
        countyPath.setAttribute('fill', fillColor);
        countyPath.setAttribute('original-fill', fillColor);
    }

    // Add weather marker for a county
    addWeatherMarker(county, weatherData) {
        // Find the position based on lat/lon
        const position = this.latLonToSvgCoords(county.lat, county.lon);
        if (!position) return;

        // Create marker group
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        marker.setAttribute('class', 'weather-marker');
        marker.setAttribute('id', `marker-${county.name.toLowerCase()}`);
        marker.setAttribute('cursor', 'pointer');

        // Temperature text
        const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tempText.setAttribute('x', position.x);
        tempText.setAttribute('y', position.y);
        tempText.setAttribute('text-anchor', 'middle');
        tempText.setAttribute('font-size', '18');
        tempText.setAttribute('font-weight', 'bold');
        tempText.setAttribute('fill', 'white');
        tempText.setAttribute('stroke', 'black');
        tempText.setAttribute('stroke-width', '0.5');
        tempText.textContent = `${weatherData.temp}°`;

        // Add click handler
        marker.addEventListener('click', () => {
            if (county.url) {
                window.location.href = county.url;
            }
        });

        // Add marker to SVG
        marker.appendChild(tempText);
        this.svg.appendChild(marker);
    }

    // Convert lat/lon to SVG coordinates
    latLonToSvgCoords(lat, lon) {
        if (window.d3 && this.projection) {
            // Use D3's projection capabilities
            return {
                x: this.projection([lon, lat])[0],
                y: this.projection([lon, lat])[1]
            };
        } else {
            // Without D3, we need a custom transformation
            // This is a very simplified approximation
            const features = topojson.feature(this.countyData, this.countyData.objects.North_Carolina);
            const bounds = this.getBoundingBox(features);

            // North Carolina's approximate bounds
            const ncMinLon = -84.32;
            const ncMaxLon = -75.46;
            const ncMinLat = 33.88;
            const ncMaxLat = 36.59;

            // Calculate position
            const x = this.width * (lon - ncMinLon) / (ncMaxLon - ncMinLon);
            const y = this.height * (1 - (lat - ncMinLat) / (ncMaxLat - ncMinLat));

            return { x, y };
        }
    }

    // Update the map (for refreshing data)
    async refresh() {
        // Clear existing markers
        const markers = this.svg.querySelectorAll('.weather-marker');
        markers.forEach(marker => marker.remove());

        // Reset county fills
        const countyPaths = this.svg.querySelectorAll('path[id^="county-"]');
        countyPaths.forEach(path => {
            path.setAttribute('fill', this.targetCounties.has(path.getAttribute('data-name')) ?
                this.options.highlightFill : this.options.defaultFill);
        });

        // Update with fresh weather data
        await this.updateWeatherData();
    }
}

// Usage example:
// 1. Add to index.js or main.js
export function initCountyMap() {
    const mapContainer = document.getElementById('nc-county-map');
    if (!mapContainer) return;

    const countyMap = new NCCountyMap('nc-county-map', {
        defaultFill: '#e0e0e0',
        highlightFill: '#ffc107',
        strokeColor: '#ffffff',
        strokeWidth: 1
    });

    countyMap.init().then(success => {
        if (success) {
            console.log('NC County Map initialized successfully');

            // Optionally refresh on global refresh button click
            const refreshButton = document.getElementById('global-refresh');
            if (refreshButton) {
                refreshButton.addEventListener('click', function () {
                    countyMap.refresh();
                });
            }
        }
    });

    // Store in window for debugging
    window.ncCountyMap = countyMap;
}




