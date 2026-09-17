import React from "react";
import {
  FlexWidget,
  TextWidget,
} from "react-native-android-widget";
import { getRouteETAs } from "../utils/eta_grouping";
import type { ETA } from "../utils/fetch";
import { normalizeStopName } from "../utils/string_formatting";

interface BusETAWidgetProps {
  groupedEtas?: Record<string, ETA[]>;
  etas?: ETA[]; // legacy, for fallback
  isLoading?: boolean;
  error?: string;
}

export function BusETAWidget({ groupedEtas, etas, isLoading, error }: BusETAWidgetProps) {
  // Render grouped routes under each stop name
  const renderGroupedEtas = () => {
    let children = [];
    if (isLoading) {
      children.push(<TextWidget key="loading" text="Loading..." style={{ fontSize: 16, color: "#ffffff", fontWeight: "bold" }} />);
    } else if (error) {
      children.push(<TextWidget key="error" text={error} style={{ fontSize: 16, color: "#ffffff", fontWeight: "bold" }} />);
    } else if (!groupedEtas || Object.keys(groupedEtas).length === 0) {
      children.push(<TextWidget key="empty" text="No buses available" style={{ fontSize: 16, color: "#ffffff", fontWeight: "bold" }} />);
    } else {
      Object.entries(groupedEtas).forEach(([stopName, etaList]) => {
        const normalizedStopName = normalizeStopName(stopName);
        const routeETAs = getRouteETAs(etaList);
        children.push(
          <TextWidget
            key={`stop-${stopName}`}
            text={normalizedStopName}
            style={{
              fontSize: 16,
              color: "#ffffff",
              fontWeight: "bold",
              marginLeft: 4,
              textAlign: "left",
            }}
          />
        );
        children.push(
          <TextWidget
            key={`etas-${stopName}`}
            text={routeETAs.map(({ route, minutes }) => minutes === null ? `${route}: --` : `${route}: ${minutes} min`).join("\n")}
            style={{
              fontSize: 16,
              color: "#ffffff",
              fontWeight: "bold",
              marginLeft: 8,
              textAlign: "left",
            }}
          />
        );
      });
    }
    return children;
  };

  // Fallback for legacy etas prop
  const renderLegacyEtas = () => {
    // Try to get the stop name from the first ETA (if available)
    let stopName = '';
    if (etas && etas.length > 0 && (etas[0] as any).stopName) {
      stopName = normalizeStopName((etas[0] as any).stopName);
    }
    const routeETAs = getRouteETAs(etas);
    const displayText = isLoading ? "Loading..." : error ? error : (routeETAs.length === 0 ? "No buses available" : routeETAs.map(({ route, minutes }) => minutes === null ? `${route}: --` : `${route}: ${minutes} min`).join("\n"));
    let children = [];
    if (stopName) {
      children.push(
        <TextWidget
          key="legacy-stop"
          text={stopName}
          style={{
            fontSize: 16,
            color: "#ffffff",
            fontWeight: "bold",
            marginLeft: 4,
            textAlign: "left",
          }}
        />
      );
    }
    children.push(
      <TextWidget
        key="legacy-etas"
        text={displayText}
        style={{
          fontSize: 16,
          color: "#ffffff",
          fontWeight: "bold",
          marginLeft: 8,
          textAlign: "left",
        }}
      />
    );
    return children;
  };

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
      clickAction="UPDATE_ETA"
      clickActionData={{ action: "refresh" }}
    >
      {groupedEtas ? renderGroupedEtas() : renderLegacyEtas()}
    </FlexWidget>
  );
}
