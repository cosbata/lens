import type { Category } from "../core/model";

export type FeedAuthority = "official" | "established" | "specialist";

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  categoryHint: Category;
  authority: FeedAuthority;
  language?: string;
}

export const RSS_FEEDS: RssFeed[] = [
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", categoryHint: "conflict", authority: "established" },
  { id: "al-jazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", categoryHint: "conflict", authority: "established" },
  { id: "un-news", name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", categoryHint: "conflict", authority: "official" },
  { id: "guardian-world", name: "Guardian World", url: "https://www.theguardian.com/world/rss", categoryHint: "conflict", authority: "established" },

  { id: "npr-news", name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", categoryHint: "politics-diplomacy", authority: "established" },
  { id: "pbs-newshour", name: "PBS NewsHour", url: "https://www.pbs.org/newshour/feeds/rss/headlines", categoryHint: "politics-diplomacy", authority: "established" },
  { id: "politico", name: "Politico", url: "https://rss.politico.com/politics-news.xml", categoryHint: "politics-diplomacy", authority: "established" },
  { id: "france24", name: "France 24", url: "https://www.france24.com/en/rss", categoryHint: "politics-diplomacy", authority: "established" },

  { id: "cisa", name: "CISA Advisories", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", categoryHint: "security", authority: "official" },
  { id: "krebs", name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", categoryHint: "security", authority: "specialist" },
  { id: "dark-reading", name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", categoryHint: "security", authority: "specialist" },
  { id: "hacker-news-security", name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", categoryHint: "security", authority: "specialist" },

  { id: "gdacs", name: "GDACS", url: "https://www.gdacs.org/xml/rss.xml", categoryHint: "disasters", authority: "official" },
  { id: "reliefweb", name: "Guardian Global Development", url: "https://www.theguardian.com/global-development/rss", categoryHint: "disasters", authority: "established" },
  { id: "nws", name: "US National Hurricane Center", url: "https://www.nhc.noaa.gov/index-at.xml", categoryHint: "disasters", authority: "official" },
  { id: "usgs-earthquakes", name: "USGS Earthquakes", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.atom", categoryHint: "disasters", authority: "official" },

  { id: "nasa-climate", name: "NASA Earth Observatory", url: "https://earthobservatory.nasa.gov/feeds/earth-observatory.rss", categoryHint: "climate-environment", authority: "official" },
  { id: "noaa-news", name: "BBC Science & Environment", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", categoryHint: "climate-environment", authority: "established" },
  { id: "carbon-brief", name: "Carbon Brief", url: "https://www.carbonbrief.org/feed/", categoryHint: "climate-environment", authority: "specialist" },
  { id: "guardian-environment", name: "Guardian Environment", url: "https://www.theguardian.com/environment/rss", categoryHint: "climate-environment", authority: "established" },

  { id: "federal-reserve", name: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml", categoryHint: "economy", authority: "official" },
  { id: "imf-news", name: "European Central Bank", url: "https://www.ecb.europa.eu/rss/press.html", categoryHint: "economy", authority: "official" },
  { id: "cnbc", name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", categoryHint: "economy", authority: "established" },
  { id: "oecd", name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", categoryHint: "economy", authority: "established" },

  { id: "iaea", name: "US Department of Energy", url: "https://www.energy.gov/rss/articles", categoryHint: "energy", authority: "official" },
  { id: "eia", name: "US EIA", url: "https://www.eia.gov/rss/todayinenergy.xml", categoryHint: "energy", authority: "official" },
  { id: "oilprice", name: "OilPrice", url: "https://oilprice.com/rss/main", categoryHint: "energy", authority: "specialist" },
  { id: "iea", name: "Guardian Business", url: "https://www.theguardian.com/business/rss", categoryHint: "energy", authority: "established" },

  { id: "freightwaves", name: "FreightWaves", url: "https://www.freightwaves.com/feed", categoryHint: "supply-chains", authority: "specialist" },
  { id: "maritime-executive", name: "Port Technology", url: "https://www.porttechnology.org/feed/", categoryHint: "supply-chains", authority: "specialist" },
  { id: "splash247", name: "Splash247", url: "https://splash247.com/feed/", categoryHint: "supply-chains", authority: "specialist" },
  { id: "gcaptain", name: "gCaptain", url: "https://gcaptain.com/feed/", categoryHint: "supply-chains", authority: "specialist" },

  { id: "who", name: "World Health Organization", url: "https://www.who.int/rss-feeds/news-english.xml", categoryHint: "health", authority: "official" },
  { id: "cdc", name: "US CDC", url: "https://tools.cdc.gov/api/v2/resources/media/132608.rss", categoryHint: "health", authority: "official" },
  { id: "ecdc", name: "BBC Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml", categoryHint: "health", authority: "established" },
  { id: "nih", name: "US FDA", url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml", categoryHint: "health", authority: "official" },

  { id: "ars-technica", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", categoryHint: "technology-infrastructure", authority: "established" },
  { id: "the-verge", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", categoryHint: "technology-infrastructure", authority: "established" },
  { id: "mit-tech-review", name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", categoryHint: "technology-infrastructure", authority: "established" },
  { id: "cloudflare-blog", name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/", categoryHint: "technology-infrastructure", authority: "specialist" },
];
