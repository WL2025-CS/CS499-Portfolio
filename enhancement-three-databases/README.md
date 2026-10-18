# Enhancement Three: Databases

[← Back to Home](../)

**Artifact:** Travlr Getaways (CS 465: Full Stack Development I)  
**Enhancement:** Bookings collection, query-matched indexes, and an aggregation-based revenue report  
**Course outcomes:** 1, 4, and 5

[💻 View the enhanced code](https://github.com/WL2025-CS/CS499-Portfolio/tree/main/enhancement-three-databases) · [📂 Compare with the original](https://github.com/WL2025-CS/CS499-Portfolio/tree/main/original-cs465)

---

## Artifact Description

Travlr Getaways is a full-stack MEAN travel booking app I built in CS 465 in summer 2026. Before this enhancement, its database stored only trips and users.

## Justification for Inclusion

I chose it because its database layer had clear gaps: no booking data, prices stored as text, and a broken seed script. I made these changes:

- **Booking collection** that links users and trips, stores prices as integer cents, and saves a snapshot of each trip's price and resort at booking time.
- **Indexes matched to real queries**, including a partial unique index that blocks duplicate active bookings.
- **Revenue report** built with a single aggregation pipeline (`$match`, `$facet`, `$group`, `$lookup`).
- **Data integrity:** trips that have confirmed bookings can no longer be deleted.
- **Fixed seed script** and an **admin report page with CSV export**.

Tests grew from 19 to 44, all passing.

## Course Outcomes

- **Outcome 4:** database design and aggregation.
- **Outcome 5:** the server, not the client, sets prices and booking ownership.
- **Outcome 1:** as planned, the report gives managers shareable data for decisions.

My outcome-coverage plan has no changes.

## Reflection

I learned that database design is about trade-offs, such as duplicating trip data to keep historical revenue accurate, and that the database itself should enforce key rules. My main challenge was accidentally deleting functions while editing the trip controller. I found the cause by loading the routes directly in Node. I also learned to test an aggregation pipeline on sample data without a live database.

---

[← Enhancement Two](../enhancement-two-algorithms/) · [Back to Home](../)
