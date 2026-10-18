# Enhancement Two: Algorithms and Data Structures

[← Back to Home](../)

**Artifact:** Travlr Getaways (CS 465: Full Stack Development I)  
**Enhancement:** Indexed search, filtering, sorting, and pagination for `GET /api/trips`  
**Course outcomes:** 3 (and supports 5)

[💻 View the enhanced code](https://github.com/WL2025-CS/CS499-Portfolio/tree/main/enhancement-two-algorithms) · [📂 Compare with the original](https://github.com/WL2025-CS/CS499-Portfolio/tree/main/original-cs465)

---

## The Artifact

The artifact is Travlr Getaways, a MEAN-stack travel booking app I built in CS 465: Full Stack Development in summer 2026. It has an Express/MongoDB REST API, a public website, and an Angular admin app. This enhancement focused on the trip listing endpoint, `GET /api/trips`.

## Why I Selected It and How It Was Improved

The original listing ran `Trip.find({})`, which scanned the entire collection and returned every trip on every request, an O(n) operation whose response grew with the data. I replaced it with server-side search, filtering, sorting, and pagination. A new query-builder module turns validated parameters into a MongoDB filter, sort, and page window.

I added B-tree indexes, ordering the compound index by the Equality → Sort → Range rule, so a filtered page reads only a slice of the index, roughly O(log n + k). I also fixed a hidden bug: prices were stored as strings, so "999" sorted above "1899". I added a numeric price field and migrated my existing data. Adding `_id` as a sort tie-breaker keeps paging stable, and a 50-item cap with strict input validation blocks oversized requests and NoSQL injection.

| | Before | After |
|---|---|---|
| Query | `Trip.find({})`, full scan | Indexed filter + sort + page window |
| Cost per request | O(n), every trip returned | About O(log n + k), one page returned |
| Price sorting | Text order ("999" > "1899") | Numeric order |
| Page size | Unlimited | Capped at 50 |
| Tests | 19 | 32, all passing |

The Angular admin gained a search panel and pager.

## Course Outcomes

I met my planned outcome of designing and evaluating a solution using algorithmic principles while managing trade-offs (**Outcome 3**). The main trade-offs were index cost versus query speed, and keeping the price display string at the cost of maintaining a second field. The input validation also supports the security outcome (**Outcome 5**). My outcome plan is unchanged.

## Reflection

I learned that efficiency depends on data structures and data representation, not just code. The query only became fast once the indexes matched its shape, and only became correct once prices were numbers. That string-price bug was my biggest challenge, because nothing failed; the results were simply in the wrong order. Changing the API's response format also broke the public page and the admin app, which taught me to trace every consumer before changing a contract. What surprised me most was that the original code had a sorting bug no one had noticed, because storing prices as text looked fine until prices had different numbers of digits.

---

[← Enhancement One](../enhancement-one-software-design/) · [Back to Home](../) · [Next: Enhancement Three →](../enhancement-three-databases/)
