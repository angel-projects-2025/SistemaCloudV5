export interface AwsRegionData {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  continent: string;
  status: 'available' | 'upcoming';
  azCount: number;
  launchYear: number | string;
}

export const awsRegions: AwsRegionData[] = [
  // América del Norte
  { id: 'us-east-1', name: 'N. Virginia', code: 'us-east-1', lat: 38.13, lng: -78.45, continent: 'América del Norte', status: 'available', azCount: 6, launchYear: 2006 },
  { id: 'us-east-2', name: 'Ohio', code: 'us-east-2', lat: 40.0, lng: -82.9, continent: 'América del Norte', status: 'available', azCount: 3, launchYear: 2016 },
  { id: 'us-west-1', name: 'N. California', code: 'us-west-1', lat: 37.35, lng: -121.95, continent: 'América del Norte', status: 'available', azCount: 3, launchYear: 2009 },
  { id: 'us-west-2', name: 'Oregón', code: 'us-west-2', lat: 45.84, lng: -119.69, continent: 'América del Norte', status: 'available', azCount: 4, launchYear: 2011 },
  { id: 'ca-central-1', name: 'Canadá Centro', code: 'ca-central-1', lat: 45.5, lng: -73.6, continent: 'América del Norte', status: 'available', azCount: 3, launchYear: 2016 },
  { id: 'ca-west-1', name: 'Calgary', code: 'ca-west-1', lat: 51.05, lng: -114.07, continent: 'América del Norte', status: 'available', azCount: 3, launchYear: 2023 },
  { id: 'us-gov-east-1', name: 'GovCloud Este', code: 'us-gov-east-1', lat: 39.0, lng: -77.5, continent: 'América del Norte', status: 'available', azCount: 3, launchYear: 2018 },
  { id: 'us-gov-west-1', name: 'GovCloud Oeste', code: 'us-gov-west-1', lat: 37.5, lng: -122.0, continent: 'América del Norte', status: 'available', azCount: 3, launchYear: 2016 },
  { id: 'mx-central-1', name: 'México Centro', code: 'mx-central-1', lat: 19.43, lng: -99.13, continent: 'América del Norte', status: 'upcoming', azCount: 0, launchYear: 'Próximamente' },

  // América del Sur
  { id: 'sa-east-1', name: 'São Paulo', code: 'sa-east-1', lat: -23.55, lng: -46.63, continent: 'América del Sur', status: 'available', azCount: 3, launchYear: 2011 },

  // Europa
  { id: 'eu-west-1', name: 'Irlanda', code: 'eu-west-1', lat: 53.33, lng: -6.25, continent: 'Europa', status: 'available', azCount: 3, launchYear: 2007 },
  { id: 'eu-central-1', name: 'Fráncfort', code: 'eu-central-1', lat: 50.11, lng: 8.68, continent: 'Europa', status: 'available', azCount: 3, launchYear: 2014 },
  { id: 'eu-west-2', name: 'Londres', code: 'eu-west-2', lat: 51.5, lng: -0.12, continent: 'Europa', status: 'available', azCount: 3, launchYear: 2016 },
  { id: 'eu-west-3', name: 'París', code: 'eu-west-3', lat: 48.86, lng: 2.35, continent: 'Europa', status: 'available', azCount: 3, launchYear: 2017 },
  { id: 'eu-north-1', name: 'Estocolmo', code: 'eu-north-1', lat: 59.33, lng: 18.07, continent: 'Europa', status: 'available', azCount: 3, launchYear: 2018 },
  { id: 'eu-south-1', name: 'Milán', code: 'eu-south-1', lat: 45.46, lng: 9.19, continent: 'Europa', status: 'available', azCount: 3, launchYear: 2020 },
  { id: 'eu-central-2', name: 'Zúrich', code: 'eu-central-2', lat: 47.37, lng: 8.54, continent: 'Europa', status: 'available', azCount: 3, launchYear: 2022 },
  { id: 'eu-south-2', name: 'España', code: 'eu-south-2', lat: 40.42, lng: -3.7, continent: 'Europa', status: 'available', azCount: 3, launchYear: 2022 },

  // Asia Pacífico
  { id: 'ap-northeast-1', name: 'Tokio', code: 'ap-northeast-1', lat: 35.68, lng: 139.69, continent: 'Asia Pacífico', status: 'available', azCount: 3, launchYear: 2010 },
  { id: 'ap-northeast-3', name: 'Osaka', code: 'ap-northeast-3', lat: 34.69, lng: 135.5, continent: 'Asia Pacífico', status: 'available', azCount: 3, launchYear: 2018 },
  { id: 'ap-northeast-2', name: 'Seúl', code: 'ap-northeast-2', lat: 37.57, lng: 126.98, continent: 'Asia Pacífico', status: 'available', azCount: 3, launchYear: 2016 },
  { id: 'ap-southeast-1', name: 'Singapur', code: 'ap-southeast-1', lat: 1.35, lng: 103.82, continent: 'Asia Pacífico', status: 'available', azCount: 3, launchYear: 2010 },
  { id: 'ap-southeast-2', name: 'Sídney', code: 'ap-southeast-2', lat: -33.86, lng: 151.21, continent: 'Asia Pacífico', status: 'available', azCount: 3, launchYear: 2012 },
  { id: 'ap-south-1', name: 'Mumbai', code: 'ap-south-1', lat: 19.08, lng: 72.88, continent: 'Asia Pacífico', status: 'available', azCount: 3, launchYear: 2016 },
  { id: 'ap-southeast-3', name: 'Yakarta', code: 'ap-southeast-3', lat: -6.21, lng: 106.85, continent: 'Asia Pacífico', status: 'available', azCount: 3, launchYear: 2021 },
  { id: 'ap-southeast-4', name: 'Melbourne', code: 'ap-southeast-4', lat: -37.81, lng: 144.96, continent: 'Asia Pacífico', status: 'available', azCount: 3, launchYear: 2023 },

  // Oriente Medio / África
  { id: 'me-south-1', name: 'Bahréin', code: 'me-south-1', lat: 26.23, lng: 50.58, continent: 'Oriente Medio / África', status: 'available', azCount: 3, launchYear: 2019 },
  { id: 'me-central-1', name: 'EAU', code: 'me-central-1', lat: 24.45, lng: 54.65, continent: 'Oriente Medio / África', status: 'available', azCount: 3, launchYear: 2022 },
  { id: 'af-south-1', name: 'Ciudad del Cabo', code: 'af-south-1', lat: -33.92, lng: 18.42, continent: 'Oriente Medio / África', status: 'available', azCount: 3, launchYear: 2020 },
];

export const CONTINENTS = [
  { label: 'Todos', lat: 20, lng: 0, altitude: 1.05 },
  { label: 'América del Norte', lat: 39, lng: -98, altitude: 1.05 },
  { label: 'América del Sur', lat: -15, lng: -60, altitude: 1.05 },
  { label: 'Europa', lat: 50, lng: 10, altitude: 1.05 },
  { label: 'Asia Pacífico', lat: 20, lng: 115, altitude: 1.05 },
  { label: 'Oriente Medio / África', lat: 15, lng: 30, altitude: 1.05 },
] as const;
