import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { fetchStop, getAllBUSETAs } from "../app/utils/fetch";
import { BusETAWidget } from "./BusETAWidget";

// Routes to fetch - same as in my_routes.tsx
const routesToFetch = [
  { stop: 'B464BD6334A93FA1', route: '272P', dir: '1' },
  { stop: 'B644204AEDE7A031', route: '272X', dir: '1' },
];

const nameToWidget = {
  // BusETAWidget must match the "name" in app.json widget configuration
  BusETAWidget: BusETAWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[
    widgetInfo.widgetName as keyof typeof nameToWidget
  ] as any;

  if (!Widget) {
    return;
  }

  // Helper function to fetch and render ETA data
  const fetchAndRenderETAs = async () => {
    try {
      const { allData } = await getAllBUSETAs(routesToFetch);

      // Fetch stop names for all unique stops
      const uniqueStops = Array.from(new Set(routesToFetch.map(r => r.stop)));
      const stopInfoResults = await Promise.all(uniqueStops.map(stopId => fetchStop(stopId)));
      const stopNameMap: Record<string, string> = {};
      stopInfoResults.forEach((info, idx) => {
        if (info) {
          stopNameMap[uniqueStops[idx]] = info.name_en;
        }
      });

      // Attach stopName to each ETA (by matching route/dir to routesToFetch)
      const normalizeDir = (dir: string) => {
        if (dir === '1' || dir === 'O') return ['1', 'O'];
        if (dir === '2' || dir === 'I') return ['2', 'I'];
        return [dir];
      };
      const etasWithStopName = allData.map((eta, idx) => {
        const routeObj = routesToFetch.find(r => r.route === eta.route && normalizeDir(r.dir).includes(eta.dir));
        const stopId = routeObj ? routeObj.stop : routesToFetch[idx]?.stop;
        const stopName = stopId ? stopNameMap[stopId] : undefined;
        return { ...eta, stopName };
      });

      props.renderWidget(<Widget {...widgetInfo} etas={etasWithStopName} />);
    } catch (error) {
      console.error("Error fetching ETA data:", error);
      // Always render something, even on error
      props.renderWidget(
        <Widget 
          {...widgetInfo} 
          error="Failed to load ETAs" 
        />
      );
    }
  };

  // Always render the widget immediately for all actions that require display
  // First render with loading state synchronously
  props.renderWidget(<Widget {...widgetInfo} isLoading={true} />);
  
  // Then fetch data asynchronously (don't await, let it update in background)
  fetchAndRenderETAs().catch(err => {
    console.error("Failed to fetch ETAs:", err);
    props.renderWidget(<Widget {...widgetInfo} error="Failed to load ETAs" />);
  });

  switch (props.widgetAction) {
    case "WIDGET_ADDED": {
      // Already rendered above
      break;
    }

    case "WIDGET_UPDATE": {
      // Already rendered above
      break;
    }

    case "WIDGET_RESIZED": {
      // Already rendered above
      break;
    }

    case "WIDGET_DELETED":
      // Not needed for now
      break;

    case "WIDGET_CLICK": {
      // On click, refresh the data (already fetching above)
      // Don't open the app, just update the widget
      break;
    }
    default:
      // Already rendered above
      break;
  }
}
