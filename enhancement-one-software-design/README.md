# Enhancement One: Software Design and Engineering

[← Back to Home](../)

**Artifact:** Travlr Getaways (CS 465: Full Stack Development I)  
**Enhancement:** Role-based access control and request validation  
**Course outcomes:** 4 and 5

[💻 View the enhanced code](https://github.com/WL2025-CS/CS499-Portfolio/tree/main/enhancement-one-software-design) · [📂 Compare with the original](https://github.com/WL2025-CS/CS499-Portfolio/tree/main/original-cs465)

---

## The Artifact

Travlr Getaways is a MEAN-stack travel booking application that I built in CS 465 (Full Stack Development I) between July and August 2026. It has an Express REST API backed by MongoDB, a server-rendered customer site, and an Angular admin app that signs in with JSON Web Tokens (JWT). Before this enhancement, any logged-in account could create, change, or delete trips, and the API accepted any request body.

## Why I Selected It and How It Improved

I chose it because I built every layer, and because I am aiming for secure full-stack development, where security is designed in rather than patched later. I added role-based access control: users have a role that defaults to "user," the role travels in the JWT, and an `authorize("admin")` middleware limits trip writes to administrators. I also added a central validation layer that rejects malformed trips, registrations, and logins with a 422 response before any controller runs.

Protected writes now pass through this chain, with authorization first so an unauthorized caller learns nothing about the data rules:

```
authenticate → authorize("admin") → validate(schema) → controller
```

Supporting changes include an admin-creation script, an Angular page that hides write controls from normal users and shows API errors, no connection string in the server log, and 19 automated tests. The middleware chain in `routes/index.js`, `authorize.js`, `schemas.js`, and the tests best show my skills.

## Course Outcomes

I planned Outcomes 4 and 5 and consider both met.

- **Outcome 4:** I used reusable middleware, schema-driven validation, and automated tests to deliver a clear benefit: only administrators change catalog data, and bad data never reaches the database.
- **Outcome 5:** I designed against specific attacks. A normal user calling the API directly gets a 403, self-registration as an administrator is rejected, NoSQL operator objects and path-like file names are rejected, and tokens with no role get no access.

My plan is unchanged: Outcome 3 will come from the search and indexing enhancement, and Outcomes 1 and 2 from the bookings and reporting enhancement.

## What I Learned and the Challenges I Faced

Hiding a button is not security; enforcement belongs on the server for every request, and my tests prove it. Older tokens had no role, so I defaulted it to "user," made the check fail closed, and logged in again for a new token, which showed me that a role change waits until the old token expires. The validation rules also had to match real data, since Angular sends ISO dates and returns extra fields such as `_id` when editing. In addition, the Angular app does not use zone.js, so the page did not redraw after server responses until I told Angular to check for changes.

One limit I would address next: passwords use PBKDF2 at 10,000 iterations, below current OWASP guidance. I left that unchanged because raising it would invalidate existing passwords without a migration.

---

[← Back to Home](../) · [Next: Enhancement Two →](../enhancement-two-algorithms/)
