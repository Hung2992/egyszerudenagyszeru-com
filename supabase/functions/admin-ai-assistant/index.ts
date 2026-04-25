import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

const FX_RATES: Record<string, number> = { HUF: 1, EUR: 400, USD: 370 }
const toHuf = (amount: number, currency: string) => amount * (FX_RATES[currency] || 1)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
    const customSystem = typeof body?.system === 'string' ? body.system.trim() : ''
    const clientSystemMessages = Array.isArray(body?.messages)
      ? body.messages.filter((m: any) => m?.role === 'system' && typeof m.content === 'string').map((m: any) => m.content.trim()).filter(Boolean)
      : []
    const messages = Array.isArray(body?.messages)
      ? body.messages.filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      : prompt
        ? [{ role: 'user', content: prompt }]
        : []
    const mode = typeof body?.mode === 'string' ? body.mode : undefined
    const wantsJsonText = Boolean(prompt) && !Array.isArray(body?.messages)

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Hiányzó AI üzenet.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch live data
    const [ordersRes, productsRes, procurementRes, settingsRes] = await Promise.all([
      supabase.from('orders').select('id, status, total_amount, shipping_name, shipping_city, payment_method, created_at, procurement_status, items').order('created_at', { ascending: false }).limit(500),
      supabase.from('shop_products').select('id, name, price, stock, category, is_active, original_price, sizes, colors').order('created_at', { ascending: false }).limit(500),
      supabase.from('admin_procurement_orders').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('store_settings').select('currency, shipping_fee, free_shipping_above').limit(1).single(),
    ])

    const orders = ordersRes.data || []
    const products = productsRes.data || []
    const procurement = procurementRes.data || []
    const storeSettings = settingsRes.data
    const now = new Date()

    // ═══════ FINANCIAL CALCULATIONS ═══════
    const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
    const totalProcCostHuf = procurement.reduce((s: number, p: any) => s + toHuf(Number(p.total_cost) || 0, p.currency), 0)
    const totalProfit = totalRevenue - totalProcCostHuf
    const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'

    // Time-based periods
    const periods = [7, 30, 90].map(days => {
      const since = new Date(now.getTime() - days * 86400000)
      const pOrders = orders.filter((o: any) => new Date(o.created_at) >= since)
      const pProc = procurement.filter((p: any) => new Date(p.created_at) >= since)
      return {
        days,
        orderCount: pOrders.length,
        revenue: pOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0),
        procCost: pProc.reduce((s: number, p: any) => s + toHuf(Number(p.total_cost) || 0, p.currency), 0),
        procCount: pProc.length,
      }
    })

    // ═══════ SUPPLIER DEEP ANALYSIS ═══════
    const supplierMap: Record<string, {
      count: number, costHuf: number, avgUnitCostHuf: number, products: string[],
      avgDeliveryDays: number | null, deliveryCount: number, currencies: Set<string>,
      paidCount: number, pendingCount: number, totalProfit: number,
      reliability: number, lastOrderDate: string | null, onTimeRate: number,
      onTimeCount: number, lateCount: number
    }> = {}

    for (const p of procurement) {
      const name = p.supplier_name
      if (!supplierMap[name]) supplierMap[name] = {
        count: 0, costHuf: 0, avgUnitCostHuf: 0, products: [], avgDeliveryDays: null,
        deliveryCount: 0, currencies: new Set(), paidCount: 0, pendingCount: 0, totalProfit: 0,
        reliability: 100, lastOrderDate: null, onTimeRate: 0, onTimeCount: 0, lateCount: 0
      }
      const s = supplierMap[name]
      s.count++
      const costHuf = toHuf(Number(p.total_cost) || 0, p.currency)
      s.costHuf += costHuf
      s.currencies.add(p.currency)
      if (!s.products.includes(p.product_name)) s.products.push(p.product_name)
      if (p.payment_status === 'paid') s.paidCount++
      else s.pendingCount++
      if (!s.lastOrderDate || p.created_at > s.lastOrderDate) s.lastOrderDate = p.created_at

      // Delivery time + on-time tracking
      if (p.actual_arrival && p.created_at) {
        const deliveryDays = Math.floor((new Date(p.actual_arrival).getTime() - new Date(p.created_at).getTime()) / 86400000)
        if (deliveryDays > 0 && deliveryDays < 365) {
          s.avgDeliveryDays = s.avgDeliveryDays
            ? (s.avgDeliveryDays * s.deliveryCount + deliveryDays) / (s.deliveryCount + 1)
            : deliveryDays
          s.deliveryCount++
          // On-time if delivered within expected or within 21 days for international
          if (p.expected_arrival) {
            if (new Date(p.actual_arrival) <= new Date(p.expected_arrival)) s.onTimeCount++
            else s.lateCount++
          } else {
            if (deliveryDays <= 21) s.onTimeCount++
            else s.lateCount++
          }
        }
      }

      // Profit per supplier
      if (p.selling_price && p.selling_price > 0) {
        s.totalProfit += Number(p.selling_price) - toHuf(Number(p.unit_cost) * Number(p.quantity), p.currency)
      }
    }

    // Calculate supplier scores
    for (const [name, data] of Object.entries(supplierMap)) {
      const items = procurement.filter((p: any) => p.supplier_name === name)
      data.avgUnitCostHuf = items.length > 0
        ? items.reduce((s: number, p: any) => s + toHuf(Number(p.unit_cost), p.currency), 0) / items.length
        : 0
      const totalDeliveries = data.onTimeCount + data.lateCount
      data.onTimeRate = totalDeliveries > 0 ? Math.round((data.onTimeCount / totalDeliveries) * 100) : 0
      // Reliability: base 100, -10 per late, -5 per pending payment
      data.reliability = Math.max(0, Math.min(100,
        100 - (data.lateCount * 10) - (data.pendingCount * 3)
      ))
    }

    // ═══════ PROFIT ANALYSIS ═══════
    const profitItems: { name: string, buyPrice: number, sellPrice: number, profit: number, margin: number, supplier: string, currency: string, quantity: number }[] = []
    for (const p of procurement) {
      if (p.selling_price && p.selling_price > 0) {
        const buyCostHuf = toHuf(Number(p.unit_cost) * Number(p.quantity), p.currency)
        const profit = Number(p.selling_price) - buyCostHuf
        const margin = (profit / Number(p.selling_price)) * 100
        profitItems.push({
          name: p.product_name, buyPrice: buyCostHuf,
          sellPrice: Number(p.selling_price), profit, margin,
          supplier: p.supplier_name, currency: p.currency,
          quantity: Number(p.quantity),
        })
      }
    }
    profitItems.sort((a, b) => b.margin - a.margin)
    const best3 = profitItems.slice(0, 5)
    const worst3 = [...profitItems].sort((a, b) => a.margin - b.margin).slice(0, 5)

    // ═══════ ORDER → PROCUREMENT MATCHING ═══════
    const pendingOrders = orders.filter((o: any) => !o.procurement_status || o.procurement_status === 'pending')
    const pendingItems: { orderId: string, buyer: string, city: string, items: string, amount: number, date: string }[] = []
    for (const o of pendingOrders.slice(0, 30)) {
      const items = Array.isArray(o.items) ? (o.items as any[]).map((i: any) => `${i.name} x${i.quantity}`).join(', ') : 'n/a'
      pendingItems.push({
        orderId: o.id.substring(0, 8), buyer: o.shipping_name || 'N/A',
        city: o.shipping_city || '', items, amount: o.total_amount || 0,
        date: new Date(o.created_at).toLocaleDateString('hu-HU'),
      })
    }

    // ═══════ STALE DETECTION ═══════
    const staleProc = procurement.filter((p: any) => {
      if (p.order_status !== 'ordered' && p.order_status !== 'shipped') return false
      return (now.getTime() - new Date(p.created_at).getTime()) / 86400000 > 14
    })

    // ═══════ STOCK RISK ═══════
    const lowStock = products.filter((p: any) => p.stock <= 5 && p.is_active)
    const outOfStock = products.filter((p: any) => p.stock === 0 && p.is_active)

    // ═══════ TOP SELLING ═══════
    const itemSales: Record<string, { name: string, qty: number, revenue: number }> = {}
    for (const o of orders) {
      if (Array.isArray(o.items)) {
        for (const item of o.items as any[]) {
          const key = item.name || 'unknown'
          if (!itemSales[key]) itemSales[key] = { name: key, qty: 0, revenue: 0 }
          itemSales[key].qty += item.quantity || 1
          itemSales[key].revenue += (item.price || 0) * (item.quantity || 1)
        }
      }
    }
    const topSelling = Object.values(itemSales).sort((a, b) => b.qty - a.qty).slice(0, 10)

    // ═══════ CATEGORY ANALYSIS ═══════
    const categoryStats: Record<string, { revenue: number, count: number }> = {}
    for (const o of orders) {
      if (Array.isArray(o.items)) {
        for (const item of o.items as any[]) {
          const cat = item.category || 'Egyéb'
          if (!categoryStats[cat]) categoryStats[cat] = { revenue: 0, count: 0 }
          categoryStats[cat].revenue += (item.price || 0) * (item.quantity || 1)
          categoryStats[cat].count += item.quantity || 1
        }
      }
    }

    // ═══════ WEEK-OVER-WEEK ═══════
    const thisWeekStart = new Date(now.getTime() - 7 * 86400000)
    const lastWeekStart = new Date(now.getTime() - 14 * 86400000)
    const thisWeekOrders = orders.filter((o: any) => new Date(o.created_at) >= thisWeekStart)
    const lastWeekOrders = orders.filter((o: any) => {
      const d = new Date(o.created_at)
      return d >= lastWeekStart && d < thisWeekStart
    })
    const thisWeekRevenue = thisWeekOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
    const lastWeekRevenue = lastWeekOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
    const revenueChange = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100).toFixed(0) : 'n/a'

    // ═══════ ROI ═══════
    const totalPaidProcCost = procurement
      .filter((p: any) => p.payment_status === 'paid')
      .reduce((s: number, p: any) => s + toHuf(Number(p.total_cost) || 0, p.currency), 0)
    const roi = totalPaidProcCost > 0 ? ((totalRevenue - totalPaidProcCost) / totalPaidProcCost * 100).toFixed(0) : 'n/a'

    // ═══════ CASH FLOW FORECAST ═══════
    const unpaidProcCost = procurement
      .filter((p: any) => p.payment_status !== 'paid')
      .reduce((s: number, p: any) => s + toHuf(Number(p.total_cost) || 0, p.currency), 0)
    const pendingRevenue = pendingOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
    const cashFlowProjection = pendingRevenue - unpaidProcCost

    // ═══════ SEASONAL / MONTHLY TRENDS ═══════
    const monthlyData: Record<string, { revenue: number, procCost: number, orderCount: number, procCount: number }> = {}
    for (const o of orders) {
      const month = o.created_at.substring(0, 7) // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = { revenue: 0, procCost: 0, orderCount: 0, procCount: 0 }
      monthlyData[month].revenue += o.total_amount || 0
      monthlyData[month].orderCount++
    }
    for (const p of procurement) {
      const month = p.created_at.substring(0, 7)
      if (!monthlyData[month]) monthlyData[month] = { revenue: 0, procCost: 0, orderCount: 0, procCount: 0 }
      monthlyData[month].procCost += toHuf(Number(p.total_cost) || 0, p.currency)
      monthlyData[month].procCount++
    }
    const sortedMonths = Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)

    // ═══════ PAYMENT METHOD ANALYSIS ═══════
    const paymentMethods: Record<string, { count: number, total: number }> = {}
    for (const o of orders) {
      const method = o.payment_method || 'Egyéb'
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 }
      paymentMethods[method].count++
      paymentMethods[method].total += o.total_amount || 0
    }

    // ═══════ PROCUREMENT STATUS SUMMARY ═══════
    const procByStatus: Record<string, number> = {}
    const procByPayment: Record<string, number> = {}
    for (const p of procurement) {
      procByStatus[p.order_status] = (procByStatus[p.order_status] || 0) + 1
      procByPayment[p.payment_status] = (procByPayment[p.payment_status] || 0) + 1
    }

    // ═══════ REORDER + DEMAND VELOCITY ═══════
    const reorderSuggestions: string[] = []
    for (const prod of lowStock) {
      const matchingProc = procurement.filter((p: any) =>
        p.linked_product_id === prod.id || p.product_name.toLowerCase().includes(prod.name.toLowerCase().substring(0, 10))
      )
      const bestSupplier = matchingProc.length > 0 ? matchingProc[0].supplier_name : 'Ismeretlen'
      const lastCost = matchingProc.length > 0 ? `${matchingProc[0].unit_cost} ${matchingProc[0].currency}` : 'n/a'
      reorderSuggestions.push(`| ${prod.name} | ${prod.stock} db | ${bestSupplier} | ${lastCost} | ${prod.price} Ft |`)
    }

    const demandVelocity: { name: string, weeklyRate: number, daysUntilOut: number | null, suggestedOrder: number }[] = []
    for (const prod of products.filter((p: any) => p.is_active)) {
      const sales = itemSales[prod.name]
      if (sales && sales.qty > 0) {
        const daysCovered = Math.min(90, Math.floor((now.getTime() - new Date(orders[orders.length - 1]?.created_at || now).getTime()) / 86400000) || 30)
        const dailyRate = sales.qty / daysCovered
        const weeklyRate = dailyRate * 7
        const daysUntilOut = dailyRate > 0 ? Math.floor(prod.stock / dailyRate) : null
        // Suggest ordering enough for 30 days
        const suggestedOrder = dailyRate > 0 ? Math.ceil(dailyRate * 30) - prod.stock : 0
        if (daysUntilOut !== null && daysUntilOut <= 45) {
          demandVelocity.push({ name: prod.name, weeklyRate: Math.round(weeklyRate * 10) / 10, daysUntilOut, suggestedOrder: Math.max(0, suggestedOrder) })
        }
      }
    }
    demandVelocity.sort((a, b) => (a.daysUntilOut || 999) - (b.daysUntilOut || 999))

    // ═══════ AVG ORDER VALUE ═══════
    const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0
    const avgOrderValueThisWeek = thisWeekOrders.length > 0 ? Math.round(thisWeekRevenue / thisWeekOrders.length) : 0

    // ═══════ CITY / LOGISTICS ANALYSIS ═══════
    const cityStats: Record<string, { count: number, revenue: number }> = {}
    for (const o of orders) {
      const city = o.shipping_city || 'Ismeretlen'
      if (!cityStats[city]) cityStats[city] = { count: 0, revenue: 0 }
      cityStats[city].count++
      cityStats[city].revenue += o.total_amount || 0
    }
    const topCities = Object.entries(cityStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)

    // ═══════ FULFILLMENT RATE ═══════
    const fulfilledOrders = orders.filter((o: any) => o.status === 'delivered' || o.status === 'shipped' || o.status === 'completed')
    const fulfillmentRate = orders.length > 0 ? Math.round((fulfilledOrders.length / orders.length) * 100) : 0

    // ═══════ CROSS-SUPPLIER PRODUCT COMPARISON ═══════
    const productSuppliers: Record<string, { supplier: string, unitCostHuf: number, currency: string, deliveryDays: number | null }[]> = {}
    for (const p of procurement) {
      const pName = p.product_name.toLowerCase().trim()
      if (!productSuppliers[pName]) productSuppliers[pName] = []
      const deliveryDays = (p.actual_arrival && p.created_at)
        ? Math.floor((new Date(p.actual_arrival).getTime() - new Date(p.created_at).getTime()) / 86400000)
        : null
      productSuppliers[pName].push({
        supplier: p.supplier_name,
        unitCostHuf: toHuf(Number(p.unit_cost), p.currency),
        currency: p.currency,
        deliveryDays,
      })
    }
    const multiSupplierProducts = Object.entries(productSuppliers)
      .filter(([_, suppliers]) => {
        const uniqueSuppliers = new Set(suppliers.map(s => s.supplier))
        return uniqueSuppliers.size > 1
      })
      .slice(0, 10)

    // ═══════ BULK ORDER SIMULATION ═══════
    const bulkOpportunities: string[] = []
    for (const [name, data] of Object.entries(supplierMap)) {
      if (data.count >= 3 && data.avgUnitCostHuf > 0) {
        const bulk5pct = data.avgUnitCostHuf * 0.95
        const bulk10pct = data.avgUnitCostHuf * 0.90
        const totalQty = procurement.filter((p: any) => p.supplier_name === name).reduce((s: number, p: any) => s + Number(p.quantity), 0)
        bulkOpportunities.push(`| ${name} | ${totalQty} db | ${data.avgUnitCostHuf.toFixed(0)} Ft | ${bulk5pct.toFixed(0)} Ft (-5%) | ${bulk10pct.toFixed(0)} Ft (-10%) | ${((data.avgUnitCostHuf - bulk10pct) * totalQty).toFixed(0)} Ft |`)
      }
    }

    // ═══════ ORDER AGING ═══════
    const orderAging = {
      fresh: orders.filter((o: any) => (now.getTime() - new Date(o.created_at).getTime()) / 86400000 <= 3).length,
      week: orders.filter((o: any) => { const d = (now.getTime() - new Date(o.created_at).getTime()) / 86400000; return d > 3 && d <= 7 }).length,
      twoWeeks: orders.filter((o: any) => { const d = (now.getTime() - new Date(o.created_at).getTime()) / 86400000; return d > 7 && d <= 14 }).length,
      old: orders.filter((o: any) => (now.getTime() - new Date(o.created_at).getTime()) / 86400000 > 14).length,
    }

    // ═══════ DAILY REVENUE TREND (last 14 days) ═══════
    const dailyRevenue: { date: string, revenue: number, orders: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 86400000)
      const dayStr = dayStart.toISOString().split('T')[0]
      const dayOrders = orders.filter((o: any) => o.created_at.startsWith(dayStr))
      dailyRevenue.push({
        date: dayStr.substring(5),
        revenue: dayOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0),
        orders: dayOrders.length,
      })
    }

    // ═══════ ABC INVENTORY ANALYSIS ═══════
    const sortedByRevenue = [...topSelling].sort((a, b) => b.revenue - a.revenue)
    const totalItemRevenue = sortedByRevenue.reduce((s, t) => s + t.revenue, 0)
    let cumulativeRevenue = 0
    const abcClassification: { name: string, revenue: number, pct: number, cumPct: number, class: string }[] = []
    for (const item of sortedByRevenue) {
      cumulativeRevenue += item.revenue
      const pct = totalItemRevenue > 0 ? (item.revenue / totalItemRevenue * 100) : 0
      const cumPct = totalItemRevenue > 0 ? (cumulativeRevenue / totalItemRevenue * 100) : 0
      const cls = cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C'
      abcClassification.push({ name: item.name, revenue: item.revenue, pct: Math.round(pct), cumPct: Math.round(cumPct), class: cls })
    }

    // ═══════ CUSTOMER REPEAT RATE ═══════
    const customerOrders: Record<string, number> = {}
    for (const o of orders) {
      const key = (o.shipping_name || 'unknown').toLowerCase().trim()
      customerOrders[key] = (customerOrders[key] || 0) + 1
    }
    const uniqueCustomers = Object.keys(customerOrders).length
    const repeatCustomers = Object.values(customerOrders).filter(c => c > 1).length
    const repeatRate = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0
    const topCustomers = Object.entries(customerOrders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // ═══════ PROCUREMENT EFFICIENCY SCORE ═══════
    const totalProcOrders = procurement.length
    const deliveredOnTime = procurement.filter((p: any) => {
      if (!p.actual_arrival || !p.expected_arrival) return false
      return new Date(p.actual_arrival) <= new Date(p.expected_arrival)
    }).length
    const withTracking = procurement.filter((p: any) => p.tracking_number).length
    const withSellingPrice = procurement.filter((p: any) => p.selling_price && Number(p.selling_price) > 0).length
    const procEfficiency = totalProcOrders > 0 ? Math.round(
      (deliveredOnTime / Math.max(1, procurement.filter((p: any) => p.actual_arrival && p.expected_arrival).length) * 30) +
      (withTracking / totalProcOrders * 20) +
      (withSellingPrice / totalProcOrders * 25) +
      (procurement.filter((p: any) => p.payment_status === 'paid').length / totalProcOrders * 25)
    ) : 0

    // ═══════ AUTO PRIORITY ACTION ITEMS ═══════
    const actionItems: { priority: string, emoji: string, text: string }[] = []
    if (outOfStock.length > 0) actionItems.push({ priority: 'KRITIKUS', emoji: '🔴', text: `${outOfStock.length} termék kifogyott — azonnali beszerzés szükséges` })
    if (staleProc.length > 0) actionItems.push({ priority: 'SÜRGŐS', emoji: '🟠', text: `${staleProc.length} beszerzés >14 napja elakadt — reklamáció szükséges` })
    if (cashFlowProjection < 0) actionItems.push({ priority: 'FIGYELEM', emoji: '🟡', text: `Negatív cash flow kilátás: ${cashFlowProjection.toLocaleString('hu-HU')} Ft — fizetések ütemezése` })
    const lowMarginItems = profitItems.filter(p => p.margin < 30)
    if (lowMarginItems.length > 0) actionItems.push({ priority: 'OPTIMALIZÁLÁS', emoji: '🟡', text: `${lowMarginItems.length} termék <30% marginnal — áremelés javaslat` })
    if (pendingOrders.length > 5) actionItems.push({ priority: 'TEENDŐ', emoji: '🔵', text: `${pendingOrders.length} rendelés vár beszerzésre` })
    const unreliableSuppliers = Object.entries(supplierMap).filter(([_, d]) => d.reliability < 50)
    if (unreliableSuppliers.length > 0) actionItems.push({ priority: 'FIGYELEM', emoji: '🟡', text: `${unreliableSuppliers.length} beszállító megbízhatósága <50% — alternatíva keresés` })
    if (demandVelocity.filter(d => d.daysUntilOut !== null && d.daysUntilOut <= 14).length > 0) {
      actionItems.push({ priority: 'SÜRGŐS', emoji: '🟠', text: `${demandVelocity.filter(d => d.daysUntilOut !== null && d.daysUntilOut <= 14).length} termék 2 héten belül kifogy — sürgős rendelés` })
    }

    // ═══════ PRODUCT PERFORMANCE SCORE ═══════
    const productScores: { name: string, score: number, salesRank: number, marginRank: number, stockStatus: string }[] = []
    for (const prod of products.filter((p: any) => p.is_active).slice(0, 30)) {
      const sales = itemSales[prod.name]
      const procMatch = profitItems.find(p => p.name.toLowerCase().includes(prod.name.toLowerCase().substring(0, 8)))
      const salesScore = sales ? Math.min(40, (sales.qty / Math.max(1, topSelling[0]?.qty || 1)) * 40) : 0
      const marginScore = procMatch ? Math.min(30, (procMatch.margin / 100) * 30) : 15
      const stockScore = prod.stock === 0 ? 0 : prod.stock <= 5 ? 10 : 30
      productScores.push({
        name: prod.name,
        score: Math.round(salesScore + marginScore + stockScore),
        salesRank: sales?.qty || 0,
        marginRank: procMatch?.margin || 0,
        stockStatus: prod.stock === 0 ? '🔴' : prod.stock <= 5 ? '🟡' : '🟢',
      })
    }
    productScores.sort((a, b) => b.score - a.score)

    // ═══════ BUILD SYSTEM PROMPT ═══════
    const isProcurementMode = mode === 'procurement'

    const supplierTable = Object.entries(supplierMap)
      .sort((a, b) => b[1].costHuf - a[1].costHuf)
      .map(([name, d]) => {
        const deliveryStr = d.avgDeliveryDays ? `~${Math.round(d.avgDeliveryDays)} nap` : 'n/a'
        const profitStr = d.totalProfit ? `${d.totalProfit.toFixed(0)} Ft` : 'n/a'
        const scoreEmoji = d.reliability >= 80 ? '🟢' : d.reliability >= 50 ? '🟡' : '🔴'
        return `| ${scoreEmoji} ${name} | ${d.count} | ${d.costHuf.toLocaleString('hu-HU')} Ft | ${d.avgUnitCostHuf.toFixed(0)} Ft | ${deliveryStr} | ${d.onTimeRate}% | ${d.paidCount}/${d.pendingCount} | ${profitStr} | ${d.reliability}/100 |`
      }).join('\n') || 'Nincs beszállítói adat'

    const profitTable = profitItems.slice(0, 25).map(p =>
      `| ${p.name} | ${p.buyPrice.toFixed(0)} Ft | ${p.sellPrice} Ft | ${p.profit.toFixed(0)} Ft | ${p.margin.toFixed(0)}% | ${p.supplier} | x${p.quantity} |`
    ).join('\n') || 'Nincs profit adat'

    const pendingTable = pendingItems.map(p =>
      `| #${p.orderId} | ${p.buyer} | ${p.city} | ${p.amount} Ft | ${p.items} | ${p.date} |`
    ).join('\n') || 'Nincs beszerzésre váró'

    const procDetailList = procurement.slice(0, 60).map((p: any) => {
      const profitStr = p.selling_price ? (Number(p.selling_price) - toHuf(Number(p.unit_cost) * Number(p.quantity), p.currency)).toFixed(0) : 'n/a'
      const daysAgo = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / 86400000)
      const deliveryStr = p.actual_arrival ? `${Math.floor((new Date(p.actual_arrival).getTime() - new Date(p.created_at).getTime()) / 86400000)} nap` : '-'
      return `| ${p.product_name} | ${p.supplier_name} | ${p.unit_cost} ${p.currency} x${p.quantity} | ${toHuf(Number(p.total_cost) || 0, p.currency).toFixed(0)} Ft | ${p.selling_price || '-'} | ${profitStr} | ${p.order_status} | ${p.payment_status} | ${daysAgo}d | ${deliveryStr} |`
    }).join('\n') || 'Nincs beszerzés'

    const staleList = staleProc.map((p: any) => {
      const daysAgo = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / 86400000)
      return `⚠️ **${p.product_name}** (${p.supplier_name}) - ${daysAgo} napja "${p.order_status}" - tracking: ${p.tracking_number || 'nincs'}`
    }).join('\n') || '✅ Nincs elakadt beszerzés'

    const lowStockList = lowStock.map((p: any) =>
      `| ${p.name} | ${p.stock} db | ${p.category} | ${p.price} Ft |`
    ).join('\n') || '✅ Nincs alacsony készletű termék'

    const topSellingList = topSelling.map((t, i) =>
      `| ${i + 1}. | ${t.name} | ${t.qty} db | ${t.revenue.toLocaleString('hu-HU')} Ft |`
    ).join('\n') || 'Nincs eladási adat'

    const categoryList = Object.entries(categoryStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([cat, d]) => `| ${cat} | ${d.count} db | ${d.revenue.toLocaleString('hu-HU')} Ft |`)
      .join('\n') || 'Nincs kategória adat'

    const monthlyTable = sortedMonths.map(([month, d]) =>
      `| ${month} | ${d.orderCount} | ${d.revenue.toLocaleString('hu-HU')} Ft | ${d.procCost.toLocaleString('hu-HU')} Ft | ${(d.revenue - d.procCost).toLocaleString('hu-HU')} Ft | ${d.revenue > 0 ? ((d.revenue - d.procCost) / d.revenue * 100).toFixed(0) : 0}% |`
    ).join('\n') || 'Nincs havi adat'

    const paymentMethodTable = Object.entries(paymentMethods)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([method, d]) => `| ${method} | ${d.count} db | ${d.total.toLocaleString('hu-HU')} Ft |`)
      .join('\n') || 'Nincs fizetési adat'

    const procStatusTable = Object.entries(procByStatus)
      .map(([status, count]) => `| ${status} | ${count} db |`)
      .join('\n') || 'Nincs státusz adat'

    const procPaymentTable = Object.entries(procByPayment)
      .map(([status, count]) => `| ${status} | ${count} db |`)
      .join('\n') || 'Nincs fizetési adat'

    const systemPrompt = `Te egy magyar nyelvű, profi AI beszerzési és üzleti asszisztens vagy az "Egyszerű de Nagyszerű" streetwear webshophoz.
Válaszaidban MINDIG használj **markdown formázást**: táblázatok, vastag betűk, listák, emoji-k. Légy tömör de informatív.
Ha kérdeznek, adj **konkrét, akcióképes** javaslatokat számokkal.

## ÜZLETI MODELL
- Vásárlók rendelnek → készpénzzel fizetnek átvételkor
- Admin előre rendeli a termékeket beszállítóktól (Shein, AliExpress, Zara, Temu) **bankkártyával**
- **Profit = eladási ár − beszerzési ár** (HUF-ban számolva, átváltással)
- Átváltási árfolyamok: 1 EUR ≈ 400 Ft, 1 USD ≈ 370 Ft
- Szállítási díj: ${storeSettings?.shipping_fee || 0} Ft, ingyenes ${storeSettings?.free_shipping_above || 0} Ft felett

---

## 📊 PÉNZÜGYI DASHBOARD
| Mutató | Érték |
|--------|-------|
| **Össz bevétel** | ${totalRevenue.toLocaleString('hu-HU')} Ft |
| **Beszerzési költség (HUF)** | ${totalProcCostHuf.toLocaleString('hu-HU')} Ft |
| **Nettó profit** | ${totalProfit.toLocaleString('hu-HU')} Ft |
| **Átlagos margin** | ${marginPct}% |
| **ROI** | ${roi}% |
| **Heti bevétel változás** | ${revenueChange}% (ez a hét vs előző) |
| **Átl. rendelési érték** | ${avgOrderValue.toLocaleString('hu-HU')} Ft |
| **Átl. rendelési érték (hét)** | ${avgOrderValueThisWeek.toLocaleString('hu-HU')} Ft |

### 💵 CASH FLOW ELŐREJELZÉS
| Mutató | Összeg |
|--------|--------|
| Várakozó bevétel (pending rendelések) | ${pendingRevenue.toLocaleString('hu-HU')} Ft |
| Kifizetetlen beszerzési költség | ${unpaidProcCost.toLocaleString('hu-HU')} Ft |
| **Nettó cash flow kilátás** | **${cashFlowProjection.toLocaleString('hu-HU')} Ft** |

### Időszakos bontás
| Időszak | Rendelések | Bevétel | Besz. költség | Profit |
|---------|-----------|---------|--------------|--------|
${periods.map(p => `| Elmúlt ${p.days} nap | ${p.orderCount} db | ${p.revenue.toLocaleString('hu-HU')} Ft | ${p.procCost.toLocaleString('hu-HU')} Ft | ${(p.revenue - p.procCost).toLocaleString('hu-HU')} Ft |`).join('\n')}

### 📅 HAVI TREND (utolsó 6 hónap)
| Hónap | Rendelések | Bevétel | Besz. költség | Profit | Margin |
|-------|-----------|---------|--------------|--------|--------|
${monthlyTable}

---

## 🏭 BESZÁLLÍTÓ SCORECARD
| Név | Rendelések | Össz költség | Átl. egységár | Szállítás | Időben% | Fizet/Függ | Profit | Pontszám |
|-----|-----------|-------------|--------------|-----------|---------|-----------|--------|----------|
${supplierTable}

---

## 📦 BESZERZÉSRE VÁRÓ RENDELÉSEK (${pendingOrders.length} db)
| Rendelés | Vevő | Város | Összeg | Tételek | Dátum |
|----------|------|-------|--------|---------|-------|
${pendingTable}

---

## 📋 BESZERZÉSEK RÉSZLETESEN (${procurement.length} db)
| Termék | Beszállító | Egységár | Össz (HUF) | Eladás | Profit | Státusz | Fizetés | Kor | Kézbesítés |
|--------|-----------|---------|-----------|--------|--------|---------|---------|-----|-----------|
${procDetailList}

### Beszerzési státusz összesítő
| Státusz | Darab |
|---------|-------|
${procStatusTable}

### Fizetési státusz összesítő
| Fizetési állapot | Darab |
|-----------------|-------|
${procPaymentTable}

---

## 💰 PROFIT RANGSOR
| Termék | Beszerzés (HUF) | Eladás | Profit | Margin | Beszállító | Qty |
|--------|----------------|--------|--------|--------|-----------|-----|
${profitTable}

${best3.length > 0 ? `\n🏆 **TOP 5 legjobb margin:**\n${best3.map((p, i) => `${i + 1}. **${p.name}** — ${p.margin.toFixed(0)}% margin, ${p.profit.toFixed(0)} Ft profit (${p.supplier})`).join('\n')}` : ''}
${worst3.length > 0 ? `\n⚠️ **TOP 5 leggyengébb margin:**\n${worst3.map((p, i) => `${i + 1}. **${p.name}** — ${p.margin.toFixed(0)}% margin, ${p.profit.toFixed(0)} Ft profit (${p.supplier})`).join('\n')}` : ''}

---

## 🔥 TOP ELADOTT TERMÉKEK
| # | Termék | Mennyiség | Bevétel |
|---|--------|----------|---------|
${topSellingList}

## 📂 KATEGÓRIA STATISZTIKA
| Kategória | Eladott db | Bevétel |
|----------|-----------|---------|
${categoryList}

## 💳 FIZETÉSI MÓDOK
| Mód | Rendelések | Összeg |
|-----|-----------|--------|
${paymentMethodTable}

---

## ⚠️ KÉSZLETRIASZTÁS
**Kifogyott (0 db):** ${outOfStock.length} termék
**Alacsony készlet (≤5 db):**
| Termék | Készlet | Kategória | Ár |
|--------|--------|----------|-----|
${lowStockList}

## ⏰ ELAKADT BESZERZÉSEK (>14 napja folyamatban)
${staleList}

---

## 🏪 KÉSZLET ÖSSZESÍTÉS
- Aktív termékek: ${products.filter((p: any) => p.is_active).length} / ${products.length}
- Kifogyott: ${outOfStock.length}
- Alacsony készlet: ${lowStock.length}

## 🔄 ÚJRARENDELÉSI JAVASLATOK
| Termék | Készlet | Utolsó beszállító | Utolsó ár | Eladási ár |
|--------|--------|-------------------|----------|-----------|
${reorderSuggestions.join('\n') || '✅ Nincs sürgős újrarendelés'}

## 📈 KERESLET ELŐREJELZÉS (≤45 napon belül kifogy)
| Termék | Heti eladás | Napok a kifogyásig | Javasolt rendelés (30 napra) |
|--------|-----------|-------------------|---------------------------|
${demandVelocity.map(d => `| ${d.name} | ~${d.weeklyRate} db/hét | **${d.daysUntilOut} nap** | ${d.suggestedOrder} db |`).join('\n') || '✅ Nincs veszélyeztetett termék'}

---

## 🏙️ TOP VÁROSOK (logisztika)
| Város | Rendelések | Bevétel |
|-------|-----------|---------|
${topCities.map(([city, d]) => `| ${city} | ${d.count} db | ${d.revenue.toLocaleString('hu-HU')} Ft |`).join('\n') || 'Nincs város adat'}

## 📊 RENDELÉS TELJESÍTÉS
- Teljesítési ráta: **${fulfillmentRate}%** (${fulfilledOrders.length}/${orders.length})
- Rendelés öregedés: 🟢 ≤3 nap: ${orderAging.fresh} | 🟡 4-7 nap: ${orderAging.week} | 🟠 8-14 nap: ${orderAging.twoWeeks} | 🔴 >14 nap: ${orderAging.old}

## 📉 NAPI BEVÉTEL TREND (14 nap)
| Dátum | Bevétel | Rendelések |
|-------|---------|-----------|
${dailyRevenue.map(d => `| ${d.date} | ${d.revenue.toLocaleString('hu-HU')} Ft | ${d.orders} db |`).join('\n')}

${multiSupplierProducts.length > 0 ? `
## 🔄 TERMÉK-BESZÁLLÍTÓ ÖSSZEHASONLÍTÁS (több forrásból rendelt)
${multiSupplierProducts.map(([pName, suppliers]) => {
  const lines = suppliers.map(s => `  - **${s.supplier}**: ${s.unitCostHuf.toFixed(0)} Ft/db (${s.currency})${s.deliveryDays ? `, ${s.deliveryDays} nap` : ''}`)
  return `**${pName}:**\n${lines.join('\n')}`
}).join('\n\n')}
` : ''}

${bulkOpportunities.length > 0 ? `
## 📦 TÖMEGES RENDELÉSI LEHETŐSÉGEK (szimulált kedvezmény)
| Beszállító | Eddigi qty | Átl. egységár | -5% ár | -10% ár | Megtakarítás (-10%) |
|-----------|-----------|--------------|--------|---------|-------------------|
${bulkOpportunities.join('\n')}
` : ''}

---

## 🎯 ABC ELEMZÉS (termékek bevétel-hozzájárulás szerint)
| Termék | Bevétel | % | Kumulált % | Osztály |
|--------|---------|---|-----------|---------|
${abcClassification.map(a => `| ${a.class === 'A' ? '⭐' : a.class === 'B' ? '🔹' : '⚪'} ${a.name} | ${a.revenue.toLocaleString('hu-HU')} Ft | ${a.pct}% | ${a.cumPct}% | **${a.class}** |`).join('\n') || 'Nincs adat'}
> A = top 80% bevétel (fókusz), B = 80-95% (normál), C = 95-100% (megfontolás)

## 👥 VÁSÁRLÓI HŰSÉG
| Mutató | Érték |
|--------|-------|
| Egyedi vásárlók | ${uniqueCustomers} fő |
| Visszatérő vásárlók | ${repeatCustomers} fő (${repeatRate}%) |
| Átl. rendelés/vásárló | ${uniqueCustomers > 0 ? (orders.length / uniqueCustomers).toFixed(1) : '0'} |

### Top vásárlók
| Név | Rendelések |
|-----|-----------|
${topCustomers.map(([name, count]) => `| ${name} | ${count} db |`).join('\n') || 'Nincs adat'}

## ⚙️ BESZERZÉSI HATÉKONYSÁG: **${procEfficiency}/100**
| Dimenzió | Pontszám |
|----------|----------|
| Időben érkezett (30p) | ${totalProcOrders > 0 ? Math.round(deliveredOnTime / Math.max(1, procurement.filter((p: any) => p.actual_arrival && p.expected_arrival).length) * 30) : 0}/30 |
| Tracking szám (20p) | ${totalProcOrders > 0 ? Math.round(withTracking / totalProcOrders * 20) : 0}/20 |
| Eladási ár kitöltve (25p) | ${totalProcOrders > 0 ? Math.round(withSellingPrice / totalProcOrders * 25) : 0}/25 |
| Kifizetett (25p) | ${totalProcOrders > 0 ? Math.round(procurement.filter((p: any) => p.payment_status === 'paid').length / totalProcOrders * 25) : 0}/25 |

## 🚨 PRIORITÁSOS TEENDŐK
${actionItems.length > 0 ? actionItems.map(a => `${a.emoji} **[${a.priority}]** ${a.text}`).join('\n') : '✅ Nincs sürgős teendő!'}

## 🏅 TERMÉK TELJESÍTMÉNY RANGSOR (top 15)
| Termék | Pontszám | Eladás | Margin | Készlet |
|--------|----------|--------|--------|---------|
${productScores.slice(0, 15).map(p => `| ${p.name} | **${p.score}/100** | ${p.salesRank} db | ${p.marginRank > 0 ? p.marginRank.toFixed(0) + '%' : 'n/a'} | ${p.stockStatus} |`).join('\n') || 'Nincs adat'}

---

${isProcurementMode ? `
## 🤖 BESZERZÉSI ASSZISZTENS SPECIÁLIS UTASÍTÁSOK
Te a BESZERZÉS fülön dolgozol. Kiemelt feladataid:

1. **BESZERZÉSI ELEMZÉS**: beszállítók összehasonlítása (ár, szállítási idő, megbízhatóság, scorecard)
2. **ÁRAZÁSI TANÁCSADÓ**: beszerzési ár → 2x/2.5x/3x árrés kiszámítás
3. **DEVIZA KEZELÉS**: EUR/USD → HUF konverzió
4. **ABC ELEMZÉS**: A kategóriás termékekre fókusz, C kategóriás termékek értékelése
5. **VÁSÁRLÓI HŰSÉG**: visszatérő vásárlók trendje, VIP kiszolgálás
6. **HATÉKONYSÁG**: beszerzési hatékonysági score javítás
7. **TERMÉK PERFORMANCE**: teljesítmény rangsor, alulteljesítők azonosítása
8. **PRIORITÁSOK**: mindig kezdd a legfontosabb teendőkkel
9. **KÖLTSÉGOPTIMALIZÁLÁS**: tömeges rendelés szimuláció, beszállító váltás
10. **CASH FLOW**: bevételek vs kiadások, tőkeigény

FONTOS: **Konkrét számokkal, táblázatokkal** válaszolj. Adj **3 szintű javaslatot**: konzervatív / optimális / agresszív.
` : `
## ÁLTALÁNOS ASSZISZTENS UTASÍTÁSOK
1. Válaszolj bármilyen webshop kérdésre: rendelések, beszerzés, készlet, profit
2. Adj üzleti tanácsokat és árazási javaslatokat
3. Használj táblázatokat és markdown formázást
`}

Mindig magyarul válaszolj. Légy profi, tömör, és adj akcióképes tanácsokat.`

    const extraSystem = [customSystem, ...clientSystemMessages].filter(Boolean).join('\n\n')
    const finalSystemPrompt = extraSystem ? `${systemPrompt}\n\n## SPECIÁLIS UTASÍTÁS\n${extraSystem}` : systemPrompt

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + LOVABLE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          ...messages,
        ],
        stream: !wantsJsonText,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Túl sok kérés, próbáld újra később.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI kredit elfogyott.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const t = await response.text()
      console.error('AI gateway error:', response.status, t)
      return new Response(JSON.stringify({ error: 'AI hiba' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (wantsJsonText) {
      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content || ''
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    })
  } catch (error) {
    console.error('Admin AI error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Ismeretlen hiba' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
