// North Carolina County Map Module
// FIXED: Removed broken weather.js import and integrated with weatherData.js
import { fetchCurrentWeather, fetchAlerts } from './weatherData.js';
import { safeSetHTML, createElement } from './utils.js';
import { warningColors, warningPriorities } from './warningColors.js';

export class NCCountyMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.width = options.width || 800;
        this.height = options.height || 450;
        this.countyData = null;
        this.countyFeatures = null;
        this.weatherData = {};
        this.alertData = {}; // Initialize alertData
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
        this.zoneToCountyMap = {
            // Hyde County zones
            'NCZ081': 'Hyde',     // Mainland Hyde
            'NCZ095': 'Hyde',     // Outer Banks Hyde
            // Add additional zone-to-county mappings here...
        };
    }


    async fetchCountyAlerts(county) {
        try {
            console.log(`Fetching alerts for ${county.name} using weatherData.js`);

            // Use the consolidated alert fetching from weatherData.js
            const alerts = await fetchAlerts(county.lat, county.lon);

            console.log(`weatherData.js returned ${alerts.length} alerts for ${county.name}`);

            return alerts;
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
            const padding = 0;
            this.svg.setAttribute('viewBox', `-${padding} -${padding} ${this.width - padding * 2} ${this.height + padding * 2}`);
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
                console.log("Processing as TopoJSON");
                const objectNames = Object.keys(this.countyData.objects || {});
                if (objectNames.length === 0) {
                    throw new Error("No objects found in TopoJSON data");
                }

                const objectName = objectNames[0];
                console.log(`Using TopoJSON object: ${objectName}`);

                this.countyFeatures = topojson.feature(this.countyData, this.countyData.objects[objectName]);
            } else if (this.countyData.type === 'FeatureCollection') {
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
            this.setupProjection();

            // Create counties group
            const countyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            countyGroup.setAttribute('class', 'counties');
            this.svg.appendChild(countyGroup);

            // Create labels group
            const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            labelsGroup.setAttribute('class', 'county-labels');
            this.svg.appendChild(labelsGroup);

            // Draw each county
            this.countyFeatures.features.forEach(county => {
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

                countyGroup.appendChild(path);
            });

            // Add labels
            this.countyFeatures.features.forEach(county => {
                const countyName = (
                    county.properties.name ||
                    county.properties.NAME ||
                    county.properties.County ||
                    county.properties.COUNTY ||
                    ""
                ).toLowerCase();

                const countyConfig = (window.siteConfig?.counties || [])
                    .find(c => c.name.toLowerCase() === countyName);

                if (countyConfig) {
                    const displayName = countyConfig.city ||
                        county.properties.CITY ||
                        county.properties.name ||
                        county.properties.NAME;

                    const centroid = this.findCentroid(county);
                    const paddingX = 8;
                    const paddingY = 5;
                    const textWidth = displayName.length * 10;
                    const bgWidth = textWidth + (paddingX * 2);
                    const bgHeight = 12 + (paddingY * 2);

                    // Background
                    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    labelBg.setAttribute('class', 'label-background');
                    labelBg.setAttribute('x', centroid.x - bgWidth / 2);
                    labelBg.setAttribute('y', centroid.y + 22 - paddingY);
                    labelBg.setAttribute('width', bgWidth);
                    labelBg.setAttribute('height', bgHeight);
                    labelBg.setAttribute('rx', '5');
                    labelBg.setAttribute('ry', '5');
                    labelBg.setAttribute('fill', 'rgba(0, 0, 0, 0.6)');

                    // Text
                    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    label.setAttribute('x', centroid.x);
                    label.setAttribute('y', centroid.y + 30);
                    label.setAttribute('text-anchor', 'middle');
                    label.setAttribute('dominant-baseline', 'middle');
                    label.setAttribute('fill', '#ffff00');
                    label.setAttribute('font-size', '12px');
                    label.setAttribute('font-weight', 'bold');
                    label.setAttribute('font-family', "'Montserrat', monospace");
                    label.setAttribute('class', 'county-label');
                    label.textContent = displayName.toUpperCase();

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
            const mobileBreakpoint = 600;
            const isMobile = window.innerWidth < mobileBreakpoint;

            this.projection = d3.geoMercator();

            if (isMobile) {
                this.projection.fitSize([this.width, this.height], this.countyFeatures);
                console.log("Using mobile map projection (100% fit)");
            } else {
                this.projection.fitSize([this.width * 0.9, this.height * 0.9], this.countyFeatures);
                const [x, y] = this.projection.translate();
                this.projection.translate([x, y + this.height * 0.05]);
                console.log("Using desktop map projection (90% fit with padding)");
            }

            this.path = d3.geoPath().projection(this.projection);
        } else {
            console.warn("D3 not available, using simplified projection");
            this.createSimplifiedProjection();
        }
    }

    // Create simplified projection without D3
    createSimplifiedProjection() {
        const easternMinLon = -78.5;
        const easternMaxLon = -75.2;
        const easternMinLat = 34.8;
        const easternMaxLat = 36.5;

        this.path = feature => {
            let pathData = '';
            const xScale = this.width / (easternMaxLon - easternMinLon);
            const yScale = this.height / (easternMaxLat - easternMinLat);

            if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates.forEach(ring => {
                    ring.forEach((coord, i) => {
                        const x = (coord[0] - easternMinLon) * xScale;
                        const y = this.height - (coord[1] - easternMinLat) * yScale;
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
            const centroidCoords = d3.geoCentroid(county);
            return {
                x: this.projection(centroidCoords)[0],
                y: this.projection(centroidCoords)[1]
            };
        } else {
            let totalX = 0;
            let totalY = 0;
            let pointCount = 0;

            const processRing = (ring) => {
                ring.forEach(coord => {
                    const easternMinLon = -78.5;
                    const easternMaxLon = -75.2;
                    const easternMinLat = 34.8;
                    const easternMaxLat = 36.5;

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
        pathElement.setAttribute('stroke-width', '3');
        pathElement.setAttribute('stroke', 'black');
    }

    // Handle county mouseout event
    handleCountyOut(county, pathElement) {
        pathElement.setAttribute('stroke-width', this.options.strokeWidth);
        pathElement.setAttribute('stroke', this.options.strokeColor);
    }

    // Handle county click event
    handleCountyClick(county) {
        const countyName = (
            county.properties.name ||
            county.properties.NAME ||
            county.properties.County ||
            county.properties.COUNTY ||
            ""
        ).toLowerCase();

        const countyConfig = (window.siteConfig?.counties || [])
            .find(c => c.name.toLowerCase() === countyName);

        if (countyConfig && countyConfig.url) {
            window.location.href = countyConfig.url;
        }
    }

    // Update county alert visualization
    updateCountyAlertStatus(countyName, alerts) {
        const normalizedName = countyName.toLowerCase();
        const countyPath = document.getElementById(`county-${normalizedName}`);
        if (!countyPath) return;

        this.alertData[normalizedName] = alerts;

        if (!alerts || alerts.length === 0) return;

        let highestPriorityAlert = null;
        let highestPriority = Infinity;

        alerts.forEach(alert => {
            const eventName =
                (alert.properties && alert.properties.event) ||
                alert.event ||
                'Unknown Alert';

            console.log(`Alert for ${countyName}: ${eventName}`);

            const priority = warningPriorities[eventName];

            if (priority && priority < highestPriority) {
                highestPriority = priority;
                highestPriorityAlert = {
                    name: eventName,
                    color: warningColors[eventName] || '#FF0000'
                };
            }
        });

        if (highestPriorityAlert) {
            console.log(`Setting ${countyName} to ${highestPriorityAlert.name} (${highestPriorityAlert.color})`);
            countyPath.setAttribute('fill', highestPriorityAlert.color);
            countyPath.setAttribute('stroke-width', '3');
            countyPath.setAttribute('title', highestPriorityAlert.name);
        }

        this.createWarningLegend();
    }

    // UPDATED: Use weatherData.js for all data fetching
    async updateWeatherData() {
        try {
            const counties = window.siteConfig?.counties || [];

            const weatherPromises = counties.map(async (county) => {
                try {
                    // Use weatherData.js for current weather
                    console.log(`Fetching weather for ${county.name} using weatherData.js`);
                    const weatherData = await fetchCurrentWeather(county.lat, county.lon);

                    if (!weatherData || weatherData.temp === 'N/A') {
                        console.warn(`No valid weather data for ${county.name}:`, weatherData);
                        return null;
                    }

                    this.weatherData[county.name.toLowerCase()] = weatherData;
                    this.addWeatherMarker(county, weatherData);

                    // Use simplified alert fetching via weatherData.js
                    const alerts = await this.fetchCountyAlerts(county);
                    this.alertData[county.name.toLowerCase()] = alerts;
                    this.updateCountyAlertStatus(county.name, alerts);

                    return weatherData;
                } catch (countyError) {
                    console.error(`Error processing county ${county.name}:`, countyError);
                    return null;
                }
            });

            const results = await Promise.allSettled(weatherPromises);

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
        if (!weatherData || weatherData.temp === 'N/A') {
            console.warn(`Cannot add weather marker for ${county.name}: Invalid weather data`, weatherData);
            return;
        }

        const countyFeature = this.countyFeatures.features.find(feature => {
            const featureName = (
                feature.properties.name ||
                feature.properties.NAME ||
                feature.properties.County ||
                feature.properties.COUNTY ||
                ""
            ).toLowerCase();

            return featureName === county.name.toLowerCase() ||
                featureName.includes(county.name.toLowerCase()) ||
                county.name.toLowerCase().includes(featureName);
        });

        if (!countyFeature) {
            console.warn(`County feature not found for: ${county.name}`);
            return;
        }

        const centroid = this.findCentroid(countyFeature);

        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        marker.setAttribute('class', 'weather-marker');
        marker.setAttribute('id', `marker-${county.name.toLowerCase()}`);
        marker.setAttribute('cursor', 'pointer');

        const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tempText.setAttribute('x', centroid.x);
        tempText.setAttribute('y', centroid.y - 5);
        tempText.setAttribute('text-anchor', 'middle');
        tempText.setAttribute('dominant-baseline', 'middle');
        tempText.setAttribute('font-size', '22px');
        tempText.setAttribute('font-weight', 'bold');
        tempText.setAttribute('fill', 'yellow');
        tempText.textContent = `${weatherData.temp}`;

        marker.addEventListener('click', () => {
            if (county.url) {
                window.location.href = county.url;
            }
        });

        marker.appendChild(tempText);
        this.svg.appendChild(marker);
    }

    // Handle window resize
    handleResize() {
        // Basic resize handler - relies on SVG viewBox for responsiveness
    }

    // Refresh the map data
    async refresh() {
        const markers = this.svg.querySelectorAll('.weather-marker');
        markers.forEach(marker => marker.remove());

        const countyPaths = this.svg.querySelectorAll('path[id^="county-"]');
        countyPaths.forEach(path => {
            path.setAttribute('fill', this.options.defaultFill);
        });

        await this.updateWeatherData();
    }

    // Create warning legend
    createWarningLegend() {
        const existingLegend = document.querySelector('.map-legend');
        if (existingLegend) {
            existingLegend.remove();
        }

        const countyConfigs = window.siteConfig?.counties || [];
        const targetUGCCodes = new Set();
        const targetZoneURLs = new Set();

        countyConfigs.forEach(county => {
            if (county.ugcCode) {
                targetUGCCodes.add(county.ugcCode);
            }
            if (county.zoneURL) {
                targetZoneURLs.add(county.zoneURL);
            }
        });

        const activeWarnings = new Map();

        Object.values(this.alertData).forEach(countyAlerts => {
            if (!countyAlerts || !countyAlerts.length) return;

            countyAlerts.forEach(alert => {
                if (!alert.properties) return;

                let matchesOurZones = false;
                let affectedCounties = new Set();

                if (alert.properties.geocode && alert.properties.geocode.UGC) {
                    for (const ugcCode of alert.properties.geocode.UGC) {
                        if (targetUGCCodes.has(ugcCode)) {
                            matchesOurZones = true;
                        }

                        const mappedCounty = this.zoneToCountyMap[ugcCode];
                        if (mappedCounty) {
                            matchesOurZones = true;
                            affectedCounties.add(mappedCounty);
                        }
                    }
                }

                if (!matchesOurZones && alert.properties.affectedZones) {
                    for (const zoneURL of alert.properties.affectedZones) {
                        if (targetZoneURLs.has(zoneURL)) {
                            matchesOurZones = true;

                            const zoneMatch = zoneURL.match(/\/zones\/forecast\/(\w+)$/);
                            if (zoneMatch && zoneMatch[1]) {
                                const zoneId = zoneMatch[1];
                                const mappedCounty = this.zoneToCountyMap[zoneId];
                                if (mappedCounty) {
                                    affectedCounties.add(mappedCounty);
                                }
                            }
                        }
                    }
                }

                if (matchesOurZones) {
                    const eventName = alert.properties.event;
                    if (warningColors[eventName]) {
                        activeWarnings.set(eventName, warningColors[eventName]);

                        affectedCounties.forEach(countyName => {
                            const countyPath = document.getElementById(`county-${countyName.toLowerCase()}`);
                            if (countyPath) {
                                countyPath.setAttribute('fill', warningColors[eventName]);
                                countyPath.setAttribute('stroke-width', '3');
                                countyPath.setAttribute('title', eventName);
                            }
                        });
                    }
                }
            });
        });

        const legendContainer = document.getElementById('map-alerts-legend');
        if (activeWarnings.size === 0) {
            if (legendContainer) {
                legendContainer.style.display = 'none';
            }
            return;
        }

        let legend = legendContainer;
        if (!legend) {
            legend = document.createElement('div');
            legend.id = 'map-alerts-legend';
            legend.className = 'map-legend';
            const currentContent = document.querySelector('.current-content');
            const mapContainer = document.getElementById('nc-county-map');
            if (currentContent && mapContainer) {
                currentContent.insertBefore(legend, mapContainer.nextSibling);
            } else {
                this.container.parentNode.appendChild(legend);
            }
        }

        legend.style.display = 'block';
        legend.innerHTML = '';

        const title = document.createElement('div');
        title.id = 'legend-title';
        title.textContent = 'Active Alerts';
        title.style.color = '#fff000';
        title.style.fontWeight = 'bold';
        legend.appendChild(title);

        const warningContainer = document.createElement('div');
        warningContainer.style.display = 'flex';
        warningContainer.style.flexWrap = 'wrap';
        warningContainer.style.gap = '5px';
        legend.appendChild(warningContainer);

        activeWarnings.forEach((color, warningName) => {
            const warningItem = document.createElement('div');
            warningItem.style.display = 'flex';
            warningItem.style.alignItems = 'center';
            warningItem.style.marginRight = '10px';

            const colorBox = document.createElement('div');
            colorBox.style.width = '12px';
            colorBox.style.height = '12px';
            colorBox.style.backgroundColor = color;
            colorBox.style.marginRight = '5px';
            colorBox.style.border = '1px solid #333';

            const warningText = document.createElement('span');
            warningText.textContent = warningName;
            warningText.style.fontWeight = 'bold';

            warningItem.appendChild(colorBox);
            warningItem.appendChild(warningText);
            warningContainer.appendChild(warningItem);
        });
    }
}

// Export function to initialize the county map
export function initCountyMap() {
    const mapContainer = document.getElementById('nc-county-map');
    if (!mapContainer) {
        console.error("Map container not found");
        return null;
    }

    const countyMap = new NCCountyMap('nc-county-map', {
        defaultFill: '#0077cc',
        highlightFill: '#1e88e5',
        strokeColor: '#ffffff',
        strokeWidth: 2
    });

    countyMap.init().then(success => {
        if (success) {
            console.log('NC County Map initialized successfully');
        } else {
            console.error('Failed to initialize NC County Map');
        }
    });

    return countyMap;
}