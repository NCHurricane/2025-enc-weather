// Wrapper: Bertie County single-zone initializer
import { initializePage } from '../../js/countyApp.js';
import * as countyData from '../../js/countyData.js';
import { initMeteogram } from '../../js/meteogram.js';

initializePage({ ...countyData, initMeteogram });