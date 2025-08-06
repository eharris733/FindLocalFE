export interface Venue {
  id: string; // uuid
  name: string;
  city: string;
  url: string | null;
  is_active: boolean | null;
  last_scraped_at: string | null; // timestamp with time zone
  scraper_config: any | null; // jsonb
  transform_rules: any | null; // jsonb
  created_at: string | null; // timestamp with time zone
  scraper_plan_path: string | null;
  transformer_rules_path: string | null;
  start_url: string | null;
  address: string | null;
  description: string | null;
  image: string | null;
  genres: string | null;
  type: string | null; // default 'Music'
  latitude: number | null; // numeric(10, 8)
  longitude: number | null; // numeric(11, 8)
}