# Best Practices for Merging Main Items and Influences in Neo4j

## Overview
This document outlines best practices and recommendations for handling merges between main items and influences in the influence graph. The goal is to ensure data integrity, avoid data loss, and provide a clear user experience when nodes serve as both main items and influences.

---

## 1. Data Model Principles
- All creative works are represented as `Item` nodes, regardless of whether they are main items or influences.
- Any `Item` node can serve as both a main item (with outgoing influences) and an influence (with incoming influences).
- All relevant fields (name, year, description, creator, etc.) should be present on every `Item` node.

---

## 2. Merge Scenarios & Recommendations

### A. Merging a Main Item with an Existing Influence
- **Problem:** The existing influence node may lack full main item data (e.g., description, creator).
- **Best Practice:**
  - When merging, update all missing or incomplete fields on the existing node with data from the new main item.
  - If the main item has a more complete or authoritative value for a field, prefer that value.
  - Ensure the node is now treated as a main item in the UI (e.g., appears in main item lists, can have outgoing influences).

### B. Merging an Influence with an Existing Main Item
- **Problem:** The same node serves as both a main item and an influence, which is valid but may be confusing.
- **Best Practice:**
  - Create the `INFLUENCES` relationship as usual.
  - Do not overwrite main item fields unless explicitly intended.
  - Avoid creating duplicate `INFLUENCES` relationships.
  - In the UI, clearly indicate when a node is both a main item and an influence.

---

## 3. Field Update Logic
- When merging, use the following logic for each field:
  - If the existing node is missing a field or has a placeholder value, update it with the new value.
  - If both nodes have values, prefer the more complete or authoritative value (e.g., longer description, verified creator).
  - Log or track all field updates for auditability.

---

## 4. UI/UX Recommendations
- Clearly display all roles a node plays (main item, influence, or both).
- When a merge occurs, show a summary of what was updated or merged.
- Warn users if merging may result in data loss or ambiguity.
- Provide a way to review and edit merged node details after the operation.

---

## 5. Duplicate Relationship Prevention
- Before creating a new `INFLUENCES` relationship, check if one already exists between the same nodes with the same category/scope.
- If a duplicate exists, update its properties if needed instead of creating a new one.

---

## 6. Testing & Validation
- Add tests to ensure that merging:
  - Never results in loss of main item or influence data.
  - Always updates missing fields as expected.
  - Never creates duplicate relationships.
- Regularly review merged nodes for completeness and correctness.

---

## 7. Future Enhancements
- Consider versioning or tracking merge history for each node.
- Allow users to manually resolve field conflicts during merge (e.g., choose which description to keep).
- Provide admin tools to audit and clean up ambiguous or incomplete merges.

---

## Summary Table
| Scenario                                      | Best Practice Summary                                 |
|-----------------------------------------------|------------------------------------------------------|
| Main item merged with existing influence      | Update all missing fields, promote node as main item  |
| Influence merged with existing main item      | Avoid duplicates, clarify roles in UI                 |

---

*Last updated: 2024-06-13* 