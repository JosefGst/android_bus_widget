import React from "react";
import { FlexWidget, ListWidget, TextWidget } from "react-native-android-widget";
import type { Strings } from "../utils/strings";
import type { WidgetSection } from "../utils/widget_sections";

// Same palette as components/theme.ts; widget/ must not import components/.
const INK = "#14171F";
const DIVIDER = "#2D3340";
const DIM = "#8E95A5";
const WHITE = "#FFFFFF";
const MUTED = "#C9CDD6";
const NOW_BACKGROUND = "#FFE2A8";
const NOW_INK = "#5C3B00";

interface BusETAWidgetProps {
  strings: Strings;
  sections?: WidgetSection[];
  isLoading?: boolean;
  error?: string;
  /** Widget width as a share of the screen width (0-1); picks how much each row shows. */
  widthShare?: number;
}

/**
 * How much a row shows, by the widget's share of the screen width. Launchers differ in cell size
 * (Samsung ~98dp, stock ~70dp), but both put about four columns across the screen, so the share
 * tells the tile count: 2 tiles ~ 0.5, 3 tiles ~ 0.75, 4 tiles ~ 1. The 2-tile size drops the destination.
 */
interface Density {
  showDest: boolean;
  badge: number;
  time: number;
  unit: number;
  dest: number;
  gap: number;
  padding: number;
}

const WIDE: Density = { showDest: true, badge: 28, time: 24, unit: 11, dest: 14, gap: 4, padding: 12 };
const NARROW: Density = { showDest: true, badge: 19, time: 19, unit: 10, dest: 12, gap: 3, padding: 10 };
const COMPACT: Density = { showDest: false, badge: 22, time: 19, unit: 10, dest: 12, gap: 6, padding: 10 };

export function densityFor(widthShare?: number): Density {
  if (widthShare === undefined || widthShare >= 0.88) return WIDE;
  if (widthShare >= 0.62) return NARROW;
  return COMPACT;
}

/**
 * Dark tile with no title, so the space goes to the ETAs: per Stop a heading and its Routes
 * (white route badge, destination, large minutes or an amber "Now"). Tap anywhere to refresh.
 */
export function BusETAWidget({ strings, sections, isLoading, error, widthShare }: BusETAWidgetProps) {
  const density = densityFor(widthShare);
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        backgroundColor: INK,
        borderRadius: 24,
        padding: density.padding,
        flexGap: 6,
      }}
      clickAction="UPDATE_ETA"
      clickActionData={{ action: "refresh" }}
    >
      {renderBody({ strings, sections, isLoading, error }, density)}
    </FlexWidget>
  );
}

function message(text: string) {
  return <TextWidget text={text} style={{ fontSize: 18, color: WHITE }} />;
}

function renderBody({ strings, sections, isLoading, error }: BusETAWidgetProps, density: Density) {
  if (isLoading) return message(strings.widgetLoading);
  if (error) return message(error);
  if (!sections || sections.length === 0) return message(strings.widgetEmpty);
  return (
    <ListWidget style={{ height: "match_parent", width: "match_parent" }}>
      {sections.map(section => (
        <FlexWidget
          key={section.key}
          style={{ width: "match_parent", flexDirection: "column", marginBottom: 8 }}
          clickAction="UPDATE_ETA"
          clickActionData={{ action: "refresh" }}
        >
          <TextWidget text={section.stopName} style={{ fontSize: 15, fontWeight: "bold", color: MUTED }} maxLines={1} truncate="END" />
          {section.rows.map((row, index) => (
            <FlexWidget key={row.key} style={{ width: "match_parent", flexDirection: "column" }}>
              {index > 0 ? <FlexWidget style={{ width: "match_parent", height: 1, backgroundColor: DIVIDER, marginTop: 2 }} /> : null}
              <FlexWidget
                style={{
                  width: "match_parent",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexGap: density.gap,
                  paddingVertical: 5,
                }}
              >
                <FlexWidget style={{ backgroundColor: WHITE, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 1 }}>
                  <TextWidget text={row.route} style={{ fontSize: density.badge, fontWeight: "bold", color: INK }} />
                </FlexWidget>
                {density.showDest ? (
                  <FlexWidget style={{ flex: 1, flexDirection: "column" }}>
                    <TextWidget text={strings.toDestination.toUpperCase()} style={{ fontSize: 10, color: DIM, letterSpacing: 0.05 }} maxLines={1} />
                    <TextWidget text={row.dest} style={{ fontSize: density.dest, fontWeight: "bold", color: WHITE }} maxLines={2} truncate="END" />
                  </FlexWidget>
                ) : null}
                {row.isNow ? (
                  <FlexWidget style={{ backgroundColor: NOW_BACKGROUND, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 1 }}>
                    <TextWidget text={row.time} style={{ fontSize: density.time - 3, fontWeight: "bold", color: NOW_INK }} />
                  </FlexWidget>
                ) : (
                  <FlexWidget style={{ flexDirection: "column", alignItems: "center" }}>
                    <TextWidget text={row.time} style={{ fontSize: density.time, fontWeight: "bold", color: WHITE }} />
                    {row.unit ? <TextWidget text={row.unit} style={{ fontSize: density.unit, color: MUTED }} maxLines={1} /> : null}
                  </FlexWidget>
                )}
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      ))}
    </ListWidget>
  );
}
