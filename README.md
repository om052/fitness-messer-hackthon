# 🏰 Fitness Messer

**Tagline:** Lets Build Empire With Exercise

A premium mobile fitness game that turns real-world exercise into empire-building gameplay. Built with React Native, Expo, and TypeScript.

## 📱 Project Overview

Fitness Messer gamifies fitness by connecting real exercise to virtual kingdom expansion. Every workout logged gives you resources to build your empire, unlock territories, and achieve milestones.

**Core Vision:**
- 💪 Manual exercise logging (honest tracking)
- 🏰 Empire building mechanics with progressive unlocks
- 📊 Progress tracking and achievements
- 🗺️ Territory expansion system
- 👤 User profiles with leaderboards (Phase 2)

## 🎯 Milestone 1: MVP Foundation

**✅ Completed:**
- React Native + Expo + TypeScript setup
- 5 Main navigation screens (tab-based)
- Premium dark navy + cyan theme system
- Reusable component library (Button, Card, Typography, Stats)
- Manual exercise logging UI
- Empire building UI with progression
- Territory/Map system
- Profile & achievements UI

**Status:** Ready for installation and testing

## 📁 Project Structure

```
fitness-messer/
├── src/
│   ├── app/                          # Expo Router routes (single source of truth)
│   │   ├── _layout.tsx               # Root Stack + global providers
│   │   ├── +not-found.tsx            # Catch-all route
│   │   ├── settings.tsx              # Settings screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx           # Tab navigator
│   │       ├── index.tsx             # Dashboard screen
│   │       ├── exercise.tsx          # Exercise logging screen
│   │       ├── empire.tsx            # Empire management screen
│   │       ├── map.tsx               # Territory exploration screen
│   │       └── profile.tsx           # User profile & achievements
│   ├── components/
│   │   ├── index.ts                  # Component exports
│   │   ├── SafeAreaWrapper.tsx       # Screen wrapper
│   │   ├── GlassCard.tsx             # Card component
│   │   ├── Button.tsx                # Button component
│   │   ├── Typography.tsx            # Text components
│   │   ├── StatCard.tsx              # Stat display card
│   │   └── ProgressBar.tsx           # Progress bar component
│   ├── lib/
│   │   └── game.ts                   # Game rules, economy & content definitions
│   ├── state/
│   │   └── GameContext.tsx           # Global state provider + useGame() hook
│   ├── styles/
│   │   └── theme.ts                  # Color, spacing, typography config
│   ├── __tests__/
│   │   └── game.test.ts              # Game rules unit tests
│   ├── app.json                      # Expo configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── package.json                  # Dependencies
│   └── README.md                     # This file
```

> **Routing rule:** every screen must live in exactly one place. The `(tabs)` group owns the
> five main screens; the root layout only hosts the stack and the global providers. Duplicated
> route files (e.g. `app/home.tsx` *and* `app/(tabs)/home.tsx`) resolve to the same URL and
> break the router.


## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Mobile** | React Native | 0.73.0 |
| **Framework** | Expo | 50.0.0 |
| **Navigation** | Expo Router | 2.0.0 |
| **Language** | TypeScript | 5.3.0 |
| **Icons** | Expo Vector Icons | 13.12.0 |
| **Safe Area** | react-native-safe-area-context | 4.7.0 |
| **Gestures** | react-native-gesture-handler | 2.14.0 |

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** v9+ or **yarn** v3+
- **Expo CLI** (global): `npm install -g expo-cli`

### Installation

1. **Clone or navigate to project:**
   ```bash
   cd D:\fitness-messer-hackthon
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify TypeScript compilation:**
   ```bash
   npm run type-check
   ```

### Running the App

#### **Option 1: Development Server (Recommended for Testing)**
```bash
npm start
```
This launches Expo's interactive CLI. Choose:
- `i` - Open in iOS simulator (macOS only)
- `a` - Open in Android emulator
- `w` - Open in web browser
- `j` - Open in Expo Go app (on physical device)

#### **Option 2: Android Emulator**
```bash
npm run android
```
(Requires Android SDK setup)

#### **Option 3: iOS Simulator**
```bash
npm run ios
```
(macOS only, requires Xcode)

#### **Option 4: Web Browser**
```bash
npm run web
```
(Limited functionality, development only)

### Building a Personal APK (no Expo Go needed)

The `android/` folder is committed, so the native project is always in sync with the
current dependency set. A signed, standalone APK can be produced with:

```bash
# 1. Sync the native project after any app.json or dependency change
npx expo prebuild --platform android --no-install

# 2. Build the release APK
cd android
gradlew.bat assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`.
It is signed with the local debug keystore, which is enough to install it on a
personal device (enable *Install unknown apps* for your file manager).

> **Memory-constrained machines:** the build settings in `android/gradle.properties`
> and `android/app/build.gradle` deliberately cap the Gradle heap, the Kotlin
> compiler and the Metro worker count. Without those caps the bundler step
> exhausts the page file and dies with *"JavaScript heap out of memory"*. Metro
> worker count is capped the same way in `metro.config.js` for `npm start`.

## 🎨 Design System

### Color Palette
- **Primary Background:** Deep Navy `#0f172a`
- **Card Background:** `#1a2847`
- **Accent (Primary):** Bright Cyan `#00d9ff`
- **Accent (Secondary):** Purple `#8b5cf6`
- **Success:** Green `#10b981`
- **Warning:** Amber `#f59e0b`
- **Danger:** Red `#ef4444`

### Theme Tokens
All design tokens are centralized in `src/styles/theme.ts`:
- **Colors** - Full palette with semantic names
- **Spacing** - xs (4px) to xxl (48px)
- **Typography** - h1 to caption, all with weights and line heights
- **Border Radius** - sm to full
- **Shadows** - sm, md, lg for depth

### Using Theme
```typescript
import { colors, spacing, typography } from '@/styles/theme';

// In components
<View style={{ padding: spacing.md, backgroundColor: colors.bg.card }}>
  <Text style={{ color: colors.accent.cyan }}>Styled text</Text>
</View>
```

## 📱 Screen Overview

### **Home Screen** 🏠
- Daily challenge progress (5 exercises/day → 100 gold bonus)
- Quick stats (Level, Streak, Gold, Today)
- Level progress bar
- Quick action cards that navigate to the right tab
- CTA to start exercise session

### **Exercise Screen** 💪
- Manual exercise input form
  - Exercise type (text input + quick-pick chips)
  - Reps (number input)
  - Sets (number input)
- Input validation
- Recent workout history with gold earned per entry
- Honest logging reminder

### **Empire Screen** 🏰
- Empire level and stats
- Total reps milestone progress bar
- Buildings list with unlock state, level and gold cost
- One-tap building upgrades (gold is deducted on success)
- Locked buildings with unlock requirements

### **Map Screen** 🗺️
- Claimed territories list
- Unclaimed territories with rep requirement and gold cost
- One-tap territory claiming
- Expansion guidance info

### **Profile Screen** 👤
- User header with avatar
- Personal stats grid
- Unlocked achievements list
- Locked achievements with progress bars
- Settings button and reset progress action

### **Settings Screen** ⚙️
- Display name editing
- Workout reminder and haptic feedback toggles
- Metric / imperial unit preference
- Storage explanation

## 🧩 Component Reference

### SafeAreaWrapper
Automatically handles iOS notch and safe areas.
```tsx
<SafeAreaWrapper bgColor={colors.bg.dark}>
  {/* Content */}
</SafeAreaWrapper>
```

### GlassCard
Versatile card with variants: `default`, `bordered`, `elevated`
```tsx
<GlassCard variant="bordered" padding={spacing.md}>
  {/* Content */}
</GlassCard>
```

### Button
Variants: `primary`, `secondary`, `outlined`
Sizes: `sm`, `md`, `lg`
```tsx
<Button
  label="Click me"
  onPress={() => console.log('pressed')}
  variant="primary"
  size="md"
  fullWidth
/>
```

### Typography
Predefined text styles via convenience components:
- `<H1>`, `<H2>`, `<H3>`, `<H4>` - Headings
- `<Body>` - Standard paragraph text
- `<BodySmall>` - Small body text
- `<Caption>` - Captions and labels

```tsx
<H2 color={colors.accent.cyan}>Heading</H2>
<Body color={colors.text.secondary}>Body text</Body>
```

### StatCard
Display metric with label and accent option
```tsx
<StatCard
  label="Level"
  value={5}
  icon="👑"
  accent={true}
/>
```

## ✅ Quality Checks

### TypeScript Validation
```bash
npm run type-check
```
**Current Status:** ✅ All files pass strict type checking

**Configuration:**
- Strict mode enabled
- No implicit any
- No unused variables or parameters
- No implicit returns
- No fallthrough cases

### Code Quality
```bash
npm run lint
```
**Current Status:** ✅ ESLint configured (`.eslintrc.js`), no errors

### Tests
```bash
npm test
```
**Current Status:** ✅ Jest + `jest-expo` preset, 17 passing tests

### Expo Doctor
```bash
npx expo-doctor
```
**Current Status:** ✅ 16/16 checks pass (run `npx expo prebuild` after changing `app.json`)

## 🔄 State Management

Global state is handled by **React Context + AsyncStorage**, not local component state.

- `src/lib/game.ts` — pure game rules: level thresholds, gold/XP economy, building and
  territory definitions, achievement definitions.
- `src/state/GameContext.tsx` — `GameProvider` + `useGame()` hook. Holds the single
  `GameState` object, applies actions through a reducer, and persists it to
  `AsyncStorage` under `@fitness-messer/state/v1` on every change.

**Persisted:** profile, gold, XP, level, total reps, workouts, streak, exercise log
history, building levels, claimed territories, unlocked achievements and settings.

```tsx
const { state, logWorkout, upgradeBuilding, claimTerritory } = useGame();
```

## 🚫 No Fake Data

This project **does NOT**:
- ❌ Fake exercise detection
- ❌ Fake sensor readings
- ❌ Fabricate achievements or rewards
- ❌ Auto-grant progress without user input

**All stats are based on honest manual logging.**

## 📋 Development Roadmap

### Phase 1 (Current) ✅
- [x] Project setup & navigation
- [x] Component library
- [x] 5 main screens
- [x] Theme system
- [x] Basic UI implementation

### Phase 2 (Next)
- [x] Local data persistence (AsyncStorage)
- [x] Exercise history & stats aggregation
- [x] Streak calculation logic
- [x] Achievement unlock system
- [x] Settings screen
- [x] Gold economy, building upgrades & territory claiming

### Phase 3 (Future)
- [ ] Backend integration (Node.js + MongoDB)
- [ ] User authentication
- [ ] Cloud save/sync
- [ ] Leaderboards
- [ ] Social features (challenges, friends)

### Phase 4 (Future)
- [ ] Fitness tracker integration (Google Fit, Apple HealthKit)
- [ ] Advanced analytics
- [ ] Multiplayer battles
- [ ] Push notifications
- [ ] App store release

## 🤝 Contributing

This is a single-developer project. Changes follow:
1. Feature branches for new features
2. Commit messages describing changes
3. Type safety enforced via TypeScript
4. Component-based architecture

## 📝 License

MIT

## 📞 Support

For issues or questions about the Fitness Messer project, check:
- TypeScript errors: Run `npm run type-check`
- Dependencies: Check `package.json`
- Theme customization: Edit `src/styles/theme.ts`
- Component updates: Update component files and re-export in `src/components/index.ts`

---

**Built with ❤️ for fitness warriors everywhere.**

**Lets Build Empire With Exercise** 🏰💪
