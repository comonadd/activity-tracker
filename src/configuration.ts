import { useContext } from "react";
import { DEFAULT_CONFIG } from "~/constants";
import AppContext from "~/AppContext";

export type ActivityType = string | null;
export interface ActivityDesc {
  description: string;
  reward: number;
}
export type ActTypeKey = string;
export type ActivityTypesMapping<AK extends ActTypeKey> = Record<
  AK,
  ActivityDesc
>;
export type ActivityMatcher<AK extends ActTypeKey> = Record<string, AK>;
export type Configuration<AK extends ActTypeKey> = {
  // mapping from activity id to activity info
  activityTypes: ActivityTypesMapping<AK>;
  // mapping from regexp to activity id
  matcher: ActivityMatcher<AK>;
  // bounds
  prodLowerBound: number;
  prodUpperBound: number;
  // urls to ignore completely
  urlIgnorePattern: string;
  // activity to color mapping (used in graphs)
  activityColors: Record<AK, string>;
};

export function calculateUrlType<AK extends ActTypeKey>(
  config: Configuration<AK>,
  url: string
): ActivityType {
  const urlDomain = new URL(url).hostname;
  const matchers = Object.keys(config.matcher);
  let at = config.matcher[urlDomain];
  if (at !== undefined) return at;
  for (const matcher of matchers) {
    if (url.includes(matcher)) {
      at = config.matcher[matcher];
      return at;
    }
  }
  return null;
}

export const useAppConfigPart = <K extends keyof CC, CC = Configuration<any>>(
  part: K
): CC[K] => {
  const { config } = useContext(AppContext);
  const value = (config as any)[part] ?? (DEFAULT_CONFIG as any)[part];
  return value;
};
