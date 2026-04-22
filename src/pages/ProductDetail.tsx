import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import SizeQuiz from "@/components/SizeQuiz";
import ProductWaitlist from "@/components/ProductWaitlist";
import PersonalizedOffers from "@/components/PersonalizedOffers";
import {
  ShoppingCart, Heart, Star, BellRing, Share2, Copy, Bell,
  UserPlus, UserMinus, Ruler, PackagePlus, MessageCircle,
  ChevronLeft, ChevronRight, Truck, RotateCcw, Shield, ZoomIn
} from "lucide-react";

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

interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
  is_primary: boolean;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [userId, setUserId] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);
  const [hasPriceAlert, setHasPriceAlert] = useState(false);
  const [priceAlertTarget, setPriceAlertTarget] = useState("");
  const [isFollowingBrand, setIsFollowingBrand] = useState(false);
  const [isPreordered, setIsPreordered] = useState(false);
  const [preorderSubmitting, setPreorderSubmitting] = useState(false);
  const [showPreorderForm, setShowPreorderForm] = useState(false);
  const [preorderName, setPreorderName] = useState("");
  const [preorderPhone, setPreorderPhone] = useState("");
  const [preorderZip, setPreorderZip] = useState("");
  const [preorderCity, setPreorderCity] = useState("");
  const [preorderAddress, setPreorderAddress] = useState("");

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewImagesMap, setReviewImagesMap] = useState<Record<string, string[]>>({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);

  const [questions, setQuestions] = useState<any[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any[]>>({});
  const [questionText, setQuestionText] = useState("");
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [answerQuestionId, setAnswerQuestionId] = useState<string | null>(null);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);

  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [showSizeQuiz, setShowSizeQuiz] = useState(false);
  const [variants, setVariants] = useState<Array<{ size: string | null; color: string | null; stock: number }>>([]);

  // Stock helpers based on variants (size+color combinations)
  const getStockForSize = (size: string): number => {
    if (variants.length === 0) return product?.stock ?? 0;
    return variants
      .filter((v) => v.size === size && (!selectedColor || !v.color || v.color === selectedColor))
      .reduce((sum, v) => sum + (v.stock || 0), 0);
  };
  const getStockForColor = (color: string): number => {
    if (variants.length === 0) return product?.stock ?? 0;
    return variants
      .filter((v) => v.color === color && (!selectedSize || !v.size || v.size === selectedSize))
      .reduce((sum, v) => sum + (v.stock || 0), 0);
  };
  const getCurrentStock = (): number => {
    if (variants.length === 0) return product?.stock ?? 0;
    const matches = variants.filter((v) =>
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColor || v.color === selectedColor)
    );
    if (matches.length === 0) return 0;
    return matches.reduce((sum, v) => sum + (v.stock || 0), 0);
  };


  // Avg rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length)
    : 0;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setUserId(uid);

      // Fetch product
      const { data: prod } = await supabase
        .from("shop_products")
        .select("*")
        .eq("id", id)
        .single();

      if (!prod) {
        setLoading(false);
        return;
      }
      const p = prod as any as Product;

      // Fetch variants — use them as the source of truth for sizes/colors when present
      const { data: variantData } = await (supabase.from("product_variants" as any) as any)
        .select("size, color, stock, is_active")
        .eq("product_id", id)
        .eq("is_active", true);

      const vList = (variantData || []) as Array<{ size: string | null; color: string | null; stock: number }>;
      setVariants(vList);

      if (vList.length > 0) {
        const sizesFromVar = Array.from(new Set(vList.map((v) => v.size).filter(Boolean)));
        const colorsFromVar = Array.from(new Set(vList.map((v) => v.color).filter(Boolean)));
        if (sizesFromVar.length > 0) p.sizes = sizesFromVar as string[];
        if (colorsFromVar.length > 0) p.colors = colorsFromVar as string[];
      }

      setProduct(p);
      // Pick first size/color that's actually in stock if possible
      const firstAvailableSize = (p.sizes || []).find((s) =>
        vList.length === 0 ? true : vList.some((v) => v.size === s && (v.stock || 0) > 0)
      ) || (p.sizes || [])[0] || "";
      const firstAvailableColor = (p.colors || []).find((c) =>
        vList.length === 0 ? true : vList.some((v) => v.color === c && (v.stock || 0) > 0)
      ) || (p.colors || [])[0] || "";
      setSelectedSize(firstAvailableSize);
      setSelectedColor(firstAvailableColor);


      // Fetch gallery images
      const { data: imgs } = await (supabase.from("product_images" as any) as any)
        .select("*")
        .eq("product_id", id)
        .order("sort_order", { ascending: true });
      setImages((imgs || []) as ProductImage[]);

      // Fetch user-specific data
      if (uid) {
        const userEmail = session?.user?.email || "";
        const [wl, alert, priceAlert, brand, preorder] = await Promise.all([
          supabase.from("wishlists").select("id").eq("user_id", uid).eq("product_id", id).maybeSingle(),
          // Stock alert = waitlist subscription with source 'stock_alert'
          userEmail
            ? supabase.from("product_waitlist").select("id").eq("product_id", id).eq("email", userEmail).eq("source", "stock_alert").maybeSingle()
            : Promise.resolve({ data: null }),
          (supabase.from("price_alerts" as any) as any).select("id").eq("user_id", uid).eq("product_id", id).eq("is_active", true).maybeSingle(),
          (supabase.from("followed_brands" as any) as any).select("id").eq("user_id", uid).eq("brand_name", p.category).maybeSingle(),
          supabase.from("product_preorders").select("id").eq("user_id", uid).eq("product_id", id).in("status", ["pending", "confirmed"]).maybeSingle(),
        ]);
        setIsWishlisted(!!wl.data);
        setHasAlert(!!alert.data);
        setHasPriceAlert(!!priceAlert.data);
        setIsFollowingBrand(!!brand.data);
        setIsPreordered(!!preorder.data);
      }

      // Track recently viewed
      if (uid) {
        await (supabase.from("recently_viewed" as any) as any).upsert(
          { user_id: uid, product_id: id, viewed_at: new Date().toISOString() },
          { onConflict: "user_id,product_id" }
        );
      }

      setLoading(false);
    };
    load();
  }, [id]);

  // Fetch reviews
  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      setReviews(data || []);
      if (data && data.length > 0) {
        const rIds = data.map((r: any) => r.id);
        const { data: imgs } = await (supabase.from("review_images" as any) as any)
          .select("review_id, image_url")
          .in("review_id", rIds)
          .order("sort_order", { ascending: true });
        const map: Record<string, string[]> = {};
        (imgs || []).forEach((img: any) => {
          if (!map[img.review_id]) map[img.review_id] = [];
          map[img.review_id].push(img.image_url);
        });
        setReviewImagesMap(map);
      }
    };
    fetchReviews();
  }, [id]);

  // Fetch questions
  useEffect(() => {
    if (!id) return;
    const fetchQuestions = async () => {
      const { data } = await (supabase.from("product_questions" as any) as any)
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      const qs = data || [];
      setQuestions(qs);
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
      }
    };
    fetchQuestions();
  }, [id]);

  // Fetch recommendations
  useEffect(() => {
    if (!id || !product) return;
    const fetchRecs = async () => {
      const { data: recs } = await (supabase.from("product_recommendations" as any) as any)
        .select("recommended_product_id, score")
        .eq("product_id", id)
        .order("score", { ascending: false })
        .limit(6);
      if (recs && recs.length > 0) {
        const ids = recs.map((r: any) => r.recommended_product_id);
        const { data: prods } = await supabase.from("shop_products").select("*").in("id", ids).eq("is_active", true);
        setRecommendations((prods || []) as Product[]);
      } else {
        // Fallback: same category
        const { data: catProds } = await supabase
          .from("shop_products")
          .select("*")
          .eq("category", product.category)
          .eq("is_active", true)
          .neq("id", id)
          .limit(6);
        setRecommendations((catProds || []) as Product[]);
      }
    };
    fetchRecs();
  }, [id, product?.category]);

  // All gallery images (including main product image)
  const allImages = images.length > 0
    ? images.map(i => i.image_url)
    : product?.image_url ? [product.image_url] : [];

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      size: selectedSize,
      color: selectedColor,
    }, quantity);
    toast({ title: "Kosárba téve! ✓", description: `${quantity}× ${product.name}` });
  };

  const toggleWishlist = async () => {
    if (!userId || !product) { navigate("/auth"); return; }
    if (isWishlisted) {
      await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", product.id);
      setIsWishlisted(false);
      toast({ title: "Eltávolítva a kedvencekből" });
    } else {
      await supabase.from("wishlists").insert({ user_id: userId, product_id: product.id });
      setIsWishlisted(true);
      toast({ title: "Hozzáadva a kedvencekhez ❤️" });
    }
  };

  const toggleAlert = async () => {
    if (!userId || !product) { navigate("/auth"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || "";
    if (!userEmail) { navigate("/auth"); return; }
    if (hasAlert) {
      const { error } = await supabase
        .from("product_waitlist")
        .delete()
        .eq("product_id", product.id)
        .eq("email", userEmail)
        .eq("source", "stock_alert");
      if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
      setHasAlert(false);
      toast({ title: "Értesítő eltávolítva" });
    } else {
      const { error } = await supabase.from("product_waitlist").insert({
        product_id: product.id,
        email: userEmail,
        user_id: userId,
        source: "stock_alert",
      });
      if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
      setHasAlert(true);
      toast({ title: "Értesítünk, ha újra elérhető! 🔔" });
    }
  };

  const togglePriceAlert = async () => {
    if (!userId || !product) { navigate("/auth"); return; }
    if (hasPriceAlert) {
      await (supabase.from("price_alerts" as any) as any).delete().eq("user_id", userId).eq("product_id", product.id);
      setHasPriceAlert(false);
      toast({ title: "Árfigyelő eltávolítva" });
    } else {
      const target = priceAlertTarget ? parseInt(priceAlertTarget) : Math.round(product.price * 0.9);
      await (supabase.from("price_alerts" as any) as any).insert({ user_id: userId, product_id: product.id, target_price: target });
      setHasPriceAlert(true);
      setPriceAlertTarget("");
      toast({ title: "Árfigyelő beállítva! 🔔", description: `Értesítünk, ha az ár ${target.toLocaleString()} Ft alá csökken.` });
    }
  };

  const toggleFollowBrand = async () => {
    if (!userId || !product) { navigate("/auth"); return; }
    if (isFollowingBrand) {
      await (supabase.from("followed_brands" as any) as any).delete().eq("user_id", userId).eq("brand_name", product.category);
      setIsFollowingBrand(false);
      toast({ title: `${product.category} követés leállítva` });
    } else {
      await (supabase.from("followed_brands" as any) as any).insert({ user_id: userId, brand_name: product.category });
      setIsFollowingBrand(true);
      toast({ title: `${product.category} követve! 🏷️` });
    }
  };

  const cancelPreorder = async () => {
    if (!userId || !product) return;
    const { error } = await supabase
      .from("product_preorders")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .in("status", ["pending", "confirmed"]);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setIsPreordered(false);
    toast({ title: "Előrendelés törölve" });
  };

  const openPreorderForm = async () => {
    if (!userId || !product) { navigate("/auth"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) { navigate("/auth"); return; }
    // Prefill from profile if available
    const { data: profile } = await supabase
      .from("profiles").select("display_name, phone, city").eq("user_id", userId).maybeSingle();
    if (profile) {
      setPreorderName(profile.display_name || session.user.user_metadata?.full_name || "");
      setPreorderPhone(profile.phone || "");
      setPreorderCity(profile.city || "");
    }
    setShowPreorderForm(true);
  };

  const submitPreorder = async () => {
    if (!userId || !product) return;
    if (!preorderName.trim() || !preorderPhone.trim() || !preorderZip.trim() || !preorderCity.trim() || !preorderAddress.trim()) {
      toast({ title: "Hiányzó adatok", description: "Minden mező kötelező!", variant: "destructive" });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || "";
    if (!userEmail) { navigate("/auth"); return; }

    setPreorderSubmitting(true);
    const totalAmount = Number(product.price) * quantity;
    const noteText = `GLS készpénzes előrendelés | Cím: ${preorderZip} ${preorderCity}, ${preorderAddress}`;
    const { error } = await supabase.from("product_preorders").insert({
      product_id: product.id,
      user_id: userId,
      customer_email: userEmail,
      customer_name: preorderName.trim(),
      customer_phone: preorderPhone.trim(),
      quantity,
      selected_size: selectedSize || null,
      selected_color: selectedColor || null,
      deposit_amount: 0,
      total_amount: totalAmount,
      status: "pending",
      notes: noteText,
    });
    setPreorderSubmitting(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setIsPreordered(true);
    setShowPreorderForm(false);
    toast({
      title: "Előrendelés rögzítve! 📦",
      description: "GLS futár hozza, fizetés készpénzben átvételkor. Felvesszük veled a kapcsolatot!"
    });
  };

  const submitReview = async () => {
    if (!userId || !product) { navigate("/auth"); return; }
    setReviewSubmitting(true);
    const { data: reviewData } = await supabase.from("product_reviews").insert({
      product_id: product.id, user_id: userId, rating: reviewRating, comment: reviewComment || null,
    }).select("id").single();

    if (reviewData && reviewImages.length > 0) {
      for (let i = 0; i < reviewImages.length; i++) {
        const file = reviewImages[i];
        const ext = file.name.split(".").pop();
        const path = `${userId}/${reviewData.id}/${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("review-images").upload(path, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("review-images").getPublicUrl(path);
          await (supabase.from("review_images" as any) as any).insert({
            review_id: reviewData.id, image_url: urlData.publicUrl, sort_order: i,
          });
        }
      }
    }
    toast({ title: "Vélemény elküldve! ✓" });
    setReviewComment(""); setReviewRating(5); setReviewImages([]); setReviewImagePreviews([]);
    setReviewSubmitting(false);
    // Refresh reviews
    const { data } = await supabase.from("product_reviews").select("*").eq("product_id", product.id).eq("is_approved", true).order("created_at", { ascending: false });
    setReviews(data || []);
  };

  const submitQuestion = async () => {
    if (!userId || !product) { navigate("/auth"); return; }
    if (!questionText.trim()) return;
    setQuestionSubmitting(true);
    await (supabase.from("product_questions" as any) as any).insert({
      product_id: product.id, user_id: userId, question: questionText.trim(),
    });
    toast({ title: "Kérdés elküldve! ✓" });
    setQuestionText(""); setQuestionSubmitting(false);
  };

  const submitAnswer = async (questionId: string) => {
    if (!userId || !answerText.trim()) return;
    setAnswerSubmitting(true);
    await (supabase.from("product_answers" as any) as any).insert({
      question_id: questionId, user_id: userId, answer: answerText.trim(),
    });
    toast({ title: "Válasz elküldve! ✓" });
    setAnswerText(""); setAnswerQuestionId(null); setAnswerSubmitting(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-lg font-bold text-foreground mb-2">Termék nem található</p>
          <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={() => navigate("/shop")}>
            <ChevronLeft className="h-3 w-3 mr-1" /> Vissza a boltba
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground transition-colors">Kollekció</Link>
          <span>/</span>
          <span className="text-foreground">{product.category}</span>
          <span>/</span>
          <span className="text-foreground/60 truncate max-w-[120px]">{product.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12">
        {/* Main layout: Image Gallery + Product Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Image Gallery */}
          <div className="space-y-3">
            {/* Main Image */}
            <div className="relative aspect-[3/4] bg-secondary border border-border overflow-hidden group cursor-pointer"
                 onClick={() => allImages[activeImageIdx] && setZoomedImage(allImages[activeImageIdx])}>
              {allImages.length > 0 ? (
                <img
                  src={allImages[activeImageIdx]}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-6xl font-bold text-muted-foreground/10">{product.name[0]}</span>
                </div>
              )}

              {product.original_price && product.original_price > product.price && (
                <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                  -{Math.round((1 - product.price / product.original_price) * 100)}%
                </span>
              )}

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImageIdx(i => (i - 1 + allImages.length) % allImages.length); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 bg-background/80 flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImageIdx(i => (i + 1) % allImages.length); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 bg-background/80 flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              <div className="absolute bottom-3 right-3 h-8 w-8 bg-background/80 flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-4 w-4" />
              </div>
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`shrink-0 w-16 h-20 border overflow-hidden transition-all ${
                      idx === activeImageIdx ? "border-accent" : "border-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{product.category}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground uppercase tracking-wide leading-tight">{product.name}</h1>

              {/* Rating summary */}
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">({reviews.length} vélemény)</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-accent">{product.price.toLocaleString("hu-HU")} Ft</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-lg text-muted-foreground line-through">{product.original_price.toLocaleString("hu-HU")} Ft</span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Size selector */}
            {(product.sizes || []).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Méret</p>
                  <button
                    onClick={() => setShowSizeQuiz(true)}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                  >
                    <Ruler className="h-3 w-3" /> Méret tanácsadó
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(product.sizes || []).map(s => {
                    const sizeStock = getStockForSize(s);
                    const soldOut = variants.length > 0 && sizeStock <= 0;
                    return (
                      <button
                        key={s}
                        onClick={() => !soldOut && setSelectedSize(s)}
                        disabled={soldOut}
                        title={soldOut ? "Elfogyott" : `${sizeStock} db készleten`}
                        className={`relative text-xs px-5 py-2.5 border transition-all ${
                          soldOut
                            ? "text-muted-foreground/40 border-border/40 line-through cursor-not-allowed bg-muted/20"
                            : selectedSize === s
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground"
                        }`}
                      >
                        {s}
                        {!soldOut && variants.length > 0 && sizeStock <= 3 && (
                          <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-accent text-accent-foreground px-1 py-0.5 font-bold rounded-sm">
                            {sizeStock}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {variants.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {(product.sizes || []).map(s => {
                      const ss = getStockForSize(s);
                      return (
                        <span key={`legend-${s}`} className={`text-[10px] ${ss <= 0 ? "text-destructive" : ss <= 3 ? "text-accent" : "text-muted-foreground"}`}>
                          {s}: {ss <= 0 ? "elfogyott" : `${ss} db`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Color selector */}
            {(product.colors || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Szín</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(product.colors || []).map(c => {
                    const colorStock = getStockForColor(c);
                    const soldOut = variants.length > 0 && colorStock <= 0;
                    return (
                      <button
                        key={c}
                        onClick={() => !soldOut && setSelectedColor(c)}
                        disabled={soldOut}
                        title={soldOut ? "Elfogyott" : `${colorStock} db készleten`}
                        className={`text-xs px-5 py-2.5 border transition-all ${
                          soldOut
                            ? "text-muted-foreground/40 border-border/40 line-through cursor-not-allowed bg-muted/20"
                            : selectedColor === c
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            {(() => {
              const currentStock = getCurrentStock();
              return currentStock > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Darabszám</p>
                  <div className="flex items-center border border-border">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm">-</button>
                    <span className="px-4 py-2 text-sm font-bold text-foreground min-w-[40px] text-center">{quantity}</span>
                    <button onClick={() => setQuantity(q => Math.min(currentStock, q + 1))} className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm">+</button>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Készleten: <span className="text-foreground font-bold">{currentStock} db</span>
                    {variants.length > 0 && (selectedSize || selectedColor) && (
                      <> ({[selectedSize, selectedColor].filter(Boolean).join(" / ")})</>
                    )}
                  </span>
                </div>

                {currentStock <= 5 && (
                  <p className="text-xs text-accent font-bold uppercase tracking-wider">⚡ Utolsó {currentStock} darab!</p>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-none uppercase tracking-widest text-xs h-12 font-bold"
                    onClick={handleAddToCart}
                    disabled={quantity > currentStock}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Kosárba teszem
                  </Button>
                  <button
                    onClick={toggleWishlist}
                    className={`h-12 w-12 border flex items-center justify-center transition-colors ${
                      isWishlisted ? "border-red-500 text-red-500" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Jelenleg nem elérhető</p>
                  {(product as any).preorder_count > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-accent/40 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
                      📦 {(product as any).preorder_count} db előrendelve
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  className={`w-full rounded-none uppercase tracking-widest text-xs h-12 font-bold ${hasAlert ? "border-accent text-accent" : ""}`}
                  onClick={toggleAlert}
                >
                  <BellRing className="h-4 w-4 mr-2" />
                  {hasAlert ? "Értesítő beállítva ✓" : "Értesíts, ha újra elérhető!"}
                </Button>
                <Button
                  className={`w-full rounded-none uppercase tracking-widest text-xs h-10 ${isPreordered ? "bg-accent/20 text-accent border border-accent" : ""}`}
                  variant={isPreordered ? "outline" : "default"}
                  onClick={isPreordered ? cancelPreorder : openPreorderForm}
                  disabled={preorderSubmitting}
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  {isPreordered ? "Előrendelve ✓ (kattints a törléshez)" : "Előrendelés (GLS, készpénz)"}
                </Button>

                {showPreorderForm && (
                  <div className="border border-accent bg-card p-4 space-y-3">
                    <div className="border-b border-border pb-2 mb-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-foreground">Előrendelés adatai</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Nincs előleg • Nincs online fizetés • Csak készpénz GLS futárnál</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Teljes név *</p>
                      <Input value={preorderName} onChange={e => setPreorderName(e.target.value)} placeholder="Példa Béla" className="rounded-none h-9 text-xs" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Telefonszám *</p>
                      <Input value={preorderPhone} onChange={e => setPreorderPhone(e.target.value)} placeholder="+36 30 123 4567" className="rounded-none h-9 text-xs" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Irsz. *</p>
                        <Input value={preorderZip} onChange={e => setPreorderZip(e.target.value)} placeholder="1234" className="rounded-none h-9 text-xs" />
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Város *</p>
                        <Input value={preorderCity} onChange={e => setPreorderCity(e.target.value)} placeholder="Budapest" className="rounded-none h-9 text-xs" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Utca, házszám *</p>
                      <Input value={preorderAddress} onChange={e => setPreorderAddress(e.target.value)} placeholder="Példa utca 12. 3/4" className="rounded-none h-9 text-xs" />
                    </div>
                    <div className="border border-border bg-muted/30 p-2 space-y-1">
                      <div className="flex justify-between text-[10px] uppercase tracking-wider">
                        <span className="text-muted-foreground">Termék összesen</span>
                        <span className="text-foreground font-bold">{(Number(product.price) * quantity).toLocaleString()} Ft</span>
                      </div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider">
                        <span className="text-muted-foreground">Szállítás (GLS)</span>
                        <span className="text-foreground">Készpénzben átvételkor</span>
                      </div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider">
                        <span className="text-muted-foreground">Előleg</span>
                        <span className="text-accent font-bold">0 Ft</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowPreorderForm(false)} variant="outline" className="flex-1 rounded-none uppercase tracking-wider text-[10px] h-9">
                        Mégse
                      </Button>
                      <Button onClick={submitPreorder} disabled={preorderSubmitting} className="flex-1 rounded-none uppercase tracking-wider text-[10px] h-9 font-bold">
                        {preorderSubmitting ? "Küldés..." : "Előrendelés véglegesítése"}
                      </Button>
                    </div>
                  </div>
                )}
                <ProductWaitlist productId={product.id} userId={userId} onAuth={() => navigate("/auth")} />
              </div>
            );
            })()}


            {/* Installment */}
            {product.price >= 10000 && (
              <div className="border border-accent/20 bg-accent/5 p-3 text-xs">
                <p className="font-bold text-foreground uppercase tracking-wider text-[10px] mb-1">💳 Részletfizetés elérhető</p>
                <p className="text-muted-foreground">
                  3 × {Math.round(product.price / 3).toLocaleString()} Ft vagy 6 × {Math.round(product.price / 6).toLocaleString()} Ft
                </p>
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
              <div className="flex flex-col items-center text-center gap-1">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Ingyenes szállítás<br/>15 000 Ft felett</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">14 napos<br/>visszaküldés</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Biztonságos<br/>fizetés</span>
              </div>
            </div>

            {/* Price Alert & Brand Follow */}
            <div className="flex gap-2">
              <button
                onClick={togglePriceAlert}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider py-2.5 border transition-colors ${
                  hasPriceAlert ? "border-accent text-accent bg-accent/10 font-bold" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bell className={`h-3 w-3 ${hasPriceAlert ? "fill-current" : ""}`} />
                {hasPriceAlert ? "Árfigyelő aktív ✓" : "Árfigyelő"}
              </button>
              <button
                onClick={toggleFollowBrand}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider py-2.5 border transition-colors ${
                  isFollowingBrand ? "border-accent text-accent bg-accent/10 font-bold" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {isFollowingBrand ? <><UserMinus className="h-3 w-3" /> Követve</> : <><UserPlus className="h-3 w-3" /> {product.category} követése</>}
              </button>
            </div>
            {!hasPriceAlert && (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={priceAlertTarget}
                  onChange={e => setPriceAlertTarget(e.target.value)}
                  placeholder={`Célár (pl. ${Math.round(product.price * 0.9).toLocaleString()})`}
                  className="rounded-none h-8 text-xs flex-1"
                />
                <span className="text-[10px] text-muted-foreground shrink-0">Ft</span>
              </div>
            )}

            {/* Share */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer"
                className="text-center text-[10px] uppercase tracking-wider py-2 border border-border text-muted-foreground hover:text-foreground transition-colors">
                Facebook
              </a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name + ' — ' + product.price.toLocaleString() + ' Ft')}&url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer"
                className="text-center text-[10px] uppercase tracking-wider py-2 border border-border text-muted-foreground hover:text-foreground transition-colors">
                X / Twitter
              </a>
              <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(product.name + ' — ' + product.price.toLocaleString() + ' Ft: ' + window.location.href)}`} target="_blank" rel="noopener noreferrer"
                className="text-center text-[10px] uppercase tracking-wider py-2 border border-border text-muted-foreground hover:text-foreground transition-colors">
                WhatsApp
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link másolva! 📋" }); }}
                className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider py-2 border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-3 w-3" /> Link másolása
              </button>
            </div>

            {userId && <PersonalizedOffers userId={userId} />}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 border-t border-border pt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">
              Vélemények ({reviews.length})
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <span className="text-sm font-bold text-foreground">{avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r: any) => (
                <div key={r.id} className="border border-border p-4 space-y-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString("hu-HU")}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  {reviewImagesMap[r.id] && reviewImagesMap[r.id].length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {reviewImagesMap[r.id].map((url: string, idx: number) => (
                        <img key={idx} src={url} alt="" className="h-20 w-20 object-cover border border-border shrink-0 cursor-pointer" onClick={() => setZoomedImage(url)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Még nincsenek vélemények. Légy te az első!</p>
          )}

          {/* Review form */}
          {userId && (
            <div className="max-w-lg space-y-3 border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Írj véleményt</p>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Star className={`h-5 w-5 ${s <= reviewRating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Véleményed (opcionális)..."
                className="flex min-h-[60px] w-full border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer border border-dashed border-border px-3 py-2 transition-colors">
                📷 Fotók hozzáadása (max 3)
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 3);
                    setReviewImages(files);
                    setReviewImagePreviews(files.map(f => URL.createObjectURL(f)));
                  }}
                />
              </label>
              {reviewImagePreviews.length > 0 && (
                <div className="flex gap-2">
                  {reviewImagePreviews.map((url, i) => (
                    <img key={i} src={url} alt="" className="h-16 w-16 object-cover border border-border" />
                  ))}
                </div>
              )}
              <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={submitReview} disabled={reviewSubmitting}>
                {reviewSubmitting ? "Küldés..." : "Vélemény küldése"}
              </Button>
            </div>
          )}
        </div>

        {/* Q&A Section */}
        <div className="mt-12 border-t border-border pt-8 space-y-6">
          <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">
            <MessageCircle className="h-4 w-4 inline mr-2" />
            Kérdések és válaszok ({questions.length})
          </h2>

          {questions.length > 0 && (
            <div className="space-y-4 max-w-2xl">
              {questions.map((q: any) => (
                <div key={q.id} className="border border-border p-4 space-y-2">
                  <p className="text-sm text-foreground font-medium">❓ {q.question}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString("hu-HU")}</p>
                  {questionAnswers[q.id] && questionAnswers[q.id].length > 0 && (
                    <div className="space-y-2 pl-3 border-l-2 border-accent">
                      {questionAnswers[q.id].map((a: any) => (
                        <div key={a.id}>
                          <p className="text-sm text-muted-foreground">
                            {a.is_seller && <span className="text-accent font-bold text-[9px] uppercase tracking-wider mr-1">Eladó</span>}
                            💬 {a.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {userId && answerQuestionId === q.id ? (
                    <div className="flex gap-2">
                      <Input value={answerText} onChange={e => setAnswerText(e.target.value)} placeholder="Válaszod..." className="rounded-none h-8 text-xs flex-1" />
                      <Button size="sm" variant="outline" className="rounded-none text-[10px] uppercase" onClick={() => submitAnswer(q.id)} disabled={answerSubmitting}>Küldés</Button>
                    </div>
                  ) : userId && (
                    <button onClick={() => setAnswerQuestionId(q.id)} className="text-[10px] text-accent hover:text-accent/80 uppercase tracking-wider">Válaszolj</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {userId && (
            <div className="flex gap-2 max-w-lg">
              <Input value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Tedd fel kérdésedet..." className="rounded-none h-10 text-xs flex-1" />
              <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs h-10" onClick={submitQuestion} disabled={questionSubmitting}>
                Kérdezek
              </Button>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wider mb-6">Hasonló termékek</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recommendations.slice(0, 8).map(rec => (
                <Link
                  key={rec.id}
                  to={`/product/${rec.id}`}
                  className="border border-border overflow-hidden hover:border-muted-foreground transition-all group"
                >
                  {rec.image_url ? (
                    <div className="aspect-[3/4] overflow-hidden">
                      <img src={rec.image_url} alt={rec.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-secondary flex items-center justify-center">
                      <span className="text-2xl font-bold text-muted-foreground/10">{rec.name[0]}</span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{rec.category}</p>
                    <p className="text-xs font-semibold text-foreground truncate">{rec.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-accent">{rec.price.toLocaleString()} Ft</span>
                      {rec.original_price && rec.original_price > rec.price && (
                        <span className="text-[10px] text-muted-foreground line-through">{rec.original_price.toLocaleString()} Ft</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center cursor-pointer" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="Zoom" className="max-w-[95vw] max-h-[95vh] object-contain" />
        </div>
      )}

      {/* Size Quiz */}
      <SizeQuiz open={showSizeQuiz} onClose={() => setShowSizeQuiz(false)} productCategory={product.category} />
    </Layout>
  );
};

export default ProductDetail;
