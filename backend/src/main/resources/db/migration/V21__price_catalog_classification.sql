ALTER TABLE price_matrix ADD COLUMN category varchar(32);
ALTER TABLE price_matrix ADD COLUMN subcategory varchar(32);
ALTER TABLE price_matrix ADD COLUMN deleted boolean NOT NULL DEFAULT false;
