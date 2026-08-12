# SEC 8-K Material Event Tracker — Corporate Filings

Search recent SEC 8-K filings for material corporate events: mergers &
acquisitions, bankruptcy, executive departures, material agreements, and
more. Search market-wide, by ticker, or by a specific 8-K item code.

Built for investors, M&A advisors, and sales/research teams tracking
material events at companies they follow — a different signal than
[Insider Trading Alert](https://github.com/timmKal01/insider-trading-alert),
which covers personal stock transactions by executives rather than
corporate-level events.

## Input

```json
{
  "ticker": "AAPL",
  "keyword": "",
  "itemCode": "5.02",
  "daysBack": 14,
  "maxResults": 25
}
```

| Field | Type | Description |
|---|---|---|
| `ticker` | string | Stock ticker for one company. Leave blank to search market-wide. |
| `keyword` | string | Free-text search across filing text. Leave blank to skip. |
| `itemCode` | string | Filter to one specific 8-K item type (e.g. `5.02` executive departures, `1.03` bankruptcy, `2.01` acquisition completion). `all` for every item type. |
| `daysBack` | number | How many days back from today to search, by filing date. Default `14`, max `365`. |
| `maxResults` | number | Max filings to return, most recent first. Default `25`, max `100`. |

## Output

One record per filing:

```json
{
  "accessionNumber": "0000950103-26-012019",
  "companyName": "Eos Energy Enterprises, Inc.",
  "ticker": "EOSE",
  "cik": "0001805077",
  "items": ["1.01", "3.02", "9.01"],
  "itemLabels": ["Entry into Material Agreement", "3.02", "Financial Statements and Exhibits"],
  "filingDate": "2026-08-06",
  "periodEnding": "2026-08-03",
  "filingUrl": "https://www.sec.gov/Archives/edgar/data/1805077/000095010326012019-index.htm"
}
```

`itemLabels` maps common item codes to plain-language descriptions; less
common codes are returned as-is (the numeric code, unmapped).

## How it works

Direct calls to the official [SEC EDGAR full text search](https://www.sec.gov/edgar/search/)
API (`efts.sec.gov`) — the same system that powers EDGAR's own search UI.
No API key, no proxy, no login, no scraping.

## Pricing note

Billed per **search**, not per filing returned — one charge whether the
search returns 1 filing or 100.

## Related products

- [Insider Trading Alert](https://github.com/timmKal01/insider-trading-alert) — executive personal stock buy/sell signals
- [Federal Contract Award Tracker](https://github.com/timmKal01/federal-contract-award-tracker) — who just won government contracts
