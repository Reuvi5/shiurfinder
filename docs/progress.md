# Progress

Every requirement in the SRS, whether it's built, and who owns it. Update your
row in the same PR that changes it. Owners of built FRs come from the Git
history; blank means nobody has taken it yet.

**Done** = everything in the SRS works. **Partly** = some works; "Missing"
says what doesn't. **Not started** = nothing yet.

## Functional requirements

| FR | What | Priority | Status | Owner | Where to see it | Missing |
| --- | --- | --- | --- | --- | --- | --- |
| FR-1 | Browse without an account | Must | Partly | | Every page | Save, Follow and Report are greyed out; they should ask a guest to sign in (needs FR-2) |
| FR-2 | Sign up and sign in | Must | Partly | Oriel | No page yet (`/auth/...` routes) | Sign-in pages, verification email, password reset, Google sign-in (Should) |
| FR-3 | Choose where distance is measured from | Must | Partly | Mattan | `/`: location button and address search | Walk and drive times ("5 min walk"), saving a home address |
| FR-4 | Account settings | Must | Not started | | | |
| FR-5 | Map home screen | Must | Partly | Reuvi | `/` | On a phone, the panel sits above the map instead of sliding up over it |
| FR-6 | Featured tab | Must | Partly | Reuvi | `/`, Featured tab | "Newly posted" row of flyers, grouping by day, flyers |
| FR-7 | Weekly tab | Must | Partly | Reuvi | `/`, Weekly tab | The Today / All week choice |
| FR-8 | Search and filters | Must | Partly | Mattan | `/`: search box and Filters | Maggid shiur and shul filters (the search box finds them) |
| FR-9 | Shiur page | Must | Partly | Mattan | Click any shiur, or `/shiur/:id` | Save and Report (need FR-2), flyer |
| FR-10 | Shul and maggid shiur pages | Must | Partly | Oriel | `/shul/:id`, `/maggid/:id` | Follow (needs FR-2), logo, photo, linked shiurim (FR-19) |
| FR-11 | Save to My Schedule | Must | Not started | | | |
| FR-12 | Follow | Must | Not started | | | |
| FR-13 | Add to Google Calendar | Should | Partly | Mattan | Shiur page: Google and Apple/Outlook buttons | Adding all saved shiurim at once (needs FR-11) |
| FR-14 | Recommendations | Should | Not started | | | |
| FR-15 | Reminders and alerts | Must | Not started | | | |
| FR-16 | Report that a shiur isn't happening | Should | Not started | | | |
| FR-17 | Register as a publisher | Must | Not started | | | |
| FR-18 | Team and roles | Must | Not started | | | |
| FR-19 | Linked shiurim | Should | Not started | | | |
| FR-20 | Create a weekly or featured shiur | Must | Partly | Reuvi | `/portal` | Only the shul's team may post, and new shuls wait for a moderator (need FR-2, FR-17, FR-23) |
| FR-21 | Change or cancel | Must | Not started | | | |
| FR-22 | Listings table | Should | Not started | | | |
| FR-23 | Verification and management | Must | Not started | | | |

## Non-functional requirements

These apply to every feature, so they have no owner. Each feature PR checks the
ones it touches.

| NFR | What | Where it stands |
| --- | --- | --- |
| NFR-1 | Map and side panel load within 6 seconds | Not measured yet |
| NFR-2 | Search and filter counts update within 3 seconds | Not measured yet |
| NFR-3 | Changes show within 3 minutes; alerts within 5, reminders within 1 | Changes show right away. Alerts not built |
| NFR-4 | Role checked on every change; only approved publishers show | Unapproved ones are hidden everywhere, with tests. Role checks wait for accounts |
| NFR-5 | Location never stored; personal data private | Location is only sent with a search, never saved |
| NFR-6 | Topics, languages and roles changeable without code | Topics and languages are tables; new ones can be added from the portal |
