import React from "react";
import {
    FlexWidget,
    TextWidget,
} from "react-native-android-widget";
import type { ETA } from "../app/utils/fetch";
import { getMinutesUntilArrival } from "../app/utils/time_formatting";

interface BusETAWidgetProps {
  etas?: ETA[];
  isLoading?: boolean;
  error?: string;
}

export function BusETAWidget({ etas, isLoading, error }: BusETAWidgetProps) {
  // Helper function to group ETAs by route and get the earliest arrival
  const getRouteETAs = (etaList: ETA[] | undefined) => {
    if (!etaList || etaList.length === 0) return [];
    
    const routeMap = new Map<string, { route: string; minutes: number | null }>();
    
    etaList.forEach(eta => {
      const minutes = getMinutesUntilArrival(eta.eta);
      const routeKey = `${eta.route}${eta.dir}`;
      
      if (!routeMap.has(routeKey) || 
          (minutes !== null && 
           (routeMap.get(routeKey)?.minutes === null || 
            minutes < (routeMap.get(routeKey)?.minutes || Infinity)))) {
        routeMap.set(routeKey, { route: eta.route, minutes });
      }
    });
    
    return Array.from(routeMap.values()).sort((a, b) => {
      if (a.minutes === null) return 1;
      if (b.minutes === null) return -1;
      return a.minutes - b.minutes;
    });
  };

  // Get display text
  const getDisplayText = () => {
    if (isLoading) return "Loading...";
    if (error) return error;
    
    const routeETAs = getRouteETAs(etas);
    if (routeETAs.length === 0) return "No buses available";
    
    return routeETAs
      .map(({ route, minutes }) => {
        if (minutes === null) return `${route}: --`;
        return `${route}: ${minutes} min`;
      })
      .join("\n");
  };

  const displayText = getDisplayText();

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000000",
        borderRadius: 16,
        padding: 16,
      }}
      clickAction="REFRESH"
    >
      <TextWidget
        text={displayText}
        style={{
          fontSize: 20,
          color: "#ffffff",
          fontWeight: "bold",
        }}
      />
    </FlexWidget>
  );
}
