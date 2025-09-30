// =============================
// Dynamic Eastern NC County Map - js/modules/ncCountyMap.js
// North Carolina County Map with Weather Stations and Alerts
// Renders an interactive SVG map of NC counties with weather station markers.
// Fetches and displays current weather data and alerts for each county.
// Colors counties based on active alerts using a predefined color scheme.
//
// Functionality to added soon to select different parameters to display on the map.
// =============================

import { warningColors, warningPriorities } from "./warningColors.js";
import {
  fetchCurrentWeather,
  fetchAlerts,
  getDefaultWeatherData,
} from "./mapAggregator.js";

const STATION_MAX_AGE_MINUTES = 90;

export class NCCountyMap {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);

    // Set base dimensions for viewBox
    this.baseWidth = 1200;
    this.baseHeight = 675;

    this.width = options.width || this.baseWidth;
    this.height = options.height || this.baseHeight;

    this.countyFeatures = { type: "FeatureCollection", features: [] };
    this.weatherData = {};
    this.alertData = {};
    this.options = {
      defaultFill: "#0077cc",
      highlightFill: "#1e88e5",
      strokeColor: "#ffffff",
      strokeWidth: 1,
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
        url: "counties/dare/?zone=hatteras",
        lat: 35.2195,
        lon: -75.6903,
      },
      {
        id: "STCN7",
        name: "Stumpy Point",
        county: "dare",
        zone: "mainland",
        url: "counties/dare/?zone=mainland",
        lat: 35.70168,
        lon: -75.75714,
      },
      {
        id: "K7W6",
        name: "Engelhard",
        county: "hyde",
        zone: "mainland",
        url: "counties/hyde/?zone=mainland",
        lat: 35.51226405320417,
        lon: -75.99222514225927,
      },
      {
        id: "G5443",
        name: "Wilmar",
        county: "beaufort",
        url: "counties/beaufort/",
        lat: 35.38967,
        lon: -77.1235,
      },
      {
        id: "TS338",
        name: "Pinetown",
        county: "beaufort",
        url: "counties/beaufort/",
        lat: 35.64122,
        lon: -76.70067,
      },
      {
        id: "HBKN7",
        name: "Hobucken",
        county: "beaufort",
        url: "counties/beaufort/",
        lat: 35.38967,
        lon: -77.1235,
      },
      {
        id: "ALIN7",
        name: "Gum Neck",
        county: "tyrrell",
        url: "counties/tyrrell",
        lat: 35.5449,
        lon: -77.45209,
      },
    ];

    this.d3 = window.d3;
  }

  async getStationData(stationConfig) {
    const BUST_BUCKET_MS = 15 * 60 * 1000;
    const bust = Math.floor(Date.now() / BUST_BUCKET_MS);

    // For multi-zone stations, only fetch the zone-specific current.json.
    // Single-zone (no stationConfig.zone) uses the root current.json.
    const urls = stationConfig.zone
      ? [
        `counties/${stationConfig.county}/data/${stationConfig.zone}/current.json?v=${bust}`,
      ]
      : [`counties/${stationConfig.county}/data/current.json?v=${bust}`];

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
        if (ageMinutes > STATION_MAX_AGE_MINUTES) continue;
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

  addStationMarker(stationConfig, weather) {
    const [x, y] = this.projection([stationConfig.lon, stationConfig.lat]);
    const g = this.svg.append("g").attr("class", "station-marker");

    const responsiveSettings = this.getResponsiveSettings();

    const clickHandler = stationConfig.url
      ? () => {
        window.location.href = stationConfig.url;
      }
      : null;

    g.append("text")
      .attr("class", "marker-temp")
      .attr("x", x)
      .attr("y", y + responsiveSettings.tempYOffset)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#ffff00")
      .text(`${weather.temp}`)
      .on("click", clickHandler);

    g.append("text")
      .attr("class", "marker-label")
      .attr("x", x)
      .attr("y", y + responsiveSettings.labelYOffset)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#fff")
      .text(stationConfig.name.toUpperCase())
      .on("click", clickHandler);
  }

  async loadCountyData() {
    try {
      const response = await fetch("js/data/NC-county-topo.json?v=" + Date.now(), { cache: "no-store" });
      if (!response.ok)
        throw new Error(`Failed to load topo data: ${response.status}`);

      const topoData = await response.json();
      const zoneIds = Object.keys(this.zoneToCountyMap);

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
      console.error("Container not found for NCCountyMap");
      return;
    }
    const wrapper = this.d3
      .select(this.container)
      .append("div")
      .style("position", "relative")
      .style("width", "100%")
      .style("padding-bottom", `${(this.height / this.width) * 100}%`)
      .style("overflow", "hidden");

    this.svg = wrapper
      .append("svg")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("position", "absolute")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100%")
      .style("height", "100%");

    await this.loadCountyData();
    this.drawMap();
    await this.updateWeatherData();
  }

  async updateWeatherData() {
    const defaultCounties = [
      {
        name: "Dare",
        city: "Manteo",
        lat: 35.9082,
        lon: -75.6757,
        url: "/counties/dare/?=mainland",
      },
      {
        name: "Hyde",
        city: "Swan Quarter",
        lat: 35.4546,
        lon: -76.3272,
        url: "/counties/hyde/?=mainland",
      },
      {
        name: "Beaufort",
        city: "Washington",
        lat: 35.5466,
        lon: -77.0497,
        url: "/counties/beaufort/",
      },
      {
        name: "Bertie",
        city: "Windsor",
        lat: 36.0015,
        lon: -76.9459,
        url: "/counties/bertie/",
      },
      {
        name: "Martin",
        city: "Williamston",
        lat: 35.8546,
        lon: -77.0544,
        url: "/counties/martin/",
      },
      {
        name: "Pitt",
        city: "Greenville",
        lat: 35.6127,
        lon: -77.3664,
        url: "/counties/pitt/",
      },
      {
        name: "Washington",
        city: "Plymouth",
        lat: 35.8674,
        lon: -76.7475,
        url: "/counties/washington/",
      },
      {
        name: "Tyrrell",
        city: "Columbia",
        lat: 35.9182,
        lon: -76.2522,
        url: "/counties/tyrrell/",
      },
    ];
    const counties =
      window.siteConfig &&
        Array.isArray(window.siteConfig.counties) &&
        window.siteConfig.counties.length > 0
        ? window.siteConfig.counties
        : defaultCounties;

    await Promise.all(
      counties.map(async (county) => {
        try {
          let weather = await fetchCurrentWeather(county.lat, county.lon);
          if (!weather || weather.temp == "N/A") {
            weather = getDefaultWeatherData();
          }
          weather.city = county.city;

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

    await Promise.all(
      this.additionalStations.map(async (station) => {
        try {
          const weather = await this.getStationData(station);
          if (weather) {
            this.addStationMarker(station, weather);
            console.log(
              `Added station marker for ${station.id}: ${weather.temp}`
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
    const fillColor = options.fillColor || "#ff0";
    const strokeWidth = options.strokeWidth || "0";
    const clickHandler = options.onClick || null;

    const responsiveSettings = this.getResponsiveSettings();

    const g = this.svg.append("g").attr("class", "weather-marker");

    g.append("text")
      .attr("class", "marker-temp")
      .attr("x", x)
      .attr("y", y + responsiveSettings.tempYOffset)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", fillColor)
      .attr("stroke", "#000")
      .attr("stroke-width", strokeWidth)
      .text(`${weather.temp}`)
      .on("click", clickHandler);

    g.append("text")
      .attr("class", "marker-label")
      .attr("x", x)
      .attr("y", y + responsiveSettings.labelYOffset)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#fff")
      .text(`${weather.city}`)
      .on("click", () => options.onClick && options.onClick());
  }

  getResponsiveSettings() {
    const width = window.innerWidth;

    if (width <= 600) {
      return {
        tempYOffset: -15,
        labelYOffset: 30,
      };
    } else if (width <= 768) {
      return {
        tempYOffset: -10,
        labelYOffset: 30,
      };
    } else if (width <= 1024) {
      return {
        tempYOffset: -12,
        labelYOffset: 25,
      };
    } else {
      return {
        tempYOffset: -15,
        labelYOffset: 30,
      };
    }
  }

  colorZonesForCounty(countyKey, alerts) {
    if (!alerts || !Array.isArray(alerts) || !alerts.length) return;

    const alertsByZone = new Map();

    alerts.forEach((alert) => {
      if (!alert) return;

      let affectedZones = [];

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

      let eventName = null;
      if (alert.properties?.event) {
        eventName = alert.properties.event;
      } else if (alert.event) {
        eventName = alert.event;
      } else if (alert.type) {
        eventName = alert.type;
      }

      if (!eventName || affectedZones.length === 0) return;

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

    alertsByZone.forEach((zoneAlerts, zoneId) => {
      if (zoneAlerts.length === 0) return;

      let bestAlert = null;
      let bestPriority = Infinity;

      zoneAlerts.forEach((alert) => {
        if (alert.priority < bestPriority) {
          bestPriority = alert.priority;
          bestAlert = alert;
        }
      });

      if (bestAlert) {
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
