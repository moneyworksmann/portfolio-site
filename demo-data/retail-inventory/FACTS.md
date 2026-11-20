# Retail Inventory Copilot — demo facts

**What it does.** A small-retailer inventory and procurement prototype: products, stock movements, suppliers, purchase orders with owner approval and partial receiving, plus rule-based reorder suggestions. Its "assistant" answers low-stock and inventory-value questions deterministically — it is not an LLM.

**Stack.** Python, FastAPI, SQLite (raw SQL), Starlette sessions, PBKDF2 password hashing, single static HTML/JS front end, pytest.

## Facts (from code and this run)
- Money is stored as integer paise, never floats.
- Reorder rule (`rule_based_v1`): flag a SKU when on-hand ≤ reorder point; suggest ordering up to 2 × reorder point (e.g. Cotton Socks 3-Pack: 10 on hand, reorder point 30 → suggest 50).
- Seeded shop: 5 SKUs, 116 units, book-cost value ₹20,970.00, 3 SKUs at/below reorder point, 2 suppliers.
- Separation of duties enforced in code: only an owner can approve a PO, and not one they created; a manager's approve attempt returned 403 in the walk-through. Receipts can't exceed the ordered quantity (409), and staff can't adjust stock (403).
- Every stock change writes an append-only movement row with the resulting balance; actions are audit-logged. Test suite: 3 passed (scratch run).

## How the sample was produced
`seed.py` was run against a temporary SQLite file in a scratch copy (source untouched). The README's demo flow was then driven through the real API with FastAPI's TestClient: read products/suppliers/recommendations/assistant answers, manager raised PO #1 from the three suggestions, owner approved it, staff received half of the first line, and an over-receipt and a staff stock adjustment were attempted (both refused). Then PO #2 was raised and rejected by the owner. `afterWalkthrough` holds the resulting state, movements and audit trail.

## Must be labelled
- **Seed data:** the shop, SKUs and suppliers are the fictional demo data in `seed.py` (supplier emails use `.example` domains).
- **Generated during export:** both purchase orders and all receipt/audit rows were created by the scripted walk-through, not by a real store.
- Demo login passwords are deliberately excluded from `data.json`.
