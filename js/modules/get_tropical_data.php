/**
* Tropical Data API Module
*
* This module provides functions to fetch tropical storm data from various sources,
* with appropriate fallbacks if primary sources fail.
*/

/**
* Fetches tropical storm data using the most reliable method available
* @returns {Promise<Object>} Promise that resolves to storm data
    */
    export async function getTropicalData() {
    try {
    // Try the PHP API endpoint first (most up-to-date)
    console.log("Attempting to fetch from PHP API...");
    const response = await fetch('./js/modules/tropical_data.php');
    if (response.ok) {
    const data = await response.json();
    console.log("Successfully loaded data from PHP API");
    return data;
    }
    throw new Error("PHP API request failed");
    } catch (error) {
    console.warn("Could not load from PHP API:", error);

    try {
    // Try the cached JSON file
    console.log("Attempting to fetch from cached JSON...");
    const response = await fetch('./js/modules/cache/nhc_current_storms.json');
    if (response.ok) {
    const data = await response.json();
    console.log("Successfully loaded data from cache file");
    return data;
    }
    throw new Error("Cache file request failed");
    } catch (cacheError) {
    console.warn("Could not load from cache file:", cacheError);

    try {
    // Fall back to example data
    console.log("Attempting to fetch from example data...");
    const response = await fetch('./js/modules/CurrentStorms[example2].json');
    if (response.ok) {
    const data = await response.json();
    console.log("Successfully loaded from example data");
    return data;
    }
    throw new Error("Example data request failed");
    } catch (fallbackError) {
    console.error("All data sources failed:", fallbackError);
    // Return an empty data structure as last resort
    return { activeStorms: [] };
    }
    }
    }
    }