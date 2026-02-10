// Utility functions for fetching KMB ETA data

export type ETA = {
  route: string;
  dir: string;
  service_type: string;
  dest_en: string;
  eta: string;
  data_timestamp: string;
};

export type ROUTS = {
  route: string;
  bound: string;
  service_type: string;
  orig_en: string;
  dest_en: string;
  seq: string;
  stop: string;

};

export type KMBResponse<T> = {
  type: string;
  version: string;
  generated_timestamp: string;
  data: T[];
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


// Fetch all BUS ROUTS route
export const fetchROUTE = async (): Promise<KMBResponse<ROUTS>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<ROUTS>>;
};

// Fetch all ROUTS Stops for a given route
export const fetchRouteSTOP = async (route: string, dir: string, service_type: string): Promise<KMBResponse<ROUTS>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${dir}/${service_type}`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<ROUTS>>;
};

// Fetch ETA for a single route
export const fetchRouteETA = async (route: string, dir: string): Promise<KMBResponse<ETA>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${route}/${dir}`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<ETA>>;
};

// Fetch ETA for a stop and route
export const fetchStopETA = async (stop: string, route: string, dir: string): Promise<KMBResponse<ETA>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stop}/${route}/${dir}`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<ETA>>;
};


// Fetch stop info for a given stop ID
export const fetchStop = async (stop: string): Promise<StopInfo | null> => {
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
    routesToFetch.map(r => fetchStopETA(r.stop, r.route, r.dir))
  );
  const allData = results.flatMap(res => res.data);
  const generatedTimestamp = results[0]?.generated_timestamp || '';
  return { allData, generatedTimestamp };
};
