import { requestWidgetUpdate } from "react-native-android-widget";

import { BUS_WIDGET_NAME, renderBusWidget } from "./widget-task-handler";

/**
 * Re-renders every BusETAWidget on the home screen right away, using the same
 * render path as the scheduled widget task. Never throws.
 */
export async function refreshBusWidget(): Promise<void> {
  try {
    await requestWidgetUpdate({ widgetName: BUS_WIDGET_NAME, renderWidget: renderBusWidget });
  } catch (e) {
    console.error("[Widget] Refresh after Favorites change failed:", e);
  }
}
