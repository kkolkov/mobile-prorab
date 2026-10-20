CREATE TABLE price_matrix (
    code VARCHAR(40) PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price_rub NUMERIC(14,2) NOT NULL CHECK (unit_price_rub > 0),
    rough_share NUMERIC(5,4) NOT NULL CHECK (rough_share >= 0),
    labor_share NUMERIC(5,4) NOT NULL CHECK (labor_share >= 0),
    source_note VARCHAR(500) NOT NULL,
    price_date DATE NOT NULL,
    CHECK (rough_share + labor_share <= 1)
);
-- Ten provisional package prices, NOT retailer quotations. Shares are model assumptions.
INSERT INTO price_matrix VALUES
('floor','Напольное покрытие с укладкой','м²',2200,0.10,0.30,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('wall','Отделка стен','м²',900,0.10,0.40,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('ceiling','Отделка потолка','м²',1100,0.10,0.40,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('preparation','Подготовка поверхности','м²',800,0.40,0.60,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('demolition','Демонтаж отделки','м²',400,0,1,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('electrical','Электрическая точка с монтажом','точка',3500,0.35,0.50,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('plumbing','Сантехническая точка с прибором','точка',18000,0.20,0.30,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('joinery','Базовый комплект мебели 3 пог. м','комплект',90000,0,0.15,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('equipment','Базовый прибор с подключением','шт.',30000,0,0.10,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20'),
('glazing','Новое остекление с монтажом','м²',12000,0.10,0.30,'Условная стартовая ставка MVP, не подтверждена рынком',DATE '2026-10-20');
ALTER TABLE projects ADD COLUMN estimate_details_json TEXT;
