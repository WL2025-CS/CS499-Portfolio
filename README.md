# CS499-Portfolio

## Professional Self-Assessment
Completing the Computer Science program has taken me from writing isolated scripts to designing, securing, testing, and documenting complete applications. This ePortfolio shows that growth and reflects my goal of becoming a full-stack engineer who treats security, maintainability, and clear communication as core parts of the job.

### Collaborating in a Team Environment
In CS 250: Software Development Lifecycle, I worked through an Agile/Scrum process from the perspectives of the product owner, Scrum master, developer, and tester, and learned that good software depends on shared understanding. In this capstone I used version control the way a team would, with clear commit messages, secrets excluded, and documentation that lets another developer set up and test the project on their own.

### Communicating with Stakeholders
I learned to adapt my communication to the audience. My code review video explains the application and my enhancement plan for a manager-level audience, and my databases enhancement produces a revenue-by-resort report that a business stakeholder can act on without reading code.

### Data Structures and Algorithms
CS 300: Data Structures and Algorithms taught me to compare structures such as vectors, hash tables, and binary search trees by time complexity. In this portfolio I replaced a full collection scan with indexed filtering, sorting, and pagination, capped page size at 50, and fixed a bug where prices stored as strings sorted incorrectly ("999" above "1899").

### Software Engineering and Databases
Coursework in full-stack development, mobile programming, and database design taught me to build applications in clear layers. I extended a MEAN-stack application with a reusable middleware chain (`authenticate → authorize → validate → controller`), added a Booking collection linking users and trips, built a MongoDB aggregation pipeline for reporting, and covered the changes with automated tests.

### Security
The program taught me to think like an attacker during design. My enhancements require an authenticated administrator for all trip changes, validate every request, block NoSQL injection attempts such as `?resort[$ne]=x`, and keep secrets out of version control.

### How the Artifacts Fit Together
This portfolio enhances one artifact, the Travlr Getaways full-stack application from CS 465: Full Stack Development, in three directions:

1. **Software Design and Engineering:** role-based access control and request validation.
2. **Algorithms and Data Structures:** indexed search, sorting, and pagination.
3. **Databases:** a bookings model and a revenue report built with aggregation.

Together they show how security protects the data, efficient algorithms make it usable at scale, and a well-designed database makes it valuable to the business. The code review, original artifact, and each enhancement with its narrative follow.

## Code Review
In this video I walk through the original CS 465 artifact, analyze areas for improvement, and explain my planned enhancements in software design, algorithms and data structures, and databases.

[▶ Watch the Code Review Video](https://drive.google.com/file/d/1gI0H9gKeGly2rekHQiZjhZ_VJHA9ugA6/view?usp=drive_link)

## Original Artifact
- [CS 465 Original Project](original-cs465/)

## Enhancements
- [Enhancement One: Software Design & Engineering](enhancement-one-software-design/)
- [Enhancement Two: Algorithms & Data Structures](enhancement-two-algorithms/)
- [Enhancement Three: Databases](enhancement-three-databases/)
