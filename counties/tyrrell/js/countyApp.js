// Wrapper: Tyrrell County single-zone initializer
import { initializePage } from '../../js/countyApp.js?v=20260824-phase4-1';
import * as countyData from '../../js/countyData.js?v=20260822-hwo-1';
import { initMeteogram } from '../../js/meteogram.js';

initializePage({ ...countyData, initMeteogram });
