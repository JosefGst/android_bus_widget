
# Copilot Instructions for AI Agents

## Project Overview
 Expo React Native project targeting Android and iOS (see the [README.md](../../README.md)).

## Architecture & Data Flow
 Widget logic goes in [widget/](../../widget/). Widget names must match the configuration in [app.json](../../app.json).
- **Screens & Routes:** Route logic in [my_favorites.tsx](../../app/my_favorites.tsx) and subfolders under `(tabs)/`.
- **Widgets:** Android widgets implemented in [widget/](../../widget/), registered via [widget-registration.ts](../../widget-registration.ts) and configured in [app.json](../../app.json).
- **Data Fetching:** API calls and data formatting in [app/utils/fetch.ts](../../app/utils/fetch.ts) and [app/utils/time_formatting.ts](../../app/utils/time_formatting.ts).
- **Native Integration:** Android uses Gradle ([android/build.gradle](../../android/build.gradle)), iOS uses CocoaPods ([ios/Podfile](../../ios/Podfile)).

## Key Workflows
- **Install dependencies:** `npm install`
- **Run on Android:** `npx expo run:android`
- **Run on iOS:** `npx expo run:ios` (macOS required)
- **Run on Web:** `npm run web`
- **Lint:** `npm run lint`
- **Reset project:** `npm run reset-project` (see [app-example/scripts/reset-project.js](../../app-example/scripts/reset-project.js))

## Project Conventions
- Use TypeScript for all new code.
- Organize screens and navigation using folders and `_layout.tsx` files.
- Place shared logic in [utils/](../../app/utils/), [hooks/](../../app-example/hooks/), or [components/](../../app-example/components/).
- Widget logic goes in [widget/](../../widget/). Widget names must match configuration in [app.json](../../app.json).
- Use [app-example/](../../app-example/) for experimental/demo features and advanced UI.
- Follow folder structure and naming conventions as seen in [app/](../../app/) and [app-example/](../../app-example/).

## Integration Points & Patterns
- **Expo config:** [app.json](../../app.json), [eas.json](../../eas.json)
- **Widget registration:** [widget-registration.ts](../../widget-registration.ts) (Android only)
- **Widget implementation:** [widget/BusETAWidget.tsx](../../widget/BusETAWidget.tsx), [widget/widget-task-handler.tsx](../../widget/widget-task-handler.tsx)
- **API/data utilities:** [app/utils/fetch.ts](../../app/utils/fetch.ts), [app/utils/time_formatting.ts](../../app/utils/time_formatting.ts)
- **Navigation:** Update `_layout.tsx` and route files for new screens/routes
- **Theming:** Use hooks/constants in [app-example/hooks/](../../app-example/hooks/) and [app-example/constants/theme.ts](../../app-example/constants/theme.ts)

## Examples
- [widget/BusETAWidget.tsx](../../widget/BusETAWidget.tsx): Android widget UI and data flow
- [app/utils/fetch.ts](../../app/utils/fetch.ts): API call patterns
- [app-example/components/parallax-scroll-view.tsx](../../app-example/components/parallax-scroll-view.tsx): Advanced UI pattern

## Additional Notes
- Widget data flow: [widget-task-handler.tsx](../../widget/widget-task-handler.tsx) fetches ETA data, renders widget UI, and handles widget actions.
- Widget configuration in [app.json](../../app.json) must match widget implementation names.
- For new navigation routes, update relevant `_layout.tsx` and route files.
- For theming, use provided hooks and constants.
