# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Refer to `../AGENTS.md` for full Versioning Policy and Code Commenting Standards.

# Code Commenting Standards

Maintain well-commented code across the entire codebase. Both "what" and "why" comments are integral:

- **"What" Comments (Execution & Steps):** Clearly describe what each function or logical block does step-by-step. Label multi-stage pipelines (e.g. `// Step 1: ...`, `// Step 2: ...`), explain variable transformations, regexes, math truncation, sorting comparator directions, and data sanitization so anyone skimming the code can immediately follow the execution flow without mentally tracing it.
- **"Why" Comments (Architecture & Rationale):** Explicitly explain non-obvious design decisions, architectural trade-offs, edge-case workarounds, and business logic requirements (e.g. `// WHY CAMPUS-WIDE INCLUSION: ...`, `// WHY SORTING BY DATE: ...`).
- **JSDoc Specifications:** Include JSDoc blocks above exported utility functions, hooks, and types detailing parameter expectations, return values, interval boundary rules, and timezone behaviors.
- **Preserve Existing Documentation:** Never strip or discard existing comments or docstrings unless explicitly instructed or replacing obsolete code.

# Backend Integration & Server-Authoritative Timestamps

When implementing or integrating the backend service (`server/` or Supabase):
- **Server-Authoritative Creation Timestamps:** When publishing posts (`POST /api/posts`), the post creation timestamp (`postedAt` ISO 8601 string and `createdAt` epoch milliseconds) **must** be generated and assigned by the server (e.g. database `DEFAULT NOW()` or server clock), never accepted from the client request body.
- **Clock Manipulation Immunity:** Relying on the server's authoritative clock prevents users from setting their personal device clocks forward or backward to artificially bump posts to the top of the feed or bypass announcement schedules.


