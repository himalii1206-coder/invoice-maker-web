/**
 * Geographic & Address Lookup Utilities (States, Cities & Indian Postal Pincode API)
 *
 * Uses:
 * 1. Free India Post Pincode API (https://api.postalpincode.in/pincode/{pincode})
 * 2. Free CountriesNow State/Cities API (https://countriesnow.space/api/v0.1/countries/state/cities)
 * 3. Comprehensive offline fallback data for Indian States and major Cities.
 */

export interface StateOption {
  code: string;
  name: string;
  isUnionTerritory?: boolean;
}

export const INDIAN_STATES: StateOption[] = [
  { code: '01', name: 'Jammu and Kashmir', isUnionTerritory: true },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh', isUnionTerritory: true },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi', isUnionTerritory: true },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', isUnionTerritory: true },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep', isUnionTerritory: true },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry', isUnionTerritory: true },
  { code: '35', name: 'Andaman and Nicobar Islands', isUnionTerritory: true },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh', isUnionTerritory: true },
  { code: '97', name: 'Other Territory' }
];

// Offline fallback for major cities in Indian States
const DEFAULT_CITIES_BY_STATE: Record<string, string[]> = {
  Gujarat: [
    'Ahmedabad',
    'Surat',
    'Vadodara',
    'Rajkot',
    'Bhavnagar',
    'Jamnagar',
    'Gandhinagar',
    'Junagadh',
    'Anand',
    'Navsari',
    'Morbi',
    'Nadiad',
    'Surendranagar',
    'Bharuch',
    'Mehsana',
    'Bhuj',
    'Porbandar',
    'Valsad',
    'Vapi',
    'Gondal',
    'Veraval',
    'Godhra',
    'Patan',
    'Dahod',
    'Botad',
    'Amreli',
    'Deesa',
    'Jetpur'
  ],
  Maharashtra: [
    'Mumbai',
    'Pune',
    'Nagpur',
    'Thane',
    'Nashik',
    'Kalyan-Dombivli',
    'Vasai-Virar',
    'Aurangabad (Chhatrapati Sambhajinagar)',
    'Navi Mumbai',
    'Solapur',
    'Mira-Bhayandar',
    'Bhiwandi',
    'Amravati',
    'Nanded',
    'Kolhapur',
    'Ulhasnagar',
    'Sangli',
    'Malegaon',
    'Jalgaon',
    'Akola',
    'Latur',
    'Dhule',
    'Ahmednagar',
    'Chandrapur',
    'Parbhani',
    'Ichalkaranji',
    'Jalna',
    'Panvel',
    'Satara',
    'Beed',
    'Yavatmal'
  ],
  Delhi: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'],
  Karnataka: [
    'Bengaluru',
    'Mysuru',
    'Hubballi-Dharwad',
    'Mangaluru',
    'Belagavi',
    'Kalaburagi',
    'Davanagere',
    'Ballari',
    'Vijayapura',
    'Shivamogga',
    'Tumakuru',
    'Raichur',
    'Bidar',
    'Hosapete',
    'Gadag-Betageri',
    'Robertsonpet',
    'Hassan',
    'Bhadravati',
    'Chitradurga',
    'Udupi',
    'Kolar',
    'Mandya',
    'Chikkamagaluru'
  ],
  'Tamil Nadu': [
    'Chennai',
    'Coimbatore',
    'Madurai',
    'Tiruchirappalli',
    'Salem',
    'Tiruppur',
    'Erode',
    'Vellore',
    'Thoothukudi',
    'Dindigul',
    'Thanjavur',
    'Ranipet',
    'Sivakasi',
    'Karur',
    'Udhagamandalam (Ooty)',
    'Hosur',
    'Nagercoil',
    'Kanchipuram',
    'Kumarakonam',
    'Tirunelveli'
  ],
  'Uttar Pradesh': [
    'Lucknow',
    'Kanpur',
    'Ghaziabad',
    'Agra',
    'Meerut',
    'Varanasi',
    'Prayagraj',
    'Bareilly',
    'Aligarh',
    'Moradabad',
    'Saharanpur',
    'Gorakhpur',
    'Noida',
    'Firozabad',
    'Jhansi',
    'Muzaffarnagar',
    'Mathura',
    'Ayodhya',
    'Greater Noida'
  ],
  Rajasthan: [
    'Jaipur',
    'Jodhpur',
    'Kota',
    'Bikaner',
    'Ajmer',
    'Udaipur',
    'Bhilwara',
    'Alwar',
    'Bharatpur',
    'Sikar',
    'Pali',
    'Sri Ganganagar',
    'Kishangarh',
    'Beawar',
    'Hanumangarh'
  ],
  'West Bengal': [
    'Kolkata',
    'Howrah',
    'Durgapur',
    'Asansol',
    'Siliguri',
    'Bardhaman',
    'Malda',
    'Baharampur',
    'Habra',
    'Kharagpur',
    'Shantipur',
    'Dankuni',
    'Haldia'
  ],
  Telangana: [
    'Hyderabad',
    'Warangal',
    'Nizamabad',
    'Khammam',
    'Karimnagar',
    'Ramagundam',
    'Mahbubnagar',
    'Nalgonda',
    'Adilabad',
    'Suryapet',
    'Miryalaguda',
    'Siddipet'
  ],
  'Madhya Pradesh': [
    'Indore',
    'Bhopal',
    'Jabalpur',
    'Gwalior',
    'Ujjain',
    'Sagar',
    'Dewas',
    'Satna',
    'Ratlam',
    'Rewa',
    'Murwara (Katni)',
    'Singrauli',
    'Burhanpur',
    'Khandwa',
    'Morena',
    'Bhind',
    'Chhindwara',
    'Guna',
    'Shivpuri',
    'Vidisha',
    'Damoh',
    'Mandsaur'
  ],
  Haryana: [
    'Gurugram',
    'Faridabad',
    'Panipat',
    'Ambala',
    'Yamunanagar',
    'Rohtak',
    'Hisar',
    'Karnal',
    'Sonipat',
    'Panchkula',
    'Bhiwani',
    'Sirsa',
    'Bahadurgarh',
    'Jind',
    'Thanesar',
    'Kaithal',
    'Rewari',
    'Palwal'
  ],
  Punjab: [
    'Ludhiana',
    'Amritsar',
    'Jalandhar',
    'Patiala',
    'Bathinda',
    'Mohali',
    'Hoshiarpur',
    'Batala',
    'Pathankot',
    'Moga',
    'Abohar',
    'Malerkotla',
    'Khanna',
    'Muktsar',
    'Barnala',
    'Firozpur',
    'Kapurthala'
  ],
  'Andhra Pradesh': [
    'Visakhapatnam',
    'Vijayawada',
    'Guntur',
    'Nellore',
    'Kurnool',
    'Kakinada',
    'Rajahmundry',
    'Kadapa',
    'Tirupati',
    'Anantapur',
    'Vizianagaram',
    'Eluru',
    'Ongole',
    'Nandyal',
    'Machilipatnam',
    'Adoni',
    'Tenali'
  ],
  Kerala: [
    'Thiruvananthapuram',
    'Kochi',
    'Kozhikode',
    'Kollam',
    'Thrissur',
    'Kannur',
    'Alappuzha',
    'Kottayam',
    'Palakkad',
    'Manjeri',
    'Thalassery',
    'Ponnani'
  ],
  Bihar: [
    'Patna',
    'Gaya',
    'Bhagalpur',
    'Muzaffarpur',
    'Purnia',
    'Darbhanga',
    'Bihar Sharif',
    'Arrah',
    'Begusarai',
    'Katihar',
    'Munger',
    'Chhapra',
    'Danapur',
    'Bettiah',
    'Saharsa',
    'Sasaram',
    'Hajipur',
    'Dehri',
    'Siwan',
    'Motihari',
    'Nawada',
    'Bagaha',
    'Buxar',
    'Kishanganj',
    'Sitamarhi'
  ]
};

const citiesCache = new Map<string, string[]>();

/**
 * Normalizes state name for matching (removes code prefix if "24-Gujarat").
 */
export function normalizeStateName(stateString: string): string {
  if (!stateString) return '';
  const trimmed = stateString.trim();
  const match = trimmed.match(/^\d{2}\s*-\s*(.+)$/);
  return match ? match[1].trim() : trimmed;
}

/**
 * Fetches cities for a given Indian State via free API with caching & fallback.
 */
export async function getCitiesForState(stateName: string): Promise<string[]> {
  const cleanState = normalizeStateName(stateName);
  if (!cleanState) return [];

  if (citiesCache.has(cleanState)) {
    return citiesCache.get(cleanState)!;
  }

  const fallbackList = DEFAULT_CITIES_BY_STATE[cleanState] || [];

  try {
    const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: 'India',
        state: cleanState
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        // Merge with fallback to ensure rich list
        const set = new Set<string>([...data.data, ...fallbackList]);
        const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
        citiesCache.set(cleanState, sorted);
        return sorted;
      }
    }
  } catch {
    // Silently proceed to fallback if network/timeout occurs
  }

  if (fallbackList.length > 0) {
    citiesCache.set(cleanState, fallbackList);
    return fallbackList;
  }

  return [];
}

export interface PincodeLookupResult {
  pincode: string;
  state: string;
  district: string;
  city: string;
  country: string;
  postOffices: string[];
}

const pincodeCache = new Map<string, PincodeLookupResult>();

/**
 * Looks up Indian Pincode details via free Postal API (api.postalpincode.in).
 */
export async function lookupPincode(pincode: string): Promise<PincodeLookupResult | null> {
  const cleanPin = (pincode || '').replace(/\D/g, '').slice(0, 6);
  if (cleanPin.length !== 6) return null;

  if (pincodeCache.has(cleanPin)) {
    return pincodeCache.get(cleanPin)!;
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0 || data[0].Status !== 'Success') {
      return null;
    }

    const postOffices = data[0].PostOffice || [];
    if (postOffices.length === 0) return null;

    const first = postOffices[0];
    const state = first.State || '';
    const district = first.District || '';
    const city = first.Block && first.Block !== 'NA' ? first.Block : district || first.Name;
    const poNames = postOffices.map((po: { Name: string }) => po.Name).filter(Boolean);

    const result: PincodeLookupResult = {
      pincode: cleanPin,
      state,
      district,
      city,
      country: 'India',
      postOffices: poNames
    };

    pincodeCache.set(cleanPin, result);
    return result;
  } catch {
    return null;
  }
}
