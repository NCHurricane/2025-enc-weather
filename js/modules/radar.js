// radar.js
import { createImageLoader } from './imageLoader.js';

async function createRadarUrls(region = 'KMHX') {
    try {
        const baseUrl = 'https://radar.weather.gov/ridge/standard/';

        // Static image URL
        const staticImageUrl = `${baseUrl}${region}_0.gif`;

        // Animated GIF URL
        const animatedGifUrl = `${baseUrl}${region}_loop.gif`;

        return [staticImageUrl, animatedGifUrl];
    } catch (error) {
        console.error("Error creating radar URLs:", error);
        return [];
    }
}

// Configure and create the radar image loader
const radarLoader = createImageLoader({
    containerId: 'radar-image-container',
    imageId: 'radar-image',
    loadingId: 'radar-loading',
    errorId: 'radar-error',
    timestampId: 'radar-timestamp',
    playButtonId: 'radar-play-pause',
    selectorId: 'radar-product-select',
    getImageUrls: createRadarUrls,
    defaultRegion: 'KMHX'
});

// Export the initialization function
export function initRadar() {
    radarLoader.initialize();
}