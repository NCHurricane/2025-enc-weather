// Wrapper: Dare County multi-zone initializer
import { initializePage } from '../../js/countyApp.multizone.js';
import * as countyData from '../../js/countyData.multizone.js';
import { initMeteogram } from '../../js/meteogram.js';

initializePage({ ...countyData, initMeteogram });
