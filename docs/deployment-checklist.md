# Kiddle deployment checklist

Launch with these five categories:

- `modern-celebrities`
- `east-asian-history`
- `east-asian-mythology`
- `western-history`
- `western-mythology`

## Before deployment

### Category and game support

- [x] Replace the single `CategoryId` with the five launch category IDs.
- [x] Load and filter Figures by category; remove Western History hard-coding from labels, sharing, and game setup.
- [x] Add a multi-select Game-pool picker for Quick and Infinite modes. Categories without reviewed Figures remain unavailable.
- [x] Seed Daily as `daily:<local-date>:<selected-category>` so the same category theme and puzzle appear for everyone each local date.
- [x] Key Daily progress and completed results by the selected daily Category; key Quick history and Infinite bests by the sorted Game-pool key.
- [ ] Verify that changing a Quick/Infinite Game pool cannot resume, overwrite, or share another pool's result.

### Content and data

- [ ] Gather and review at least 20 active Figures for at least two launch Categories; Quick Mode needs 20 distinct Figures in any selectable Game pool.
- [ ] Verify a mixed two-category pool generates cross-category comparisons and has no repeated Figure inside a Quick session.
- [ ] Keep one JSON file per category with the same Figure contract: approved child count, explanation, sources, tags, status, image URL, licence, attribution, and source URL.
- [ ] Run the data validator across all five category files.
- [ ] Confirm every active Figure has a non-tied possible matchup and that each category can produce the intended easy, medium, and hard mix.
- [ ] Establish a category-specific source rule for mythology: use a named tradition/source, never merge conflicting versions into one invented count.
- [ ] Review names, descriptors, transliteration, portrait licences, and sensitive family facts with particular care for East Asian and mythological Figures.
- [ ] Update the data-crawling guide with category file locations and mythology-source guidance.

### Local quality gate

- [ ] Play Daily, Quick, and Infinite in every category.
- [ ] Verify Daily refresh/resume and completed-device behavior for every category.
- [ ] Verify Infinite never pairs two previously revealed child counts when an unseen Figure remains.
- [ ] Test Infinite game-over modal, disabled/blocked local storage, keyboard-only controls, and a 320px viewport.
- [ ] Add the Methodology and Privacy pages.
- [ ] Add title, favicon, social metadata, and a static 404 page.
- [ ] Run `npm run validate-data`, `npm test`, and `npm run build` cleanly.

## Deployment

- [ ] Choose static hosting and connect the repository.
- [ ] Configure the build command as `npm run build` and publish `dist`.
- [ ] Set up pull-request checks for data validation, tests, and production build.
- [ ] Create preview deployments and a rollback path before the first public release.
- [ ] Connect the custom domain, HTTPS, and DNS redirects.
- [ ] Confirm that the production host permits the external portrait URLs or move portraits to controlled static storage.
- [ ] Set cache headers for hashed static assets and verify a fresh deployment invalidates the app shell correctly.

## After deployment

- [ ] Play each mode and category on the public URL from desktop and mobile browsers.
- [ ] Check same-date/same-category Daily consistency across two clean devices, plus local-midnight behavior.
- [ ] Check Daily resume and completion after browser restart on the same device.
- [ ] Verify share sheet, clipboard fallback, source links, portrait fallbacks, and external-image loading.
- [ ] Watch for broken sources, images, or data corrections; update the Figure record and deploy through the normal review flow.
- [ ] Collect qualitative playtester feedback on category clarity, matchup fairness, and the usefulness of sources.
- [ ] Review performance and errors using privacy-preserving tooling only if it becomes necessary.
