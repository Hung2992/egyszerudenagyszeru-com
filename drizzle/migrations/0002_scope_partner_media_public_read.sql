-- A partner-képek tárolója privát; a publikus olvasást csak a valóban megjelenített objektumokra engedjük.

drop policy if exists "Public read partner-product-images" on storage.objects;
drop policy if exists "Public read partner-storefront-media" on storage.objects;

create policy "Public read referenced partner-product-images"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'partner-product-images'
  and (
    exists (
      select 1 from public.partner_products p
      where p.status = 'active' and p.images @> jsonb_build_array(objects.name)
    )
    or exists (
      select 1 from public.partner_storefronts s
      where s.is_published
        and objects.name in (s.hero_image_url, s.banner_url, s.logo_url, s.og_image_url, s.section1_image_url, s.section2_image_url)
    )
  )
);

create policy "Public read referenced partner-storefront-media"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'partner-storefront-media'
  and (
    exists (
      select 1 from public.partner_storefronts s
      where s.is_published
        and objects.name in (s.hero_image_url, s.banner_url, s.logo_url, s.og_image_url, s.section1_image_url, s.section2_image_url)
    )
    or exists (
      select 1 from public.partner_products p
      where p.status = 'active' and p.images @> jsonb_build_array(objects.name)
    )
  )
);

create policy "Partners read own partner-product-images"
on storage.objects for select to authenticated
using (
  bucket_id = 'partner-product-images'
  and exists (
    select 1 from public.partners p
    where p.user_id = auth.uid() and (storage.foldername(objects.name))[1] = p.id::text
  )
);

create policy "Partners read own partner-storefront-media"
on storage.objects for select to authenticated
using (
  bucket_id = 'partner-storefront-media'
  and exists (
    select 1 from public.partners p
    where p.user_id = auth.uid() and (storage.foldername(objects.name))[1] = p.id::text
  )
);