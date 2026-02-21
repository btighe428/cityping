// trigger/scrapers/index.ts
/**
 * Scraper Tasks Index
 *
 * Re-exports all scraper tasks for Trigger.dev registration.
 */

export { mtaAlertsTask } from "./mta-alerts";
export { ferryAlertsTask } from "./ferry-alerts";
export { citibikeTask } from "./citibike";
export { airportsTask } from "./airports";
export { trafficTask } from "./traffic";
export { airQualityTask } from "./air-quality";
export { environmentalTask } from "./environmental";
export { newsTier1Task, newsTier2Task, newsTier3Task, newsCurationTask } from "./news-multi";
export { serviceAlertsTask } from "./311";
export { parksTask } from "./parks";
export { diningTask } from "./dining";
export { sampleSalesTask } from "./sample-sales";
export { housingTask } from "./housing";
export { emergencyTask } from "./emergency";
export { eventsTask } from "./events";
