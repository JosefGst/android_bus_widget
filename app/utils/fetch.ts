// Utility functions for fetching KMB ETA data

export type ETA = {
  route: string;
  dir: string;
  service_type: string;
  dest_en: string;
  eta: string;
  data_timestamp: string;
};

export type KMBResponse = {
  type: string;
  version: string;
  generated_timestamp: string;
  data: ETA[];
};


export type StopInfo = {
  stop: string;
  name_en: string;
  name_tc?: string;
  name_sc?: string;
  lat?: string;
  long?: string;
  data_timestamp?: string;
};

// Fetch ETA for a single route
export const fetchRouteETA = async (stop: string, route: string, dir: string): Promise<KMBResponse> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stop}/${route}/${dir}`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse>;
};


// Fetch stop info for a given stop ID
export const fetchStopInfo = async (stop: string): Promise<StopInfo | null> => {
  try {
    const url = `https://data.etabus.gov.hk/v1/transport/kmb/stop/${stop}`;
    const response = await fetch(url);
    const json = await response.json();
    return json.data as StopInfo;
  } catch (e) {
    console.error('Failed to fetch stop info', e);
    return null;
  }
};

// Fetch all ETAs for a list of routes and combine results
export const getAllBUSETAs = async (
  routesToFetch: { stop: string; route: string; dir: string }[]
): Promise<{ allData: ETA[]; generatedTimestamp: string }> => {
  const results = await Promise.all(
    routesToFetch.map(r => fetchRouteETA(r.stop, r.route, r.dir))
  );
  const allData = results.flatMap(res => res.data);
  const generatedTimestamp = results[0]?.generated_timestamp || '';
  return { allData, generatedTimestamp };
};
