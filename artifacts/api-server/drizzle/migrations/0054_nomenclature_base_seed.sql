-- Migration: базовый шаблон номенклатуры (S0). Idempotent по slug.
-- Категории верхнего уровня + стартовый набор товаров. Расширяется вручную.

-- Категории (parent_id = NULL — верхний уровень)
INSERT INTO global_product_categories (slug, name_ru, sort_order)
SELECT v.slug, v.name_ru, v.sort_order
FROM (VALUES
  ('concrete-mortar', 'Бетон и растворы', 10),
  ('metal-rolled',    'Металлопрокат',    20),
  ('brick-block',     'Кирпич и блоки',   30),
  ('bulk',            'Сыпучие',          40),
  ('fasteners',       'Крепёж',           50),
  ('electrical',      'Электрика',        60),
  ('plumbing',        'Сантехника',       70)
) AS v(slug, name_ru, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM global_product_categories c WHERE c.slug = v.slug
);

-- Товары. category_id резолвится по slug категории.
INSERT INTO global_products (category_id, canonical_name, slug, unit_default, status)
SELECT c.id, v.canonical_name, v.slug, v.unit_default, 'active'
FROM (VALUES
  ('concrete-mortar', 'Бетон М300',        'concrete-m300',   'м3'),
  ('concrete-mortar', 'Раствор цементный', 'mortar-cement',   'м3'),
  ('metal-rolled',    'Арматура А500 12мм','rebar-a500-12',   'т'),
  ('metal-rolled',    'Уголок 50x50',      'angle-50x50',     'м'),
  ('brick-block',     'Кирпич рядовой',    'brick-ordinary',  'шт'),
  ('brick-block',     'Газоблок D500',     'gasblock-d500',   'м3'),
  ('bulk',            'Цемент М500',       'cement-m500',     'т'),
  ('bulk',            'Песок речной',      'pesok-rechnoy',   'м3'),
  ('bulk',            'Щебень 5-20',       'gravel-5-20',     'м3'),
  ('fasteners',       'Саморез 3.5x35',    'screw-35x35',     'шт'),
  ('electrical',      'Кабель ВВГ 3x2.5',  'cable-vvg-3x2.5', 'м'),
  ('plumbing',        'Труба PPR 20',      'pipe-ppr-20',     'м')
) AS v(cat_slug, canonical_name, slug, unit_default)
JOIN global_product_categories c ON c.slug = v.cat_slug
WHERE NOT EXISTS (
  SELECT 1 FROM global_products p WHERE p.slug = v.slug
);
