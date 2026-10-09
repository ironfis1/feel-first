# Asset sources

The catalog is about 600 works, split 50/50 between two lanes (spec Section 2). Only public-domain or open-access works are used. Nothing comes from art.com, and no licensed pop-culture material is used.

**Verify before you build.** Museum APIs change. Before writing an ingest script for a source, read that source's current API documentation and confirm the endpoints, rate limits and license fields described here. If anything differs, note it in `docs/decisions.md` and tell Scott.

## Fine-art lane: about 300 works

About 100 works each from three museums. If a museum yields fewer than 100 usable works, make up the shortfall from the other two. The Cleveland Museum of Art comes in only if fine art falls below 270 works in total [Gap G21]. Smithsonian is not used.

### Art Institute of Chicago

- API: `https://api.artic.edu/api/v1/`. The artworks search endpoint supports filtering on `is_public_domain`.
- Images are served through IIIF: `https://www.artic.edu/iiif/2/{image_id}/full/{width},/0/default.jpg`.
- Use public-domain works only. Record `is_public_domain` and the credit line in the `license` field.
- Their API documentation asks for a descriptive User-Agent identifying the requester. Use one.

### The Metropolitan Museum of Art

- API: `https://collectionapi.metmuseum.org/public/collection/v1/`. Use the search endpoint with `hasImages=true`, then the objects endpoint for each id.
- Use only objects where `isPublicDomain` is true. Use `primaryImage` for the full image and `primaryImageSmall` for the thumbnail.
- Respect their published request-rate limit. Throttle the script.

### Rijksmuseum

- The Rijksmuseum has changed its data services in recent years. **Read the current documentation first** and use whichever official API is current.
- Use only works marked public domain. Record the license string from the source.

## Poster lane: about 300 works

### NASA JPL "Visions of the Future"

- Include every available poster in the series. It is a small set.
- Source: JPL's own gallery page for the series. Confirm the current URL and download location.
- **License:** JPL usage terms apply. The prototype is treated as non-commercial because nothing can be bought [Res #18]. Any other use needs a licensing check. Record the JPL credit and terms in the `license` field.

### Library of Congress WPA posters

- Collection: Work Projects Administration Poster Collection at `https://www.loc.gov/collections/works-progress-administration-posters/`. Append `?fo=json` for JSON results.
- The collection is about 900 posters. Fill the poster lane's remainder from it.
- Rights: most items are marked "no known restrictions". Check each item's rights statement and skip any that say otherwise.
- **Selection note (D-002):** WPA posters cluster around national parks, health, theater and travel. Picking across subjects should help the lane cover the whole mood field. Check the J1 distribution per lane and show it to Scott before accepting the set.

## Rules for every source

**Required by the spec:**

1. **Credits are mandatory.** Every work records title, artist, date, source institution, source id and license. The Piece screen shows title, artist, date, source institution and license [Gap G2, Gap G33].
2. **Public domain or open access only.** No art.com images, and no licensed pop-culture material [RB40, RB42].

**Curation rules (adopted by Scott, D-002):**

3. Thumbnails may be resized, never cropped to fill a box.
4. Skip images under 1,200px on the long edge, and heavily damaged items.
5. Skip works with graphic violence, nudity, or imagery that would read badly in a CEO demo, such as racist caricature in older material. Log every skip with a reason so Scott can review the list.

**Process (how, not what):** each source gets its own script in `scripts/ingest/`, writing `data/raw/{source}.json`. A merge step produces the metadata half of `data/catalog.json`, and J1 adds the emotional fields later.

## Where images are served from (D-001)

Hybrid. Resized thumbnails are copied into the app, under `public/thumbs/`, so the Room loads instantly. Full-size images on the Piece and Wall screens are linked from the source institutions. Ingest scripts download and resize thumbnails at a width that serves the Room grid sharply on retina screens. Record each thumbnail's local path in `thumbUrl` and the institution's full-size URL in `imageUrl`.
