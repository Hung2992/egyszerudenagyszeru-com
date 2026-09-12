// Egyszerű, webshoponként (slug) külön tárolt vásárlói kosár a partner storefrontokhoz.
import { useCallback, useEffect, useState } from "react";

export type BrandCartItem = {
  product_id: string;
  title: string;
  price_huf: number;
  qty: number;
  image?: string | null;
  physical: boolean;
};

const key = (slug: string) => `brand-cart:${slug}`;
const EVENT = "brand-cart-changed";

export const readBrandCart = (slug: string): BrandCartItem[] => {
  try {
    const raw = localStorage.getItem(key(slug));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.product_id && i.qty > 0) : [];
  } catch {
    return [];
  }
};

export const writeBrandCart = (slug: string, items: BrandCartItem[]) => {
  try {
    localStorage.setItem(key(slug), JSON.stringify(items));
  } catch { /* tárhely tele */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { slug } }));
};

export const addToBrandCart = (slug: string, item: BrandCartItem) => {
  const items = readBrandCart(slug);
  const existing = items.find((i) => i.product_id === item.product_id);
  if (existing) existing.qty = Math.min(20, existing.qty + item.qty);
  else items.push({ ...item, qty: Math.min(20, Math.max(1, item.qty)) });
  writeBrandCart(slug, items);
};

export const setBrandCartQty = (slug: string, productId: string, qty: number) => {
  const items = readBrandCart(slug)
    .map((i) => (i.product_id === productId ? { ...i, qty: Math.min(20, Math.max(0, qty)) } : i))
    .filter((i) => i.qty > 0);
  writeBrandCart(slug, items);
};

export const clearBrandCart = (slug: string) => writeBrandCart(slug, []);

export const useBrandCart = (slug: string | null | undefined) => {
  const [items, setItems] = useState<BrandCartItem[]>([]);

  const refresh = useCallback(() => {
    setItems(slug ? readBrandCart(slug) : []);
  }, [slug]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price_huf, 0);
  return { items, count, subtotal, refresh };
};
