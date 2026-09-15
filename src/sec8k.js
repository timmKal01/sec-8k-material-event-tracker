const UA = 'SEC8KMaterialEventTracker/0.1 (+contact: sec-8k-tracker-admin@example.com)';
const FTS_BASE = 'https://efts.sec.gov/LATEST/search-index';

const ITEM_LABELS = {
    '1.01': 'Entry into Material Agreement',
    '1.02': 'Termination of Material Agreement',
    '1.03': 'Bankruptcy or Receivership',
    '2.01': 'Completion of Acquisition/Disposition of Assets',
    '2.02': 'Results of Operations and Financial Condition',
    '2.03': 'Creation of a Direct Financial Obligation',
    '2.05': 'Costs Associated with Exit or Disposal Activities',
    '3.01': 'Delisting or Failure to Satisfy Listing Rule',
    '4.01': "Changes in Registrant's Certifying Accountant",
    '5.01': 'Changes in Control of Registrant',
    '5.02': 'Departure/Election of Directors or Officers',
    '5.03': 'Amendments to Articles of Incorporation or Bylaws',
    '7.01': 'Regulation FD Disclosure',
    '8.01': 'Other Events',
    '9.01': 'Financial Statements and Exhibits',
};

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries transient failures (rate limits, upstream 5xx) instead of failing the whole run on one hiccup. */
async function secFetch(url) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        let res;
        try {
            res = await fetch(url, { headers: { 'User-Agent': UA } });
        } catch (err) {
            lastError = err;
            if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
            continue;
        }
        if (res.ok) return res;
        if (!TRANSIENT_STATUSES.has(res.status)) {
            throw new Error(`SEC request failed: ${url} (${res.status})`);
        }
        lastError = new Error(`SEC request failed: ${url} (${res.status})`);
        if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
    throw lastError;
}

export async function lookupCik(ticker) {
    const res = await secFetch('https://www.sec.gov/files/company_tickers.json');
    const data = await res.json();
    const match = Object.values(data).find((t) => t.ticker.toUpperCase() === ticker.toUpperCase());
    if (!match) throw new Error(`Ticker not found: ${ticker}`);
    return String(match.cik_str).padStart(10, '0');
}

function parseDisplayName(displayName) {
    const m = displayName?.match(/^(.*?)\s*\(([A-Z.]+)\)\s*\(CIK (\d+)\)/);
    if (!m) return { companyName: displayName ?? null, ticker: null };
    return { companyName: m[1].trim(), ticker: m[2] };
}

export async function fetchFilings({ cik, keyword, itemCode, startDate, endDate, limit }) {
    const params = new URLSearchParams({
        forms: '8-K',
        startdt: startDate.toISOString().slice(0, 10),
        enddt: endDate.toISOString().slice(0, 10),
        size: '100', // EDGAR FTS page size cap; itemCode filtering happens client-side after this
    });
    if (keyword) params.set('q', keyword);
    if (cik) params.set('ciks', cik);
    // efts.sec.gov requires a non-empty q for cik-only searches to return results.
    if (cik && !keyword) params.set('q', '"a"');

    const res = await secFetch(`${FTS_BASE}?${params}`);
    const data = await res.json();
    const hits = data.hits?.hits ?? [];

    const byAccession = new Map();
    for (const hit of hits) {
        const s = hit._source;
        if (itemCode && itemCode !== 'all' && !(s.items ?? []).includes(itemCode)) continue;
        if (!byAccession.has(s.adsh)) byAccession.set(s.adsh, s);
    }

    return [...byAccession.values()]
        .sort((a, b) => b.file_date.localeCompare(a.file_date))
        .slice(0, limit)
        .map((s) => {
            const { companyName, ticker } = parseDisplayName(s.display_names?.[0]);
            const cikNum = s.ciks?.[0]?.replace(/^0+/, '') || s.ciks?.[0];
            const accessionNoDashes = s.adsh.replace(/-/g, '');
            return {
                accessionNumber: s.adsh,
                companyName,
                ticker,
                cik: s.ciks?.[0] ?? null,
                items: s.items ?? [],
                itemLabels: (s.items ?? []).map((code) => ITEM_LABELS[code] ?? code),
                filingDate: s.file_date,
                periodEnding: s.period_ending ?? null,
                filingUrl: `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoDashes}-index.htm`,
            };
        });
}
