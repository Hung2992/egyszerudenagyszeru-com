import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getOrCreateVisitorId(): string {
  const key = "edn_vid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getSessionId(): string {
  const key = "edn_sid";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export const usePageTracking = () => {
  const location = useLocation();
  const lastTracked = useRef<string>("");
  const lastTrackedTime = useRef<number>(0);

  useEffect(() => {
    // Don't track admin pages
    if (location.pathname.startsWith("/admin")) return;

    const now = Date.now();
    const dedupKey = `${getSessionId()}:${location.pathname}`;
    
    // Deduplicate: same page + same session within 30 seconds → skip
    if (dedupKey === lastTracked.current && now - lastTrackedTime.current < 30000) {
      return;
    }

    lastTracked.current = dedupKey;
    lastTrackedTime.current = now;

    const track = async () => {
      try {
        await supabase.from("page_views").insert({
          page: location.pathname,
          referrer: document.referrer || null,
          device_type: getDeviceType(),
          user_agent: navigator.userAgent.slice(0, 200),
          session_id: getSessionId(),
          visitor_id: getOrCreateVisitorId(),
        });
      } catch {
        // Silent fail — tracking should never break the app
      }
    };

    track();
  }, [location.pathname]);
};
