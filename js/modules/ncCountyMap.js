// North Carolina County Map Module
import { fetchCurrentWeather, getWeatherIcon } from './weatherData.js';
import { safeSetHTML, createElement } from './utils.js';

export class NCCountyMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.width = options.width || 800;
        this.height = options.height || 450;
        this.countyData = null;
        this.countyFeatures = null; // Will store the GeoJSON features
        this.weatherData = {};
        this.svg = null;
        this.projection = null;
        this.path = null;
        this.options = {
            defaultFill: '#0077cc',
            highlightFill: '#1e88e5',
            strokeColor: '#ffffff',
            strokeWidth: 2,
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
            this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
            this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            this.svg.style.width = '100%';
            this.svg.style.height = '100%';
            this.container.appendChild(this.svg);

            // Add background rect
            const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            background.setAttribute('width', this.width);
            background.setAttribute('height', this.height);
            background.setAttribute('fill', 'transparent');
            this.svg.appendChild(background);

            // Add loading indicator
            const loadingText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            loadingText.setAttribute('x', '50%');
            loadingText.setAttribute('y', '50%');
            loadingText.setAttribute('text-anchor', 'middle');
            loadingText.setAttribute('dominant-baseline', 'middle');
            loadingText.setAttribute('fill', '#ffffff');
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

    // Load county data - works with either TopoJSON or GeoJSON
    async loadCountyData() {
        try {
            const response = await fetch('js/data/NC-county-topo.json');
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            this.countyData = await response.json();
            console.log("Loaded data type:", this.countyData.type);

            // Process data based on its type
            if (this.countyData.type === 'Topology') {
                // This is TopoJSON
                console.log("Processing as TopoJSON");
                const objectNames = Object.keys(this.countyData.objects || {});
                if (objectNames.length === 0) {
                    throw new Error("No objects found in TopoJSON data");
                }

                // Use the first object
                const objectName = objectNames[0];
                console.log(`Using TopoJSON object: ${objectName}`);

                // Convert TopoJSON to GeoJSON
                this.countyFeatures = topojson.feature(this.countyData, this.countyData.objects[objectName]);
            } else if (this.countyData.type === 'FeatureCollection') {
                // This is GeoJSON
                console.log("Processing as GeoJSON");
                this.countyFeatures = this.countyData;
            } else {
                throw new Error(`Unsupported data type: ${this.countyData.type}`);
            }

            console.log(`Loaded ${this.countyFeatures.features.length} county features`);
            return true;
        } catch (error) {
            console.error('Error loading county data:', error);
            return false;
        }
    }

    // Draw the county map
    drawMap() {
        if (!this.countyFeatures) return false;

        try {
            // Set up D3 projection
            this.setupProjection();

            // Create counties group
            const countyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            countyGroup.setAttribute('class', 'counties');
            this.svg.appendChild(countyGroup);

            // Draw each county
            this.countyFeatures.features.forEach(county => {
                // Get county name - handle various property formats
                const countyName = (
                    county.properties.name ||
                    county.properties.NAME ||
                    county.properties.County ||
                    county.properties.COUNTY ||
                    ""
                ).toLowerCase();

                // Create path element
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', this.path(county));
                path.setAttribute('id', `county-${countyName}`);
                path.setAttribute('data-name', countyName);
                path.setAttribute('fill', this.options.defaultFill);
                path.setAttribute('stroke', this.options.strokeColor);
                path.setAttribute('stroke-width', this.options.strokeWidth);

                // Add event listeners
                path.addEventListener('mouseover', () => this.handleCountyHover(county, path));
                path.addEventListener('mouseout', () => this.handleCountyOut(county, path));
                path.addEventListener('click', () => this.handleCountyClick(county));

                // Add to the group
                countyGroup.appendChild(path);

                // Add county label - use the original capitalization
                const displayName = county.properties.CITY ||
                    county.properties.name ||
                    county.properties.NAME ||
                    county.properties.County ||
                    county.properties.COUNTY ||
                    countyName;

                const centroid = this.findCentroid(county);
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', centroid.x);
                label.setAttribute('y', centroid.y + 30); // Position below where temp will be
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', 'white');
                label.setAttribute('font-size', '12px');
                label.setAttribute('text-transform', 'uppercase');
                label.setAttribute('class', 'county-label');
                label.textContent = displayName;
                countyGroup.appendChild(label);
            });

            return true;
        } catch (error) {
            console.error('Error drawing map:', error);
            return false;
        }
    }

    // Set up projection for the counties
    setupProjection() {
        if (window.d3) {
            // Create a projection that fits all counties
            this.projection = d3.geoMercator()
                .fitSize([this.width * 0.9, this.height * 0.9], this.countyFeatures);

            // Add slight padding
            const [x, y] = this.projection.translate();
            this.projection.translate([x, y + this.height * 0.05]);

            // Create a path generator
            this.path = d3.geoPath().projection(this.projection);
        } else {
            // Fallback if D3 is not available
            console.warn("D3 not available, using simplified projection");
            this.createSimplifiedProjection();
        }
    }

    // Create simplified projection without D3
    createSimplifiedProjection() {
        // Eastern NC approximate bounds
        const easternMinLon = -78.5;
        const easternMaxLon = -75.2;
        const easternMinLat = 34.8;
        const easternMaxLat = 36.5;

        // Create simple path generator
        this.path = feature => {
            let pathData = '';

            // Scale for converting coordinates
            const xScale = this.width / (easternMaxLon - easternMinLon);
            const yScale = this.height / (easternMaxLat - easternMinLat);

            // Convert coordinates to path data
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
                            const y = this.height - (coord[1] - easternMinLat) * yScale;
                            pathData += (i === 0 ? 'M' : 'L') + x + ',' + y;
                        });
                        pathData += 'Z';
                    });
                });
            }

            return pathData;
        };
    }

    // Find the centroid of a county
    findCentroid(county) {
        if (window.d3) {
            // Use D3's centroid calculation
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

            // Helper function to process each coordinate ring
            const processRing = (ring) => {
                ring.forEach(coord => {
                    // Eastern NC approximate bounds
                    const easternMinLon = -78.5;
                    const easternMaxLon = -75.2;
                    const easternMinLat = 34.8;
                    const easternMaxLat = 36.5;

                    // Calculate position
                    const xScale = this.width / (easternMaxLon - easternMinLon);
                    const yScale = this.height / (easternMaxLat - easternMinLat);

                    const x = (coord[0] - easternMinLon) * xScale;
                    const y = this.height - (coord[1] - easternMinLat) * yScale;

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

    // Handle county hover event
    handleCountyHover(county, pathElement) {
        // Get county name - handle various property formats
        const countyName = (
            county.properties.name ||
            county.properties.NAME ||
            county.properties.County ||
            county.properties.COUNTY ||
            ""
        ).toLowerCase();

        // Highlight the county
        pathElement.setAttribute('fill', this.options.highlightFill);


    }

    // Handle county mouseout event
    handleCountyOut(county, pathElement) {
        // Restore original fill color
        pathElement.setAttribute('fill', this.options.defaultFill);

        // Hide tooltip
        this.hideTooltip();
    }

    // Handle county click event
    handleCountyClick(county) {
        // Get county name - handle various property formats
        const countyName = (
            county.properties.name ||
            county.properties.NAME ||
            county.properties.County ||
            county.properties.COUNTY ||
            ""
        ).toLowerCase();

        // Find the county in our config
        const countyConfig = (window.siteConfig?.counties || [])
            .find(c => c.name.toLowerCase() === countyName);

        // Navigate to county page if URL exists
        if (countyConfig && countyConfig.url) {
            window.location.href = countyConfig.url;
        }
    }

    // Show tooltip with weather data
    showTooltip(county, weatherData) {
        // Remove any existing tooltip
        this.hideTooltip();

        // Get display name for county
        const countyName = county.properties.name ||
            county.properties.NAME ||
            county.properties.County ||
            county.properties.COUNTY;

        // Create tooltip group
        const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tooltip.setAttribute('id', 'county-tooltip');
        tooltip.setAttribute('class', 'county-tooltip');

        // Find county centroid
        const centroid = this.findCentroid(county);

        // Background rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', centroid.x - 70);
        rect.setAttribute('y', centroid.y - 80);
        rect.setAttribute('width', '140');
        rect.setAttribute('height', '90');
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        rect.setAttribute('fill', 'rgba(0,0,0,0.8)');

        // County name
        const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.setAttribute('x', centroid.x);
        nameText.setAttribute('y', centroid.y - 55);
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('fill', 'white');
        nameText.setAttribute('font-weight', 'bold');
        nameText.textContent = countyName;

        // Weather condition
        const condText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        condText.setAttribute('x', centroid.x);
        condText.setAttribute('y', centroid.y - 35);
        condText.setAttribute('text-anchor', 'middle');
        condText.setAttribute('fill', 'white');
        condText.setAttribute('font-size', '12');
        condText.textContent = weatherData.condition;

        // Wind Info
        const windText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        windText.setAttribute('x', centroid.x);
        windText.setAttribute('y', centroid.y - 35);
        windText.setAttribute('text-anchor', 'middle');
        windText.setAttribute('fill', 'white');
        windText.setAttribute('font-size', '12');
        windText.textContent = weatherData.wind;

        // Add elements to tooltip
        tooltip.appendChild(rect);
        tooltip.appendChild(nameText);
        tooltip.appendChild(condText);

        // Add tooltip to SVG
        this.svg.appendChild(tooltip);
    }

    // Hide tooltip
    hideTooltip() {
        const tooltip = document.getElementById('county-tooltip');
        if (tooltip) {
            tooltip.parentNode.removeChild(tooltip);
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

                // Add weather marker at county location
                this.addWeatherMarker(county, weatherData);
            }

            return true;
        } catch (error) {
            console.error('Error updating weather data:', error);
            return false;
        }
    }

    // Add weather marker (temperature) for a county
    addWeatherMarker(county, weatherData) {
        if (!this.countyFeatures) {
            console.error("County features not available");
            return;
        }

        // Find the county feature by name
        const countyFeature = this.countyFeatures.features.find(feature => {
            const featureName = (
                feature.properties.name ||
                feature.properties.NAME ||
                feature.properties.County ||
                feature.properties.COUNTY ||
                ""
            ).toLowerCase();

            return featureName === county.name.toLowerCase();
        });

        if (!countyFeature) {
            console.warn(`County feature not found for: ${county.name}`);
            return;
        }

        // Find the county centroid
        const centroid = this.findCentroid(countyFeature);

        // Create marker group
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        marker.setAttribute('class', 'weather-marker');
        marker.setAttribute('id', `marker-${county.name.toLowerCase()}`);
        marker.setAttribute('cursor', 'pointer');

        // Temperature text
        const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tempText.setAttribute('x', centroid.x);
        tempText.setAttribute('y', centroid.y);
        tempText.setAttribute('text-anchor', 'middle');
        tempText.setAttribute('dominant-baseline', 'middle');
        tempText.setAttribute('font-size', '22px');
        tempText.setAttribute('font-weight', 'bold');
        tempText.setAttribute('fill', 'yellow');
        tempText.textContent = `${weatherData.temp}°`;

        // Add hover events for tooltip
        marker.addEventListener('mouseover', () => {
            this.showTooltip(countyFeature, weatherData);
        });

        marker.addEventListener('mouseout', () => {
            this.hideTooltip();
        });

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

    // Handle window resize
    handleResize() {
        // This method can be extended to handle responsive adjustments
        // For now, the SVG viewBox should handle most of the responsive behavior
    }

    // Refresh the map data
    async refresh() {
        // Clear existing weather markers
        const markers = this.svg.querySelectorAll('.weather-marker');
        markers.forEach(marker => marker.remove());

        // Reset county fills
        const countyPaths = this.svg.querySelectorAll('path[id^="county-"]');
        countyPaths.forEach(path => {
            path.setAttribute('fill', this.options.defaultFill);
        });

        // Update with fresh weather data
        await this.updateWeatherData();
    }
}

// Export function to initialize the county map
export function initCountyMap() {
    const mapContainer = document.getElementById('nc-county-map');
    if (!mapContainer) {
        console.error("Map container not found");
        return null;
    }

    // Create map instance with options
    const countyMap = new NCCountyMap('nc-county-map', {
        defaultFill: '#0077cc',
        highlightFill: 'yellow',
        strokeColor: '#ffffff',
        strokeWidth: 1
    });

    // Initialize the map
    countyMap.init().then(success => {
        if (success) {
            console.log('NC County Map initialized successfully');
        } else {
            console.error('Failed to initialize NC County Map');
        }
    });

    return countyMap;
}