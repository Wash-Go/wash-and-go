-- Global order-code sequence (finding C1: created in a migration, never via
-- runtime DDL). Order codes are minted as WG-<PH-year>-<6-digit zero-padded>
-- by OrdersRepository.createOrder, calling nextval() INSIDE the create tx so a
-- rolled-back booking never burns... well, nextval is non-transactional by
-- design (gaps are acceptable for an opaque order code — uniqueness is what
-- matters, not contiguity).
CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1;
