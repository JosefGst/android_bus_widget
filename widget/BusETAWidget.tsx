import React from "react";
import { FlexWidget, ListWidget, TextWidget } from "react-native-android-widget";
import type { Strings } from "../utils/strings";
import type { WidgetSection } from "../utils/widget_sections";

// Same palette as components/theme.ts; widget/ must not import components/.
const INK = "#14171F";
const ROW = "#262B36";
const WHITE = "#FFFFFF";
const MUTED = "#C9CDD6";
const NOW_BACKGROUND = "#FFE2A8";
const NOW_INK = "#5C3B00";

interface BusETAWidgetProps {
  strings: Strings;
  sections?: WidgetSection[];
  isLoading?: boolean;
  error?: string;
}

/**
 * Dark tile with no title, so the space goes to the ETAs: per Stop a heading and its Routes
 * (white route badge, large minutes or an amber "Now"). Tap anywhere to refresh.
 */
export function BusETAWidget({ strings, sections, isLoading, error }: BusETAWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        backgroundColor: INK,
        borderRadius: 24,
        padding: 12,
        flexGap: 8,
      }}
      clickAction="UPDATE_ETA"
      clickActionData={{ action: "refresh" }}
    >
      {renderBody({ strings, sections, isLoading, error })}
    </FlexWidget>
  );
}

function message(text: string) {
  return <TextWidget text={text} style={{ fontSize: 18, color: WHITE }} />;
}

function renderBody({ strings, sections, isLoading, error }: BusETAWidgetProps) {
  if (isLoading) return message(strings.widgetLoading);
  if (error) return message(error);
  if (!sections || sections.length === 0) return message(strings.widgetEmpty);
  return (
    <ListWidget style={{ height: "match_parent", width: "match_parent" }}>
      {sections.map(section => (
        <FlexWidget
          key={section.key}
          style={{ width: "match_parent", flexDirection: "column", flexGap: 6, marginBottom: 10 }}
          clickAction="UPDATE_ETA"
          clickActionData={{ action: "refresh" }}
        >
          <TextWidget text={section.stopName} style={{ fontSize: 16, fontWeight: "bold", color: MUTED }} maxLines={1} truncate="END" />
          {section.rows.map(row => (
            <FlexWidget
              key={row.key}
              style={{
                width: "match_parent",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: ROW,
                borderRadius: 14,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <FlexWidget style={{ flexDirection: "row", alignItems: "center", flexGap: 8, flex: 1 }}>
                <FlexWidget style={{ backgroundColor: WHITE, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 }}>
                  <TextWidget text={row.route} style={{ fontSize: 22, fontWeight: "bold", color: INK }} />
                </FlexWidget>
                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget text={row.dest} style={{ fontSize: 14, color: MUTED }} maxLines={1} truncate="END" />
                </FlexWidget>
              </FlexWidget>
              {row.isNow ? (
                <FlexWidget style={{ backgroundColor: NOW_BACKGROUND, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
                  <TextWidget text={row.time} style={{ fontSize: 22, fontWeight: "bold", color: NOW_INK }} />
                </FlexWidget>
              ) : (
                <TextWidget text={row.time} style={{ fontSize: 24, fontWeight: "bold", color: WHITE }} />
              )}
            </FlexWidget>
          ))}
        </FlexWidget>
      ))}
    </ListWidget>
  );
}
