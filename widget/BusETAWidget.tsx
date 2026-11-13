import React from "react";
import {
  FlexWidget,
  TextWidget,
} from "react-native-android-widget";
import { nextArrivalsText, StopGroup } from "../utils/favorite_board";
import type { Strings } from "../utils/strings";

interface BusETAWidgetProps {
  strings: Strings;
  groups?: StopGroup[];
  isLoading?: boolean;
  error?: string;
}

const TEXT_STYLE = { fontSize: 16, color: "#ffffff", fontWeight: "bold" } as const;

export function BusETAWidget({ strings, groups, isLoading, error }: BusETAWidgetProps) {
  const renderContent = () => {
    if (isLoading) {
      return [<TextWidget key="loading" text={strings.widgetLoading} style={TEXT_STYLE} />];
    }
    if (error) {
      return [<TextWidget key="error" text={error} style={TEXT_STYLE} />];
    }
    if (!groups || groups.length === 0) {
      return [<TextWidget key="empty" text={strings.widgetEmpty} style={TEXT_STYLE} />];
    }
    return groups.flatMap(group => [
      <TextWidget
        key={`stop-${group.stopName}`}
        text={group.stopName}
        style={{ ...TEXT_STYLE, marginLeft: 4, textAlign: "left" }}
      />,
      <TextWidget
        key={`etas-${group.stopName}`}
        text={nextArrivalsText(group, strings)}
        style={{ ...TEXT_STYLE, marginLeft: 8, textAlign: "left" }}
      />,
    ]);
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
      {renderContent()}
    </FlexWidget>
  );
}
