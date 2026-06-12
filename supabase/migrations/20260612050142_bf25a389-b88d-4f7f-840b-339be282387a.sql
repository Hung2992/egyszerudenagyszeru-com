INSERT INTO public.coupons (code, description, discount_percent, is_active, coupon_type, single_use, notes)
VALUES ('WELCOME20', 'Nyitó akció - 20% kedvezmény regisztrált vásárlóknak', 20, true, 'single_use', true, 'Egyszer felhasználható kupon a már regisztrált vásárlóknak')
ON CONFLICT (code) DO UPDATE SET is_active = true, discount_percent = 20, single_use = true, coupon_type = 'single_use';