import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import {
  ShoppingCart, Search, X, Plus, SlidersHorizontal, ChevronDown, Heart, Star, BellRing, GitCompare, MessageCircle, Clock, Share2, Copy, Check, Bell, UserPlus, UserMinus, Ruler, PackagePlus
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SizeQuiz from "@/components/SizeQuiz";
import ProductWaitlist from "@/components/ProductWaitlist";
import PersonalizedOffers from "@/components/PersonalizedOffers";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  sizes: string[] | null;
  colors: string[] | null;
  image_url: string | null;
  is_active: boolean;
  stock: number;
}

const CATEGORIES = ["Összes", "Pólók", "Pulóverek", "Nadrágok", "Dzsekik", "Kiegészítők", "Cipők"];

const DEMO_PRODUCTS: Product[] = [];

const SORT_OPTIONS = [
  { label: "Legújabb", value: "newest" },
  { label: "Ár: alacsony → magas", value: "price_asc" },
  { label: "Ár: magas → alacsony", value: "price_desc" },
  { label: "Akciós", value: "sale" },
];

const Shop = () => {
  const navigate = useNavigate();
  const { addItem, totalItems, setIsCartOpen } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Összes");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [showSort, setShowSort] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [alertIds, setAlertIds] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [reviewImagesMap, setReviewImagesMap] = useState<Record<string, string[]>>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any[]>>({});
  const [questionText, setQuestionText] = useState("");
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [answerQuestionId, setAnswerQuestionId] = useState<string | null>(null);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [priceAlertIds, setPriceAlertIds] = useState<Set<string>>(new Set());
  const [priceAlertTarget, setPriceAlertTarget] = useState("");
  const [followedBrands, setFollowedBrands] = useState<Set<string>>(new Set());
  const [showSizeQuiz, setShowSizeQuiz] = useState(false);
  const [preorderIds, setPreorderIds] = useState<Set<string>>(new Set());
  const [preorderSubmitting, setPreorderSubmitting] = useState(false);
  const [dbRecommendations, setDbRecommendations] = useState<Product[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const [wlRes, alertRes, priceAlertRes, brandsRes, preorderRes] = await Promise.all([
          supabase.from("wishlists").select("product_id").eq("user_id", session.user.id),
          (supabase.from("product_alerts" as any) as any).select("product_id").eq("user_id", session.user.id).eq("alert_type", "back_in_stock"),
          (supabase.from("price_alerts" as any) as any).select("product_id").eq("user_id", session.user.id).eq("is_active", true),
          (supabase.from("followed_brands" as any) as any).select("brand_name").eq("user_id", session.user.id),
          (supabase.from("preorders" as any) as any).select("product_id").eq("user_id", session.user.id).eq("status", "pending"),
        ]);
        if (wlRes.data) setWishlistIds(new Set(wlRes.data.map((w: any) => w.product_id)));
        if (alertRes.data) setAlertIds(new Set(alertRes.data.map((a: any) => a.product_id)));
        if (priceAlertRes.data) setPriceAlertIds(new Set(priceAlertRes.data.map((a: any) => a.product_id)));
        if (brandsRes.data) setFollowedBrands(new Set(brandsRes.data.map((b: any) => b.brand_name)));
        if (preorderRes.data) setPreorderIds(new Set(preorderRes.data.map((p: any) => p.product_id)));
      }

      const { data } = await supabase
        .from("shop_products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const dbProducts = (data || []) as any as Product[];
      if (dbProducts.length >= 6) {
        setProducts(dbProducts);
      } else {
        const demoIds = new Set(DEMO_PRODUCTS.map(d => d.id));
        const combined = [...dbProducts.filter(p => !demoIds.has(p.id)), ...DEMO_PRODUCTS];
        setProducts(combined);
      }
      setLoading(false);
    };
    init();
  }, []);

  const filtered = products
    .filter(p => {
      const matchCat = selectedCategory === "Összes" || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price_asc": return a.price - b.price;
        case "price_desc": return b.price - a.price;
        case "sale": {
          const aDiscount = a.original_price ? (1 - a.price / a.original_price) : 0;
          const bDiscount = b.original_price ? (1 - b.price / b.original_price) : 0;
          return bDiscount - aDiscount;
        }
        default: return 0;
      }
    });

  const handleAddToCart = (product: Product) => {
    const sizes = product.sizes || [];
    const colors = product.colors || [];

    if ((sizes.length > 0 || colors.length > 0) && !selectedProduct) {
      setSelectedProduct(product);
      setSelectedSize(sizes[0] || "");
      setSelectedColor(colors[0] || "");
      return;
    }

    const size = selectedProduct ? selectedSize : (sizes[0] || "");
    const color = selectedProduct ? selectedColor : (colors[0] || "");

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      size,
      color,
    });

    toast({ title: "Kosárba téve! ✓", description: product.name });
    setSelectedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
  };
  const toggleWishlist = async (productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!userId) { navigate("/auth"); return; }
    if (wishlistIds.has(productId)) {
      await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId);
      setWishlistIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
      toast({ title: "Eltávolítva a kedvencekből" });
    } else {
      await supabase.from("wishlists").insert({ user_id: userId, product_id: productId });
      setWishlistIds(prev => new Set(prev).add(productId));
      toast({ title: "Hozzáadva a kedvencekhez ❤️" });
    }
  };

  const toggleAlert = async (productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!userId) { navigate("/auth"); return; }
    if (alertIds.has(productId)) {
      await (supabase.from("product_alerts" as any) as any).delete().eq("user_id", userId).eq("product_id", productId);
      setAlertIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
      toast({ title: "Értesítő eltávolítva" });
    } else {
      await (supabase.from("product_alerts" as any) as any).insert({ user_id: userId, product_id: productId, alert_type: "back_in_stock" });
      setAlertIds(prev => new Set(prev).add(productId));
      toast({ title: "Értesítünk, ha újra elérhető! 🔔" });
    }
  };

  const toggleCompare = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (compareList.find(p => p.id === product.id)) {
      setCompareList(prev => prev.filter(p => p.id !== product.id));
    } else {
      if (compareList.length >= 4) {
        toast({ title: "Maximum 4 terméket hasonlíthatsz össze", variant: "destructive" });
        return;
      }
      setCompareList(prev => [...prev, product]);
    }
  };

  const fetchReviews = async (productId: string) => {
    const { data } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });
    setReviews(data || []);

    // Fetch review images
    if (data && data.length > 0) {
      const reviewIds = data.map((r: any) => r.id);
      const { data: imgs } = await (supabase.from("review_images" as any) as any)
        .select("review_id, image_url")
        .in("review_id", reviewIds)
        .order("sort_order", { ascending: true });
      const map: Record<string, string[]> = {};
      (imgs || []).forEach((img: any) => {
        if (!map[img.review_id]) map[img.review_id] = [];
        map[img.review_id].push(img.image_url);
      });
      setReviewImagesMap(map);
    } else {
      setReviewImagesMap({});
    }
  };

  const fetchQuestions = async (productId: string) => {
    const { data } = await (supabase.from("product_questions" as any) as any)
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(20);
    const qs = data || [];
    setQuestions(qs);

    // Fetch answers for all questions
    if (qs.length > 0) {
      const qIds = qs.map((q: any) => q.id);
      const { data: answers } = await (supabase.from("product_answers" as any) as any)
        .select("*")
        .in("question_id", qIds)
        .order("created_at", { ascending: true });
      const aMap: Record<string, any[]> = {};
      (answers || []).forEach((a: any) => {
        if (!aMap[a.question_id]) aMap[a.question_id] = [];
        aMap[a.question_id].push(a);
      });
      setQuestionAnswers(aMap);
    } else {
      setQuestionAnswers({});
    }
  };

  const submitQuestion = async () => {
    if (!userId || !selectedProduct) { navigate("/auth"); return; }
    if (!questionText.trim()) return;
    setQuestionSubmitting(true);
    await (supabase.from("product_questions" as any) as any).insert({
      product_id: selectedProduct.id,
      user_id: userId,
      question: questionText.trim(),
    });
    toast({ title: "Kérdés elküldve! ✓", description: "Hamarosan válaszolunk." });
    setQuestionText("");
    setQuestionSubmitting(false);
    fetchQuestions(selectedProduct.id);
  };

  const submitAnswer = async (questionId: string) => {
    if (!userId || !answerText.trim()) return;
    setAnswerSubmitting(true);
    await (supabase.from("product_answers" as any) as any).insert({
      question_id: questionId,
      user_id: userId,
      answer: answerText.trim(),
    });
    toast({ title: "Válasz elküldve! ✓" });
    setAnswerText("");
    setAnswerQuestionId(null);
    setAnswerSubmitting(false);
    if (selectedProduct) fetchQuestions(selectedProduct.id);
  };

  const trackRecentlyViewed = async (product: Product) => {
    if (!userId || product.id.startsWith("demo-")) return;
    await (supabase.from("recently_viewed" as any) as any).upsert(
      { user_id: userId, product_id: product.id, viewed_at: new Date().toISOString() },
      { onConflict: "user_id,product_id" }
    );
    fetchRecentlyViewed();
  };

  const fetchRecentlyViewed = async () => {
    if (!userId) return;
    const { data } = await (supabase.from("recently_viewed" as any) as any)
      .select("product_id, viewed_at")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(8);
    if (data && data.length > 0) {
      const ids = data.map((r: any) => r.product_id);
      const { data: prods } = await supabase
        .from("shop_products")
        .select("*")
        .in("id", ids);
      if (prods) {
        const ordered = ids
          .map((id: string) => prods.find((p: any) => p.id === id))
          .filter(Boolean) as Product[];
        setRecentlyViewed(ordered);
      }
    }
  };

  useEffect(() => {
    if (userId) fetchRecentlyViewed();
  }, [userId]);

  const submitReview = async () => {
    if (!userId || !selectedProduct) { navigate("/auth"); return; }
    setReviewSubmitting(true);
    const { data: reviewData } = await supabase.from("product_reviews").insert({
      product_id: selectedProduct.id,
      user_id: userId,
      rating: reviewRating,
      comment: reviewComment || null,
    }).select("id").single();

    // Upload review images
    if (reviewData && reviewImages.length > 0) {
      for (let i = 0; i < reviewImages.length; i++) {
        const file = reviewImages[i];
        const ext = file.name.split(".").pop();
        const path = `${userId}/${reviewData.id}/${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("review-images").upload(path, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("review-images").getPublicUrl(path);
          await (supabase.from("review_images" as any) as any).insert({
            review_id: reviewData.id,
            image_url: urlData.publicUrl,
            sort_order: i,
          });
        }
      }
    }

    toast({ title: "Vélemény elküldve! ✓", description: "Jóváhagyás után jelenik meg." });
    setReviewComment("");
    setReviewRating(5);
    setReviewImages([]);
    setReviewImagePreviews([]);
    setReviewSubmitting(false);
    fetchReviews(selectedProduct.id);
  };

  useEffect(() => {
    if (selectedProduct && !selectedProduct.id.startsWith("demo-")) {
      fetchReviews(selectedProduct.id);
      fetchQuestions(selectedProduct.id);
      trackRecentlyViewed(selectedProduct);
      // Fetch DB recommendations
      (async () => {
        const { data: recs } = await (supabase.from("product_recommendations" as any) as any)
          .select("recommended_product_id, score")
          .eq("product_id", selectedProduct.id)
          .order("score", { ascending: false })
          .limit(6);
        if (recs && recs.length > 0) {
          const ids = recs.map((r: any) => r.recommended_product_id);
          const { data: prods } = await supabase.from("shop_products").select("*").in("id", ids);
          setDbRecommendations((prods || []) as Product[]);
        } else {
          setDbRecommendations([]);
        }
      })();
    } else {
      setReviews([]);
      setQuestions([]);
      setDbRecommendations([]);
    }
  }, [selectedProduct?.id]);

  const togglePriceAlert = async (product: Product) => {
    if (!userId) { navigate("/auth"); return; }
    if (priceAlertIds.has(product.id)) {
      await (supabase.from("price_alerts" as any) as any).delete().eq("user_id", userId).eq("product_id", product.id);
      setPriceAlertIds(prev => { const n = new Set(prev); n.delete(product.id); return n; });
      toast({ title: "Árfigyelő eltávolítva" });
    } else {
      const target = priceAlertTarget ? parseInt(priceAlertTarget) : Math.round(product.price * 0.9);
      await (supabase.from("price_alerts" as any) as any).insert({
        user_id: userId,
        product_id: product.id,
        target_price: target,
      });
      setPriceAlertIds(prev => new Set(prev).add(product.id));
      setPriceAlertTarget("");
      toast({ title: "Árfigyelő beállítva! 🔔", description: `Értesítünk, ha az ár ${target.toLocaleString()} Ft alá csökken.` });
    }
  };

  const toggleFollowBrand = async (category: string) => {
    if (!userId) { navigate("/auth"); return; }
    if (followedBrands.has(category)) {
      await (supabase.from("followed_brands" as any) as any).delete().eq("user_id", userId).eq("brand_name", category);
      setFollowedBrands(prev => { const n = new Set(prev); n.delete(category); return n; });
      toast({ title: `${category} követés leállítva` });
    } else {
      await (supabase.from("followed_brands" as any) as any).insert({ user_id: userId, brand_name: category });
      setFollowedBrands(prev => new Set(prev).add(category));
      toast({ title: `${category} követve! 🏷️`, description: "Értesítünk az új termékekről." });
    }
  };

  const handlePreorder = async (product: Product) => {
    if (!userId) { navigate("/auth"); return; }
    if (preorderIds.has(product.id)) {
      await (supabase.from("preorders" as any) as any).delete().eq("user_id", userId).eq("product_id", product.id).eq("status", "pending");
      setPreorderIds(prev => { const n = new Set(prev); n.delete(product.id); return n; });
      toast({ title: "Előrendelés törölve" });
    } else {
      setPreorderSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      await (supabase.from("preorders" as any) as any).insert({
        user_id: userId,
        product_id: product.id,
        email: session?.user?.email || "",
      });
      setPreorderIds(prev => new Set(prev).add(product.id));
      toast({ title: "Előrendelés rögzítve! 📦", description: "Értesítünk, amint elérhető." });
      setPreorderSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Böngéssz</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">Kollekció</h1>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Termék keresése..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-none border-border bg-card text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[11px] uppercase tracking-widest px-4 py-2 border whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-foreground text-background font-bold border-foreground"
                  : "text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results bar */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {filtered.length} termék{selectedCategory !== "Összes" ? ` — ${selectedCategory}` : ""}
          </p>
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
            >
              <SlidersHorizontal className="h-3 w-3" />
              {SORT_OPTIONS.find(s => s.value === sortBy)?.label}
              <ChevronDown className={`h-3 w-3 transition-transform ${showSort ? "rotate-180" : ""}`} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border z-10 min-w-[180px]">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                    className={`block w-full text-left text-xs uppercase tracking-wider px-4 py-2.5 transition-colors ${
                      sortBy === opt.value ? "text-accent font-bold" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground mb-2">Nincs találat.</p>
            <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wider" onClick={() => { setSearchTerm(""); setSelectedCategory("Összes"); }}>
              Szűrők törlése
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map(product => (
              <div key={product.id} className="group border border-border bg-card overflow-hidden transition-all hover:border-muted-foreground">
                <div
                  className="relative aspect-[3/4] overflow-hidden cursor-pointer bg-secondary"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-muted-foreground/20">{product.name[0]}</span>
                    </div>
                  )}

                  {product.original_price && product.original_price > product.price && (
                    <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                      -{Math.round((1 - product.price / product.original_price) * 100)}%
                    </span>
                  )}

                  {!product.id.startsWith("demo-") && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button
                        onClick={(e) => toggleWishlist(product.id, e)}
                        className={`h-8 w-8 flex items-center justify-center bg-background/80 transition-colors ${
                          wishlistIds.has(product.id) ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${wishlistIds.has(product.id) ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => toggleCompare(product, e)}
                        className={`h-8 w-8 flex items-center justify-center bg-background/80 transition-colors ${
                          compareList.find(p => p.id === product.id) ? "text-accent" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <GitCompare className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Elfogyott</span>
                      {!product.id.startsWith("demo-") && (
                        <button
                          onClick={(e) => toggleAlert(product.id, e)}
                          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors ${
                            alertIds.has(product.id)
                              ? "border-accent text-accent bg-accent/10"
                              : "border-muted-foreground text-muted-foreground hover:text-foreground hover:border-foreground"
                          }`}
                        >
                          <BellRing className="h-3 w-3" />
                          {alertIds.has(product.id) ? "Értesítő beállítva" : "Értesíts!"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hidden md:block">
                    <Button
                      size="sm"
                      className="w-full rounded-none uppercase tracking-wider text-[10px] h-9 bg-foreground text-background hover:bg-foreground/90"
                      disabled={product.stock <= 0}
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Gyors hozzáadás
                    </Button>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{product.category}</p>
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-bold text-accent">{product.price.toLocaleString("hu-HU")} Ft</span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-[11px] text-muted-foreground line-through">{product.original_price.toLocaleString("hu-HU")} Ft</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2.5 rounded-none uppercase tracking-wider text-[10px] h-8 md:hidden"
                    disabled={product.stock <= 0}
                    onClick={() => handleAddToCart(product)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Kosárba
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Legutóbb megtekintett</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recentlyViewed.map(product => (
                <div
                  key={product.id}
                  className="border border-border bg-card overflow-hidden cursor-pointer hover:border-muted-foreground transition-all"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                      <span className="text-xl font-bold text-muted-foreground/20">{product.name[0]}</span>
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                    <p className="text-xs font-bold text-accent mt-0.5">{product.price.toLocaleString()} Ft</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSort && (
        <div className="fixed inset-0 z-[5]" onClick={() => setShowSort(false)} />
      )}

      {/* Compare floating bar */}
      {compareList.length > 0 && !showCompare && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-accent shadow-lg px-4 py-3 flex items-center gap-3">
          <GitCompare className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{compareList.length} termék kiválasztva</span>
          <Button
            size="sm"
            className="rounded-none text-[10px] uppercase tracking-wider h-8"
            onClick={() => setShowCompare(true)}
            disabled={compareList.length < 2}
          >
            Összehasonlítás
          </Button>
          <button onClick={() => setCompareList([])} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Compare modal */}
      {showCompare && compareList.length >= 2 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCompare(false)}>
          <div className="w-full max-w-4xl bg-background border max-h-[90vh] overflow-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Összehasonlítás</h3>
              </div>
              <button onClick={() => setShowCompare(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground w-24">Tulajdonság</th>
                    {compareList.map(p => (
                      <th key={p.id} className="p-3 text-center min-w-[140px]">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-20 h-20 object-cover mx-auto mb-2 border border-border" />}
                        <p className="text-xs font-bold text-foreground">{p.name}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Ár</td>
                    {compareList.map(p => {
                      const prices = compareList.map(c => c.price);
                      const minPrice = Math.min(...prices);
                      return (
                        <td key={p.id} className="p-3 text-center">
                          <span className={`text-sm font-bold ${p.price === minPrice ? "text-green-500" : "text-accent"}`}>
                            {p.price.toLocaleString()} Ft
                          </span>
                          {p.original_price && p.original_price > p.price && (
                            <span className="block text-[10px] text-muted-foreground line-through">{p.original_price.toLocaleString()} Ft</span>
                          )}
                          {p.price === minPrice && <span className="block text-[9px] text-green-500 font-bold mt-0.5">✓ Legjobb ár</span>}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Leírás</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 text-center text-[11px] text-muted-foreground leading-snug">
                        {p.description ? (p.description.length > 80 ? p.description.slice(0, 80) + "…" : p.description) : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Kategória</td>
                    {compareList.map(p => <td key={p.id} className="p-3 text-center text-xs text-foreground">{p.category}</td>)}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Méretek</td>
                    {compareList.map(p => <td key={p.id} className="p-3 text-center text-xs text-foreground">{(p.sizes || []).join(", ") || "—"}</td>)}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Színek</td>
                    {compareList.map(p => <td key={p.id} className="p-3 text-center text-xs text-foreground">{(p.colors || []).join(", ") || "—"}</td>)}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Kedvezmény</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 text-center text-xs">
                        {p.original_price && p.original_price > p.price ? (
                          <span className="text-accent font-bold">-{Math.round((1 - p.price / p.original_price) * 100)}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Készlet</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 text-center text-xs">
                        <span className={p.stock > 0 ? "text-green-500 font-bold" : "text-destructive font-bold"}>
                          {p.stock > 0 ? `${p.stock} db` : "Elfogyott"}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3"></td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 text-center">
                        <Button
                          size="sm"
                          className="rounded-none uppercase tracking-wider text-[10px] h-8"
                          disabled={p.stock <= 0}
                          onClick={() => { handleAddToCart(p); setShowCompare(false); }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Kosárba
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Size Quiz Modal */}
      <SizeQuiz
        open={showSizeQuiz}
        onClose={() => setShowSizeQuiz(false)}
        productCategory={selectedProduct?.category}
      />
    </Layout>
  );
};

export default Shop;
