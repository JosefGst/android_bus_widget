import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { loadFavoriteBoard } from "../utils/favorite_board";
import { listForWidget } from "../utils/favorites";
import { getLanguage } from "../utils/language";
import { STRINGS } from "../utils/strings";
import { BusETAWidget } from "./BusETAWidget";

// Must match the widget name in app.json.
export const BUS_WIDGET_NAME = "BusETAWidget";

const WIDGET_FETCH_TIMEOUT_MS = 12000;

/** Reject after ms so we never leave the widget stuck on Loading (e.g. when app is closed). */
function withTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Widget update timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Loads the Favorite board and returns the finished widget. Never rejects:
 * any failure or timeout renders the "Tap to refresh" state instead.
 */
export async function renderBusWidget(): Promise<React.JSX.Element> {
  const language = await getLanguage();
  const text = STRINGS[language];
  try {
    const board = await withTimeout(
      WIDGET_FETCH_TIMEOUT_MS,
      listForWidget().then((favorites) => loadFavoriteBoard(favorites, new Date(), language))
    );
    return <BusETAWidget strings={text} groups={board.groups} />;
  } catch (e) {
    console.error("[Widget] ETA fetch failed:", e);
    return <BusETAWidget strings={text} error={text.widgetTapToRefresh} />;
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== BUS_WIDGET_NAME) return;
  if (props.widgetAction === "WIDGET_DELETED") return;

  // Every other action (added, update, resized, click) shows Loading, then refreshes the data.
  props.renderWidget(<BusETAWidget strings={STRINGS[await getLanguage()]} isLoading={true} />);
  props.renderWidget(await renderBusWidget());
}
