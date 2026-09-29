# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths are strictly rejected (`allow read, write: if false;`).
2. **Identity Integrity**: Every created document (`collaborators`, `companies`, `sectors`, `interviews`, `admins`, `settings`) must have `ownerId == request.auth.uid`.
3. **Age Enforcement**: A `Collaborator` cannot be created or updated unless `age >= 18` and `age <= 120` and `acceptedTerms == true`.
4. **Path Variable Hardening**: All single-document target operations validate `isValidId(docId)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
5. **Strict Key & Size Boundaries**: All string fields have explicit `.size() <= MAX` constraints and `hasOnly()` allowlists to block shadow fields.
6. **Temporal Integrity**: `createdAt` and `updatedAt` use server timestamp `request.time` and `createdAt`/`ownerId` are immutable during updates.
7. **PII & List Query Protection**: List queries enforce `resource.data.ownerId == request.auth.uid || isAdmin()` without `get()`/`exists()` inside `allow list`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection**: Adding `"isSuperAdmin": true` to `/collaborators/{id}` -> Rejected by `hasOnly()`.
2. **Identity Spoofing**: Setting `"ownerId": "victim_uid"` when `request.auth.uid == "attacker_uid"` -> Rejected by `data.ownerId == request.auth.uid`.
3. **Underage Collaborator Creation**: Setting `"age": 16` in `/collaborators/{id}` -> Rejected by `data.age >= 18`.
4. **Terms Bypass**: Setting `"acceptedTerms": false` in `/collaborators/{id}` -> Rejected by `data.acceptedTerms == true`.
5. **Oversized Payload (Denial of Wallet)**: Sending a 10,000-char string in `q1DemandsAndPressure` -> Rejected by `.size() <= 4000`.
6. **ID Poisoning**: Creating document with ID containing spaces or special characters -> Rejected by `isValidId(id)`.
7. **Unverified Email Spoofing**: Claiming admin email with `email_verified == false` -> Rejected by `request.auth.token.email_verified == true`.
8. **Immutable Field Mutation**: Updating `ownerId` or `createdAt` on an existing interview -> Rejected by `incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`.
9. **Future/Past Forged Timestamp**: Providing forged client `createdAt` instead of `serverTimestamp()` (`request.time`) -> Rejected by `incoming().createdAt == request.time`.
10. **Unauthorized PII Read**: Authenticated non-owner reading another user's `/collaborators/{id}` document -> Rejected by `existing().ownerId == request.auth.uid || isAdmin()`.
11. **Unfiltered Collection Scraping**: Calling `list` on `/interviews` without filtering by `ownerId` as a non-admin -> Rejected by `allow list: if isSignedIn() && (resource.data.ownerId == request.auth.uid || isMasterAdminEmail())`.
12. **Privilege Escalation in `/admins`**: Non-admin attempting to create a document in `/admins/{id}` -> Rejected by `isAdmin()`.
