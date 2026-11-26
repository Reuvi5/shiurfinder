# Progress

What's built and what's left: every requirement in the SRS, plus the work the
design doc adds that isn't a single requirement. Update the row in the same PR
that changes it.

**Done** = everything in the SRS and design doc works. **Partly** = some works;
"Notes" says what doesn't. **Not started** = nothing yet.

## Summary

- **Must (18):** 11 partly, 7 not started.
- **Should (5):** 1 partly, 4 not started.
- **Sign-in pages are built (FR-2).** Signing in needs a verified email; until
  Amazon SES is set up, the link is in the server console. Save, Follow and
  Report (FR-1, FR-9, FR-10) can now send guests to `/sign-in?redirect=...`.

Update these counts when a row's status changes.

## Functional requirements

| FR    | What                                   | Priority | Status      | Where to see it                              | Notes                                                                                                                                     |
| ----- | -------------------------------------- | -------- | ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1  | Browse without an account              | Must     | Partly      | Every page                                   | Save, Follow and Report are greyed out; they should ask a guest to sign in (needs FR-2)                                                   |
| FR-2  | Sign up and sign in                    | Must     | Partly      | `/sign-up`, `/sign-in`, Sign in on the map   | Emails go through Amazon SES, but SES isn't set up in AWS yet, so they're printed in the server console. Google sign-in only lets in test users until it's published                                  |
| FR-3  | Choose where distance is measured from | Must     | Partly      | `/`: location button and address search      | Walk and drive times ("5 min walk", Google Routes), saving a home address                                                                 |
| FR-4  | Account settings                       | Must     | Partly      | `/account` (click your name on the map)      | Alert choices are saved, but alerts aren't sent yet (FR-15); deleting will also need to remove the user's SNS topic once FR-15 makes them |
| FR-5  | Map home screen                        | Must     | Partly      | `/`                                          | On a phone, the panel sits above the map instead of sliding up over it; links to My Schedule, Recommended and Account                     |
| FR-6  | Featured tab                           | Must     | Partly      | `/`, Featured tab                            | "Newly posted" row of flyers, grouping by day, flyers                                                                                     |
| FR-7  | Weekly tab                             | Must     | Partly      | `/`, Weekly tab                              | The Today / All week choice                                                                                                               |
| FR-8  | Search and filters                     | Must     | Partly      | `/`: search box and Filters                  | Maggid shiur and shul filters (the search box finds them)                                                                                 |
| FR-9  | Shiur page                             | Must     | Partly      | Click any shiur, or `/shiur/:id`             | Save and Report (need FR-2), flyer                                                                                                        |
| FR-10 | Shul and maggid shiur pages            | Must     | Partly      | `/shul/:id`, `/maggid/:id`                   | Follow (needs FR-2), logo, photo, linked shiurim (FR-19)                                                                                  |
| FR-11 | Save to My Schedule                    | Must     | Not started |                                              |                                                                                                                                           |
| FR-12 | Follow                                 | Must     | Not started |                                              |                                                                                                                                           |
| FR-13 | Add to Google Calendar                 | Should   | Partly      | Shiur page: Google and Apple/Outlook buttons | Adding all saved shiurim at once (needs FR-11)                                                                                            |
| FR-14 | Recommendations                        | Should   | Not started |                                              |                                                                                                                                           |
| FR-15 | Reminders and alerts                   | Must     | Not started |                                              | Design doc: emails through AWS SNS, browser notifications through web-push, a job every minute for reminders                              |
| FR-16 | Report that a shiur isn't happening    | Should   | Not started |                                              |                                                                                                                                           |
| FR-17 | Register as a publisher                | Must     | Not started |                                              |                                                                                                                                           |
| FR-18 | Team and roles                         | Must     | Not started |                                              |                                                                                                                                           |
| FR-19 | Linked shiurim                         | Should   | Not started |                                              |                                                                                                                                           |
| FR-20 | Create a weekly or featured shiur      | Must     | Partly      | `/portal`                                    | Only the shul's team may post, and new shuls wait for a moderator (need FR-2, FR-17, FR-23); flyer upload; alerting followers (FR-15) |
| FR-21 | Change or cancel                       | Must     | Not started |                                              |                                                                                                                                           |
| FR-22 | Listings table                         | Should   | Not started |                                              |                                                                                                                                           |
| FR-23 | Verification and management            | Must     | Not started |                                              |                                                                                                                                           |

## Other work from the design doc

Things the design doc plans that aren't one FR.

| What                                                         | Status      | Notes                                                                    |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------ |
| Website refreshes its data every minute                      | Done        | Map, shiur page and publisher pages                                      |
| Change history (who changed a shiur, and when)               | Partly      | Written when a shiur is created; changes come with FR-21                 |
| Nightly job that keeps weekly shiurim' dates 8 weeks ahead   | Not started | Today a weekly shiur gets 8 weeks of dates once, when it's posted        |
| Role check on every change (shul team, delegate, moderator)  | Not started | `SignedInGuard` exists; who may change what comes with FR-17 and FR-18   |
| Image uploads to Amazon S3 (flyers, logos, photos)           | Not started | Needed by FR-6, FR-9, FR-10, FR-20                                       |
| Hosting on Render, with an uptime monitor and our own domain | Not started |                                                                          |
| Sentry error reports                                         | Not started |                                                                          |

## Non-functional requirements

These apply to every feature. Each feature PR checks the ones it touches.

| NFR   | What                                                               | Where it stands                                                                  |
| ----- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| NFR-1 | Map and side panel load within 6 seconds                           | Not measured yet                                                                 |
| NFR-2 | Search and filter counts update within 3 seconds                   | Not measured yet                                                                 |
| NFR-3 | Changes show within 3 minutes; alerts within 5, reminders within 1 | Changes show within a minute (the website refreshes). Alerts not built           |
| NFR-4 | Role checked on every change; only approved publishers show        | Unapproved ones are hidden everywhere, with tests. Role checks wait for accounts |
| NFR-5 | Location never stored; personal data private                       | Location is only sent with a search, never saved                                 |
| NFR-6 | Topics, languages and roles changeable without code                | Topics and languages are tables; new ones can be added from the portal           |
