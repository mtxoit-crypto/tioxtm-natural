UPDATE public.products SET sort_order = v.ord, jar_color = '#F4F3F0'
FROM (VALUES ('ginseng',0),('tribulus-terrestris',1),('feno-grego',2),('maca-peruana-negra',3),('marapuama',4),('mucuna-preta',5),('catuaba',6)) AS v(slug, ord)
WHERE products.slug = v.slug;

UPDATE public.products SET sort_order = sort_order + 20 WHERE slug IN ('magnesio-quelato','oleo-de-alho','zinco-quelato','vitamina-b12','magnesio-inositol-melatonina','picolinato-de-cromo');