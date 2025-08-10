// ncCountyMap.js
// North Carolina Alert Zone & Weather Map Module
// Expects global D3 (<script src="https://d3js.org/d3.v7.min.js"></script>)
import {
  fetchCurrentWeather,
  fetchAlerts,
  getDefaultWeatherData,
} from "./weatherData.js";
import { warningColors, warningPriorities } from "./warningColors.js";

export class NCCountyMap {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.width = options.width || 800;
    this.height = options.height || 450;
    this.countyFeatures = { type: "FeatureCollection", features: [] };
    this.weatherData = {};
    this.alertData = {};
    this.options = {
      defaultFill: "#0077cc",
      highlightFill: "#1e88e5",
      strokeColor: "#ffffff",
      strokeWidth: 1,
      markerFontSize: "16px",
      ...options,
    };
    this.zoneToCountyMap = {
      NCZ047: "dare",
      NCZ203: "dare",
      NCZ205: "dare",
      NCZ081: "hyde",
      NCZ204: "hyde",
      NCZ030: "bertie",
      NCZ044: "pitt",
      NCZ080: "beaufort",
      NCZ029: "martin",
      NCZ045: "washington",
      NCZ046: "tyrrell",
    };
    this.d3 = window.d3;
  }

  async loadCountyData() {
    const ids = Object.keys(this.zoneToCountyMap);
    const features = [];
    for (const id of ids) {
      try {
        const resp = await fetch(
          `https://api.weather.gov/zones/forecast/${id}`
        );
        if (!resp.ok) throw new Error(resp.statusText);
        const zoneGeo = await resp.json();
        features.push(zoneGeo);
      } catch (err) {
        console.error(`Zone ${id} load failed:`, err);
      }
    }
    this.countyFeatures = { type: "FeatureCollection", features };
    console.log(`Loaded ${features.length} zones`);
  }

  async init() {
    if (!this.container) {
      console.error("Container not found");
      return;
    }
    this.svg = this.d3
      .select(this.container)
      .append("svg")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "85%")
      .style("height", "85%");

    await this.loadCountyData();
    this.drawMap();
    await this.updateWeatherData();
  }

  drawMap() {
    const data = this.countyFeatures;
    if (!data.features.length) return;

    this.projection = this.d3
      .geoMercator()
      .fitSize([this.width, this.height], data);
    this.path = this.d3.geoPath().projection(this.projection);

    const g = this.svg.append("g").attr("class", "zones");
    g.selectAll("path")
      .data(data.features)
      .enter()
      .append("path")
      .attr("d", (d) => this.path(d))
      .attr("data-zone-id", (d) => d.properties.id)
      .attr("data-county", (d) => this.zoneToCountyMap[d.properties.id])
      .attr("fill", this.options.defaultFill)
      .attr("stroke", this.options.strokeColor)
      .attr("stroke-width", this.options.strokeWidth);
  }

  async updateWeatherData() {
    const counties = window.siteConfig?.counties || [];
    await Promise.all(
      counties.map(async (county) => {
        try {
          // Get weather data
          let weather = await fetchCurrentWeather(county.lat, county.lon);
          if (!weather || weather.temp == "N/A") {
            weather = getDefaultWeatherData();
          }
          weather.city = county.city;

          // Get alerts using zone-based method
          const alerts = await fetchAlerts(county.lat, county.lon);

          const key = county.name.toLowerCase();
          this.weatherData[key] = weather;
          this.alertData[key] = alerts;

          this.addWeatherMarker(county, weather);
          this.colorZonesForCounty(key, alerts);
        } catch (err) {
          console.error(`Weather update failed for ${county.name}:`, err);
        }
      })
    );
    this.createWarningLegend();
  }

  addWeatherMarker(county, weather) {
    const key = county.name.toLowerCase();
    const feat = this.countyFeatures.features.find(
      (f) => this.zoneToCountyMap[f.properties.id] === key
    );
    if (!feat) return;
    const centroid = this.d3.geoCentroid(feat);
    const [x, y] = this.projection(centroid);
    const g = this.svg.append("g").attr("class", "weather-marker");

    g.append("text")

      .attr("class", "marker-temp")
      .attr("x", x)
      .attr("y", y - 8)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", this.options.markerFontSize)
      .attr("fill", "#ff0")
      .text(`${weather.temp}°`)
      .on("click", () => county.url && (window.location.href = county.url));

    g.append("text")

      .attr("class", "marker-label")
      .attr("x", x)
      .attr("y", y + 25)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", this.options.markerFontSize)
      .attr("fill", "#fff")
      .text(`${weather.city}`)
      .on("click", () => county.url && (window.location.href = county.url));
  }

  colorZonesForCounty(countyKey, alerts) {
    if (!alerts || !Array.isArray(alerts) || !alerts.length) return;

    let bestEvent = null;
    let bestPriority = Infinity;

    alerts.forEach((alert) => {
      if (!alert) return; // Guard against null/undefined alerts

      // Handle different alert data structures
      let eventName = null;

      if (alert.properties && alert.properties.event) {
        eventName = alert.properties.event;
      } else if (alert.event) {
        eventName = alert.event;
      }

      if (!eventName) return; // Skip if we can't find an event name

      const priority = warningPriorities[eventName] ?? 999;
      if (priority < bestPriority) {
        bestPriority = priority;
        bestEvent = eventName;
      }
    });

    if (bestEvent) {
      const color = warningColors[bestEvent] || this.options.defaultFill;

      // Color all zones for this county
      this.svg
        .selectAll(`path[data-county="${countyKey}"]`)
        .attr("fill", color);
    }
  }

  /**
   * Fix for ncCountyMap.js - Replace the createWarningLegend method
   * Add defensive programming to handle undefined properties
   */

  createWarningLegend() {
    const old = document.querySelector(".map-legend");
    if (old) old.remove();

    const active = new Map();

    Object.values(this.alertData).forEach((alerts) => {
      if (!alerts || !Array.isArray(alerts)) return; // Guard against non-array data

      alerts.forEach((alert) => {
        if (!alert) return; // Guard against null/undefined alerts

        // Handle different alert data structures
        let eventName = null;

        // Try multiple ways to get the event name
        if (alert.properties && alert.properties.event) {
          eventName = alert.properties.event;
        } else if (alert.event) {
          eventName = alert.event;
        } else if (typeof alert === "string") {
          eventName = alert; // Sometimes the alert might just be a string
        }

        // Only add to legend if we found a valid event name and it has a color
        if (eventName && warningColors[eventName]) {
          active.set(eventName, warningColors[eventName]);
        } else if (eventName) {
          console.warn(`No color defined for alert type: ${eventName}`);
        }
      });
    });

    if (!active.size) return;

    const legend = document.createElement("div");
    legend.className = "map-legend";
    legend.id = "map-alerts-legend";
    legend.innerHTML = `<div id="legend-title">Active Alerts</div>`;

    Object.entries(Object.fromEntries(active)).forEach(([eventName, color]) => {
      const item = document.createElement("div");
      item.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};margin-right:5px;border:1px solid #333;"></span><strong>${eventName}</strong>`;
      legend.appendChild(item);
    });

    this.container.parentNode.insertBefore(legend, this.container.nextSibling);
  }
}

export function initCountyMap() {
  const map = new NCCountyMap("nc-county-map");
  map.init();
  return map;
}
