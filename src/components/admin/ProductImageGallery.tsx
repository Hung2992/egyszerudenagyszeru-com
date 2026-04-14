import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Star, GripVertical, Image, Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  is_primary: boolean;
}

interface ProductImageGalleryProps {
  productId: string;
  images: ProductImage[];
  onImagesChange: () => void;
}

const ProductImageGallery = ({ productId, images, onImagesChange }: ProductImageGalleryProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const fileName = `${productId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) {
        toast({ title: "Feltöltési hiba", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
      const isPrimary = images.length === 0 && i === 0;

      await supabase.from("product_images").insert({
        product_id: productId,
        image_url: publicUrl,
        sort_order: images.length + i,
        is_primary: isPrimary,
      } as any);

      // Also set as main image_url on product if primary
      if (isPrimary) {
        await supabase.from("shop_products").update({ image_url: publicUrl }).eq("id", productId);
      }
    }

    toast({ title: `${files.length} kép feltöltve!` });
    setUploading(false);
    onImagesChange();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const setPrimary = async (img: ProductImage) => {
    // Unset all primary
    await supabase.from("product_images").update({ is_primary: false } as any).eq("product_id", productId);
    // Set this one
    await supabase.from("product_images").update({ is_primary: true } as any).eq("id", img.id);
    // Update main product image
    await supabase.from("shop_products").update({ image_url: img.image_url }).eq("id", productId);
    toast({ title: "Főkép beállítva!" });
    onImagesChange();
  };

  const deleteImage = async (img: ProductImage) => {
    // Extract path from URL
    const path = img.image_url.split("/product-images/")[1];
    if (path) {
      await supabase.storage.from("product-images").remove([path]);
    }
    await supabase.from("product_images").delete().eq("id", img.id);
    
    // If was primary, set next as primary
    if (img.is_primary) {
      const remaining = images.filter(i => i.id !== img.id);
      if (remaining.length > 0) {
        await supabase.from("product_images").update({ is_primary: true } as any).eq("id", remaining[0].id);
        await supabase.from("shop_products").update({ image_url: remaining[0].image_url }).eq("id", productId);
      } else {
        await supabase.from("shop_products").update({ image_url: null }).eq("id", productId);
      }
    }
    
    toast({ title: "Kép törölve!" });
    onImagesChange();
  };

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Image className="h-3.5 w-3.5" /> Termékkép galéria ({images.length} kép)
        </Label>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-none text-xs uppercase tracking-wider"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            {uploading ? "Feltöltés..." : "Képek feltöltése"}
          </Button>
        </div>
      </div>

      {sorted.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {sorted.map(img => (
            <div key={img.id} className={`relative group border ${img.is_primary ? "border-accent ring-1 ring-accent" : "border-border"}`}>
              <img src={img.image_url} alt="" className="w-full aspect-square object-cover" />
              {img.is_primary && (
                <span className="absolute top-1 left-1 bg-accent text-accent-foreground text-[8px] font-bold px-1 py-0.5 uppercase">Fő</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {!img.is_primary && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-accent" onClick={() => setPrimary(img)} title="Beállítás főképnek">
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-destructive" onClick={() => deleteImage(img)} title="Törlés">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed p-6 text-center text-muted-foreground text-sm cursor-pointer hover:border-accent/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-6 w-6 mx-auto mb-2 opacity-50" />
          Kattints vagy húzd ide a képeket
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
