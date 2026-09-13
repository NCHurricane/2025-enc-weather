// Wrapper: Tyrrell County single-zone initializer
import { initializePage } from '../../js/countyApp.js?v=20260912-phase11-hwo-2';
import * as countyData from '../../js/countyData.js?v=20260912-phase11-1';
import { initMeteogram } from '../../js/meteogram.js?v=20260912-meteogram-buttons-1';

initializePage({ ...countyData, initMeteogram });
