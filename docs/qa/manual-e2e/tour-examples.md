# أمثلة كاملة لإنشاء «رحلة» (Tour) — بيانات جاهزة للتجربة

> هذا الملف مرجع عملي (fixtures) للتجربة اليدوية. كل قيمة هنا مطابقة لعقود الواجهة والباكند الفعلية.
> أسماء الحقول مكتوبة **بالعربية كما تظهر في الواجهة** بين قوسين، ويتبعها المفتاح التقني بـ`code`.
>
> **المصادر المؤكَّدة (تمت قراءتها):**
> - عقد الإنشاء/التعديل: `backend/src/tours/tours.schemas.ts:163–208`
> - شكل الاستجابة والقوائم: `backend/src/tours/tours.types.ts:30–93`
> - بوابة النشر: `backend/src/tours/tours.service.ts:318–348`
> - مخطط نموذج المحرر: `frontend/agency-dashboard-mantine/src/features/trips/schemas/tour.schema.ts:69–114`
> - الإنشاء السريع: `frontend/agency-dashboard-mantine/src/features/trips/schemas/quick-create.schema.ts:18–27`
> - الكتالوج (القيم الحرفية): `frontend/agency-dashboard-mantine/src/features/trips/lib/tour-catalog.ts`
> - الأسماء والتسميات EN/AR: `frontend/agency-dashboard-mantine/src/i18n/locales/{en,ar}/trips.json`
> - تحويل الحقول النصية إلى قوائم: `frontend/agency-dashboard-mantine/src/features/trips/lib/tour-payloads.ts:80–110`

---

## 1) بوابة النشر (ما يجعل الرحلة «قابلة للنشر»)

جولة تصبح قابلة للنشر فقط إذا تحقّقت **كل** الشروط — الباكند هو المرجع النهائي (`tours.service.ts:318–348`):

| # | الشرط | التفصيل |
|---|-------|---------|
| 1 | **الاسم** (`name`) | غير فارغ |
| 2 | **وجهة محلولة** | **داخلية Domestic** ← وجود `رمز الولاية` غير فارغ · **دولية International** ← وجود `المكان` غير فارغ |
| 3 | **الوصف القصير** (`shortDescription`) | غير فارغ |
| 4 | **رابط صورة الغلاف** (`coverImageUrl`) | غير فارغ |
| 5 | **مغادرة مفتوحة** | فقط عند `التوفر = مجدولة (scheduled)` → مغادرة واحدة `OPEN` على الأقل |

- عند الفشل يرجع الباكند `409` بكود **`TOUR_PUBLISH_READINESS_BLOCKED`** + `metadata.blockers`.
- الجولة **المؤرشفة** لا يمكن نشرها (`TOUR_PUBLISH_STATE_BLOCKED`). النشر المكرّر لجولة منشورة = لا شيء (no-op).
- **التسعير غير مطلوب** للنشر (مؤجّل — Module H).

> ⚠️ **تنبيه تجربة:** مؤشر الجاهزية في الواجهة (`trip-readiness.ts` + `tour-actions.ts`) أوسع من الباكند: يعتبر الوجهة مكتملة بوجود أي من `المكان/المدينة/رمز الولاية`. أي أن رحلة **داخلية** بلا `رمز الولاية` ستظهر «✅ وجهة» لكن النشر سيُرفض بـ `DESTINATION`. سجّلها كملاحظة عند ظهورها.

---

## 2) دليل الحقول الكامل (بالعربية + المفتاح)

| الحقل (في الواجهة) | المفتاح | مطلوب للإنشاء | النوع / الحد | ملاحظات |
|---|---|---|---|---|
| **الاسم** | `name` | **نعم** | نص 1..120 | |
| المرجع الداخلي | `internalRef` | لا | نص ≤80 | فارغ = null |
| النوع | `format` | **نعم** | enum | انظر §3 |
| النطاق | `geographicScope` | **نعم** | enum | `داخلية/دولية` |
| التوفر | `availabilityMode` | **نعم** | enum | `مجدولة/عند الطلب/عرض سعر مخصص` |
| المشاركة | `participationMode` | لا | enum | يمكن تركه فارغاً |
| المرافقة | `guidanceType` | لا | enum | يمكن تركه فارغاً |
| نقطة الانطلاق · رمز الولاية | `origin.wilayaCode` | لا | نص ≤8 | حر (لا قائمة ثابتة) |
| نقطة الانطلاق · المدينة / البلدية | `origin.cityId` | لا | نص ≤120 | |
| نقطة الانطلاق · المكان | `origin.place` | لا | نص ≤200 | |
| **الوجهات** | `destinations[]` | **نعم (≥1)** | مصفوفة 1..50 | كل وجهة: رمز ولاية + مدينة/بلدية + مكان |
| الأيام | `days` | لا | عدد صحيح ≥1 | فارغ = null |
| الليالي | `nights` | لا | عدد صحيح ≥0 | فارغ = null |
| الساعات | `hours` | لا | عدد صحيح ≥1 | فارغ = null |
| جدول مرن | `isFlexible` | لا | boolean | الافتراضي لا |
| حد أدنى للمسافرين | `minTravelers` | لا | عدد صحيح | الافتراضي 1 |
| اللغات | `languages[]` | لا | **سطر لكل لغة** (كل ≤40) | تُقسم على `\n` |
| المواضيع | `themes[]` | لا | enum، ≤14 | |
| الأنشطة | `activities[]` | لا | enum، ≤23 | |
| الشرائح | `audiences[]` | لا | enum، ≤8 | |
| وسائل النقل | `transportModes[]` | لا | enum، ≤12 | |
| الإقامة | `accommodationTypes[]` | لا | enum، ≤7 | |
| **وصف قصير** | `shortDescription` | **للنشر** | نص ≤160 | |
| وصف كامل | `description` | لا | نص ≤100000 | |
| أبرز ما يميزها | `highlights[]` | لا | **سطر لكل عنصر** (كل ≤500) | تُقسم على `\n` |
| يشمل | `included[]` | لا | **سطر لكل عنصر** (كل ≤500) | |
| لا يشمل | `notIncluded[]` | لا | **سطر لكل عنصر** (كل ≤500) | |
| برنامج الرحلة | `itinerary[]` | لا | صفوف ≤30 | كل صف: العنوان + المكان + الوصف **جميعها مطلوبة إن أُدخل الصف** |
| معلومات مهمة | `importantInformation` | لا | نص ≤100000 | |
| سياسة الإلغاء | `cancellationPolicy` | لا | نص ≤100000 | |
| نقطة اللقاء | `meetingPoint` | لا | نص ≤500 | |
| تعليمات اللقاء | `meetingInstructions` | لا | نص ≤2000 | |
| **رابط صورة الغلاف** | `coverImageUrl` | **للنشر** | نص ≤2048 | رابط صورة عام |
| روابط صور المعرض | `gallery[]` | لا | **سطر لكل رابط** (كل ≤2048) | |
| الصعوبة | `activityRequirements.difficulty` | لا | `easy/moderate/challenging` | |
| مستوى اللياقة | `activityRequirements.fitnessLevel` | لا | `basic/normal/good/high` | |
| المسافة (كم) | `activityRequirements.distanceKm` | لا | عدد صحيح ≥0 | |
| الارتفاع الصاعد (م) | `activityRequirements.elevationGainM` | لا | عدد صحيح ≥0 | |
| الحد الأدنى للسن | `activityRequirements.minimumAge` | لا | عدد صحيح ≥0 | |
| المعدات المطلوبة | `activityRequirements.requiredEquipment` | لا | نص ≤500 | يُرسل `null` إذا كانت كل حقول المتطلبات فارغة |

**قاعدة الحقول المتعددة:** «اللغات / أبرز ما يميزها / يشمل / لا يشمل / روابط صور المعرض» تُكتَب **سطراً واحداً لكل عنصر** (تُقسم على `\n` وتُهمَل الأسطر الفارغة).

---

## 3) كتالوج القيم (Code — EN — AR)

### النوع (`format`)
| Code | EN | AR |
|---|---|---|
| `experience` | Experience | تجربة |
| `day_excursion` | Day excursion | رحلة يومية |
| `stay` | Stay | إقامة |
| `circuit` | Circuit | جولة |
| `cruise` | Cruise | رحلة بحرية |

### النطاق (`geographicScope`)
| Code | EN | AR |
|---|---|---|
| `domestic` | Domestic | داخلية |
| `international` | International | دولية |

### التوفر (`availabilityMode`)
| Code | EN | AR | يلزم مغادرة للنشر؟ |
|---|---|---|---|
| `scheduled` | Scheduled | مجدولة | **نعم (OPEN)** |
| `on_request` | On request | عند الطلب | لا |
| `custom_quote` | Custom quote | عرض سعر مخصص | لا |

### المشاركة (`participationMode`)
| Code | EN | AR |
|---|---|---|
| `shared_group` | Shared group | مجموعة مشتركة |
| `private` | Private | خاصة |
| `individual` | Individual | فردية |

### المرافقة (`guidanceType`)
| Code | EN | AR |
|---|---|---|
| `guided` | Guided | بمرشد |
| `escorted` | Escorted | بمرافقة |
| `self_guided` | Self-guided | تلقائية |
| `mixed` | Mixed | مختلطة |

### المواضيع (`themes`)
| Code | EN | AR |
|---|---|---|
| `nature` | Nature | طبيعة |
| `mountain` | Mountain | جبال |
| `sahara_desert` | Sahara / desert | الصحراء والصحاري |
| `beach_coastal` | Beach / coastal | الشواطئ والسواحل |
| `cultural` | Cultural | ثقافي |
| `heritage_history` | Heritage / history | تراث وتاريخ |
| `religious_spiritual` | Religious / spiritual | ديني وروحي |
| `wellness` | Wellness | استجمام |
| `adventure` | Adventure | مغامرة |
| `eco_tourism` | Eco-tourism | سياحة بيئية |
| `urban_city` | Urban / city | مدن وحضرية |
| `gastronomy` | Gastronomy | مأكولات |
| `festival_event` | Festival / event | مهرجانات وفعاليات |
| `luxury` | Luxury | فاخر |

### الأنشطة (`activities`)
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

### الشرائح (`audiences`)
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

### وسائل النقل (`transportModes`)
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

### الإقامة (`accommodationTypes`)
| Code | EN | AR |
|---|---|---|
| `none` | None | بدون |
| `hotel` | Hotel | فندق |
| `resort` | Resort | منتجع |
| `guesthouse` | Guesthouse | نزل |
| `homestay` | Homestay | إقامة عائلية |
| `camp` | Camp | مخيم |
| `mixed` | Mixed | مختلطة |

### الصعوبة ومستوى اللياقة
| النوع | القيم |
|---|---|
| الصعوبة (`difficulty`) | `easy` (سهل) · `moderate` (متوسط) · `challenging` (صعب) |
| مستوى اللياقة (`fitnessLevel`) | `basic` (أساسي) · `normal` (عادي) · `good` (جيد) · `high` (عالٍ) |

---

## 4) مثال (أ) — «جولة تيكجدا – يوم كامل» (داخلية · عند الطلب · **قابلة للنشر فوراً**)

كل الحقول معبّأة. صالحة للنشر بعد الإنشاء مباشرة (تحقّق الشروط 1–4).

| الحقل (الاسم في الواجهة — `المفتاح`) | القيمة |
|---|---|
| الاسم — `name` | `جولة تيكجدا – يوم كامل` |
| المرجع الداخلي — `internalRef` | `TIK-1D-001` |
| النوع — `format` | `day_excursion` (رحلة يومية) |
| النطاق — `geographicScope` | `domestic` (داخلية) |
| التوفر — `availabilityMode` | `on_request` (عند الطلب) |
| المشاركة — `participationMode` | `shared_group` (مجموعة مشتركة) |
| المرافقة — `guidanceType` | `guided` (بمرشد) |
| نقطة الانطلاق · رمز الولاية — `origin.wilayaCode` | `19` |
| نقطة الانطلاق · المدينة/البلدية — `origin.cityId` | `Sétif` |
| نقطة الانطلاق · المكان — `origin.place` | `Sétif` |
| الوجهة 1 · رمز الولاية | `06` |
| الوجهة 1 · المدينة/البلدية | `Béjaïa` |
| الوجهة 1 · المكان | `Tikjda` |
| الأيام — `days` | `1` |
| الليالي — `nights` | (فارغ) |
| الساعات — `hours` | `8` |
| جدول مرن — `isFlexible` | لا |
| حد أدنى للمسافرين — `minTravelers` | `1` |
| اللغات — `languages` (سطر لكل لغة) | `ar` ↵ `fr` |
| المواضيع — `themes` | `nature` (طبيعة), `mountain` (جبال) |
| الأنشطة — `activities` | `hiking` (مشي جبلي), `sightseeing` (استكشاف معالم) |
| الشرائح — `audiences` | `friends` (أصدقاء), `families` (عائلات) |
| وسائل النقل — `transportModes` | `bus` (حافلة) |
| الإقامة — `accommodationTypes` | `none` (بدون) |
| وصف قصير — `shortDescription` | `رحلة مشي بصحبة مرشد في قمم جرجرة` |
| وصف كامل — `description` | `انطلاق صباحاً من سطيف نحو تيكجدا، صعود بصحبة مرشد، غداء حر وتنزّه، ثم العودة.` |
| أبرز ما يميزها — `highlights` (سطر لكل عنصر) | `إطلالات قمة جرجرة` ↵ `مرشد محلي` |
| يشمل — `included` (سطر لكل عنصر) | `نقل بالحافلة` ↵ `مرشد` |
| لا يشمل — `notIncluded` (سطر لكل عنصر) | `الغداء` ↵ `التأمين` |
| برنامج الرحلة — `itinerary` صف 1 | العنوان=`الانطلاق` · المكان=`سطيف` · الوصف=`الاستقبال صباحاً` |
| برنامج الرحلة — `itinerary` صف 2 | العنوان=`الصعود` · المكان=`تيكجدا` · الوصف=`مشي بصحبة المرشد` |
| معلومات مهمة — `importantInformation` | `أحضر ملابس دافئة وماءً كافياً` |
| سياسة الإلغاء — `cancellationPolicy` | `إلغاء مجاني حتى 48 ساعة` |
| نقطة اللقاء — `meetingPoint` | `محطة الحافلات – سطيف` |
| تعليمات اللقاء — `meetingInstructions` | `الحضور 15 دقيقة قبل الموعد` |
| رابط صورة الغلاف — `coverImageUrl` | `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200` |
| روابط صور المعرض — `gallery` (سطر لكل رابط) | `https://cdn.example.com/tikjda-1.jpg` ↵ `https://cdn.example.com/tikjda-2.jpg` |
| الصعوبة — `difficulty` | `easy` (سهل) |
| مستوى اللياقة — `fitnessLevel` | `normal` (عادي) |
| المسافة (كم) — `distanceKm` | `8` |
| الارتفاع الصاعد (م) — `elevationGainM` | `450` |
| الحد الأدنى للسن — `minimumAge` | `10` |
| المعدات المطلوبة — `requiredEquipment` | `حذاء مشي، قبعة` |

<details>
<summary>Payload JSON مطابق لعقد الباكند (المفاتيح التقنية بالإنجليزية كما يرسلها التطبيق)</summary>

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
  "transportModes": ["bus"],
  "accommodationTypes": ["none"],
  "activityRequirements": {
    "difficulty": "easy",
    "fitnessLevel": "normal",
    "distanceKm": 8,
    "elevationGainM": 450,
    "minimumAge": 10,
    "requiredEquipment": "حذاء مشي، قبعة"
  },
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
  "gallery": [{ "url": "https://cdn.example.com/tikjda-1.jpg" }, { "url": "https://cdn.example.com/tikjda-2.jpg" }]
}
```

</details>

---

## 5) مثال (ب) — «الصحراء الكبرى» (داخلية · مجدولة · **تتطلّب مغادرة OPEN**)

نفس بنية المثال (أ) مع الفروقات التالية:

| الحقل (الاسم في الواجهة — `المفتاح`) | القيمة |
|---|---|
| الاسم — `name` | `جولة الصحراء الكبرى — تمنراست` |
| المرجع الداخلي — `internalRef` | `SAH-4D-001` |
| النوع — `format` | `circuit` (جولة) |
| النطاق — `geographicScope` | `domestic` (داخلية) |
| التوفر — `availabilityMode` | **`scheduled` (مجدولة)** |
| المشاركة — `participationMode` | `shared_group` (مجموعة مشتركة) |
| المرافقة — `guidanceType` | `escorted` (بمرافقة) |
| نقطة الانطلاق · رمز الولاية | `11` |
| نقطة الانطلاق · المدينة/البلدية | `Tamanrasset` |
| نقطة الانطلاق · المكان | `Tamanrasset` |
| الوجهة 1 · رمز الولاية | `11` |
| الوجهة 1 · المدينة/البلدية | `Tamanrasset` |
| الوجهة 1 · المكان | `Hoggar` |
| الأيام — `days` | `4` |
| الليالي — `nights` | `3` |
| الساعات — `hours` | (فارغ) |
| حد أدنى للمسافرين — `minTravelers` | `4` |
| اللغات — `languages` | `ar` ↵ `en` ↵ `fr` |
| المواضيع — `themes` | `sahara_desert`, `adventure`, `nature` |
| الأنشطة — `activities` | `offroad_4x4`, `camel_trek`, `camping`, `photography` |
| الشرائح — `audiences` | `friends` (أصدقاء), `couples` (أزواج) |
| وسائل النقل — `transportModes` | `offroad_4x4`, `camel` |
| الإقامة — `accommodationTypes` | `camp` (مخيم), `guesthouse` (نزل) |
| وصف قصير — `shortDescription` | `أربعة أيام بين كثبان تمنراست ومرتفعات الأهقار` |
| وصف كامل — `description` | `مسير بصحبة مرشدين محليين...` |
| أبرز ما يميزها — `highlights` | `غروب فوق الكثبان` ↵ `ليالٍ في المخيم` |
| يشمل — `included` | `الإقامة` ↵ `المرشد` ↵ `الوجبات` |
| لا يشمل — `notIncluded` | `الطيران الداخلي` |
| برنامج الرحلة — `itinerary` | 4 صفوف (يوم لكل صف) |
| رابط صورة الغلاف — `coverImageUrl` | `https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200` |
| الصعوبة / مستوى اللياقة | `moderate` (متوسط) / `good` (جيد) |

> ⚠️ **قبل النشر:** أنشئ **مغادرة (Departure) بحالة `OPEN`** لهذه الرحلة من قسم Departures، وإلا سيرجع النشر `409 TOUR_PUBLISH_READINESS_BLOCKED` بسبب `SCHEDULED_DEPARTURES_REQUIRED`.

---

## 5bis) مثال (ب‑intl) — «اكتشاف إسطنبول» (دولية · **تتطلّب المكان place**)

| الحقل (الاسم في الواجهة — `المفتاح`) | القيمة |
|---|---|
| الاسم — `name` | `اكتشاف إسطنبول — 5 أيام` |
| المرجع الداخلي — `internalRef` | `IST-5D-001` |
| النوع — `format` | `circuit` (جولة) |
| النطاق — `geographicScope` | **`international` (دولية)** |
| التوفر — `availabilityMode` | `on_request` (عند الطلب) |
| المرافقة — `guidanceType` | `escorted` (بمرافقة) |
| نقطة الانطلاق · المكان | `Algiers` |
| الوجهة 1 · رمز الولاية | (فارغ — مسموح دولياً) |
| الوجهة 1 · المدينة/البلدية | `Istanbul` |
| الوجهة 1 · **المكان** | **`Istanbul`** ← مطلوب للتحقق الدولي |
| الأيام / الليالي | `5` / `4` |
| اللغات — `languages` | `ar` ↵ `en` ↵ `tr` |
| المواضيع — `themes` | `urban_city` (مدن)، `cultural` (ثقافي)، `gastronomy` (مأكولات) |
| الأنشطة — `activities` | `sightseeing`, `guided_visit`, `food_tasting`, `boat_trip` |
| وسائل النقل — `transportModes` | `flight` (طائرة), `bus` (حافلة), `boat` (قارب) |
| الإقامة — `accommodationTypes` | `hotel` (فندق) |
| وصف قصير — `shortDescription` | `جولة خمسة أيام بين معالم إسطنبول التاريخية` |
| رابط صورة الغلاف — `coverImageUrl` | `https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200` |

> ✅ الشرط الدولي يتحقّق بـ `المكان = Istanbul`؛ لا حاجة لـ `رمز الولاية`.

---

## 6) مثال (ج) — الإنشاء السريع (أدنى بيانات صالحة)

حقوق نافذة «New trip» فقط (`quick-create.schema.ts`):

| الحقل (في الواجهة) | القيمة |
|---|---|
| الاسم — `name` | `رحلة تجريبية سريعة` |
| النوع — `format` | `experience` (تجربة) |
| النطاق — `geographicScope` | `domestic` (داخلية) |
| التوفر — `availabilityMode` | `on_request` (عند الطلب) |
| المكان أو المدينة — `destinationPlace` | `Djanet` |
| الأيام — `days` | `1` |
| الليالي — `nights` | (فارغ) |
| الساعات — `hours` | `4` |

تُنتِج مسوّدة (DRAFT) بوجهة واحدة `{ wilayaCode: null, cityId: null, place: "Djanet" }`. **غير قابلة للنشر بعد** (بلا `رمز الولاية` محلي، ولا وصف قصير، ولا صورة غلاف) — وهذا متوقع.

---

## 7) حالات مقصودة للفشل (لتجربة بوابة النشر)

| السيناريو | الإعداد (بعربية الحقل) | النتيجة المتوقّعة |
|---|---|---|
| بلا صورة غلاف | عند الطلب، كل الشروط ما عدا `رابط صورة الغلاف` | `409` blockers تتضمّن `COVER_IMAGE` |
| بلا وصف قصير | حذف `الوصف القصير` | `409` blockers تتضمّن `SHORT_DESCRIPTION` |
| داخلية بلا رمز ولاية | وجهة `{wilayaCode:null, place:"Tikjda"}` + النطاق=داخلية | `409` blocks تتضمّن `DESTINATION` (وقد تظهر في الواجهة كـ ✅ — تعارض موثّق) |
| مجدولة بلا مغادرة | `scheduled` + بقية الشروط | `409` blocks تتضمّن `SCHEDULED_DEPARTURES_REQUIRED` |
| نشر جولة مؤرشفة | أرشِف ثم انشر | `409` `TOUR_PUBLISH_STATE_BLOCKED` |
| صف برنامج ناقص | صف برنامج فيه العنوان فقط | `400` خطأ تحقق (بقية الحقول مطلوبة) |

---

## 8) ملاحظات سريعة

- `رمز الولاية` و`المدينة/البلدية` نصوص حرة في الواجهة (لا قائمة منسدلة ثابتة).
- `رابط صورة الغلاف` وروابط المعرض **روابط URL** فقط (لا يوجد رفع ملفات في هذه الشاشة).
- اليوم الثابت: عند `النوع = day_excursion` تُثبَّت `الأيام = 1`.
- التسعير (Pricing) غير مطلوب للنشر في الوقت الراهن.
