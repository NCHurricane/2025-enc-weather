// North Carolina County Map Module
import { fetchCurrentWeather, getWeatherIcon } from './weatherData.js';
import { safeSetHTML, createElement } from './utils.js';
import { warningColors, warningPriorities } from './warningColors.js';

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
            ...options
        };
        this.alertData = {};
        // Script to test the county alert highlight functionality
        this.testModeEnabled = false;
        this.targetCounties = new Set(
            (window.siteConfig?.counties || []).map(county => county.name.toLowerCase())
        );
    }

    // Add a new method to fetch alerts for a county
    async fetchCountyAlerts(county) {
        try {
            // For testing: Return mock data when in test mode
            if (this.testModeEnabled) {
                console.log(`Using test data for ${county.name}`);
                return [{
                    properties: {
                        event: "Earthquake Warning", // Or any other warning type from your warningColors
                        headline: "Current Warning",
                        description: "This is a test alert for development purposes."
                    }
                }];
            }

            // Normal code for production
            const response = await fetch(`https://api.weather.gov/alerts/active?point=${county.lat},${county.lon}`);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const data = await response.json();
            return data.features || [];
        } catch (error) {
            console.error(`Error fetching alerts for ${county.name}:`, error);
            return [];
        }
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

            // Create a separate group for labels that will be rendered on top of everything else
            const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            labelsGroup.setAttribute('class', 'county-labels');
            // Add this group as the last child of the SVG so it renders on top
            this.svg.appendChild(labelsGroup);

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
            });

            // After all counties are drawn, add the labels to avoid clipping
            this.countyFeatures.features.forEach(county => {
                // Get county name
                const countyName = (
                    county.properties.name ||
                    county.properties.NAME ||
                    county.properties.County ||
                    county.properties.COUNTY ||
                    ""
                ).toLowerCase();

                // Find the county in our config to get the city name
                const countyConfig = (window.siteConfig?.counties || [])
                    .find(c => c.name.toLowerCase() === countyName);

                if (countyConfig) {
                    // Use city name from config as label, or county name as fallback
                    const displayName = countyConfig.city ||
                        county.properties.CITY ||
                        county.properties.name ||
                        county.properties.NAME;

                    // Calculate center point
                    const centroid = this.findCentroid(county);

                    // Padding values
                    const paddingX = 8; // Horizontal padding (left and right)
                    const paddingY = 5; // Vertical padding (top and bottom)

                    // Calculate dimensions with padding
                    const textWidth = displayName.length * 10;
                    const bgWidth = textWidth + (paddingX * 2); // Add padding to both sides
                    const bgHeight = 12 + (paddingY * 2); // Add padding to top and bottom

                    // First create the background with rounded corners
                    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    labelBg.setAttribute('class', 'label-background');
                    labelBg.setAttribute('x', centroid.x - bgWidth / 2); // Center the wider rectangle
                    labelBg.setAttribute('y', centroid.y + 22 - paddingY); // Adjust y position for top padding
                    labelBg.setAttribute('width', bgWidth);
                    labelBg.setAttribute('height', bgHeight);
                    labelBg.setAttribute('rx', '5'); // Rounded corners
                    labelBg.setAttribute('ry', '5'); // Rounded corners
                    labelBg.setAttribute('fill', 'rgba(0, 0, 0, 0.6)'); // Semi-transparent background

                    // Then create the text label itself
                    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    label.setAttribute('x', centroid.x);
                    label.setAttribute('y', centroid.y + 30); // Positioned within background 
                    label.setAttribute('text-anchor', 'middle');
                    label.setAttribute('dominant-baseline', 'middle');
                    label.setAttribute('fill', '#ffff00'); // Yellow text to match temps
                    label.setAttribute('font-size', '12px');
                    label.setAttribute('font-weight', 'bold');
                    label.setAttribute('font-family', "'Montserrat', monospace"); // Match temperature font
                    label.setAttribute('class', 'county-label');
                    label.textContent = displayName.toUpperCase();

                    // Add background first, then text to the labels group
                    labelsGroup.appendChild(labelBg);
                    labelsGroup.appendChild(label);
                }
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
            // Define your mobile breakpoint (e.g., 768px)
            const mobileBreakpoint = 600;
            const isMobile = window.innerWidth < mobileBreakpoint;

            // Create the base projection
            this.projection = d3.geoMercator();

            if (isMobile) {
                // --- Mobile View ---
                // Fit to the entire viewBox (100%) for smaller screens
                this.projection.fitSize([this.width, this.height], this.countyFeatures);
                // No manual translation adjustment needed for full centering

                console.log("Using mobile map projection (100% fit)");

            } else {
                // --- Desktop View (Above Mobile) ---
                // Use the original 90% fit
                this.projection.fitSize([this.width * 0.9, this.height * 0.9], this.countyFeatures);

                // Re-apply the original downward shift if desired for desktop
                const [x, y] = this.projection.translate();
                this.projection.translate([x, y + this.height * 0.05]);

                console.log("Using desktop map projection (90% fit with padding)");
            }

            // Create a path generator (common to both)
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
        pathElement.setAttribute('stroke-width', '3');
        pathElement.setAttribute('stroke', 'black');
    }

    // Handle county mouseout event
    handleCountyOut(county, pathElement) {
        // Restore original fill color
        pathElement.setAttribute('stroke-width', this.options.strokeWidth);
        pathElement.setAttribute('stroke', this.options.strokeColor);
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

    // Add a new method to update county alert visualization
    updateCountyAlertStatus(countyName, alerts) {
        const normalizedName = countyName.toLowerCase();
        const countyPath = document.getElementById(`county-${normalizedName}`);
        if (!countyPath) return;

        // If no alerts, keep default fill
        if (!alerts || alerts.length === 0) return;

        // Find highest priority alert
        let highestPriorityAlert = null;
        let highestPriority = Infinity;

        alerts.forEach(alert => {
            const eventName = alert.properties.event;
            // Use priority directly from the warningPriorities object
            const priority = warningPriorities[eventName];

            if (priority && priority < highestPriority) {
                highestPriority = priority;
                highestPriorityAlert = {
                    name: eventName,
                    color: warningColors[eventName]
                };
            }
        });

        // Update the county fill color if we found a warning
        if (highestPriorityAlert) {
            countyPath.setAttribute('fill', highestPriorityAlert.color);
            // Optional: Add stroke highlighting for better visibility
            countyPath.setAttribute('stroke-width', '3');
            // Add a title with alert info for tooltip
            countyPath.setAttribute('title', highestPriorityAlert.name);
        }
    }

    // Helper method to get warning priority
    getWarningPriority(warningName) {
        // This would need to map to your priority system from warningColors.csv
        // Example implementation:
        const priorityMap = {
            "Tornado Warning": 1,
            "Severe Thunderstorm Warning": 2,
            "Flash Flood Warning": 3,
            "Extreme Wind Warning": 4,
            // ... other warnings with their priorities
        };

        return priorityMap[warningName] || 999; // Default to low priority if not found
    }

    // Fetch and update weather data for counties
    async updateWeatherData() {
        try {
            // Get counties from siteConfig
            const counties = window.siteConfig?.counties || [];

            // Fetch weather data and alerts for each county
            const weatherPromises = counties.map(async (county) => {
                try {
                    // Fetch weather data 
                    const weatherData = await fetchCurrentWeather(county.lat, county.lon);

                    // Validate weather data
                    if (!weatherData || weatherData.temp === 'N/A') {
                        console.warn(`No valid weather data for ${county.name}:`, weatherData);
                        return null;
                    }

                    // Store weather data
                    this.weatherData[county.name.toLowerCase()] = weatherData;

                    // Add weather marker
                    this.addWeatherMarker(county, weatherData);

                    // Fetch alerts for this county
                    const alerts = await this.fetchCountyAlerts(county);
                    this.alertData[county.name.toLowerCase()] = alerts;

                    // Update county polygon color based on alerts
                    this.updateCountyAlertStatus(county.name, alerts);

                    return weatherData;
                } catch (countyError) {
                    console.error(`Error processing county ${county.name}:`, countyError);
                    return null;
                }
            });

            // Wait for all counties to be processed
            const results = await Promise.allSettled(weatherPromises);

            // Log any failed county data fetches
            const failedCounties = results.filter(result =>
                result.status === 'rejected' ||
                (result.status === 'fulfilled' && result.value === null)
            );

            if (failedCounties.length > 0) {
                console.warn(`Failed to fetch data for ${failedCounties.length} counties`);
            }

            this.createWarningLegend();

            return results.some(result => result.status === 'fulfilled' && result.value !== null);
        } catch (error) {
            console.error('Error updating weather data:', error);
            return false;
        }
    }

    // Add weather marker to the map
    addWeatherMarker(county, weatherData) {
        // Add a null check
        if (!weatherData || !weatherData.temp) {
            console.warn(`Cannot add weather marker for ${county.name}: Invalid weather data`, weatherData);
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
        tempText.setAttribute('y', centroid.y - 5);
        tempText.setAttribute('text-anchor', 'middle');
        tempText.setAttribute('dominant-baseline', 'middle');
        tempText.setAttribute('font-size', '22px');
        tempText.setAttribute('font-weight', 'bold');
        tempText.setAttribute('fill', 'yellow');
        tempText.textContent = `${weatherData.temp}`;

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

    // Handle window resize - minimal version
    handleResize() {
        // Basic resize handler - just relies on SVG viewBox for responsiveness
        // No dynamic scaling or element adjustments
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

    // Add this method to the NCCountyMap class in ncCountyMap.js

    /**
     * Creates or updates the warning legend at the bottom of the map
     * Only displays warnings that are currently active on the map
     */
    // In the createWarningLegend method of NCCountyMap class
    createWarningLegend() {
        // Remove any existing legend first
        const existingLegend = document.querySelector('.map-legend');
        if (existingLegend) {
            existingLegend.remove();
        }

        // Check if there are any active alerts
        const activeWarnings = new Map();

        // Collect all unique warnings currently displayed on the map
        Object.values(this.alertData).forEach(countyAlerts => {
            if (countyAlerts && countyAlerts.length > 0) {
                countyAlerts.forEach(alert => {
                    const eventName = alert.properties.event;
                    if (warningColors[eventName]) {
                        activeWarnings.set(eventName, warningColors[eventName]);
                    }
                });
            }
        });

        // If no active warnings, hide the legend container and return
        const legendContainer = document.getElementById('map-alerts-legend');
        if (activeWarnings.size === 0) {
            if (legendContainer) {
                legendContainer.style.display = 'none';
            }
            return;
        }

        // Create legend container if it doesn't exist
        let legend = legendContainer;
        if (!legend) {
            legend = document.createElement('div');
            legend.id = 'map-alerts-legend';
            legend.className = 'map-legend';
            // Find the current-content and append the legend after the map
            const currentContent = document.querySelector('.current-content');
            const mapContainer = document.getElementById('nc-county-map');
            if (currentContent && mapContainer) {
                currentContent.insertBefore(legend, mapContainer.nextSibling);
            } else {
                // Fallback: append to container
                this.container.parentNode.appendChild(legend);
            }
        }

        // Show the legend
        legend.style.display = 'block';

        // Clear existing content
        legend.innerHTML = '';

        // Create legend title
        const title = document.createElement('div');
        title.id = 'legend-title';
        title.textContent = 'Active Alerts';
        title.style.color = '#fff000';
        title.style.fontWeight = 'bold';
        legend.appendChild(title);

        // Create a flex container for warning items
        const warningContainer = document.createElement('div');
        warningContainer.style.display = 'flex';
        warningContainer.style.flexWrap = 'wrap';
        warningContainer.style.gap = '5px';
        legend.appendChild(warningContainer);

        // Add each active warning to the legend
        activeWarnings.forEach((color, warningName) => {
            const warningItem = document.createElement('div');
            warningItem.style.display = 'flex';
            warningItem.style.alignItems = 'center';
            warningItem.style.marginRight = '10px';

            // Color box
            const colorBox = document.createElement('div');
            colorBox.style.width = '12px';
            colorBox.style.height = '12px';
            colorBox.style.backgroundColor = color;
            colorBox.style.marginRight = '5px';
            colorBox.style.border = '1px solid #333';

            // Warning text
            const warningText = document.createElement('span');
            warningText.textContent = warningName;
            warningText.style.fontWeight = 'bold';

            warningItem.appendChild(colorBox);
            warningItem.appendChild(warningText);
            warningContainer.appendChild(warningItem);
        });
    }
    // Modify the updateCountyAlertStatus method to track active warnings
    updateCountyAlertStatus(countyName, alerts) {
        const normalizedName = countyName.toLowerCase();
        const countyPath = document.getElementById(`county-${normalizedName}`);
        if (!countyPath) return;

        // Store the alerts in the alertData object
        this.alertData[normalizedName] = alerts;

        // If no alerts, keep default fill
        if (!alerts || alerts.length === 0) return;

        // Find highest priority alert
        let highestPriorityAlert = null;
        let highestPriority = Infinity;

        alerts.forEach(alert => {
            const eventName = alert.properties.event;
            // Use priority directly from the warningPriorities object
            const priority = warningPriorities[eventName];

            if (priority && priority < highestPriority) {
                highestPriority = priority;
                highestPriorityAlert = {
                    name: eventName,
                    color: warningColors[eventName]
                };
            }
        });

        // Update the county fill color if we found a warning
        if (highestPriorityAlert) {
            countyPath.setAttribute('fill', highestPriorityAlert.color);
            // Optional: Add stroke highlighting for better visibility
            countyPath.setAttribute('stroke-width', '3');
            // Add a title with alert info for tooltip
            countyPath.setAttribute('title', highestPriorityAlert.name);
        }

        // Update the legend
        this.createWarningLegend();
    }

    // Initialize alertData in the constructor
    // Add this line to the constructor of NCCountyMap class:
    // this.alertData = {};

    // Call createWarningLegend after updating weather data
    // Add this line at the end of the updateWeatherData method:
    // this.createWarningLegend();
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

    return countyMap;
}