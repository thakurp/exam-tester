export interface GeoCountry {
  code: string;
  name: string;
  states: GeoState[];
}

export interface GeoState {
  code: string;
  name: string;
}

export const GEO_DATA: GeoCountry[] = [
  {
    code: "AU",
    name: "Australia",
    states: [
      { code: "NSW", name: "New South Wales" },
      { code: "VIC", name: "Victoria" },
      { code: "QLD", name: "Queensland" },
      { code: "WA", name: "Western Australia" },
      { code: "SA", name: "South Australia" },
      { code: "TAS", name: "Tasmania" },
      { code: "ACT", name: "Australian Capital Territory" },
      { code: "NT", name: "Northern Territory" },
    ],
  },
  {
    code: "US",
    name: "United States",
    states: [
      { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
      { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
      { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
      { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
      { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
      { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
      { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
      { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
      { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
      { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
      { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
      { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
      { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
      { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
      { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
      { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
      { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "Washington D.C." },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    states: [
      { code: "ENG", name: "England" },
      { code: "SCT", name: "Scotland" },
      { code: "WLS", name: "Wales" },
      { code: "NIR", name: "Northern Ireland" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    states: [
      { code: "AB", name: "Alberta" }, { code: "BC", name: "British Columbia" },
      { code: "MB", name: "Manitoba" }, { code: "NB", name: "New Brunswick" },
      { code: "NL", name: "Newfoundland and Labrador" }, { code: "NS", name: "Nova Scotia" },
      { code: "NT", name: "Northwest Territories" }, { code: "NU", name: "Nunavut" },
      { code: "ON", name: "Ontario" }, { code: "PE", name: "Prince Edward Island" },
      { code: "QC", name: "Quebec" }, { code: "SK", name: "Saskatchewan" }, { code: "YT", name: "Yukon" },
    ],
  },
  {
    code: "IN",
    name: "India",
    states: [
      { code: "AP", name: "Andhra Pradesh" }, { code: "AR", name: "Arunachal Pradesh" },
      { code: "AS", name: "Assam" }, { code: "BR", name: "Bihar" }, { code: "CG", name: "Chhattisgarh" },
      { code: "GA", name: "Goa" }, { code: "GJ", name: "Gujarat" }, { code: "HR", name: "Haryana" },
      { code: "HP", name: "Himachal Pradesh" }, { code: "JH", name: "Jharkhand" }, { code: "KA", name: "Karnataka" },
      { code: "KL", name: "Kerala" }, { code: "MP", name: "Madhya Pradesh" }, { code: "MH", name: "Maharashtra" },
      { code: "MN", name: "Manipur" }, { code: "ML", name: "Meghalaya" }, { code: "MZ", name: "Mizoram" },
      { code: "NL", name: "Nagaland" }, { code: "OD", name: "Odisha" }, { code: "PB", name: "Punjab" },
      { code: "RJ", name: "Rajasthan" }, { code: "SK", name: "Sikkim" }, { code: "TN", name: "Tamil Nadu" },
      { code: "TS", name: "Telangana" }, { code: "TR", name: "Tripura" }, { code: "UP", name: "Uttar Pradesh" },
      { code: "UK", name: "Uttarakhand" }, { code: "WB", name: "West Bengal" },
      { code: "DL", name: "Delhi" }, { code: "JK", name: "Jammu & Kashmir" },
    ],
  },
  {
    code: "NZ",
    name: "New Zealand",
    states: [
      { code: "AUK", name: "Auckland" }, { code: "BOP", name: "Bay of Plenty" },
      { code: "CAN", name: "Canterbury" }, { code: "GIS", name: "Gisborne" },
      { code: "HKB", name: "Hawke's Bay" }, { code: "MWT", name: "Manawatū-Whanganui" },
      { code: "MBH", name: "Marlborough" }, { code: "NSN", name: "Nelson" },
      { code: "NTL", name: "Northland" }, { code: "OTA", name: "Otago" },
      { code: "STL", name: "Southland" }, { code: "TKI", name: "Taranaki" },
      { code: "TAS", name: "Tasman" }, { code: "WKO", name: "Waikato" },
      { code: "WGN", name: "Wellington" }, { code: "WTC", name: "West Coast" },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    states: [{ code: "SG", name: "Singapore (National)" }],
  },
  {
    code: "IE",
    name: "Ireland",
    states: [
      { code: "C", name: "Connacht" }, { code: "L", name: "Leinster" },
      { code: "M", name: "Munster" }, { code: "U", name: "Ulster" },
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    states: [
      { code: "EC", name: "Eastern Cape" }, { code: "FS", name: "Free State" },
      { code: "GP", name: "Gauteng" }, { code: "KZN", name: "KwaZulu-Natal" },
      { code: "LP", name: "Limpopo" }, { code: "MP", name: "Mpumalanga" },
      { code: "NW", name: "North West" }, { code: "NC", name: "Northern Cape" },
      { code: "WC", name: "Western Cape" },
    ],
  },
];

export function getCountry(code: string): GeoCountry | undefined {
  return GEO_DATA.find((c) => c.code === code);
}
