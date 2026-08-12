import { Actor, log } from 'apify';
import { lookupCik, fetchFilings } from './sec8k.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { ticker, keyword, itemCode = 'all', daysBack = 14, maxResults = 25 } = input;

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const FILING_SEARCH_EVENT = 'filing-search';

let cik = null;
if (ticker) {
    cik = await lookupCik(ticker);
    log.info(`Resolved ${ticker} to CIK ${cik}`);
}

const endDate = new Date();
const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

const filings = await fetchFilings({
    cik,
    keyword,
    itemCode,
    startDate,
    endDate,
    limit: Math.min(maxResults, 100),
});

for (const filing of filings) {
    await Actor.pushData(filing);
}

await Actor.charge({ eventName: FILING_SEARCH_EVENT });

log.info(`Pushed ${filings.length} filing(s)`);

await Actor.exit();
