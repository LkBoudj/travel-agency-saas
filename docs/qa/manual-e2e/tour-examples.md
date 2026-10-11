# أمثلة كاملة لإنشاء «رحلة» (Tour) — بيانات جاهزة للتجربة

> هذا الملف مرجع عملي (fixtures) للتجربة اليدوية. كل قيمة هنا مطابقة لعقود الواجهة والباكند الفعلية.
>
> **المصادر المؤكَّدة (تمت قراءتها):**
> - عقد الإنشاء/التعديل: `backend/src/tours/tours.schemas.ts:163–208`
> - شكل الاستجابة والقوائم: `backend/src/tours/tours.types.ts:30–93`
> - بوابة النشر: `backend/src/tours/tours.service.ts:318–348`
> - مخطط نموذج المحرر: `frontend/agency-dashboard-mantine/src/features/trips/schemas/tour.schema.ts:69–114`
> - الإنشاء السريع: `frontend/agency-dashboard-mantine/src/features/trips/schemas/quick-create.schema.ts:18–27`
> - الكتالوج (القيم الحرفية): `frontend/agency-dashboard-mantine/src/features/trips/lib/tour-catalog.ts`
> - التسميات EN/AR: `frontend/agency-dashboard-mantine/src/i18n/locales/{en,ar}/trips.json`
> - تحويل الحقول النصية إلى قوائم: `frontend/agency-dashboard-mantine/src/features/trips/lib/tour-payloads.ts:80–110`

---

## 1) بوابة النشر (ما يجعل الرحلة «قابلة للنشر»)

جولة تصبح قابلة للنشر فقط إذا تحقّقت **كل** الشروط — الباكند هو المرجع النهائي (`tours.service.ts:318–348`):

| # | الشرط | التفصيل |
|---|-------|---------|
| 1 | **الاسم** | `name` غير فارغ |
| 2 | **وجهة محلولة** | **محلي (domestic)** ← يجب وجود `wilayaCode` غير فارغ · **دولي (international)** ← يجب وجود `place` غير فارغ |
| 3 | **الوصف المختصر** | `shortDescription` غير فارغ |
| 4 | **صورة الغلاف** | `coverImageUrl` غير فارغ |
| 5 | **مغادرة مفتوحة** | فقط عند `availabilityMode = scheduled` → مغادرة واحدة `OPEN` على الأقل |

- عند الفشل يرجع الباكند `409` بكود **`TOUR_PUBLISH_READINESS_BLOCKED`** + `metadata.blockers`.
- الجولة **المؤرشفة** لا يمكن نشرها (`TOUR_PUBLISH_STATE_BLOCKED`). النشر المكرّر لجولة منشورة = لا شيء (no-op).
- **التسعير غير مطلوب** للنشر (مؤجّل — Module H).

> ⚠️ **تنبيه تجربة:** مؤشر الجاهزية في الواجهة (`trip-readiness.ts` + `tour-actions.ts`) أوسع من الباكند: يعتبر الوجهة مكتملة بوجود أي من `place/cityId/wilayaCode`. أي أن رحلة **محلية** بلا `wilayaCode` ستظهر «✅ وجهة» لكن النشر سيُرفض بـ `DESTINATION`. سجّلها كملاحظة عند ظهورها.

---

## 2) دليل الحقول الكامل

| الحقل (النموذج) | المفتاح في الـ payload | مطلوب للإنشاء | النوع / الحد | ملاحظات |
|---|---|---|---|---|
| Name | `name` | **نعم** | نص 1..120 | |
| Internal reference | `internalRef` | لا | نص ≤80 | فارغ = null |
| Format | `format` | **نعم** | enum | انظر §3 |
| Scope | `geographicScope` | **نعم** | enum | `domestic` \| `international` |
| Availability | `availabilityMode` | **نعم** | enum | `scheduled` / `on_request` / `custom_quote` |
| Participation | `participationMode` | لا | enum أو فارغ | |
| Guidance | `guidanceType` | لا | enum | |
| Origin (Wilaya code) | `origin.wilayaCode` | لا | نص ≤8 | نص حر (لا قائمة ثابتة). لا يدخل بوابة النشر |
| Origin City / commune | `origin.cityId` | لا | نص ≤120 | |
| Origin Place | `origin.place` | لا | نص ≤200 | |
| Destinations | `destinations[]` | **نعم (≥1)** | مصفوفة 1..50 | كل عنصر: `{wilayaCode, cityId, place}` |
| Days | `days` | لا | عدد صحيح ≥1 أو فارغ | `day_excursion` يُثبَّت على 1 |
| Nights | `nights` | لا | عدد صحيح ≥0 | فارغ = null |
| Hours | `hours` | لا | عدد صحيح ≥1 | فارغ = null |
| Flexible schedule | `isFlexible` | لا | boolean | الافتراضي false |
| Min. travellers | `minTravelers` | لا | عدد صحيح | الافتراضي 1 |
| Languages | `languages[]` | لا | **سطر لكل لغة** (كل ≤40) | تُقسم على `\n` |
| Themes | `themes[]` | لا | enum، ≤14 | |
| Activities | `activities[]` | لا | enum، ≤23 | |
| Audiences | `audiences[]` | لا | enum، ≤8 | |
| Transport | `transportModes[]` | لا | enum، ≤12 | |
| Accommodation | `accommodationTypes[]` | لا | enum، ≤7 | |
| Short description | `shortDescription` | **للنشر** | نص ≤160 | |
| Full description | `description` | لا | نص ≤100000 | |
| Highlights | `highlights[]` | لا | **سطر لكل عنصر** (كل ≤500) | تُقسم على `\n` |
| Included | `included[]` | لا | **سطر لكل عنصر** (كل ≤500) | |
| Not included | `notIncluded[]` | لا | **سطر لكل عنصر** (كل ≤500) | |
| Itinerary | `itinerary[]` | لا | صفوف ≤30 | كل صف: `title`+`location`+`description` **جميعها مطلوبة إن أُدخل الصف** |
| Important information | `importantInformation` | لا | نص ≤100000 | |
| Cancellation policy | `cancellationPolicy` | لا | نص ≤100000 | |
| Meeting point | `meetingPoint` | لا | نص ≤500 | |
| Meeting instructions | `meetingInstructions` | لا | نص ≤2000 | |
| Cover image URL | `coverImageUrl` | **للنشر** | نص ≤2048 | رابط صورة عام |
| Gallery | `gallery[]` | لا | **سطر لكل رابط** (كل ≤2048) | |
| Difficulty | `activityRequirements.difficulty` | لا | `easy`/`moderate`/`challenging` | |
| Fitness level | `activityRequirements.fitnessLevel` | لا | `basic`/`normal`/`good`/`high` | |
| Distance (km) | `activityRequirements.distanceKm` | لا | عدد صحيح ≥0 | |
| Elevation gain (m) | `activityRequirements.elevationGainM` | لا | عدد صحيح ≥0 | |
| Min. age | `activityRequirements.minimumAge` | لا | عدد صحيح ≥0 | |
| Required equipment | `activityRequirements.requiredEquipment` | لا | نص ≤500 | يُرسل `null` إذا كانت كل حقول المتطلبات فارغة |

**قاعدة الحقول المتعددة:** `languages` / `highlights` / `included` / `notIncluded` / `gallery` تُكتَب **سطراً واحداً لكل عنصر** (تُقسم على `\n` وتُهمَل الأسطر الفارغة).

---

## 3) كتالوج القيم (Code — EN — AR)

### Format (`format`)
| Code | EN | AR |
|---|---|---|
| `experience` | Experience | تجربة |
| `day_excursion` | Day excursion | رحلة يومية |
| `stay` | Stay | إقامة |
| `circuit` | Circuit | جولة |
| `cruise` | Cruise | رحلة بحرية |

### Scope (`geographicScope`)
| Code | EN | AR |
|---|---|---|
| `domestic` | Domestic | داخلية |
| `international` | International | دولية |

### Availability (`availabilityMode`)
| Code | EN | AR | يلزم مغادرة للنشر؟ |
|---|---|---|---|
| `scheduled` | Scheduled | مجدولة | **نعم (OPEN)** |
| `on_request` | On request | عند الطلب | لا |
| `custom_quote` | Custom quote | عرض سعر مخصص | لا |

### Participation (`participationMode`)
| Code | EN | AR |
|---|---|---|
| `shared_group` | Shared group | مجموعة مشتركة |
| `private` | Private | خاصة |
| `individual` | Individual | فردية |

### Guidance (`guidanceType`)
| Code | EN | AR |
|---|---|---|
| `guided` | Guided | بمرشد |
| `escorted` | Escorted | بمرافقة |
| `self_guided` | Self-guided | تلقائية |
| `mixed` | Mixed | مختلطة |

### Difficulty (`activityRequirements.difficulty`)
| Code | EN | AR |
|---|---|---|
| `easy` | Easy | سهل |
| `moderate` | Moderate | متوسط |
| `challenging` | Challenging | صعب |

### Fitness level (`activityRequirements.fitnessLevel`)
| Code | EN | AR |
|---|---|---|
| `basic` | Basic | أساسي |
| `normal` | Normal | عادي |
| `good` | Good | جيد |
| `high` | High | عالٍ |

### Themes (`themes`)
| Code | EN | AR |
|---|---|---|
| `nature` | Nature | طبيعة |
| `mountain` | Mountain | جبال |
| `sahara_desert` | Sahara desert | الصحراء والصحاري |
| `beach_coastal` | Beach & coastal | الشواطئ والسواحل |
| `cultural` | Cultural | ثقافي |
| `heritage_history` | Heritage & history | تراث وتاريخ |
| `religious_spiritual` | Religious & spiritual | ديني وروحي |
| `wellness` | Wellness | استجمام |
| `adventure` | Adventure | مغامرة |
| `eco_tourism` | Eco-tourism | سياحة بيئية |
| `urban_city` | Urban / city | مدن وحضرية |
| `gastronomy` | Gastronomy | مأكولات |
| `festival_event` | Festival / event | مهرجانات وفعاليات |
| `luxury` | Luxury | فاخر |

### Activities (`activities`)
| Code | EN | AR |
|---|---|---|
| `hiking` | Hiking | مشي جبلي |
| `trekking` | Trekking | رحل مرتفعات |
| `walking_tour` | Walking tour | جولة مشي |
| `sightseeing` | Sightseeing | استكشاف معالم |
| `guided_visit` | Guided visit | زيارة بمرشد |
| `museum_archaeology` | Museum / archaeology | متاحف وآثار |
| `camping` | Camping | تخييم |
| `offroad_4x4` | Off-road 4×4 | دفع رباعي |
| `camel_trek` | Camel trek | رحل بالجمال |
| `cycling` | Cycling | دراجات |
| `horse_riding` | Horse riding | ركوب الخيل |
| `boat_trip` | Boat trip | رحلة بالقارب |
| `swimming_beach` | Swimming / beach | سباحة وشاطئ |
| `fishing` | Fishing | صيد |
| `skiing_snow` | Skiing / snow | تزلج وثلوج |
| `climbing` | Climbing | تسلق |
| `kayaking` | Kayaking | كاياك |
| `diving` | Diving | غوص |
| `wellness_hammam` | Wellness / hammam | استجمام وحمّام |
| `craft_workshop` | Craft workshop | ورش حرفية |
| `food_tasting` | Food tasting | تذوق المأكولات |
| `photography` | Photography | تصوير |
| `festival` | Festival | مهرجان |

### Audiences (`audiences`)
| Code | EN | AR |
|---|---|---|
| `families` | Families | عائلات |
| `couples` | Couples | أزواج |
| `honeymoon` | Honeymoon | شهر عسل |
| `friends` | Friends | أصدقاء |
| `solo` | Solo | منفردون |
| `youth` | Youth | شباب |
| `seniors` | Seniors | كبار السن |
| `corporate` | Corporate | شركات |

### Transport (`transportModes`)
| Code | EN | AR |
|---|---|---|
| `bus` | Bus | حافلة |
| `minibus` | Minibus | حافلة صغيرة |
| `car` | Car | سيارة |
| `flight` | Flight | طائرة |
| `train` | Train | قطار |
| `boat` | Boat | قارب |
| `offroad_4x4` | Off-road 4×4 | دفع رباعي |
| `camel` | Camel | جمال |
| `bicycle` | Bicycle | دراجة |
| `walking` | Walking | مشي |
| `self_drive` | Self-drive | قيادة ذاتية |
| `mixed` | Mixed | مختلطة |

### Accommodation (`accommodationTypes`)
| Code | EN | AR |
|---|---|---|
| `none` | None | بدون |
| `hotel` | Hotel | فندق |
| `resort` | Resort | منتجع |
| `guesthouse` | Guesthouse | نزل |
| `homestay` | Homestay | إقامة عائلية |
| `camp` | Camp | مخيم |
| `mixed` | Mixed | مختلطة |

### Difficulty / Fitness
| النوع | القيم |
|---|---|
| `difficulty` | `easy` (سهل) · `moderate` (متوسط) · `challenging` (صعب) |
| `fitnessLevel` | `basic` (أساسي) · `normal` (عادي) · `good` (جيد) · `high` (عالٍ) |

---

## 4) مثال (أ) — «جولة تيكجدا – يوم كامل» (محلية · on_request · **قابلة للنشر فوراً**)

كل الحقول معبّأة. صالحة للنشر بعد الإنشاء مباشرة (تحقّق الشروط 1–4).

| الحقل | القيمة |
|---|---|
| Name | `جولة تيكجدا – يوم كامل` |
| Internal reference | `TIK-1D-001` |
| Format | `day_excursion` |
| Scope | `domestic` |
| Availability | `on_request` |
| Participation | `shared_group` |
| Guidance | `guided` |
| Origin · wilayaCode | `19` |
| Origin · cityId | `Sétif` |
| Origin · place | `Sétif` |
| Destination 1 · wilayaCode | `06` |
| Destination 1 · cityId | `Béjaïa` |
| Destination 1 · place | `Tikjda` |
| Days | `1` |
| Nights | (فارغ) |
| Hours | `8` |
| Flexible schedule | لا |
| Min. travellers | `1` |
| Languages (سطر/عنصر) | `ar` ↵ `fr` |
| Themes | `nature`, `mountain` |
| Activities | `hiking`, `sightseeing` |
| Audiences | `friends`, `families` |
| Transport | `bus` |
| Accommodation | `none` |
| Short description | `رحلة مشي بصحبة مرشد في قمم جرجرة` |
| Full description | `انطلاق صباحاً من سطيف نحو تيكجدا، صعود بصحبة مرشد، غداء حر وتنزّه، ثم العودة.` |
| Highlights (سطر/عنصر) | `إطلالات قمة جرجرة` ↵ `مرشد محلي` |
| Included (سطر/عنصر) | `نقل بالحافلة` ↵ `مرشد` |
| Not included (سطر/عنصر) | `الغداء` ↵ `التأمين` |
| Itinerary 1 | title=`الانطلاق` · location=`سطيف` · description=`الاستقبال صباحاً` |
| Itinerary 2 | title=`الصعود` · location=`تيكجدا` · description=`مشي بصحبة المرشد` |
| Important information | `أحضر ملابس دافئة وماءً كافياً` |
| Cancellation policy | `إلغاء مجاني حتى 48 ساعة` |
| Meeting point | `محطة الحافلات – سطيف` |
| Meeting instructions | `الحضور 15 دقيقة قبل الموعد` |
| Cover image URL | `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200` |
| Gallery (سطر/عنصر) | `https://cdn.example.com/tikjda-1.jpg` ↵ `https://cdn.example.com/tikjda-2.jpg` |
| Difficulty | `easy` |
| Fitness level | `normal` |
| Distance (km) | `8` |
| Elevation gain (m) | `450` |
| Min. age | `10` |
| Required equipment | `حذاء مشي، قبعة` |

<details>
<summary>Payload JSON مطابق لعقد الباكند</summary>

```json
{
  "name": "جولة تيكجدا – يوم كامل",
  "internalRef": "TIK-1D-001",
  "format": "day_excursion",
  "geographicScope": "domestic",
  "availabilityMode": "on_request",
  "participationMode": "shared_group",
  "guidanceType": "guided",
  "origin": { "wilayaCode": "19", "cityId": "Sétif", "place": "Sétif" },
  "destinations": [
    { "wilayaCode": "06", "cityId": "Béjaïa", "place": "Tikjda" }
  ],
  "days": 1,
  "nights": null,
  "hours": 8,
  "isFlexible": false,
  "minTravelers": 1,
  "languages": ["ar", "fr"],
  "themes": ["nature", "mountain"],
  "activities": ["hiking", "sightseeing"],
  "audiences": ["friends", "families"],
  "activityRequirements": {
    "difficulty": "easy",
    "fitnessLevel": "normal",
    "distanceKm": 8,
    "elevationGainM": 450,
    "minimumAge": 10,
    "requiredEquipment": "حذاء مشي، قبعة"
  },
  "transportModes": ["bus"],
  "accommodationTypes": ["none"],
  "shortDescription": "رحلة مشي بصحبة مرشد في قمم جرجرة",
  "description": "انطلاق صباحاً من سطيف نحو تيكجدا، صعود بصحبة مرشد، غداء حر وتنزّه، ثم العودة.",
  "highlights": [{ "text": "إطلالات قمة جرجرة" }, { "text": "مرشد محلي" }],
  "itinerary": [
    { "title": "الانطلاق", "location": "سطيف", "description": "الاستقبال صباحاً" },
    { "title": "الصعود", "location": "تيكجدا", "description": "مشي بصحبة المرشد" }
  ],
  "included": [{ "text": "نقل بالحافلة" }, { "text": "مرشد" }],
  "notIncluded": [{ "text": "الغداء" }, { "text": "التأمين" }],
  "importantInformation": "أحضر ملابس دافئة وماءً كافياً",
  "cancellationPolicy": "إلغاء مجاني حتى 48 ساعة",
  "meetingPoint": "محطة الحافلات – سطيف",
  "meetingInstructions": "الحضور 15 دقيقة قبل الموعد",
  "coverImageUrl": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200",
  "gallery": [{ "url": "https://cdn.example.com/tikjda-1.jpg" }, { "url": "https://cdn.example.com/tikjda-2.jpg" }],
  "activityRequirements": {
    "difficulty": "easy",
    "fitnessLevel": "normal",
    "distanceKm": 8,
    "elevationGainM": 450,
    "minimumAge": 10,
    "requiredEquipment": "حذاء مشي، قبعة"
  }
}
```
> ملاحظة: في العقد توجد نسخة واحدة من `activityRequirements` (أُدرجت مرتين أعلاه للتوضيح فقط).
</details>

---

## 5) مثال (ب) — «جولة الصحراء الكبرى» (محلية · scheduled · **تتطلّب مغادرة OPEN**)

نفس بنية المثال (أ) مع الفروقات التالية:

| الحقل | القيمة |
|---|---|
| Name | `جولة الصحراء الكبرى — تمنراست` |
| Internal reference | `SAH-4D-001` |
| Format | `circuit` |
| Scope | `domestic` |
| Availability | `scheduled` |
| Participation | `shared_group` |
| Guidance | `escorted` |
| Origin · wilayaCode / cityId / place | `11` / `Tamanrasset` / `Tamanrasset` |
| Destination 1 · wilayaCode / cityId / place | `11` / `Tamanrasset` / `Hoggar` |
| Days / Nights / Hours | `4` / `3` / (فارغ) |
| Min. travellers | `4` |
| Languages | `ar` ↵ `en` ↵ `fr` |
| Themes | `sahara_desert`, `adventure`, `nature` |
| Activities | `offroad_4x4`, `camel_trek`, `camping`, `photography` |
| Audiences | `friends`, `couples` |
| Transport | `offroad_4x4`, `camel` |
| Accommodation | `camp`, `guesthouse` |
| Short description | `أربعة أيام بين كثبان تمنراست ومرتفعات الأهقار` |
| Full description | `مسير بصحبة مرشدين محليين...` |
| Highlights | `غروب فوق الكثبان` ↵ `ليالٍ في المخيم` |
| Included | `الإقامة` ↵ `المرشد` ↵ `الوجبات` |
| Not included | `الطيران الداخلي` |
| Itinerary | 4 صفوف (يوم لكل صف) |
| Cover image URL | `https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200` |
| Difficulty / Fitness | `moderate` / `good` |

> ⚠️ **قبل النشر:** أنشئ **مغادرة (Departure) بحالة `OPEN`** لهذه الرحلة من قسم Departures، وإلا فسيرجع النشر `409 TOUR_PUBLISH_READINESS_BLOCKED` بسبب `SCHEDULED_DEPARTURES_REQUIRED`.

---

## 5bis) مثال (ب‑intl) — «اكتشاف إسطنبول» (دولية · **تتطلّب place**)

| الحقل | القيمة |
|---|---|
| Name | `اكتشاف إسطنبول — 5 أيام` |
| Internal reference | `IST-5D-001` |
| Format | `circuit` |
| Scope | **`international`** |
| Availability | `on_request` |
| Guidance | `escorted` |
| Origin · place | `Algiers` |
| Destination 1 · wilayaCode | (فارغ — مسموح) |
| Destination 1 · cityId | `Istanbul` |
| Destination 1 · **place** | **`Istanbul`** ← مطلوب للتحقق الدولي |
| Days / Nights | `5` / `4` |
| Languages | `ar` ↵ `en` ↵ `tr` |
| Themes | `urban_city`, `cultural`, `gastronomy` |
| Activities | `sightseeing`, `guided_visit`, `food_tasting`, `boat_trip` |
| Transport | `flight`, `bus`, `boat` |
| Accommodation | `hotel` |
| Short description | `جولة خمسة أيام بين معالم إسطنبول التاريخية` |
| Cover image URL | `https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200` |

> ✅ الشرط الدولي يتحقّق بـ `place = Istanbul`؛ لا حاجة لـ `wilayaCode`.

---

## 6) مثال (ج) — الإنشاء السريع (أدنى بيانات صالحة)

حقوق نافذة «New trip» فقط (`quick-create.schema.ts`):

| الحقل | القيمة |
|---|---|
| Name | `رحلة تجريبية سريعة` |
| Format | `experience` |
| Scope | `domestic` |
| Availability | `on_request` |
| Destination place / city | `Djanet` |
| Days | `1` |
| Nights | (فارغ) |
| Hours | `4` |

تُنتِج مسوّدة (DRAFT) بوجهة واحدة `{ wilayaCode: null, cityId: null, place: "Djanet" }`. **غير قابلة للنشر بعد** (بلا `wilayaCode` محلي، ولا وصف قصير، ولا صورة غلاف) — وهذا متوقع.

---

## 7) حالات مقصودة للفشل (لتجربة بوابة النشر)

| السيناريو | الإعداد | النتيجة المتوقّعة |
|---|---|---|
| بلا صورة غلاف | `on_request`، كل الشروط ما عدا `coverImageUrl` | `409` blockers تتضمّن `COVER_IMAGE` |
| بلا وصف قصير | حذف `shortDescription` | `409` blockers تتضمّن `SHORT_DESCRIPTION` |
| محلية بلا wilayaCode | وجهة `{wilayaCode:null, place:"Tikjda"}` + scope=domestic | `409` blocks تتضمّن `DESTINATION` (وقد تظهر في الواجهة كـ ✅ — تعارض موثّق) |
| scheduled بلا مغادرة | `scheduled` + بقية الشروط | `409` blocks تتضمّن `SCHEDULED_DEPARTURES_REQUIRED` |
| نشر جولة مؤرشفة | أرشِف ثم انشر | `409` `TOUR_PUBLISH_STATE_BLOCKED` |
| صف برنامج ناقص | صف itinerary فيه `title` فقط | `400` خطأ تحقق (بقية الحقول min 1) |

---

## 8) ملاحظات سريعة

- `wilayaCode` و`cityId` نصوص حرة في الواجهة (لا قائمة منسدلة ثابتة) — استخدم رموزاً واقعية أو أسماء.
- صورة الغلاف/المعرض **روابط URL** فقط (لا يوجد رفع ملفات في هذه الشاشة).
- اليوم الثابت: عند `format = day_excursion` تُثبَّت `days = 1`.
- التسعير (Pricing) غير مطلوب للنشر في الوقت الراهن.
