# APEX Modem Bridge — saját GSM/LTE SMS átjáró bekötése

Ez a dokumentum írja le, hogyan kapcsolódik az APEX Communication Gateway egy saját
GSM/LTE modemhez vagy SMS Gateway eszközhöz. A szoftver oldal kész: az APEX átjáró
`apex_modem` illesztője HTTP-n keresztül adja át az SMS-t a modem mellé telepített
kis „bridge" programnak, a modem pedig a SIM-kártyán keresztül a mobilhálózatba küldi.

## 1. Ami fizikailag kell

| Komponens | Megjegyzés |
|---|---|
| GSM/LTE modem vagy SMS Gateway eszköz | Pl. ipari USB/RS232 modem (Quectel, SIMCom, Telit), vagy Android-alapú SMS gateway készülék. A modem támogassa az AT-parancsokat vagy legyen rajta gyári HTTP API. |
| SIM-kártya + mobil-előfizetés | Üzleti forgalomhoz a szolgáltatóval egyeztetett üzleti/aggregátor díjcsomag kell — egyes szolgáltatók tiltják a SIM-ből küldött tömeges (A2P) üzenetet. |
| Mobilhálózati lefedettség | A modem telepítési helyén stabil térerő kell; antenna javíthat. |
| Egy kis gép a modem mellé | Raspberry Pi vagy bármilyen szerver, amelyen fut a bridge és eléri a modemet (USB/soros/LAN). |
| Szolgáltatói/hatósági feltételek | Nagyobb üzleti SMS-forgalomnál távközlési szabályozás vonatkozik rád (azonosító használat, adatkezelés, opt-out). Magyarországon az NMHH előírásai az irányadók. |

## 2. Architektúra

```text
APEX webshop esemény
  → messaging_outbox (várólista, retry, opt-out, rate limit)
  → APEX gatewaySend (routing szabályok, tiltólista, throughput)
  → apex_modem illesztő  ──HTTP──>  Modem Bridge (saját gép, modem mellett)
                                       → AT-parancs / gyári API → GSM/LTE modem
                                       → SIM → mobilhálózat → címzett
  Modem Bridge ──HTTP──> comm-status-callback (DLR: delivered / rejected / undeliverable)
```

A bridge a kötelező köztes réteg: az APEX nem közvetlenül a modemet hívja, hanem egy
saját HTTP API-t, így a modem típusa szabadon cserélhető.

## 3. A Modem Bridge szoftver

A bridge egy kis szolgáltatás (bármilyen nyelven megírható), amely két dolgot csinál:

### 3.1 SMS fogadása az APEX felől

`POST /send` — az APEX ezt hívja:

```json
{
  "to": "+36701234567",
  "message": "Rendelésed visszaigazolva: #1234",
  "sender_id": "APEX",
  "reference": "a3f1...uuid",
  "dlr_url": "https://<projekt>.supabase.co/functions/v1/comm-status-callback",
  "sim_slot": 1
}
```

Fejléc: `Authorization: Bearer <MODEM_TOKEN>` — ugyanaz a token, amit az APEX-ben
a szolgáltatói fiókhoz mentesz. A bridge minden kérést ellenőrizzen, és ismerje fel
a duplikált `reference`-öket (idempotens újraküldés miatt).

Válasz elfogadáskor:

```json
{ "ok": true, "id": "modem-oldali-azonosito" }
```

### 3.2 Kézbesítési riport (DLR) küldése vissza

Ha a modem/hálózat jelzi a kézbesítés eredményét, a bridge a `dlr_url`-re küldi:

```json
{ "id": "modem-oldali-azonosito", "status": "delivered" }
```

Elfogadott státuszok: `delivered`, `rejected`, `undeliverable`, `expired`, `failed`, `sent`.
Hiba esetén az APEX automatikusan újrapróbálja (növekvő várakozással, max. próbálkozással).

### 3.3 Kész megoldások a bridge-hez

Nem kell nulláról írni — ezeket lehet a bridge „motorjaként" használni:

- **Gammu / gammu-smsd** — AT-parancsos USB/soros modemekhez, beépített küldő démon.
- **Kannel** — professzionális, nyílt forrású SMS gateway; SMPP és AT modem is.
- **Jasmin SMS Gateway** — SMPP-fókuszú, ha később operátori SMPP-re váltasz.
- **Gyári HTTP API** — sok ipari SMS gateway készüléknek eleve van REST API-ja; ilyenkor
  a bridge csak egy vékony átalakító az APEX formátum és a gyári API között.

## 4. Bekötés az APEX-be

1. A bridge fusson elérhető, HTTPS-es címen (pl. `https://sms-bridge.sajatdomain.hu`).
2. Az APEX-ben hozz létre egy szolgáltatói fiókot:
   - driver: `apex_modem`
   - endpoint: a bridge címe, pl. `https://sms-bridge.sajatdomain.hu`
   - titkosított hitelesítés: `{ "modem_token": "<erős véletlen token>", "sim_slot": "1" }`
   - csatornák: `["sms"]`, feladó: a kért sender ID
   - ország-lista: csak az engedélyezett országok
   - átbocsátás (max_tps): GSM modemnél tipikusan 1 SMS / 5–10 mp SIM-enként — állítsd konzervatívan (pl. `max_tps: 1` alatt kezelve napi korláttal).
3. Routing szabály: ha több modem/SIM van, országonként külön útvonal vehető fel.

## 5. Fontos korlátok

- **Sebesség:** egy SIM-en egy modem általában percenként 6–12 SMS-t tud. Tömeges
  kampányhoz több SIM/modem kell, vagy operátori SMPP szerződés.
- **Szabályozás:** tömeges üzleti SMS-hez a legtöbb országban aggregátori/operátori
  egyezmény és regisztrált sender ID kell. SIM-alapú A2P küldést sok szolgáltató tilt.
- **A szoftver nem helyettesíti a szerződéseket:** az APEX kezeli a várólistát, az
  opt-outot, a DLR-t és a routingot — a fizikai kézbesítéshez a modem, SIM és a
  szolgáltatói feltételek kellenek.
