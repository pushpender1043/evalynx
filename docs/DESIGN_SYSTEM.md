# Evalynx — Design System (Day 1.9)

## 1. Visual Direction: Soft Airy Shell & 70 / 20 / 7 / 3 Color Discipline
Evalynx (`Evaluate smarter.`) pairs a calm **3-layer rounded application shell** with an **editorial minimal soft-clay** surface hierarchy and custom inline vector illustrations.

### The 3-Layer Shell Architecture (`ShellLayout.tsx`)
1. **Layer 1 — Page Canvas**: Soft lavender-grey (`#D9DAEE` light / `#0E0C2B` dark) with very faint decorative curved inline SVG lines (`6–8%` opacity, `1px` strokes) and 2–3 tiny accent dots. No raster background images.
2. **Layer 2 — Main Shell Panel**: One large off-white rounded panel (`#FAFAFE` light / `#1A1744` dark), `40px` border radius, `24–32px` desktop margin (`12px` tablet, `0px` full-bleed mobile `<768px`), soft elevated shadow `0 30px 80px rgba(108, 92, 231, 0.12)`, scrolling internally while keeping navigation anchored.
3. **Layer 3 — Content**: Spacious Bento grid inside the panel (`20–24px` gaps, `24–28px` card padding, `28px` card radius, bold `18px` section headers with muted subtitles).

### Attached S-Curve Purple Sidebar (`SidebarTab.tsx`)
- **Desktop (`>=768px`)**: A purple tab (`#7A6CF0` → `#6C5CE7` subtle vertical gradient) **attached flush (`0px` gap)** to the Main Shell Panel's left border, vertically centered inside the panel (`84px` wide, `~62px` top/bottom cubic-Bezier S-curve concave fillets merging smoothly into the panel wall).
- **Icons**: Thin outline Lucide icons (`strokeWidth={1.6}`, `22px`, white at `75%` opacity). Active = `44px` white rounded square (`radius 16px`) with `#6C5CE7` icon. Hover = faint `white/13%` rounded square + dark navy hover tooltip.
- **No logo / no logout** in the sidebar — logout lives exclusively inside the top bar profile dropdown. Notifications shows a tiny `#5CC9A7` mint dot only when unread items exist.
- **Mobile (`<768px`)**: Collapses into a floating purple rounded-`24px` bottom navigation bar (`BottomNav.tsx`, max 5 icons, active white rounded square) while the shell panel goes full-bleed.

### Light, Flat Top Bar (`Topbar.tsx`)
- Sits flat inside the Layer 2 panel with a hairline bottom divider.
- **Left**: `36px` Evalynx icon mark + text navigation tabs using a `2.5px` purple rounded **underline** active indicator (no pill buttons).
- **Center**: 1px lavender-bordered search/command input (`"Search tests or type a command"`) with `"Ctrl K"` shortcut hint.
- **Right**: Segmented Light/Dark theme toggle (sun/moon), notification bell, settings icon, ONE dark navy (`#14123A` light / `#EDEBFF` dark) primary CTA (`Create test` / `Join test`), and profile avatar dropdown.

---

## 2. Strict 70 / 20 / 7 / 3 Color & Shadow Tokens (`src/styles/theme.css`)
- **70%** Crisp white/off-white cards (`#FFFFFF` on `#FAFAFE` panel; dark `#221F54` on `#1A1744` panel).
- **20%** Soft lavender tints (`#F1F0FC` inner cards/rows, `#EEEDFB` unified stat icon tiles, `#F6F5FE` dashed placeholders with `#CFCBEF` dashed border).
- **7%** Brand purple (`#6C5CE7` → `#7A6CF0`) reserved strictly for the sidebar tab, active tab underline, small icon accents, progress fills, links, illustration accents, and **ONE** purple `FeatureCard` promo per dashboard.
- **3%** Accent pops:
  - **Navy (`#14123A`)**: Primary CTA buttons (`variant="navy"`).
  - **Mint (`#5CC9A7` / soft `#E4F7F0`)**: Success, secondary progress rings/chart series, live indicator dots, tiny badges.
  - **Soft Pink (`#D9607A` / soft `#FDE7EA`)**: ONLY High-risk / Flagged / error states.
  - **Amber (`#F2B84B` / soft `#FDF5E4`)**: ONLY tiny warning/draft/pending dots & badges.
- **Unified Stat Icons**: ALL `StatCard` and `StatChip` tiles use one consistent lavender tile (`--tile-lavender: #EEEDFB` light / `#2F2A6C` dark) with a `#6C5CE7` purple icon — zero rainbow/multi-colored icon grids.
- **Chart Palette**: Purple (`#6C5CE7`) primary, soft lavender (`#A89CF5`) & mint (`#5CC9A7`) secondary only.

### Light Theme (`:root`)
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#D9DAEE` | Layer 1 page background |
| `--bg-panel` | `#FAFAFE` | Layer 2 main rounded shell panel |
| `--bg-surface` | `#FFFFFF` | Layer 3 Bento cards, modals |
| `--bg-surface-tinted` | `#F1F0FC` | Nested list rows, calendar agenda, tinted chips |
| `--tile-lavender` | `#EEEDFB` | Unified stat & feature icon tile |
| `--bg-dashed` / `--border-dashed` | `#F6F5FE` / `#CFCBEF` | Dashed add placeholder (`DashedAddCard`) |
| `--text-primary` / `--text-secondary` / `--text-muted` | `#14123A` / `#535174` / `#9A98B8` | Primary headings, body copy, captions |
| `--navy-cta` | `#14123A` | Primary CTA button surface |
| `--shadow-panel` | `0 30px 80px rgba(108, 92, 231, 0.12)` | Layer 2 shell elevation |
| `--shadow-clay` | `0 8px 30px rgba(108, 92, 231, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)` | Airy Layer 3 cards (`28px` radius) |

### Dark Theme (`.dark`)
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#0E0C2B` | Deep midnight Layer 1 canvas |
| `--bg-panel` | `#1A1744` | Layer 2 shell panel |
| `--bg-surface` | `#221F54` | Elevated dark Bento cards |
| `--bg-surface-tinted` | `#27235D` | Nested rows & chips |
| `--tile-lavender` | `#2F2A6C` | Unified dark lavender icon tile |
| `--text-primary` / `--text-secondary` / `--text-muted` | `#EDEBFF` / `#B4B1DF` / `#8A87B8` | WCAG AA+ dark typography |
| `--navy-cta` / `--navy-cta-text` | `#EDEBFF` / `#14123A` | Crisp high-contrast primary CTA in dark mode |

---

## 3. Custom Inline SVG Illustrations (`src/components/illustrations/`)
All 12 illustrations are pure, reusable inline React SVG components (`{ size?: number; className?: string }`) with **zero external URLs, zero gradients, and zero faces**. Every SVG uses CSS custom properties (`--ill-stroke`, `--ill-card`, `--ill-fill-1`, `--ill-fill-2`, `--ill-purple`, `--ill-mint`, `--ill-pink`) with `2px` rounded navy/light-lavender outlines, flat fills, offset backdrop shapes, and minimal geometric confetti so Light & Dark themes switch seamlessly:

1. `CreateTestIllustration` — Clipboard with checklist & pencil
2. `AIGeneratorIllustration` — Document with sparkles & magic wand
3. `QuestionBankIllustration` — Stacked cards & tabbed folder
4. `ResultsIllustration` — Bar chart with magnifier
5. `EmptyTestsIllustration` — Open folder with floating plus
6. `EmptyPerformanceIllustration` — Chart axes with dotted curve & mint sprout
7. `EmptySubmissionsIllustration` — Inbox tray with paper plane
8. `EmptyNotificationsIllustration` — Bell with calm sparkles & check
9. `JoinWithCodeIllustration` — Ticket pass with code boxes & key badge
10. `PracticeModeIllustration` — Concentric target with dart
11. `EmptyStudentsIllustration` — Simple avatar silhouettes with floating plus
12. `PromoIllustration` — Lightbulb with sparkles (designed for the purple `FeatureCard`)

In development (`import.meta.env.DEV`), all 12 illustrations can be inspected in Light & Dark modes at `/dev/illustrations`.

---

## 4. Reusable UI Primitives (`src/components/ui/` & `src/components/layout/`)
- **Shell & Nav**: `ShellLayout`, `SidebarTab`, `Topbar`, `BottomNav`, `NotificationDrawer`.
- **Surfaces & Actions**: `ClayCard` (`default | tinted | dashed`), `ClayButton` (`primary | navy | secondary | ghost | danger | icon`), `ClayInput`, `ClayBadge` (flat minimal pills), `DashedAddCard`.
- **Bento Dashboard Primitives**: `IllustratedActionCard`, `FeatureCard` (the single purple promo card per dashboard), `StatChip`, `StatCard`, `ProgressRing`, `ProgressBar`, `EmptyState` (accepts `illustration?: ReactNode`).

---

## 5. Brand Logo & 3-Dot Loader
- **Logo (`Logo.tsx`, `public/favicon.svg`)**: Stylized 3-bar `"E"` inside a purple squircle (`#6C5CE7` → `#8E7DF5`) with a mint-green (`#5CC9A7`) circular `"lynx eye"`.
- **Loader (`Loader.tsx`)**: Minimal pure-CSS 3-dot staggered bouncing loader — **only the 3 balls (`#6C5CE7`, `#A89CF5`, `#5CC9A7` light; `#9486F7`, `#C9C0FF`, `#6FD9B8` dark) and their ground shadows**, with no card, border, logo, or text, and full `prefers-reduced-motion` support.
