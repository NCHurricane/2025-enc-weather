// ncCountyMap.js
// North Carolina Alert Zone & Weather Map Module
// Expects global D3 (<script src="https://d3js.org/d3.v7.min.js"></script>)

import { warningColors, warningPriorities } from "./warningColors.js";
import {
  fetchCurrentWeather,
  fetchAlerts,
  getDefaultWeatherData,
} from "./mapAggregator.js";

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
    this.additionalStations = [
      {
        id: "KHSE",
        name: "Hatteras",
        county: "dare",
        zone: "hatteras",
        lat: 35.2195,
        lon: -75.6903,
      },
      {
        id: "STCN7",
        name: "Stumpy Point",
        county: "dare",
        zone: "mainland",
        lat: 35.70168,
        lon: -75.75714,
      },
      {
        id: "K7W6",
        name: "Engelhard",
        county: "hyde",
        zone: "mainland",
        lat: 35.51226405320417,
        lon: -75.99222514225927,
      },
      {
        id: "G5443",
        name: "Wilmar",
        county: "beaufort",
        lat: 35.38967,
        lon: -77.1235,
      },
    ];

    this.d3 = window.d3;
  }

  // getStationData with debug logging for skipped stations
  // getStationData with cache-busting and 60m freshness
  async getStationData(stationConfig) {
    const BUST_BUCKET_MS = 15 * 60 * 1000;
    const bust = Math.floor(Date.now() / BUST_BUCKET_MS);
    const urls = [];
    if (stationConfig.zone) {
      urls.push(
        `counties/${stationConfig.county}/data/${stationConfig.zone}/current.json?cb=${bust}`
      );
    }
    urls.push(`counties/${stationConfig.county}/data/current.json?cb=${bust}`);

    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) continue;
        const data = await response.json();
        const stationData = Object.values(data.stations || {}).find(
          (s) => s.id === stationConfig.id
        );
        if (!stationData?.data?.temperature) continue;
        const ageMinutes = stationData.observation?.age_minutes ?? 999;
        if (ageMinutes > 60) continue;
        return {
          temp: Math.round(Number(stationData.data.temperature)),
          conditions: stationData.data.conditions || "N/A",
          stationName: stationData.name || stationConfig.name,
          age: ageMinutes,
          updatedIso: data.generated || stationData.observation?.timestamp,
        };
      } catch (err) {
        console.warn(`Error fetching ${stationConfig.id} from ${url}:`, err);
        continue;
      }
    }
    return null;
  }

  // Add this new method to create station markers
  addStationMarker(stationConfig, weather) {
    const [x, y] = this.projection([stationConfig.lon, stationConfig.lat]);
    const g = this.svg.append("g").attr("class", "station-marker");

    // Temperature marker (smaller than county markers)
    g.append("text")
      .attr("class", "marker-temp")
      .attr("x", x)
      .attr("y", y - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "2.7rem")
      .attr("fill", "#ffff00")
      .text(`${weather.temp}°`);
    g.append("text")
      .attr("class", "marker-label")
      .attr("x", x)
      .attr("y", y + 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .text(stationConfig.name.toUpperCase());
  }

  async loadCountyData() {
    try {
      const response = await fetch("js/data/NC-county-topo.json");
      if (!response.ok)
        throw new Error(`Failed to load topo data: ${response.status}`);

      const topoData = await response.json();
      const zoneIds = Object.keys(this.zoneToCountyMap);

      // Filter features to only include zones we care about
      const filteredFeatures = topoData.features.filter((feature) => {
        const zoneCode = feature.properties?.zoneCode;
        return zoneIds.includes(zoneCode);
      });

      this.countyFeatures = {
        type: "FeatureCollection",
        features: filteredFeatures,
      };
      console.log(
        `Loaded ${filteredFeatures.length} zones from local topo file`
      );
    } catch (err) {
      console.error("Failed to load county topo data:", err);
    }
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
      .attr("data-zone-id", (d) => {
        return d.properties?.zoneCode || d.properties?.id;
      })
      .attr(
        "data-county",
        (d) => this.zoneToCountyMap[d.properties?.zoneCode || d.properties?.id]
      )
      .attr("fill", this.options.defaultFill)
      .attr("stroke", this.options.strokeColor)
      .attr("stroke-width", this.options.strokeWidth);
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

  async updateWeatherData() {
    const counties = window.siteConfig?.counties || [];

    // Process county markers (existing code)
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

          this.addWeatherMarker(county.lat, county.lon, weather, {
            onClick: () => county.url && (window.location.href = county.url),
          });
          this.colorZonesForCounty(key, alerts);
        } catch (err) {
          console.error(`Weather update failed for ${county.name}:`, err);
        }
      })
    );

    // Process individual station markers (new code)
    await Promise.all(
      this.additionalStations.map(async (station) => {
        try {
          const weather = await this.getStationData(station);
          if (weather) {
            this.addStationMarker(station, weather);
            console.log(
              `Added station marker for ${station.id}: ${weather.temp}°`
            );
          } else {
            console.log(`No valid data for station ${station.id}`);
          }
        } catch (err) {
          console.error(`Station marker failed for ${station.id}:`, err);
        }
      })
    );

    this.createWarningLegend();
  }

  addWeatherMarker(lat, lon, weather, options = {}) {
    const [x, y] = this.projection([lon, lat]);
    const fontSize = options.fontSize || this.options.markerFontSize;
    const fillColor = options.fillColor || "#ff0";
    const strokeWidth = options.strokeWidth || "0";
    const clickHandler = options.onClick || null;

    const g = this.svg.append("g").attr("class", "weather-marker");

    g.append("text")
      .attr("class", "marker-temp")
      .attr("x", x)
      .attr("y", y - 8)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", fontSize)
      .attr("fill", fillColor)
      .attr("stroke", "#000")
      .attr("stroke-width", strokeWidth)
      .text(`${weather.temp}°`)
      .on("click", clickHandler);

    g.append("text")
      .attr("class", "marker-label")
      .attr("x", x)
      .attr("y", y + 20)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", this.options.markerFontSize)
      .attr("fill", "#fff")
      .text(`${weather.city}`)
      .on("click", () => county.url && (window.location.href = county.url));
  }

  colorZonesForCounty(countyKey, alerts) {
    if (!alerts || !Array.isArray(alerts) || !alerts.length) return;

    // Group alerts by the zones they affect
    const alertsByZone = new Map();

    alerts.forEach((alert) => {
      if (!alert) return;

      // Extract zones this alert affects
      let affectedZones = [];

      // Check different possible structures for zone information
      if (alert.properties?.zones) {
        affectedZones = alert.properties.zones.map((zoneUrl) =>
          zoneUrl.split("/").pop()
        );
      } else if (alert.zones) {
        affectedZones = Array.isArray(alert.zones)
          ? alert.zones
          : [alert.zones];
      } else if (alert.properties?.geocode?.UGC) {
        affectedZones = alert.properties.geocode.UGC;
      } else if (alert.geocode?.UGC) {
        affectedZones = alert.geocode.UGC;
      } else if (alert.forecastZone) {
        affectedZones = [alert.forecastZone];
      }

      // Get event name - check multiple possible locations
      let eventName = null;
      if (alert.properties?.event) {
        eventName = alert.properties.event;
      } else if (alert.event) {
        eventName = alert.event;
      } else if (alert.type) {
        eventName = alert.type;
      }

      if (!eventName || affectedZones.length === 0) return;

      // Add alert to each affected zone
      affectedZones.forEach((zoneId) => {
        if (!alertsByZone.has(zoneId)) {
          alertsByZone.set(zoneId, []);
        }
        alertsByZone.get(zoneId).push({
          event: eventName,
          priority: warningPriorities[eventName] ?? 999,
          color: warningColors[eventName] || this.options.defaultFill,
        });
      });
    });

    // Color each zone based on its highest priority alert
    alertsByZone.forEach((zoneAlerts, zoneId) => {
      if (zoneAlerts.length === 0) return;

      // Find highest priority alert for this zone
      let bestAlert = null;
      let bestPriority = Infinity;

      zoneAlerts.forEach((alert) => {
        if (alert.priority < bestPriority) {
          bestPriority = alert.priority;
          bestAlert = alert;
        }
      });

      if (bestAlert) {
        // Color the specific zone path
        this.svg
          .selectAll(`path[data-zone-id="${zoneId}"]`)
          .attr("fill", bestAlert.color);
      }
    });
  }

  createWarningLegend() {
    const old = document.querySelector(".map-legend");
    if (old) old.remove();

    const active = new Map();

    Object.values(this.alertData).forEach((alerts) => {
      if (!alerts || !Array.isArray(alerts)) return;

      alerts.forEach((alert) => {
        if (!alert) return;

        // Handle different alert data structures
        let eventName = null;
        if (alert.properties && alert.properties.event) {
          eventName = alert.properties.event;
        } else if (alert.event) {
          eventName = alert.event;
        } else if (alert.type) {
          eventName = alert.type;
        } else if (typeof alert === "string") {
          eventName = alert;
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
