export interface ShopProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  sizes: string[];
  colors: string[];
  image_url: string | null;
  is_active: boolean;
  stock: number;
  created_at: string;
  launch_status?: string;
  launch_date?: string | null;
  preorder_enabled?: boolean;
  preorder_deposit_percent?: number;
  preorder_limit?: number | null;
  teaser_description?: string | null;
  teaser_image_url?: string | null;
  is_sneak_peek?: boolean;
  material?: string | null;
  care_instructions?: string | null;
  origin_country?: string | null;
  manufacturer?: string | null;
  weight_grams?: number | null;
}

export const createEmptyProductDraft = (): Partial<ShopProduct> => ({
  name: "",
  description: "",
  price: 0,
  original_price: null,
  category: "Egyéb",
  sizes: [],
  colors: [],
  image_url: null,
  is_active: true,
  stock: 0,
  launch_status: "live",
  launch_date: null,
  preorder_enabled: false,
  preorder_deposit_percent: 20,
  preorder_limit: null,
  teaser_description: null,
  teaser_image_url: null,
  is_sneak_peek: false,
  material: "",
  care_instructions: "",
  origin_country: "",
  manufacturer: "",
  weight_grams: null,
});

export const CATEGORIES = ["Pólók", "Pulóverek", "Nadrágok", "Dzsekik", "Kiegészítők", "Cipők", "Egyéb"];
