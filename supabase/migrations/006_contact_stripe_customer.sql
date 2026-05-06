-- 006_contact_stripe_customer.sql
-- Stores the Stripe Customer ID for each portal contact so we can save their
-- card after first checkout and re-use it for one-click subsequent payments.
--
-- Single-tenant: one customer ID per contact. When TerraFlow goes multi-tenant
-- and the same person could be a contact for multiple contractors, this needs
-- to become a join table (contact_id, connected_account_id, stripe_customer_id).

alter table contacts
  add column if not exists stripe_customer_id text;

create index if not exists idx_contacts_stripe_customer
  on contacts (stripe_customer_id);
