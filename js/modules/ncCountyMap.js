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
        this.weatherData = {};
        this.svg = null;
        this.projection = null;
        this.path = null;
        this.options = {
            defaultFill: '#0077cc',
            highlightFill: '#1e88e5',
            strokeColor: '#ffffff',
            strokeWidth: 2,
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
            this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
            this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            this.svg.style.width = '100%';
            this.svg.style.height = '100%'; // Make sure height is 100%
            this.container.appendChild(this.svg);

            // Add background rect
            const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            background.setAttribute('width', this.width);
            background.setAttribute('height', this.height);
            background.setAttribute('fill', '#262626');
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

    // Load TopoJSON county data
    // async loadCountyData() {
    //     try {
    //         const response = await fetch('js/data/NC-county-topo.json');
    //         if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    //         this.countyData = await response.json();
    //         return true;
    //     } catch (error) {
    //         console.error('Error loading county data:', error);
    //         return false;
    //     }
    // }

    // Load GeoJSON county data
    async loadCountyData() {
        try {
            const response = await fetch('js/data/NC-county-topo.geojson'); // Update filename if needed
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            this.countyData = await response.json();
            console.log("Loaded GeoJSON data:", this.countyData.type);
            return true;
        } catch (error) {
            console.error('Error loading county data:', error);
            return false;
        }
    }

    // Draw the county map
    // drawMap() {
    //     if (!this.countyData) return false;

    //     try {
    //         // Set up D3 projection (focusing on Eastern NC)
    //         this.setupProjection();

    //         // Create counties group
    //         const countyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    //         countyGroup.setAttribute('class', 'counties');
    //         this.svg.appendChild(countyGroup);

    //         // Get counties from TopoJSON
    //         const counties = topojson.feature(this.countyData, this.countyData.objects.North_Carolina);

    //         // Filter counties to only those in our target set
    //         const targetCountyFeatures = counties.features.filter(feature =>
    //             this.targetCounties.has(feature.properties.name.toLowerCase())
    //         );

    //         // Draw each county
    //         targetCountyFeatures.forEach(county => {
    //             const countyName = county.properties.name.toLowerCase();

    //             // Create path element
    //             const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    //             path.setAttribute('d', this.path(county));
    //             path.setAttribute('id', `county-${countyName}`);
    //             path.setAttribute('data-name', countyName);
    //             path.setAttribute('fill', this.options.defaultFill);
    //             path.setAttribute('stroke', this.options.strokeColor);
    //             path.setAttribute('stroke-width', this.options.strokeWidth);

    //             // Add event listeners
    //             path.addEventListener('mouseover', () => this.handleCountyHover(county, path));
    //             path.addEventListener('mouseout', () => this.handleCountyOut(county, path));
    //             path.addEventListener('click', () => this.handleCountyClick(county));

    //             // Add to the group
    //             countyGroup.appendChild(path);

    //             // Add county label
    //             const centroid = this.findCentroid(county);
    //             const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    //             label.setAttribute('x', centroid.x);
    //             label.setAttribute('y', centroid.y + 40); // Position below where temp will be
    //             label.setAttribute('text-anchor', 'middle');
    //             label.setAttribute('fill', 'white');
    //             label.setAttribute('font-size', '12px');
    //             label.setAttribute('class', 'county-label');
    //             label.textContent = county.properties.name;
    //             countyGroup.appendChild(label);
    //         });

    //         return true;
    //     } catch (error) {
    //         console.error('Error drawing map:', error);
    //         return false;
    //     }
    // }

    // drawMap() {
    //     if (!this.countyData) return false;

    //     try {
    //         // Set up D3 projection (focusing on Eastern NC)
    //         this.setupProjection();

    //         // Create counties group
    //         const countyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    //         countyGroup.setAttribute('class', 'counties');
    //         this.svg.appendChild(countyGroup);

    //         // Determine the correct object name in the TopoJSON file
    //         const objectNames = Object.keys(this.countyData.objects || {});
    //         if (objectNames.length === 0) {
    //             console.error("No objects found in TopoJSON data");
    //             return false;
    //         }

    //         // Use the first object (could be "counties", "nc", etc.)
    //         const objectName = objectNames[0];
    //         console.log(`Found TopoJSON object: ${objectName}`);

    //         // Get counties from TopoJSON
    //         const counties = topojson.feature(this.countyData, this.countyData.objects[objectName]);

    //         // Filter counties to only those in our target set
    //         const targetCountyFeatures = counties.features.filter(feature =>
    //             this.targetCounties.has((feature.properties.name || "").toLowerCase())
    //         );

    //         // Draw each county
    //         targetCountyFeatures.forEach(county => {
    //             const countyName = (county.properties.name || "").toLowerCase();

    //             // Create path element
    //             const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    //             path.setAttribute('d', this.path(county));
    //             path.setAttribute('id', `county-${countyName}`);
    //             path.setAttribute('data-name', countyName);
    //             path.setAttribute('fill', this.options.defaultFill);
    //             path.setAttribute('stroke', this.options.strokeColor);
    //             path.setAttribute('stroke-width', this.options.strokeWidth);

    //             // Add event listeners
    //             path.addEventListener('mouseover', () => this.handleCountyHover(county, path));
    //             path.addEventListener('mouseout', () => this.handleCountyOut(county, path));
    //             path.addEventListener('click', () => this.handleCountyClick(county));

    //             // Add to the group
    //             countyGroup.appendChild(path);

    //             // Add county label
    //             const centroid = this.findCentroid(county);
    //             const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    //             label.setAttribute('x', centroid.x);
    //             label.setAttribute('y', centroid.y + 40); // Position below where temp will be
    //             label.setAttribute('text-anchor', 'middle');
    //             label.setAttribute('fill', 'white');
    //             label.setAttribute('font-size', '12px');
    //             label.setAttribute('class', 'county-label');
    //             label.textContent = county.properties.name;
    //             countyGroup.appendChild(label);
    //         });

    //         return true;
    //     } catch (error) {
    //         console.error('Error drawing map:', error);
    //         return false;
    //     }
    // }

    drawMap() {
        if (!this.countyData) return false;

        try {
            // Set up D3 projection (focusing on Eastern NC)
            this.setupProjection();

            // Create counties group
            const countyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            countyGroup.setAttribute('class', 'counties');
            this.svg.appendChild(countyGroup);

            // Filter counties to only those in our target set
            const targetCountyFeatures = this.countyData.features.filter(feature => {
                // Check various possible property names for county name
                const countyName = (
                    feature.properties.name ||
                    feature.properties.NAME ||
                    feature.properties.County ||
                    feature.properties.COUNTY ||
                    ""
                ).toLowerCase();

                // Remove "County" suffix if present
                const cleanName = countyName.replace(/\s+county$/, "");

                return this.targetCounties.has(cleanName);
            });

            console.log(`Found ${targetCountyFeatures.length} target counties`);

            // Draw each county
            targetCountyFeatures.forEach(county => {
                // Get county name from properties
                const countyProps = county.properties;
                const rawName = countyProps.name || countyProps.NAME ||
                    countyProps.County || countyProps.COUNTY || "";
                const countyName = rawName.toLowerCase().replace(/\s+county$/, "");

                console.log(`Drawing county: ${rawName} (${countyName})`);

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

                // Add county label
                const centroid = this.findCentroid(county);
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', centroid.x);
                label.setAttribute('y', centroid.y + 40); // Position below where temp will be
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', 'white');
                label.setAttribute('font-size', '12px');
                label.setAttribute('class', 'county-label');
                label.textContent = rawName;
                countyGroup.appendChild(label);
            });

            return true;
        } catch (error) {
            console.error('Error drawing map:', error);
            return false;
        }
    }

    // Set up projection focused on Eastern NC
    // setupProjection() {
    //     if (window.d3) {
    //         // Get all target counties as a single feature collection
    //         const counties = topojson.feature(this.countyData, this.countyData.objects.North_Carolina);
    //         const targetCountyFeatures = counties.features.filter(feature =>
    //             this.targetCounties.has(feature.properties.name.toLowerCase())
    //         );

    //         // Create a feature collection with just our target counties
    //         const targetCounties = {
    //             type: "FeatureCollection",
    //             features: targetCountyFeatures
    //         };

    //         // Create a projection that fits exactly these counties
    //         this.projection = d3.geoMercator()
    //             .fitSize([this.width * 0.9, this.height * 0.9], targetCounties);

    //         // Add padding around the counties
    //         const [x, y] = this.projection.translate();
    //         this.projection.translate([x, y + this.height * 0.05]);

    //         // Create a path generator using this projection
    //         this.path = d3.geoPath().projection(this.projection);
    //     } else {
    //         // Fallback if D3 is not available
    //         console.warn("D3 not available, using simplified projection");
    //         this.createSimplifiedProjection();
    //     }
    // }

    // Set up projection focused on Eastern NC
    // setupProjection() {
    //     if (window.d3) {
    //         // Define a custom area for Eastern NC with slightly adjusted bounds
    //         const easternNC = {
    //             type: "Feature",
    //             properties: {},
    //             geometry: {
    //                 type: "Polygon",
    //                 coordinates: [[
    //                     [-78.5, 34.8],  // Southwest corner
    //                     [-75.2, 34.8],  // Southeast corner (adjusted for higher resolution)
    //                     [-75.2, 36.5],  // Northeast corner (adjusted for higher resolution)
    //                     [-78.5, 36.5],  // Northwest corner
    //                     [-78.5, 34.8]   // Close the polygon
    //                 ]]
    //             }
    //         };

    //         // Create a projection focused on Eastern NC
    //         this.projection = d3.geoMercator()
    //             .fitSize([this.width, this.height], easternNC);

    //         // Create a path generator using this projection
    //         this.path = d3.geoPath().projection(this.projection);
    //     } else {
    //         // Fallback if D3 is not available
    //         this.createSimplifiedProjection();
    //     }
    // }

    // setupProjection() {
    //     if (window.d3) {
    //         // Determine the correct object name in the TopoJSON file
    //         const objectNames = Object.keys(this.countyData.objects || {});
    //         if (objectNames.length === 0) {
    //             console.error("No objects found in TopoJSON data");
    //             return false;
    //         }

    //         // Use the first object
    //         const objectName = objectNames[0];

    //         // Get all target counties as a single feature collection
    //         const counties = topojson.feature(this.countyData, this.countyData.objects[objectName]);
    //         const targetCountyFeatures = counties.features.filter(feature =>
    //             this.targetCounties.has((feature.properties.name || "").toLowerCase())
    //         );

    //         // Create a feature collection with just our target counties
    //         const targetCounties = {
    //             type: "FeatureCollection",
    //             features: targetCountyFeatures
    //         };

    //         // Create a projection that fits exactly these counties
    //         this.projection = d3.geoMercator()
    //             .fitSize([this.width * 0.9, this.height * 0.8], targetCounties);

    //         // Add padding around the counties
    //         const [x, y] = this.projection.translate();
    //         this.projection.translate([x, y + this.height * 0.05]);

    //         // Create a path generator using this projection
    //         this.path = d3.geoPath().projection(this.projection);
    //     } else {
    //         // Fallback if D3 is not available
    //         this.createSimplifiedProjection();
    //     }
    // }

    setupProjection() {
        if (window.d3) {
            // Filter to just our target counties
            const targetCountyFeatures = this.countyData.features.filter(feature => {
                const countyName = (
                    feature.properties.name ||
                    feature.properties.NAME ||
                    feature.properties.County ||
                    feature.properties.COUNTY ||
                    ""
                ).toLowerCase().replace(/\s+county$/, "");

                return this.targetCounties.has(countyName);
            });

            // Create a feature collection with just our target counties
            const targetCounties = {
                type: "FeatureCollection",
                features: targetCountyFeatures
            };

            // Create a projection that fits exactly these counties
            this.projection = d3.geoMercator()
                .fitSize([this.width * 0.9, this.height * 0.8], targetCounties);

            // Add padding around the counties
            const [x, y] = this.projection.translate();
            this.projection.translate([x, y + this.height * 0.05]);

            // Create a path generator using this projection
            this.path = d3.geoPath().projection(this.projection);
        } else {
            // Fallback if D3 is not available
            this.createSimplifiedProjection();
        }
    }

    // Create simplified projection without D3
    createSimplifiedProjection() {
        // Eastern NC approximate bounds
        const easternMinLon = -78.5;
        const easternMaxLon = -75.4;
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
    // findCentroid(county) {
    //     if (window.d3) {
    //         // Use D3's centroid calculation
    //         const centroidCoords = d3.geoCentroid(county);
    //         return {
    //             x: this.projection(centroidCoords)[0],
    //             y: this.projection(centroidCoords)[1]
    //         };
    //     } else {
    //         // Calculate a simple average of all coordinates
    //         let totalX = 0;
    //         let totalY = 0;
    //         let pointCount = 0;

    //         // Helper function to process each coordinate ring
    //         const processRing = (ring) => {
    //             ring.forEach(coord => {
    //                 // Eastern NC approximate bounds
    //                 const easternMinLon = -78.5;
    //                 const easternMaxLon = -75.4;
    //                 const easternMinLat = 34.8;
    //                 const easternMaxLat = 36.5;

    //                 // Calculate position
    //                 const xScale = this.width / (easternMaxLon - easternMinLon);
    //                 const yScale = this.height / (easternMaxLat - easternMinLat);

    //                 const x = (coord[0] - easternMinLon) * xScale;
    //                 const y = this.height - (coord[1] - easternMinLat) * yScale;

    //                 totalX += x;
    //                 totalY += y;
    //                 pointCount++;
    //             });
    //         };

    //         if (county.geometry.type === 'Polygon') {
    //             county.geometry.coordinates.forEach(processRing);
    //         } else if (county.geometry.type === 'MultiPolygon') {
    //             county.geometry.coordinates.forEach(polygon => {
    //                 polygon.forEach(processRing);
    //             });
    //         }

    //         return {
    //             x: totalX / pointCount,
    //             y: totalY / pointCount
    //         };
    //     }
    // }

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

            // Helper function to process each coordinate
            const processCoordinates = (coords) => {
                coords.forEach(coord => {
                    if (Array.isArray(coord[0])) {
                        // This is a nested array of coordinates
                        processCoordinates(coord);
                    } else {
                        // This is a single [lon, lat] coordinate
                        const point = this.projection([coord[0], coord[1]]);
                        if (point) {
                            totalX += point[0];
                            totalY += point[1];
                            pointCount++;
                        }
                    }
                });
            };

            // Process the geometry's coordinates
            processCoordinates(county.geometry.coordinates);

            return {
                x: totalX / (pointCount || 1),
                y: totalY / (pointCount || 1)
            };
        }
    }

    // Handle county hover event
    handleCountyHover(county, pathElement) {
        const countyName = county.properties.name;

        // Highlight the county
        pathElement.setAttribute('fill', this.options.highlightFill);

        // Show tooltip if we have weather data
        if (this.weatherData[countyName.toLowerCase()]) {
            this.showTooltip(county, this.weatherData[countyName.toLowerCase()]);
        }
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
        const countyName = county.properties.name.toLowerCase();

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

        const countyName = county.properties.name;

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
        rect.setAttribute('height', '70');
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
        // Find the county in our GeoJSON
        const countyFeature = this.countyData.features.find(feature => {
            const countyName = (
                feature.properties.name ||
                feature.properties.NAME ||
                feature.properties.County ||
                feature.properties.COUNTY ||
                ""
            ).toLowerCase().replace(/\s+county$/, "");

            return countyName === county.name.toLowerCase();
        });

        // Initialize position
        let position;

        // Try to get position from county feature
        if (countyFeature) {
            position = this.findCentroid(countyFeature);
        }

        // If we couldn't find the position, use a manual fallback position
        if (!position) {
            // Fallback manual positions
            const manualPositions = {
                'bertie': { x: this.width * 0.3, y: this.height * 0.3 },
                'pitt': { x: this.width * 0.45, y: this.height * 0.5 },
                'beaufort': { x: this.width * 0.55, y: this.height * 0.6 },
                'dare': { x: this.width * 0.7, y: this.height * 0.3 },
                'washington': { x: this.width * 0.4, y: this.height * 0.4 },
                'tyrrell': { x: this.width * 0.6, y: this.height * 0.35 },
                'hyde': { x: this.width * 0.65, y: this.height * 0.55 }
            };

            position = manualPositions[county.name.toLowerCase()] ||
                { x: this.width * 0.5, y: this.height * 0.5 }; // Default fallback
        }

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
        highlightFill: '#1e88e5',
        strokeColor: '#ffffff',
        strokeWidth: 2
    });

    // Initialize the map
    countyMap.init().then(success => {
        if (success) {
            console.log('NC County Map initialized successfully');
        } else {
            console.error('Failed to initialize NC County Map');
        }
    });

    // Set up refresh button to update the map
    const refreshButton = document.getElementById('global-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', function () {
            // The main refresh functionality is in index.js
            // This prevents duplicate event listeners
            if (countyMap && typeof countyMap.refresh === 'function') {
                countyMap.refresh();
            }
        });
    }

    return countyMap;
}