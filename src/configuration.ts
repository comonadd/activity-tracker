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
};

export function calculateUrlType<AK extends ActTypeKey>(
  config: Configuration<AK>,
  url: string
): ActivityType {
  const urlDomain = new URL(url).hostname;
  const matchers = Object.keys(config.matcher);
  let at = config.matcher[urlDomain];
  if (at !== undefined) return at;
  for (let matcher of matchers) {
    if (url.includes(matcher)) {
      at = config.matcher[matcher];
      return at;
    }
  }
  return null;
}
