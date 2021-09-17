const chromiumBrowsers = new Set(["Google Chrome", "Chromium"]);
const isChromium = (navigator as any).userAgentData?.brands?.some((b: any) =>
  chromiumBrowsers.has(b.brand)
);
declare var browser: any;
const apis: typeof chrome = isChromium ? chrome : (browser as any);
export default apis;
