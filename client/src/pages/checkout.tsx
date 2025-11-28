import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CreditCard, MapPin, User, Package, CheckCircle, Gift, Award, ChevronDown, Tag, Check, Plus, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// City to State and Pincode mapping - now supports multiple pincodes per city
const cityLocationMap: Record<string, { state: string; pincodes: string[] }> = {
  mumbai: { state: "maharashtra", pincodes: ["400001", "400002", "400003", "400004", "400005", "400006", "400007", "400008", "400009", "400010"] },
  delhi: { state: "delhi", pincodes: ["110001", "110002", "110003", "110004", "110005", "110006", "110007", "110008", "110009", "110010"] },
  bangalore: { state: "karnataka", pincodes: ["560001", "560002", "560003", "560004", "560005", "560006", "560007", "560008", "560009", "560010"] },
  hyderabad: { state: "telangana", pincodes: ["500001", "500002", "500003", "500004", "500005", "500006", "500007", "500008", "500009", "500010"] },
  ahmedabad: { state: "gujarat", pincodes: ["380001", "380002", "380003", "380004", "380005", "380006", "380007", "380008", "380009", "380010"] },
  chennai: { state: "tamil_nadu", pincodes: ["600001", "600002", "600003", "600004", "600005", "600006", "600007", "600008", "600009", "600010"] },
  kolkata: { state: "west_bengal", pincodes: ["700001", "700002", "700003", "700004", "700005", "700006", "700007", "700008", "700009", "700010"] },
  pune: { state: "maharashtra", pincodes: ["411001", "411002", "411003", "411004", "411005", "411006", "411007", "411008", "411009", "411010"] },
  jaipur: { state: "rajasthan", pincodes: ["302001", "302002", "302003", "302004", "302005", "302006", "302007", "302008", "302009", "302010"] },
  surat: { state: "gujarat", pincodes: ["395001", "395002", "395003", "395004", "395005", "395006", "395007", "395008", "395009", "395010"] },
  lucknow: { state: "uttar_pradesh", pincodes: ["226001", "226002", "226003", "226004", "226005"] },
  kanpur: { state: "uttar_pradesh", pincodes: ["208001", "208002", "208003", "208004", "208005"] },
  nagpur: { state: "maharashtra", pincodes: ["440001", "440002", "440003", "440004", "440005"] },
  indore: { state: "madhya_pradesh", pincodes: ["452001", "452002", "452003", "452004", "452005"] },
  thane: { state: "maharashtra", pincodes: ["400601", "400602", "400603", "400604", "400605"] },
  bhopal: { state: "madhya_pradesh", pincodes: ["462001", "462002", "462003", "462004", "462005"] },
  visakhapatnam: { state: "andhra_pradesh", pincodes: ["530001", "530002", "530003", "530004", "530005"] },
  pimpri: { state: "maharashtra", pincodes: ["411017", "411018", "411019", "411020", "411021"] },
  patna: { state: "bihar", pincodes: ["800001", "800002", "800003", "800004", "800005"] },
  vadodara: { state: "gujarat", pincodes: ["390001", "390002", "390003", "390004", "390005"] },
  ghaziabad: { state: "uttar_pradesh", pincodes: ["201001"] },
  ludhiana: { state: "punjab", pincodes: ["141001"] },
  agra: { state: "uttar_pradesh", pincodes: ["282001"] },
  nashik: { state: "maharashtra", pincodes: ["422001"] },
  faridabad: { state: "haryana", pincodes: ["121001"] },
  meerut: { state: "uttar_pradesh", pincodes: ["250001"] },
  rajkot: { state: "gujarat", pincodes: ["360001"] },
  kalyan: { state: "maharashtra", pincodes: ["421301"] },
  vasai: { state: "maharashtra", pincodes: ["401201"] },
  varanasi: { state: "uttar_pradesh", pincodes: ["221001"] },
  srinagar: { state: "jammu_and_kashmir", pincodes: ["190001"] },
  aurangabad: { state: "maharashtra", pincodes: ["431001"] },
  dhanbad: { state: "jharkhand", pincodes: ["826001"] },
  amritsar: { state: "punjab", pincodes: ["143001"] },
  navi_mumbai: { state: "maharashtra", pincodes: ["400614"] },
  allahabad: { state: "uttar_pradesh", pincodes: ["211001"] },
  ranchi: { state: "jharkhand", pincodes: ["834001"] },
  howrah: { state: "west_bengal", pincodes: ["711101"] },
  coimbatore: { state: "tamil_nadu", pincodes: ["641001"] },
  jabalpur: { state: "madhya_pradesh", pincodes: ["482001"] },
  gwalior: { state: "madhya_pradesh", pincodes: ["474001"] },
  vijayawada: { state: "andhra_pradesh", pincodes: ["520001"] },
  jodhpur: { state: "rajasthan", pincodes: ["342001"] },
  madurai: { state: "tamil_nadu", pincodes: ["625001"] },
  raipur: { state: "chhattisgarh", pincodes: ["492001"] },
  kota: { state: "rajasthan", pincodes: ["324001"] },
  guwahati: { state: "assam", pincodes: ["781001"] },
  chandigarh: { state: "chandigarh", pincodes: ["160001"] },
  solapur: { state: "maharashtra", pincodes: ["413001"] },
  hubli: { state: "karnataka", pincodes: ["580020"] },
  mysore: { state: "karnataka", pincodes: ["570001"] },
  tiruchirappalli: { state: "tamil_nadu", pincodes: ["620001"] },
  bareilly: { state: "uttar_pradesh", pincodes: ["243001"] },
  aligarh: { state: "uttar_pradesh", pincodes: ["202001"] },
  tiruppur: { state: "tamil_nadu", pincodes: ["641601"] },
  moradabad: { state: "uttar_pradesh", pincodes: ["244001"] },
  mysuru: { state: "karnataka", pincodes: ["570001"] },
  bhiwandi: { state: "maharashtra", pincodes: ["421302"] },
  saharanpur: { state: "uttar_pradesh", pincodes: ["247001"] },
  gorakhpur: { state: "uttar_pradesh", pincodes: ["273001"] },
  guntur: { state: "andhra_pradesh", pincodes: ["522001"] },
  bikaner: { state: "rajasthan", pincodes: ["334001"] },
  amravati: { state: "maharashtra", pincodes: ["444601"] },
  noida: { state: "uttar_pradesh", pincodes: ["201301"] },
  jamshedpur: { state: "jharkhand", pincodes: ["831001"] },
  bhilai: { state: "chhattisgarh", pincodes: ["490001"] },
  cuttack: { state: "odisha", pincodes: ["753001"] },
  firozabad: { state: "uttar_pradesh", pincodes: ["283203"] },
  kochi: { state: "kerala", pincodes: ["682001"] },
  nellore: { state: "andhra_pradesh", pincodes: ["524001"] },
  bhavnagar: { state: "gujarat", pincodes: ["364001"] },
  dehradun: { state: "uttarakhand", pincodes: ["248001"] },
  durgapur: { state: "west_bengal", pincodes: ["713201"] },
  asansol: { state: "west_bengal", pincodes: ["713301"] },
  rourkela: { state: "odisha", pincodes: ["769001"] },
  nanded: { state: "maharashtra", pincodes: ["431601"] },
  kolhapur: { state: "maharashtra", pincodes: ["416001"] },
  ajmer: { state: "rajasthan", pincodes: ["305001"] },
  akola: { state: "maharashtra", pincodes: ["444001"] },
  gulbarga: { state: "karnataka", pincodes: ["585101"] },
  jamnagar: { state: "gujarat", pincodes: ["361001"] },
  ujjain: { state: "madhya_pradesh", pincodes: ["456001"] },
  loni: { state: "uttar_pradesh", pincodes: ["201102"] },
  siliguri: { state: "west_bengal", pincodes: ["734001"] },
  jhansi: { state: "uttar_pradesh", pincodes: ["284001"] },
  ulhasnagar: { state: "maharashtra", pincodes: ["421001"] },
  jammu: { state: "jammu_and_kashmir", pincodes: ["180001"] },
  sangli: { state: "maharashtra", pincodes: ["416416"] },
  mangalore: { state: "karnataka", pincodes: ["575001"] },
  erode: { state: "tamil_nadu", pincodes: ["638001"] },
  belgaum: { state: "karnataka", pincodes: ["590001"] },
  ambattur: { state: "tamil_nadu", pincodes: ["600053"] },
  tirunelveli: { state: "tamil_nadu", pincodes: ["627001"] },
  malegaon: { state: "maharashtra", pincodes: ["423203"] },
  gaya: { state: "bihar", pincodes: ["823001"] },
  jalgaon: { state: "maharashtra", pincodes: ["425001"] },
  udaipur: { state: "rajasthan", pincodes: ["313001"] },
  maheshtala: { state: "west_bengal", pincodes: ["700141"] },
  davanagere: { state: "karnataka", pincodes: ["577001"] },
  kozhikode: { state: "kerala", pincodes: ["673001"] },
  kurnool: { state: "andhra_pradesh", pincodes: ["518001"] },
  rajpur_sonarpur: { state: "west_bengal", pincodes: ["700149"] },
  rajahmundry: { state: "andhra_pradesh", pincodes: ["533101"] },
  bokaro_steel_city: { state: "jharkhand", pincodes: ["827001"] },
  south_dumdum: { state: "west_bengal", pincodes: ["700074"] },
  bellary: { state: "karnataka", pincodes: ["583101"] },
  patiala: { state: "punjab", pincodes: ["147001"] },
  gopalpur: { state: "west_bengal", pincodes: ["743273"] },
  agartala: { state: "tripura", pincodes: ["799001"] },
  bhagalpur: { state: "bihar", pincodes: ["812001"] },
  muzaffarnagar: { state: "uttar_pradesh", pincodes: ["251001"] },
  bhatpara: { state: "west_bengal", pincodes: ["743123"] },
  panihati: { state: "west_bengal", pincodes: ["700110"] },
  latur: { state: "maharashtra", pincodes: ["413512"] },
  dhule: { state: "maharashtra", pincodes: ["424001"] },
  tirupati: { state: "andhra_pradesh", pincodes: ["517501"] },
  rohtak: { state: "haryana", pincodes: ["124001"] },
  korba: { state: "chhattisgarh", pincodes: ["495677"] },
  bhilwara: { state: "rajasthan", pincodes: ["311001"] },
  berhampur: { state: "odisha", pincodes: ["760001"] },
  muzaffarpur: { state: "bihar", pincodes: ["846001"] },
  ahmednagar: { state: "maharashtra", pincodes: ["414001"] },
  mathura: { state: "uttar_pradesh", pincodes: ["281001"] },
  kollam: { state: "kerala", pincodes: ["691001"] },
  avadi: { state: "tamil_nadu", pincodes: ["600054"] },
  kadapa: { state: "andhra_pradesh", pincodes: ["516001"] },
  kamarhati: { state: "west_bengal", pincodes: ["700058"] },
  sambalpur: { state: "odisha", pincodes: ["768001"] },
  bilaspur: { state: "chhattisgarh", pincodes: ["495001"] },
  shahjahanpur: { state: "uttar_pradesh", pincodes: ["242001"] },
  satara: { state: "maharashtra", pincodes: ["415001"] },
  bijapur: { state: "karnataka", pincodes: ["586101"] },
  rampur: { state: "uttar_pradesh", pincodes: ["244901"] },
  shivamogga: { state: "karnataka", pincodes: ["577201"] },
  chandrapur: { state: "maharashtra", pincodes: ["442401"] },
  junagadh: { state: "gujarat", pincodes: ["362001"] },
  thrissur: { state: "kerala", pincodes: ["680001"] },
  alwar: { state: "rajasthan", pincodes: ["301001"] },
  bardhaman: { state: "west_bengal", pincodes: ["713101"] },
  kulti: { state: "west_bengal", pincodes: ["713343"] },
  kakinada: { state: "andhra_pradesh", pincodes: ["533001"] },
  nizamabad: { state: "telangana", pincodes: ["503001"] },
  parbhani: { state: "maharashtra", pincodes: ["431401"] },
  tumkur: { state: "karnataka", pincodes: ["572101"] },
  khammam: { state: "telangana", pincodes: ["507001"] },
  ozhukarai: { state: "puducherry", pincodes: ["605013"] },
  bihar_sharif: { state: "bihar", pincodes: ["803101"] },
  panipat: { state: "haryana", pincodes: ["132103"] },
  darbhanga: { state: "bihar", pincodes: ["846004"] },
  bally: { state: "west_bengal", pincodes: ["711201"] },
  aizawl: { state: "mizoram", pincodes: ["796001"] },
  dewas: { state: "madhya_pradesh", pincodes: ["455001"] },
  ichalkaranji: { state: "maharashtra", pincodes: ["416115"] },
  karnal: { state: "haryana", pincodes: ["132001"] },
  bathinda: { state: "punjab", pincodes: ["151001"] },
  jalna: { state: "maharashtra", pincodes: ["431203"] },
  eluru: { state: "andhra_pradesh", pincodes: ["534001"] },
  kirari_suleman_nagar: { state: "delhi", pincodes: ["110086"] },
  barasat: { state: "west_bengal", pincodes: ["700124"] },
  purnia: { state: "bihar", pincodes: ["854301"] },
  satna: { state: "madhya_pradesh", pincodes: ["485001"] },
  mau: { state: "uttar_pradesh", pincodes: ["275101"] },
  sonipat: { state: "haryana", pincodes: ["131001"] },
  farrukhabad: { state: "uttar_pradesh", pincodes: ["209625"] },
  sagar: { state: "madhya_pradesh", pincodes: ["470001"] },
  durg: { state: "chhattisgarh", pincodes: ["491001"] },
  imphal: { state: "manipur", pincodes: ["795001"] },
  ratlam: { state: "madhya_pradesh", pincodes: ["457001"] },
  hapur: { state: "uttar_pradesh", pincodes: ["245101"] },
  arrah: { state: "bihar", pincodes: ["802301"] },
  karimnagar: { state: "telangana", pincodes: ["505001"] },
  anantapur: { state: "andhra_pradesh", pincodes: ["515001"] },
  etawah: { state: "uttar_pradesh", pincodes: ["206001"] },
  ambernath: { state: "maharashtra", pincodes: ["421501"] },
  north_dumdum: { state: "west_bengal", pincodes: ["700074"] },
  bharatpur: { state: "rajasthan", pincodes: ["321001"] },
  begusarai: { state: "bihar", pincodes: ["851101"] },
  new_delhi: { state: "delhi", pincodes: ["110001"] },
  gandhidham: { state: "gujarat", pincodes: ["370201"] },
  baranagar: { state: "west_bengal", pincodes: ["700036"] },
  tiruvottiyur: { state: "tamil_nadu", pincodes: ["600019"] },
  puducherry: { state: "puducherry", pincodes: ["605001"] },
  sikar: { state: "rajasthan", pincodes: ["332001"] },
  thoothukudi: { state: "tamil_nadu", pincodes: ["628001"] },
  rewa: { state: "madhya_pradesh", pincodes: ["486001"] },
  mirzapur: { state: "uttar_pradesh", pincodes: ["231001"] },
  raichur: { state: "karnataka", pincodes: ["584101"] },
  pali: { state: "rajasthan", pincodes: ["306401"] },
  ramagundam: { state: "telangana", pincodes: ["505208"] },
  haridwar: { state: "uttarakhand", pincodes: ["249401"] },
  vijayanagaram: { state: "andhra_pradesh", pincodes: ["535001"] },
  katihar: { state: "bihar", pincodes: ["854105"] },
  naihati: { state: "west_bengal", pincodes: ["743165"] },
  sambhal: { state: "uttar_pradesh", pincodes: ["244302"] },
  nadiad: { state: "gujarat", pincodes: ["387001"] },
  yamunanagar: { state: "haryana", pincodes: ["135001"] },
  english_bazar: { state: "west_bengal", pincodes: ["732101"] },
  unnao: { state: "uttar_pradesh", pincodes: ["209801"] },
  morena: { state: "madhya_pradesh", pincodes: ["476001"] },
  bhiwani: { state: "haryana", pincodes: ["127021"] },
  purnea: { state: "bihar", pincodes: ["854301"] },
  kharagpur: { state: "west_bengal", pincodes: ["721301"] },
  dindigul: { state: "tamil_nadu", pincodes: ["624001"] },
  gandhinagar: { state: "gujarat", pincodes: ["382010"] },
  hospet: { state: "karnataka", pincodes: ["583201"] },
  nangloi_jat: { state: "delhi", pincodes: ["110041"] },
  malda: { state: "west_bengal", pincodes: ["732101"] },
  ongole: { state: "andhra_pradesh", pincodes: ["523001"] },
  deoghar: { state: "jharkhand", pincodes: ["814112"] },
  chapra: { state: "bihar", pincodes: ["841301"] },
  haldia: { state: "west_bengal", pincodes: ["721602"] },
  khandwa: { state: "madhya_pradesh", pincodes: ["450001"] },
  nandyal: { state: "andhra_pradesh", pincodes: ["518501"] },
  chittoor: { state: "andhra_pradesh", pincodes: ["517001"] },
  morbi: { state: "gujarat", pincodes: ["363641"] },
  amroha: { state: "uttar_pradesh", pincodes: ["244221"] },
  anand: { state: "gujarat", pincodes: ["388001"] },
  bhusawal: { state: "maharashtra", pincodes: ["425201"] },
  orai: { state: "uttar_pradesh", pincodes: ["285001"] },
  bahraich: { state: "uttar_pradesh", pincodes: ["271801"] },
  vellore: { state: "tamil_nadu", pincodes: ["632001"] },
  mahesana: { state: "gujarat", pincodes: ["384001"] },
  raiganj: { state: "west_bengal", pincodes: ["733134"] },
  sirsa: { state: "haryana", pincodes: ["125055"] },
  danapur: { state: "bihar", pincodes: ["801503"] },
  serampore: { state: "west_bengal", pincodes: ["712201"] },
  sultan_pur_majra: { state: "delhi", pincodes: ["110086"] },
  guna: { state: "madhya_pradesh", pincodes: ["473001"] },
  jaunpur: { state: "uttar_pradesh", pincodes: ["222001"] },
  panvel: { state: "maharashtra", pincodes: ["410206"] },
  shillong: { state: "meghalaya", pincodes: ["793001"] },
  tenali: { state: "andhra_pradesh", pincodes: ["522201"] },
  khora: { state: "uttar_pradesh", pincodes: ["201301"] },
  guntakal: { state: "andhra_pradesh", pincodes: ["515801"] },
  puri: { state: "odisha", pincodes: ["752001"] },
  compiegne: { state: "uttar_pradesh", pincodes: ["209801"] },
  kishanganj: { state: "bihar", pincodes: ["855107"] },
  supaul: { state: "bihar", pincodes: ["852131"] },
  godda: { state: "jharkhand", pincodes: ["814133"] },
  hazaribagh: { state: "jharkhand", pincodes: ["825301"] },
  pakur: { state: "jharkhand", pincodes: ["816107"] },
  paschim_bardhaman: { state: "west_bengal", pincodes: ["713101"] },
  dharwad: { state: "karnataka", pincodes: ["580001"] },
  medininagar: { state: "jharkhand", pincodes: ["822101"] }
};

// Helper to build API URLs that respect VITE_API_BASE when frontend runs separately
const apiUrl = (path: string) => {
  const base = (import.meta as any).env?.VITE_API_BASE || "";
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path.startsWith('/') ? path : `/${path}`}`;
};


interface CartItem {
  id: number;
  name: string;
  price?: string;
  image: string;
  quantity: number;
  inStock: boolean;
  cashbackPrice?: string;
  cashbackPercentage?: string;
  affiliateCommission?: number; // Dynamic affiliate commission % from product
  selectedShade?: {
    id?: number;
    name: string;
    imageUrl?: string;
    colorCode?: string;
  };
}

// Step definitions for progress
const steps = [
  { number: 1, title: "Address", icon: MapPin },
  { number: 2, title: "Review", icon: Package },
  { number: 3, title: "Payment", icon: CreditCard },
];

export default function CheckoutPage() {
  const [location, setLocation] = useLocation();
  const { items = [], walletAmount: passedWalletAmount = 0, affiliateWalletAmount: passedAffiliateWalletAmount = 0, promoCode = null, promoDiscount: passedPromoDiscount = 0, affiliateCode: passedAffiliateCode = "", affiliateDiscount: passedAffiliateDiscount = 0, affiliateDiscountFromItems: passedAffiliateDiscountFromItems = 0, affiliateCommissionFromItems: passedAffiliateCommissionFromItems = 0 } = (location as any).state || {};

  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);
  const [multiAddressMapping, setMultiAddressMapping] = useState<Record<string, number>>({});

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false); // Added state for processing
  const [isRedeeming, setIsRedeeming] = useState(false); // State for cashback redemption

  // State for the instructions dialog
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    paymentMethod: "cashfree",
    affiliateCode: passedAffiliateCode || "",
    // Prefer explicit affiliateDiscount passed via location, otherwise fallback to discount from items
    affiliateDiscount: passedAffiliateDiscount || passedAffiliateDiscountFromItems || 0,
    deliveryInstructions: "", // Added state for delivery instructions
    saturdayDelivery: false, // Changed to boolean for easier handling
    sundayDelivery: false // Changed to boolean for easier handling
  });
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileDataLoaded, setProfileDataLoaded] = useState(false);
  const [showAddAddressDialog, setShowAddAddressDialog] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [newAddressData, setNewAddressData] = useState({
    fullName: "",
    mobile: "",
    pincode: "",
    flat: "",
    area: "",
    landmark: "",
    town: "",
    state: "",
    makeDefault: false,
    deliveryInstructions: '', // For new address dialog
    saturdayDelivery: false, // For new address dialog
    sundayDelivery: false, // For new address dialog
  });

  // Initialize shipping cost state and loading indicator
  const [shippingCost, setShippingCost] = useState<number>(99);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Wallet cashback states - load from localStorage
  const [redeemAmount, setRedeemAmount] = useState(() => {
    const saved = localStorage.getItem('redeemAmount');
    return saved ? parseFloat(saved) : 0;
  });
  const [walletAmount, setWalletAmount] = useState(() => {
    // Try to get from props first, then localStorage
    if (passedWalletAmount > 0) {
      return passedWalletAmount;
    }
    const saved = localStorage.getItem('redeemAmount');
    return saved ? parseFloat(saved) : 0;
  });
  const [affiliateWalletAmount, setAffiliateWalletAmount] = useState(0);

  // Promo code states
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [hasPromoCode, setHasPromoCode] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(passedPromoDiscount); // Initialize with passed value

  // Get user from localStorage - must be before any hooks that use it
  const getCurrentUser = () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  };

  const user = getCurrentUser();

  // Fetch wallet data
  const { data: walletData, refetch: refetchWalletData } = useQuery({
    queryKey: ['/api/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/wallet?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch wallet');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Fetch affiliate wallet data
  const { data: affiliateWalletData } = useQuery({
    queryKey: ['/api/affiliate/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/affiliate/wallet?userId=${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Sync redeemAmount with walletAmount
  useEffect(() => {
    setRedeemAmount(walletAmount);
  }, [walletAmount]);

  // Sync affiliateWalletAmount with database data (affiliateWalletData.commissionBalance)
  useEffect(() => {
    if (affiliateWalletData?.commissionBalance) {
      const balance = parseFloat(affiliateWalletData.commissionBalance);
      if (!isNaN(balance) && balance > 0) {
        setAffiliateWalletAmount(balance);
      }
    }
  }, [affiliateWalletData]);

  useEffect(() => {
    // Check if user is logged in when accessing checkout
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to proceed with checkout",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
    }
const isMultiAddress = localStorage.getItem('isMultiAddressOrder') === 'true';
    const multiAddressMapping = localStorage.getItem('multiAddressMapping');

    // Only redirect if multi-address order AND no addresses have been assigned yet
    if (isMultiAddress && !multiAddressMapping) {
      // Redirect back to delivery address page for multi-address orders that need address assignment
      toast({
        title: "Multi-Address Order",
        description: "Please assign delivery addresses to your items",
      });
      setLocation('/select-delivery-address');
      return;
    }

    // If multi-address order with mapping, skip Step 1 and go to Step 2
    if (isMultiAddress && multiAddressMapping) {
      setCurrentStep(2);
      toast({
        title: "Multi-Address Order",
        description: "Review your items and their delivery addresses",
      });
    }
    // Fetch saved addresses
    const fetchAddresses = async () => {
      try {
        const response = await fetch(apiUrl(`/api/delivery-addresses?userId=${user.id}`));
        if (response.ok) {
          const addresses = await response.json();
          setSavedAddresses(addresses);

          // Check if address was selected from delivery address page
          const selectedAddressFromStorage = localStorage.getItem('selectedDeliveryAddress');

              if (selectedAddressFromStorage) {
            try {
              const selectedAddr = JSON.parse(selectedAddressFromStorage);
                  const addressInList = addresses.find((addr: any) => Number(addr.id) === Number(selectedAddr.id));

              if (addressInList) {
                    setSelectedAddressId(Number(addressInList.id));
                populateFormWithAddress(addressInList);

                toast({
                  title: "Address Loaded",
                  description: `Using address in ${addressInList.city}`,
                });
              }

              // Clear the selected address from localStorage
              localStorage.removeItem('selectedDeliveryAddress');
            } catch (error) {
              console.error('Error parsing selected address:', error);
            }
          } else {
            // Select the default address or the first one if no address was selected
            const defaultAddress = addresses.find((addr: any) => addr.isDefault);
            if (defaultAddress) {
              setSelectedAddressId(Number(defaultAddress.id));
              populateFormWithAddress(defaultAddress);
            } else if (addresses.length > 0) {
              setSelectedAddressId(Number(addresses[0].id));
              populateFormWithAddress(addresses[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      }
    };

    fetchAddresses();

   

    // Load affiliate discount from localStorage first (set by Cart when items include affiliate discounts)
    const savedAffiliateDiscount = localStorage.getItem('affiliateCommissionEarned');
    let affiliateDiscountAmount = 0;
    let affiliateCodeValue = '';

    if (savedAffiliateDiscount) {
      try {
        const affiliateData = JSON.parse(savedAffiliateDiscount);
        // saved shape from cart.tsx: { commission, discount, fromProducts, timestamp }
        affiliateDiscountAmount = affiliateData.discount || 0;
        // there may not be an affiliate code saved here; only set if present
        affiliateCodeValue = affiliateData.code || '';

        setFormData(prev => ({
          ...prev,
          // do not overwrite affiliateCode if already provided by location state unless we have one here
          affiliateCode: prev.affiliateCode || affiliateCodeValue,
          affiliateDiscount: affiliateData.discount || prev.affiliateDiscount || 0,
        }));

        console.log('✅ Loaded affiliate discount from localStorage:', affiliateData);
      } catch (error) {
        console.error('Error loading affiliate discount:', error);
        // remove the stored affiliate commission object if it's invalid
        localStorage.removeItem('affiliateCommissionEarned');
      }
    }

    // Load promo code from localStorage
    const savedPromo = localStorage.getItem('appliedPromoCode');
    const savedPromoDiscount = localStorage.getItem('promoDiscount');

    if (savedPromo && savedPromoDiscount) {
      try {
        const promoData = JSON.parse(savedPromo);
        const discountAmount = parseFloat(savedPromoDiscount);

        setAppliedPromo(promoData);
        setPromoDiscount(discountAmount);
        setHasPromoCode(true);

        console.log('✅ Loaded promo code from localStorage:', promoData, 'Discount:', discountAmount);
      } catch (error) {
        console.error('Error loading promo code:', error);
        localStorage.removeItem('appliedPromoCode');
        localStorage.removeItem('promoDiscount');
        setHasPromoCode(false);
      }
    } else {
      setHasPromoCode(false);
    }

    // Check for affiliate code in localStorage (fallback if not already set)
    if (!savedAffiliateDiscount) {
      const affiliateRef = localStorage.getItem("affiliateRef");
      if (affiliateRef && user) {
        const userData = user;

        // Get order count for this affiliate code
        fetch(`/api/orders/count?userId=${userData.id}&affiliateCode=${affiliateRef}`)
          .then(res => res.json())
          .then(data => {
            const orderCount = data.count || 0;
            const discountPercentage = orderCount === 0 ? 15 : 10; // 15% for first order, 10% for subsequent

            setFormData(prev => ({
              ...prev,
              affiliateCode: affiliateRef,
              affiliateDiscount: discountPercentage,
            }));

            toast({
              title: "Affiliate Discount Applied!",
              description: `${discountPercentage}% OFF on your order`,
            });
          })
          .catch(err => console.error("Error fetching order count:", err));
      }
    }

    // Parse user data and set profile
    try {
      const userData = user;
      setUserProfile(userData);

      // Auto-fill form data if profile has information (always load for multi-address orders)
      if (userData) {
        const isMultiAddress = localStorage.getItem('isMultiAddressOrder') === 'true';
        
        // For non-multi-address orders, only load once. For multi-address, always load to ensure form data is populated
        if (!profileDataLoaded || isMultiAddress) {
          // Parse address to extract city, state, zipCode from profile
          let city = "";
          let state = "";
          let zipCode = "";
          let streetAddress = userData.address || "";

          // Try to extract city, state, zipCode from full address if they exist
          if (streetAddress) {
            const addressParts = streetAddress.split(',').map((part: string) => part.trim());
            if (addressParts.length >= 3) {
              // Last part might contain state and pin code
              const lastPart = addressParts[addressParts.length - 1];
              const pinCodeMatch = lastPart.match(/\d{6}$/);
              if (pinCodeMatch) {
                zipCode = pinCodeMatch[0];
                state = lastPart.replace(/\d{6}$/, '').trim();
              } else {
                state = lastPart;
              }

              // Second last part might be city
              if (addressParts.length >= 2) {
                city = addressParts[addressParts.length - 2];
              }

              // Remove city and state from full address to get street address
              streetAddress = addressParts.slice(0, -2).join(', ');
            } else if (addressParts.length === 2) {
              // If only 2 parts, assume first is address and second is city
              city = addressParts[1];
              streetAddress = addressParts[0];
            } else if (addressParts.length === 1) {
              // If only 1 part, use it as street address
              streetAddress = addressParts[0];
            }
          }

          // Auto-fill form data with profile information
          setFormData(prev => {
            const updatedForm = {
              ...prev,
              email: userData.email?.trim() || prev.email || "",
              firstName: userData.firstName?.trim() || prev.firstName || "",
              lastName: userData.lastName?.trim() || prev.lastName || "",
              address: streetAddress?.trim() || prev.address || "",
              city: city?.trim() || prev.city || "",
              state: state?.trim() || prev.state || "",
              zipCode: zipCode?.trim() || prev.zipCode || "",
              phone: userData.phone?.trim() || prev.phone || "",
              deliveryInstructions: userData.deliveryInstructions?.trim() || prev.deliveryInstructions || "",
              saturdayDelivery: userData.saturdayDelivery === true ? true : prev.saturdayDelivery,
              sundayDelivery: userData.sundayDelivery === true ? true : prev.sundayDelivery
            };
            
            console.log('📝 Form data auto-populated:', {
              email: updatedForm.email ? '✓' : '✗',
              firstName: updatedForm.firstName ? '✓' : '✗',
              lastName: updatedForm.lastName ? '✓' : '✗',
              address: updatedForm.address ? '✓' : '✗'
            });
            
            return updatedForm;
          });

          if (!profileDataLoaded) {
            setProfileDataLoaded(true);

            // Show notification that data was auto-filled
            if (userData.firstName || userData.lastName || userData.email || userData.phone || userData.address) {
              toast({
                title: "Profile Data Loaded",
                description: "Your contact information and shipping address have been filled automatically.",
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
      } catch (error) {
        console.error("Error parsing cart data:", error);
        setCartItems([]);
      }
    }
    setLoading(false);
  }, [user?.id, profileDataLoaded]);

  // Fetch shipping cost when zipCode or paymentMethod changes
  useEffect(() => {
    const fetchShippingCost = async () => {
      if (formData.zipCode && formData.zipCode.length === 6) {
        setLoadingShipping(true);
        try {
          const weight = cartItems.reduce((total, item) => total + (0.5 * item.quantity), 0);
          const isCOD = formData.paymentMethod === 'cod';

          const response = await fetch(
            `/api/shiprocket/serviceability?deliveryPincode=${formData.zipCode}&weight=${weight}&cod=${isCOD}`
          );

          if (response.ok) {
            const data = await response.json();

            if (data.data && data.data.available_courier_companies && data.data.available_courier_companies.length > 0) {
              const cheapestCourier = data.data.available_courier_companies.reduce((prev: any, curr: any) => {
                return (curr.rate < prev.rate) ? curr : prev;
              });

              setShippingCost(Math.round(cheapestCourier.rate));
              toast({
                title: "Shipping Cost Calculated",
                description: `₹${Math.round(cheapestCourier.rate)} via ${cheapestCourier.courier_name}`,
              });
            } else {
              setShippingCost(99);
              toast({
                title: "Shipping Unavailable",
                description: "Shipping not available for this location or combination.",
                variant: "destructive",
              });
            }
          } else {
            setShippingCost(99);
            toast({
              title: "Shipping Error",
              description: "Could not calculate shipping cost. Please try again.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error fetching shipping cost:", error);
          setShippingCost(99);
          toast({
            title: "Shipping Error",
            description: "An unexpected error occurred while calculating shipping.",
            variant: "destructive",
          });
        } finally {
          setLoadingShipping(false);
        }
      } else {
        setShippingCost(99);
      }
    };

    fetchShippingCost();
  }, [formData.zipCode, formData.paymentMethod, cartItems]);


  const verifyPayment = async (orderIdParam: string) => {
    try {
      const response = await fetch(apiUrl('/api/payments/cashfree/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderIdParam }),
      });

      const result = await response.json();

      if (response.ok && result.verified) {
        const pendingOrder = sessionStorage.getItem('pendingOrder');
        if (pendingOrder) {
          const orderData = JSON.parse(pendingOrder);
          setOrderId(orderData.orderId);
          setOrderPlaced(true);

          localStorage.removeItem("cart");
          localStorage.removeItem("appliedPromoCode");
          // Clear affiliate discount/commission info saved by cart
          localStorage.removeItem("affiliateDiscount");
          localStorage.removeItem("affiliateCommissionEarned");
          localStorage.removeItem("promoDiscount"); // Remove promo discount from local storage
          sessionStorage.removeItem('pendingOrder');
          localStorage.setItem("cartCount", "0");
          window.dispatchEvent(new Event("cartUpdated"));

          toast({
            title: "Payment Successful!",
            description: "Your order has been confirmed",
          });
        }
      } else {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive",
        });

        const pendingOrder = sessionStorage.getItem('pendingOrder');
        if (pendingOrder) {
          const orderData = JSON.parse(pendingOrder);
          setCartItems(orderData.cartItems);
        }
        sessionStorage.removeItem('pendingOrder');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Verification Error",
        description: "Could not verify payment status. Please contact support.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price
        ? parseInt(item.price.replace(/[₹,]/g, ""))
        : 0;
      return total + (price * item.quantity);
    }, 0);
  };

  // Calculate product discounts
  const productDiscount = cartItems.reduce((total, item) => {
    if (item.price) {
      const original = parseInt(item.price.replace(/[₹,]/g, ""));
      const current = parseInt(item.price.replace(/[₹,]/g, ""));
      return total + ((original - current) * item.quantity);
    }
    return total;
  }, 0);

  const cartSubtotal = calculateSubtotal();
  const cartSubtotalAfterProductDiscount = cartSubtotal - productDiscount;

  // Read affiliate discount synchronously so it can be shown on initial render
  const initialAffiliateDiscount = (() => {
    try {
      if (typeof window === 'undefined') return 0;

      // Read previously saved value in localStorage
      const raw = localStorage.getItem('affiliateCommissionEarned');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.discount === 'number' && parsed.discount > 0) {
          return parsed.discount;
        }
      }
    } catch (e) {
      // ignore and fallback to 0
    }
    return 0;
  })();

  // Use affiliate discount from formData (loaded from localStorage or passed value) or the initial value
  const affiliateDiscountAmount = (formData.affiliateDiscount || passedAffiliateDiscount || initialAffiliateDiscount) || 0;
  const subtotalAfterAffiliate = cartSubtotalAfterProductDiscount - affiliateDiscountAmount;

  const subtotalAfterDiscount = subtotalAfterAffiliate - promoDiscount;

  // Free shipping only if no promo code, no affiliate discount, and subtotal > 599
  const shipping = (promoDiscount > 0 || affiliateDiscountAmount > 0)
    ? shippingCost
    : (subtotalAfterAffiliate > 599 ? 0 : shippingCost);

  // Calculate total before redemption (same as cart page)
  const totalBeforeRedemption = subtotalAfterDiscount + shipping;

  // Apply wallet deductions at the end (same as cart page) - with NaN safety checks
  const safeWalletAmount = isNaN(walletAmount) || !walletAmount ? 0 : Number(walletAmount);
  const safeAffiliateWalletAmount = isNaN(affiliateWalletAmount) || !affiliateWalletAmount ? 0 : Number(affiliateWalletAmount);
  const total = Math.max(0, totalBeforeRedemption - safeWalletAmount - safeAffiliateWalletAmount);

  // Calculate affiliate commission dynamically from product's affiliate_commission field
  const affiliateCommission = formData.affiliateCode
    ? Math.round(
        cartItems.reduce((sum, item) => {
          // Get affiliate commission percentage from product (fallback to 0 if not set)
          const itemAffiliateCommission = item.affiliateCommission || 0;
          const itemPrice = parseInt(item.price?.replace(/[₹,]/g, "") || "0");
          const itemTotal = itemPrice * item.quantity;
          // Calculate commission for this item: (itemTotal * affiliateCommission%) / 100
          return sum + (itemTotal * itemAffiliateCommission) / 100;
        }, 0)
      )
    : 0;

  // Whether the currently selected address has all required fields filled
  // Consider address complete if at least one name (firstName OR lastName) present
  // (some saved addresses may have a single recipient name), plus other required fields.
  const isAddressComplete = Boolean(
    ( (formData.firstName && formData.firstName.trim().length > 0) || (formData.lastName && formData.lastName.trim().length > 0) ) &&
    formData.phone && formData.phone.trim().length > 0 &&
    formData.address && formData.address.trim().length >= 10 &&
    formData.city && formData.city.trim().length > 0 &&
    formData.state && formData.state.trim().length > 0 &&
    formData.zipCode && /^\d{6}$/.test(String(formData.zipCode))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill state and clear zipcode when city is selected (user will select from dropdown)
    if (name === 'city' && value) {
      const cityKey = value.toLowerCase().trim();
      const locationData = cityLocationMap[cityKey];

      if (locationData) {
        setFormData(prev => ({
          ...prev,
          city: value,
          state: locationData.state,
          zipCode: "" // Clear zipCode so user can select from dropdown
        }));
      }
    }
  };

  // Get available pincodes for selected city
  const getAvailablePincodes = () => {
    if (!formData.city) return [];
    const cityKey = formData.city.toLowerCase().trim();
    const locationData = cityLocationMap[cityKey];
    return locationData?.pincodes || [];
  };

  const handleUseProfileData = () => {
    if (userProfile) {
      let city = "";
      let state = "";
      let zipCode = "";
      let streetAddress = (userProfile as any)?.address || "";

      const addressParts = streetAddress.split(',').map((part: string) => part.trim());
      if (addressParts.length >= 3) {
        const lastPart = addressParts[addressParts.length - 1];
        const pinCodeMatch = lastPart.match(/\d{6}$/);
        if (pinCodeMatch) {
          zipCode = pinCodeMatch[0];
          state = lastPart.replace(/\d{6}$/, '').trim();
        } else {
          state = lastPart;
        }

        if (addressParts.length >= 2) {
          city = addressParts[addressParts.length - 2];
        }

        streetAddress = addressParts.slice(0, -2).join(', ');
      } else if (addressParts.length === 2) {
        city = addressParts[1];
        streetAddress = addressParts[0];
      } else if (addressParts.length === 1) {
        streetAddress = addressParts[0];
      }

        setFormData({
        email: (userProfile as any)?.email || "",
        firstName: (userProfile as any)?.firstName || "",
        lastName: (userProfile as any)?.lastName || "",
        address: streetAddress,
        city: city,
        state: state,
        zipCode: zipCode,
        phone: (userProfile as any)?.phone || "",
        paymentMethod: "cashfree",
        affiliateCode: passedAffiliateCode,
        affiliateDiscount: passedAffiliateDiscount || passedAffiliateDiscountFromItems || 0,
        deliveryInstructions: (userProfile as any)?.deliveryInstructions || "",
        saturdayDelivery: (userProfile as any)?.saturdayDelivery === true, // Ensure boolean
        sundayDelivery: (userProfile as any)?.sundayDelivery === true // Ensure boolean
      });

      toast({
        title: "Profile Information Loaded",
        description: "Your contact information and shipping address have been filled automatically.",
      });
    }
    setShowProfileDialog(false);
  };

  const handleSkipProfileData = () => {
    setShowProfileDialog(false);
  };

  const copyAffiliateCode = () => {
    if (formData.affiliateCode) {
      navigator.clipboard.writeText(formData.affiliateCode);
      toast({
        title: "Copied!",
        description: "Affiliate code copied to clipboard",
      });
    }
  };

  const handleAutofillLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Detecting Location",
      description: "Please wait while we detect your current location...",
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Use Nominatim OpenStreetMap API for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );

          if (!response.ok) throw new Error('Failed to fetch location data');

          const data = await response.json();
          const address = data.address;

          // Extract and format address details
          const city = address.city || address.town || address.village || address.suburb || '';
          const state = address.state || '';
          const pincode = address.postcode || '';
          const area = address.road || address.neighbourhood || '';
          const landmark = address.amenity || '';

          // Update form fields
          setNewAddressData(prev => ({
            ...prev,
            town: city,
            state: state.toLowerCase().replace(/ /g, '_'),
            pincode: pincode,
            area: area,
            landmark: landmark,
          }));

          toast({
            title: "Location Detected!",
            description: `${city}, ${state}`,
          });
        } catch (error) {
          console.error('Geocoding error:', error);
          toast({
            title: "Location Detection Failed",
            description: "Could not detect address details. Please enter manually.",
            variant: "destructive",
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = "Could not access your location";

        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location permission denied. Please enable location access in your browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out.";
        }

        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const populateFormWithAddress = (address: any) => {
    setFormData(prev => ({
      ...prev,
      firstName: address.recipientName?.split(' ')[0] || "",
      lastName: address.recipientName?.split(' ').slice(1).join(' ') || "",
      phone: address.phoneNumber || "",
      address: address.addressLine1 || "",
      city: address.city || "",
      state: address.state || "",
      zipCode: address.pincode || "",
      saturdayDelivery: address.saturdayDelivery === true, // Populate weekend delivery info as boolean
      sundayDelivery: address.sundayDelivery === true, // Populate weekend delivery info as boolean
      deliveryInstructions: address.deliveryInstructions || "", // Populate delivery instructions
    }));
  };

  const handleAddressSelection = (addressId: number) => {
    setSelectedAddressId(Number(addressId));
    const selectedAddress = savedAddresses.find(addr => Number(addr.id) === Number(addressId));
    if (selectedAddress) {
      populateFormWithAddress(selectedAddress);
    }
  };

  const handleNewAddressSubmit = async () => {
    // Validate required fields
    if (!newAddressData.fullName || !newAddressData.mobile || !newAddressData.pincode ||
        !newAddressData.flat || !newAddressData.area || !newAddressData.town || !newAddressData.state) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate mobile number
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    const cleanPhone = newAddressData.mobile.replace(/[\s-()]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit Indian mobile number",
        variant: "destructive",
      });
      return;
    }

    // Validate pincode
    if (!/^\d{6}$/.test(newAddressData.pincode)) {
      toast({
        title: "Invalid Pincode",
        description: "Please enter a valid 6-digit PIN code",
        variant: "destructive",
      });
      return;
    }

    // Build full address
    const fullAddress = `${newAddressData.flat}, ${newAddressData.area}${newAddressData.landmark ? ', ' + newAddressData.landmark : ''}`;

    // Split name into first and last
    const [firstName, ...lastNameParts] = newAddressData.fullName.trim().split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    try {
      // Save to database
      const response = await fetch(apiUrl('/api/delivery-addresses'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          recipientName: newAddressData.fullName,
          addressLine1: fullAddress,
          addressLine2: null,
          city: newAddressData.town,
          state: newAddressData.state,
          pincode: newAddressData.pincode,
          country: 'India',
          phoneNumber: newAddressData.mobile,
          deliveryInstructions: newAddressData.deliveryInstructions, // Save delivery instructions
          isDefault: newAddressData.makeDefault,
          saturdayDelivery: newAddressData.saturdayDelivery, // Save Saturday delivery preference
          sundayDelivery: newAddressData.sundayDelivery, // Save Sunday delivery preference
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save address');
      }

      const savedAddress = await response.json();

      // Refresh addresses list
      const addressesResponse = await fetch(apiUrl(`/api/delivery-addresses?userId=${user.id}`));
      if (addressesResponse.ok) {
        const updatedAddresses = await addressesResponse.json();
        setSavedAddresses(updatedAddresses);

        // Select the newly added address (coerce id to number)
        setSelectedAddressId(Number(savedAddress.id));
        populateFormWithAddress(savedAddress);
      }

      // Reset new address form
      setNewAddressData({
        fullName: "",
        mobile: "",
        pincode: "",
        flat: "",
        area: "",
        landmark: "",
        town: "",
        state: "",
        makeDefault: false,
        deliveryInstructions: '',
        saturdayDelivery: false,
        sundayDelivery: false,
      });

      setShowAddAddressDialog(false);

      toast({
        title: "Address Saved",
        description: "New delivery address has been saved to your account",
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Error",
        description: "Failed to save delivery address. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRedeemCashback = async () => {
    if (!user?.id || redeemAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to redeem",
        variant: "destructive",
      });
      return;
    }

    if (redeemAmount > (walletData?.cashbackBalance || 0)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough cashback balance",
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await fetch(apiUrl('/api/wallet/redeem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: redeemAmount,
          description: 'Cashback redeemed at checkout'
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to redeem cashback');
      }

      // Update wallet amount in state
      setWalletAmount((prev: number) => prev - redeemAmount);
      // Also update the form data's redeemAmount if it's used elsewhere
      setFormData(prev => ({
        ...prev,
        // Assuming redeemAmount in formData is meant to track the amount to be applied, not the balance
      }));

      toast({
        title: "Success!",
        description: `₹${redeemAmount} cashback redeemed successfully`,
      });

      // Optionally refetch wallet data to ensure UI reflects the absolute latest balance
      refetchWalletData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem cashback",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const processCashfreePayment = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue with payment",
          variant: "destructive",
        });
        return false;
      }

      if (!formData.email || !formData.firstName || !formData.lastName) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return false;
      }

      if (formData.phone && formData.phone.trim()) {
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        const cleanPhone = formData.phone.replace(/[\s-()]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid 10-digit Indian mobile number starting with 6-9",
            variant: "destructive",
          });
          return false;
        }
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return false;
      }

      const orderId = `ORD-${Date.now()}-${user.id}`;

      const response = await fetch(apiUrl('/api/payments/cashfree/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(total),
          orderId: orderId,
          currency: 'INR',
          customerDetails: {
            customerId: String(user.id),
            customerName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            customerEmail: formData.email.trim(),
            customerPhone: formData.phone?.trim() || '9999999999',
          },
          orderNote: 'Beauty Store Purchase',
          orderData: {
            userId: user.id,
            totalAmount: Math.round(total),
            shippingAddress: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
            affiliateCode: passedAffiliateCode || null,
            affiliateCommission: affiliateCommission > 0 ? Math.round(affiliateCommission) : null,
            promoCode: appliedPromo?.code || null,
            promoDiscount: promoDiscount > 0 ? Math.round(promoDiscount) : null,
            redeemAmount: Math.round(redeemAmount) || 0,
            affiliateWalletAmount: Math.round(affiliateWalletAmount) || 0,
            deliveryInstructions: formData.deliveryInstructions, // Include general delivery instructions
            saturdayDelivery: formData.saturdayDelivery, // Include weekend delivery preferences
            sundayDelivery: formData.sundayDelivery,   // Include weekend delivery preferences
            items: cartItems.map(item => ({
              productId: item.id,
              productName: item.name,
              productImage: item.image,
              quantity: item.quantity,
              price: item.price,
              cashbackPrice: item.cashbackPrice || null,
              cashbackPercentage: item.cashbackPercentage || null,
            }))
          }
        }),
      });

      const orderData = await response.json();

      if (!response.ok) {
        console.error('Cashfree API error:', orderData);

        let errorMessage = "Payment processing failed";

        if (orderData.configError) {
          errorMessage = "Cashfree is not configured. Please use Cash on Delivery.";
        } else if (orderData.cashfreeError) {
          errorMessage = orderData.error || "Cashfree service error. Please try again.";
        } else {
          errorMessage = orderData.error || `Payment setup failed (${response.status})`;
        }

        toast({
          title: "Payment Error",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }

      if (!orderData.paymentSessionId) {
        console.error("Missing payment session ID:", orderData);
        toast({
          title: "Configuration Error",
          description: "Invalid payment session. Please try Cash on Delivery.",
          variant: "destructive",
        });
        return false;
      }

      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId: orderData.orderId,
        paymentSessionId: orderData.paymentSessionId,
        customerData: formData,
        cartItems: cartItems,
        totalAmount: total,
        redeemAmount: redeemAmount,
        affiliateWalletAmount: affiliateWalletAmount, // Include affiliateWalletAmount
        affiliateCommission: affiliateCommission,
      }));

      return new Promise((resolve) => {
        const existingScript = document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
        if (existingScript) {
          existingScript.remove();
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => {
          try {
            const cashfree = (window as any).Cashfree({
              mode: orderData.environment || 'sandbox'
            });

            console.log("Initiating Cashfree checkout with session ID:", orderData.paymentSessionId);
            console.log("Using environment mode:", orderData.environment || 'sandbox');

            cashfree.checkout({
              paymentSessionId: orderData.paymentSessionId,
              returnUrl: `${window.location.origin}/checkout?payment=processing&orderId=${orderData.orderId}`,
            });

            resolve(true);
          } catch (checkoutError) {
            console.error("Cashfree checkout error:", checkoutError);
            toast({
              title: "Payment Error",
              description: "Failed to initialize payment. Please try again.",
              variant: "destructive",
            });
            resolve(false);
          }
        };
        script.onerror = () => {
          console.error("Failed to load Cashfree SDK");
          toast({
            title: "Payment Error",
            description: "Failed to load payment system. Please try again.",
            variant: "destructive",
          });
          resolve(false);
        };
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Cashfree payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Payment processing failed",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedAddressId && localStorage.getItem('isMultiAddressOrder') !== 'true') {
      toast({
        title: "Address Required",
        description: "Please select or add a delivery address",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const user = getCurrentUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place an order",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    if (!formData.email?.trim() || !formData.firstName?.trim() || !formData.lastName?.trim() || !formData.address?.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields: Email, First Name, Last Name, and Address",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      const cleanPhone = formData.phone.replace(/[\s-()]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid 10-digit Indian mobile number starting with 6-9",
          variant: "destructive",
        });
        setIsProcessing(false);
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      setIsProcessing(false);
      return false;
    }

    if (!formData.address || formData.address.trim().length < 10) {
      toast({
        title: "Invalid Address",
        description: "Please enter a complete address (minimum 10 characters)",
        variant: "destructive",
      });
      setIsProcessing(false);
      return false;
    }

    if (!formData.city || formData.city.trim().length < 3) {
      toast({
        title: "Invalid City",
        description: "Please select a valid city",
        variant: "destructive",
      });
      setIsProcessing(false);
      return false;
    }

    if (!formData.state || formData.state.trim().length < 3) {
      toast({
        title: "Invalid State",
        description: "Please select a valid state",
        variant: "destructive",
      });
      setIsProcessing(false);
      return false;
    }

    if (!formData.zipCode || !/^\d{6}$/.test(formData.zipCode.trim())) {
      toast({
        title: "Invalid PIN Code",
        description: "Please enter a valid 6-digit PIN code",
        variant: "destructive",
      });
      setIsProcessing(false);
      return false;
    }

    if (!formData.city || !formData.state) {
      toast({
        title: "Address Incomplete",
        description: "Please select city and state",
        variant: "destructive",
      });
      setIsProcessing(false);
      return false;
    }


    try {
      let paymentSuccessful = false;
      let paymentMethod = 'Cash on Delivery';
      const finalTotal = total;
      const fullAddress = `${formData.address.trim()}, ${formData.city.trim()}, ${formData.state.trim()} ${formData.zipCode.trim()}`;


      if (formData.paymentMethod === 'cashfree') {
        toast({
          title: "Processing Payment",
          description: "Redirecting to Cashfree...",
        });
        paymentSuccessful = (await processCashfreePayment()) as boolean;
        return;
      } else {
        paymentSuccessful = true;
        paymentMethod = 'Cash on Delivery';

        // Check if this is a multi-address order
        const isMultiAddress = localStorage.getItem('isMultiAddressOrder') === 'true';
        const multiAddressMapping = localStorage.getItem('multiAddressMapping');

        let shippingAddressData = fullAddress;
        let itemsData = cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          productImage: item.image,
          quantity: item.quantity,
          price: item.price,
          cashbackPrice: item.cashbackPrice || null,
          cashbackPercentage: item.cashbackPercentage || null,
          deliveryInstructions: formData.deliveryInstructions || null,
        }));

        // If multi-address order, include delivery addresses for each item
        if (isMultiAddress && multiAddressMapping && savedAddresses.length > 0) {
          try {
            const mapping = JSON.parse(multiAddressMapping);
            
            itemsData = cartItems.map((item: any) => {
              const addressId = mapping[item.id];
              const address = savedAddresses.find(addr => addr.id === addressId);
              
              return {
                productId: item.id,
                productName: item.name,
                productImage: item.image,
                quantity: item.quantity,
                price: item.price,
                cashbackPrice: item.cashbackPrice || null,
                cashbackPercentage: item.cashbackPercentage || null,
                deliveryAddress: address ? `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city}, ${address.state} - ${address.pincode}, ${address.country}` : null,
                recipientName: address ? address.recipientName : null,
                recipientPhone: address ? address.phoneNumber : null,
                deliveryInstructions: address?.deliveryInstructions || null,
                saturdayDelivery: address?.saturdayDelivery,
                sundayDelivery: address?.sundayDelivery,
              };
            });

            // For multi-address orders, use first address or a combined note
            shippingAddressData = "Multiple Delivery Addresses - See individual items";
          } catch (error) {
            console.error('Error parsing multi-address mapping:', error);
          }
        }

        const orderData = {
          userId: user.id,
          totalAmount: Math.round(total), // Round to integer
          paymentMethod: paymentMethod,
          shippingAddress: shippingAddressData,
          isMultiAddress: isMultiAddress,
          affiliateCode: formData.affiliateCode || passedAffiliateCode || null,
          affiliateCommission: affiliateCommission > 0 ? affiliateCommission : null,
          affiliateCommissionEarned: (() => {
            try {
              const raw = localStorage.getItem('affiliateCommissionEarned');
              if (raw) {
                const parsed = JSON.parse(raw);
                return parsed.commission || 0;
              }
            } catch (e) {
              // ignore
            }
            return 0;
          })(),
          promoCode: appliedPromo?.code || null,
          promoDiscount: promoDiscount > 0 ? Math.round(promoDiscount) : null,
          redeemAmount: Math.round(redeemAmount) || 0,
          affiliateWalletAmount: Math.round(affiliateWalletAmount) || 0,
          deliveryInstructions: formData.deliveryInstructions, // Include general delivery instructions from the main form
          saturdayDelivery: formData.saturdayDelivery, // Include weekend delivery preferences
          sundayDelivery: formData.sundayDelivery,   // Include weekend delivery preferences
          items: itemsData,
          customerName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim(),
        };

        console.log('📦 Order Data being sent:', {
          affiliateCode: orderData.affiliateCode,
          affiliateCommission: orderData.affiliateCommission,
          totalAmount: orderData.totalAmount
        });

        if (redeemAmount > 0) {
          try {
            const redeemResponse = await fetch(apiUrl('/api/wallet/redeem'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.id,
                amount: redeemAmount,
                description: 'Cashback redeemed during checkout'
              }),
            });

            if (!redeemResponse.ok) {
              const redeemError = await redeemResponse.json();
              throw new Error(redeemError.error || 'Failed to redeem cashback');
            }

            console.log('Cashback redeemed successfully:', redeemAmount);
            window.dispatchEvent(new CustomEvent('walletUpdated'));
          } catch (redeemError) {
            console.error('Error redeeming cashback:', redeemError);
            toast({
              title: "Cashback Redemption Failed",
              description: (redeemError as any)?.message || "Failed to redeem cashback. Please try again.",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }
        }

        let response;
        try {
          response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || "Failed to create order");
          }

          const data = await response.json();

          setOrderId(data.orderId || 'ORD-001');
          setOrderPlaced(true);

          // Log affiliate wallet transaction if affiliate wallet was used
          if (affiliateWalletAmount > 0) {
            try {
              await fetch(apiUrl('/api/affiliate/transactions'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  type: 'redemption',
                  amount: Math.round(affiliateWalletAmount),
                  description: `Affiliate wallet redeemed during checkout for order ${data.orderId || 'ORD-001'}`,
                  orderId: data.orderId,
                  status: 'completed'
                }),
              });
            } catch (txError) {
              console.error('Error logging affiliate transaction:', txError);
            }
          }

          localStorage.removeItem("cart");
          localStorage.removeItem("appliedPromoCode");
          localStorage.removeItem("affiliateDiscount");
          localStorage.removeItem("promoDiscount");
          localStorage.removeItem("redeemAmount");
          localStorage.removeItem("affiliateWalletAmount");
          localStorage.removeItem("isMultiAddressOrder");
          localStorage.removeItem("multiAddressMapping");
          localStorage.removeItem("multipleAddressMode");
          sessionStorage.removeItem('pendingOrder');
          localStorage.setItem("cartCount", "0");
          window.dispatchEvent(new Event("cartUpdated"));
          window.dispatchEvent(new CustomEvent('walletUpdated'));

          toast({
            title: "Order Placed Successfully!",
            description: redeemAmount > 0
              ? `Order placed with ₹${redeemAmount.toFixed(2)} cashback redeemed!`
              : "You will receive a confirmation email shortly",
          });
        } catch (error: any) {
          console.error("Order creation error:", error);
          toast({
            title: "Order Failed",
            description: error.message || "Failed to create order. Please try again.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    } finally {
      if (formData.paymentMethod !== 'cashfree') {
        setIsProcessing(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
            <p className="text-gray-600">
              Thank you for your purchase. Your order {orderId} has been confirmed.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Estimated delivery</p>
              <p className="font-semibold">3-5 business days</p>
            </div>
            <div className="space-y-3 pt-4">
              <Link href={`/track-order?orderId=${orderId}`}>
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  Track Your Order
                </Button>
              </Link>
              <Link href="/order-history">
                <Button variant="outline" className="w-full">
                  View All Orders
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showAuthRequired) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <User className="mx-auto h-24 w-24 text-gray-300 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-8">Please log in or create an account to proceed with checkout.</p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login">
                <Button className="bg-red-600 hover:bg-red-700">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="outline">
                  Create Account
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <Link href="/cart" className="text-red-600 hover:text-red-700">
                ← Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <Package className="mx-auto h-24 w-24 text-gray-300 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Add some items to your cart before checking out.</p>
            <Link href="/">
              <Button className="bg-red-600 hover:bg-red-700">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout UI with multi-step flow
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/cart" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isMultiAddress = localStorage.getItem('isMultiAddressOrder') === 'true';
              const stepCompleted = isMultiAddress && step.number === 1 ? true : currentStep > step.number;
              const stepActive = isMultiAddress && step.number === 1 ? true : currentStep >= step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      stepActive
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {stepCompleted ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <step.icon className="h-6 w-6" />
                      )}
                    </div>
                    <span className={`mt-2 text-sm font-medium ${
                      stepActive ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {isMultiAddress && step.number === 1 ? 'Multiple Addresses' : step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 ${
                      stepCompleted ? 'bg-red-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

       <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Delivery Address - Hide for multi-address orders */}
              {currentStep === 1 && localStorage.getItem('isMultiAddressOrder') !== 'true' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Select Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {savedAddresses.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Add delivery address</h3>
                        <p className="text-sm text-gray-600 mb-6">Enter your address to see delivery options</p>
                        <Dialog open={showAddAddressDialog} onOpenChange={(open) => {
                          setShowAddAddressDialog(open);
                          if (open) { // Reset form when opening dialog
                            setNewAddressData({
                              fullName: "", mobile: "", pincode: "", flat: "", area: "", landmark: "",
                              town: "", state: "", makeDefault: false, deliveryInstructions: '',
                              saturdayDelivery: false, sundayDelivery: false,
                            });
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-6 text-base">
                              Add a new delivery address
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Enter a new delivery address</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-blue-900">Save time. Autofill your current location.</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    type="button"
                                    onClick={handleAutofillLocation}
                                  >
                                    <MapPin className="h-3 w-3 mr-1" />
                                    Autofill
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="newCountry">Country/Region *</Label>
                                <select
                                  id="newCountry"
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  defaultValue="India"
                                  disabled
                                >
                                  <option value="India">India</option>
                                </select>
                              </div>

                              <div>
                                <Label htmlFor="newFullName">Full name (First and Last name) *</Label>
                                <Input
                                  id="newFullName"
                                  value={newAddressData.fullName}
                                  onChange={(e) => setNewAddressData({...newAddressData, fullName: e.target.value})}
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="newMobile">Mobile number *</Label>
                                <Input
                                  id="newMobile"
                                  placeholder="May be used to assist delivery"
                                  value={newAddressData.mobile}
                                  onChange={(e) => setNewAddressData({...newAddressData, mobile: e.target.value})}
                                  maxLength={10}
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="newPincode">Pincode *</Label>
                                <Input
                                  id="newPincode"
                                  placeholder="6 digits [0-9] PIN code"
                                  value={newAddressData.pincode}
                                  onChange={(e) => setNewAddressData({...newAddressData, pincode: e.target.value})}
                                  maxLength={6}
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="newFlat">Flat, House no., Building, Company, Apartment *</Label>
                                <Input
                                  id="newFlat"
                                  value={newAddressData.flat}
                                  onChange={(e) => setNewAddressData({...newAddressData, flat: e.target.value})}
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="newArea">Area, Street, Sector, Village *</Label>
                                <Input
                                  id="newArea"
                                  placeholder="e.g., hawa, nandpuri colony"
                                  value={newAddressData.area}
                                  onChange={(e) => setNewAddressData({...newAddressData, area: e.target.value})}
                                  required
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="newTown">Town/City *</Label>
                                  <Input
                                    id="newTown"
                                    value={newAddressData.town}
                                    onChange={(e) => setNewAddressData({...newAddressData, town: e.target.value})}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="newState">State *</Label>
                                  <select
                                    id="newState"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newAddressData.state}
                                    onChange={(e) => setNewAddressData({...newAddressData, state: e.target.value})}
                                    required
                                  >
                                    <option value="">Select State</option>
                                    <option value="andhra_pradesh">Andhra Pradesh</option>
                                    <option value="arunachal_pradesh">Arunachal Pradesh</option>
                                    <option value="assam">Assam</option>
                                    <option value="bihar">Bihar</option>
                                    <option value="chhattisgarh">Chhattisgarh</option>
                                    <option value="goa">Goa</option>
                                    <option value="gujarat">Gujarat</option>
                                    <option value="haryana">Haryana</option>
                                    <option value="himachal_pradesh">Himachal Pradesh</option>
                                    <option value="jharkhand">Jharkhand</option>
                                    <option value="karnataka">Karnataka</option>
                                    <option value="kerala">Kerala</option>
                                    <option value="madhya_pradesh">Madhya Pradesh</option>
                                    <option value="maharashtra">Maharashtra</option>
                                    <option value="manipur">Manipur</option>
                                    <option value="meghalaya">Meghalaya</option>
                                    <option value="mizoram">Mizoram</option>
                                    <option value="nagaland">Nagaland</option>
                                    <option value="odisha">Odisha</option>
                                    <option value="punjab">Punjab</option>
                                    <option value="rajasthan">Rajasthan</option>
                                    <option value="sikkim">Sikkim</option>
                                    <option value="tamil_nadu">Tamil Nadu</option>
                                    <option value="telangana">Telangana</option>
                                    <option value="tripura">Tripura</option>
                                    <option value="uttar_pradesh">Uttar Pradesh</option>
                                    <option value="uttarakhand">Uttarakhand</option>
                                    <option value="west_bengal">West Bengal</option>
                                    <option value="delhi">Delhi</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="makeDefault"
                                  className="rounded"
                                  checked={newAddressData.makeDefault}
                                  onChange={(e) => setNewAddressData({...newAddressData, makeDefault: e.target.checked})}
                                />
                                <Label htmlFor="makeDefault" className="text-sm font-normal">
                                  Make this my default address
                                </Label>
                              </div>

                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <p className="text-sm font-semibold mb-2">Add delivery instructions (optional)</p>
                                <Textarea
                                  placeholder="E.g., Leave at door, Ring bell twice, Call before delivery..."
                                  rows={3}
                                  className="mt-2 resize-none"
                                  onChange={(e) => {
                                    setNewAddressData({...newAddressData, deliveryInstructions: e.target.value});
                                  }}
                                />
                                <p className="text-xs text-gray-600 mt-2">Preferences are used to plan your delivery. However, shipments can sometimes arrive early or later than planned.</p>
                              </div>

                              <Button
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                                type="button"
                                onClick={handleNewAddressSubmit}
                              >
                                Use this address
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Multiple Addresses Option */}
                        {savedAddresses.length > 1 && (
                          <div className="mb-4 p-3   rounded-lg">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-600" />
                             
                              <button
                                type="button"
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline ml-1"
                                onClick={() => {
                                  // Save cart items to localStorage for multi-address page
                                  const minimalCart = cartItems.map(item => ({
                                    id: item.id,
                                    quantity: item.quantity
                                  }));
                                  localStorage.setItem('checkoutCartItems', JSON.stringify(minimalCart));
                                  localStorage.setItem('multipleAddressMode', 'true');
                                  setLocation('/select-delivery-address');
                                }}
                              >
                                Deliver to multiple addresses
                              </button>
                            </div>
                          </div>
                        )}

                        {savedAddresses.map((address) => (
                          <div
                            key={address.id}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                              selectedAddressId === address.id
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleAddressSelection(address.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                                selectedAddressId === address.id
                                  ? 'bg-red-600'
                                  : 'border-2 border-gray-300'
                              }`}>
                                {selectedAddressId === address.id && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{address.recipientName}</p>
                                <p className="text-sm text-gray-700 mt-1">{address.addressLine1}</p>
                                {address.addressLine2 && (
                                  <p className="text-sm text-gray-700">{address.addressLine2}</p>
                                )}
                                <p className="text-sm text-gray-700">{address.city}, {address.state}, {address.pincode}</p>
                                <p className="text-sm text-gray-600 mt-1">Phone: {address.phoneNumber}</p>
                              </div>
                            </div>
                          </div>
                        ))}

                        <Dialog open={showAddAddressDialog} onOpenChange={(open) => {
                          setShowAddAddressDialog(open);
                          if (open) { // Reset form when opening dialog
                            setNewAddressData({
                              fullName: "", mobile: "", pincode: "", flat: "", area: "", landmark: "",
                              town: "", state: "", makeDefault: false, deliveryInstructions: '',
                              saturdayDelivery: false, sundayDelivery: false,
                            });
                          }
                        }}>
                          <DialogTrigger asChild>
                            <button type="button" className="text-red-600 hover:text-red-700 text-sm hover:underline flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add a new delivery address
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Enter a new delivery address</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-blue-900">Save time. Autofill your current location.</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    type="button"
                                    onClick={handleAutofillLocation}
                                  >
                                    <MapPin className="h-3 w-3 mr-1" />
                                    Autofill
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="newCountry">Country/Region *</Label>
                                <select
                                  id="newCountry"
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  defaultValue="India"
                                  disabled
                                >
                                  <option value="India">India</option>
                                </select>
                              </div>

                              <div>
                                <Label htmlFor="newFullName">Full name (First and Last name) *</Label>
                                <Input
                                  id="newFullName"
                                  value={newAddressData.fullName}
                                  onChange={(e) => setNewAddressData({...newAddressData, fullName: e.target.value})}
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="newMobile">Mobile number *</Label>
                                <Input
                                  id="newMobile"
                                  placeholder="May be used to assist delivery"
                                  value={newAddressData.mobile}
                                  onChange={(e) => setNewAddressData({...newAddressData, mobile: e.target.value})}
                                  maxLength={10}
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="newPincode">Pincode *</Label>
                                <Input
                                  id="newPincode"
                                  placeholder="6 digits [0-9] PIN code"
                                  value={newAddressData.pincode}
                                  onChange={(e) => setNewAddressData({...newAddressData, pincode: e.target.value})}
                                  maxLength={6}
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="newFlat">Flat, House no., Building, Company, Apartment *</Label>
                                <Input
                                  id="newFlat"
                                  value={newAddressData.flat}
                                  onChange={(e) => setNewAddressData({...newAddressData, flat: e.target.value})}
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="newArea">Area, Street, Sector, Village *</Label>
                                <Input
                                  id="newArea"
                                  placeholder="e.g., hawa, nandpuri colony"
                                  value={newAddressData.area}
                                  onChange={(e) => setNewAddressData({...newAddressData, area: e.target.value})}
                                  required
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="newTown">Town/City *</Label>
                                  <Input
                                    id="newTown"
                                    value={newAddressData.town}
                                    onChange={(e) => setNewAddressData({...newAddressData, town: e.target.value})}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="newState">State *</Label>
                                  <select
                                    id="newState"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newAddressData.state}
                                    onChange={(e) => setNewAddressData({...newAddressData, state: e.target.value})}
                                    required
                                  >
                                    <option value="">Select State</option>
                                    <option value="andhra_pradesh">Andhra Pradesh</option>
                                    <option value="arunachal_pradesh">Arunachal Pradesh</option>
                                    <option value="assam">Assam</option>
                                    <option value="bihar">Bihar</option>
                                    <option value="chhattisgarh">Chhattisgarh</option>
                                    <option value="goa">Goa</option>
                                    <option value="gujarat">Gujarat</option>
                                    <option value="haryana">Haryana</option>
                                    <option value="himachal_pradesh">Himachal Pradesh</option>
                                    <option value="jharkhand">Jharkhand</option>
                                    <option value="karnataka">Karnataka</option>
                                    <option value="kerala">Kerala</option>
                                    <option value="madhya_pradesh">Madhya Pradesh</option>
                                    <option value="maharashtra">Maharashtra</option>
                                    <option value="manipur">Manipur</option>
                                    <option value="meghalaya">Meghalaya</option>
                                    <option value="mizoram">Mizoram</option>
                                    <option value="nagaland">Nagaland</option>
                                    <option value="odisha">Odisha</option>
                                    <option value="punjab">Punjab</option>
                                    <option value="rajasthan">Rajasthan</option>
                                    <option value="sikkim">Sikkim</option>
                                    <option value="tamil_nadu">Tamil Nadu</option>
                                    <option value="telangana">Telangana</option>
                                    <option value="tripura">Tripura</option>
                                    <option value="uttar_pradesh">Uttar Pradesh</option>
                                    <option value="uttarakhand">Uttarakhand</option>
                                    <option value="west_bengal">West Bengal</option>
                                    <option value="delhi">Delhi</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="makeDefault"
                                  className="rounded"
                                  checked={newAddressData.makeDefault}
                                  onChange={(e) => setNewAddressData({...newAddressData, makeDefault: e.target.checked})}
                                />
                                <Label htmlFor="makeDefault" className="text-sm font-normal">
                                  Make this my default address
                                </Label>
                              </div>

                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <p className="text-sm font-semibold mb-2">Add delivery instructions (optional)</p>
                                <Textarea
                                  placeholder="E.g., Leave at door, Ring bell twice, Call before delivery..."
                                  rows={3}
                                  className="mt-2 resize-none"
                                  onChange={(e) => {
                                    setNewAddressData({...newAddressData, deliveryInstructions: e.target.value});
                                  }}
                                />
                                <p className="text-xs text-gray-600 mt-2">Preferences are used to plan your delivery. However, shipments can sometimes arrive early or later than planned.</p>
                              </div>

                              <Button
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                                type="button"
                                onClick={handleNewAddressSubmit}
                              >
                                Use this address
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation('/cart')}
                        size="sm"
                      >
                        ← Back
                      </Button>

                      <div className="flex flex-col items-end">
                        <Button
                          type="button"
                          onClick={handleNextStep}
                          className={`flex items-center gap-2 ${isAddressComplete ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                          disabled={!isAddressComplete}
                        >
                          Continue to Review
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        {!isAddressComplete && (
                          <p className="text-xs text-gray-500 mt-1">Please complete address details to continue</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Order Review */}
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <Package className="h-5 w-5 mr-2" />
                      Review Your Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Multi-address order info - Enhanced */}
                    {localStorage.getItem('isMultiAddressOrder') === 'true' && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 rounded-lg p-4 flex items-start gap-3 mb-4">
                        <MapPin className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-blue-900">Multiple Delivery Addresses Selected</p>
                          <p className="text-xs text-blue-800 mt-1">Each item will be delivered to its assigned address as shown below</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLocation('/select-delivery-address')}
                          className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline whitespace-nowrap"
                        >
                          Edit Addresses
                        </button>
                      </div>
                    )}

                    {cartItems.map((item, itemIndex) => {
                      const isMultiAddress = localStorage.getItem('isMultiAddressOrder') === 'true';
                      let itemAddress = null;

                      if (isMultiAddress) {
                        const instanceKeys = Object.keys(multiAddressMapping).filter(key => key.startsWith(`${item.id}-`));

                        if (instanceKeys.length > 0) {
                          const instances = instanceKeys.map(key => {
                            const addressId = multiAddressMapping[key];
                            const address = savedAddresses.find(addr => addr.id === addressId);
                            const instanceNum = parseInt(key.split('-')[1]) + 1;
                            return { instanceNum, address };
                          }).filter(inst => inst.address);

                          return (
                            <div key={item.id} className="border border-gray-200 rounded-md bg-white">
                              {/* Compact Product Header */}
                              <div className="p-3 bg-gray-50 border-b">
                                <div className="flex gap-3">
                                  <img src={item.image} alt={item.name} className="h-16 w-16 object-cover rounded border" />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{item.name}</h4>
                                    {item.selectedShade && (
                                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-xs rounded">{item.selectedShade.name}</span>
                                    )}
                                    <div className="mt-1 flex items-center justify-between text-xs">
                                      <span className="text-gray-600">Qty: <span className="font-semibold">{item.quantity}</span></span>
                                      <span className="font-semibold text-red-600">{item.price}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Compact Multiple Addresses */}
                              {instances.map(({ instanceNum, address }) => (
                                <div key={instanceNum} className="p-3 border-t border-gray-100">
                                  <div className="flex gap-2">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                      {instanceNum}
                                    </div>
                                    <div className="flex-1 text-xs">
                                      <p className="font-semibold text-gray-900">{address?.recipientName}</p>
                                      <p className="text-gray-600 mt-0.5 leading-relaxed">
                                        {address?.addressLine1}, {address?.city}, {address?.state.replace(/_/g, ' ').toUpperCase()} - {address?.pincode}
                                      </p>
                                      {address?.phoneNumber && <p className="text-gray-500 mt-0.5">📱 {address.phoneNumber}</p>}
                                      {address?.deliveryInstructions && (
                                        <p className="text-gray-600 mt-1 italic">✎ {address.deliveryInstructions}</p>
                                      )}
                                      {(address?.saturdayDelivery || address?.sundayDelivery) && (
                                        <div className="mt-1 flex gap-1">
                                          {address.saturdayDelivery && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">Sat</span>}
                                          {address.sundayDelivery && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">Sun</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        } else {
                          const addressId = multiAddressMapping[item.id.toString()];
                          itemAddress = addressId ? savedAddresses.find(addr => addr.id === addressId) : null;
                        }
                      } else {
                        itemAddress = selectedAddressId ? savedAddresses.find(addr => addr.id === selectedAddressId) : null;
                      }

                      if (!isMultiAddress || (isMultiAddress && itemAddress)) {
                        return (
                          <div key={item.id} className="border border-gray-200 rounded-md bg-white">
                            {/* Compact Single Item */}
                            <div className="p-3">
                              <div className="flex gap-3">
                                <img src={item.image} alt={item.name} className="h-16 w-16 object-cover rounded border" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{item.name}</h4>
                                  {item.selectedShade && (
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-xs rounded">{item.selectedShade.name}</span>
                                  )}
                                  <div className="mt-1 flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Qty: <span className="font-semibold">{item.quantity}</span></span>
                                    <span className="font-semibold text-red-600">{item.price}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Compact Address */}
                              {itemAddress && (
                                <div className="mt-3 pt-3 border-t text-xs">
                                  <div className="flex gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">{itemAddress.recipientName}</p>
                                      <p className="text-gray-600 mt-0.5 leading-relaxed">
                                        {itemAddress.addressLine1}, {itemAddress.city}, {itemAddress.state.replace(/_/g, ' ').toUpperCase()} - {itemAddress.pincode}
                                      </p>
                                      {itemAddress.phoneNumber && <p className="text-gray-500 mt-0.5">📱 {itemAddress.phoneNumber}</p>}
                                      {itemAddress.deliveryInstructions && (
                                        <p className="text-gray-600 mt-1 italic">✎ {itemAddress.deliveryInstructions}</p>
                                      )}
                                      {(itemAddress.saturdayDelivery || itemAddress.sundayDelivery) && (
                                        <div className="mt-1 flex gap-1">
                                          {itemAddress.saturdayDelivery && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">Sat</span>}
                                          {itemAddress.sundayDelivery && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">Sun</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}

                    <div className="flex justify-between pt-3 mt-3 border-t">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          // Go back to Step 1 to allow address changes
                          setCurrentStep(1);
                          // Keep selectedAddressId and formData so address stays selected
                        }}
                        size="sm"
                      >
                        ← Back to Address
                      </Button>
                      <Button type="button" onClick={handleNextStep} className="bg-red-600 hover:bg-red-700" size="sm">
                        Continue to Payment →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact Information Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-blue-900 mb-3">Contact Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="your@email.com"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone *</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="10-digit number"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            placeholder="First Name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            placeholder="Last Name"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Payment Method Section */}
                    <div className="mt-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
                      <RadioGroup
                        value={formData.paymentMethod}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value="cashfree" id="cashfree" />
                          <Label htmlFor="cashfree" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Online Payment</p>
                                <p className="text-sm text-gray-500">Pay with UPI, Cards, Net Banking & Wallets</p>
                              </div>
                              <Badge className="bg-purple-100 text-purple-800">Secure</Badge>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value="cod" id="cod" />
                          <Label htmlFor="cod" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Cash on Delivery</p>
                                <p className="text-sm text-gray-500">Pay when you receive your order</p>
                              </div>
                              <Badge className="bg-amber-100 text-amber-800">No fees</Badge>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevStep}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Processing..." : `Place Order - ₹${total.toLocaleString()}`}
                      </Button>
                    </div>

                    {/* Affiliate Wallet Section - Show if user has affiliate wallet balance */}
                    {affiliateWalletData?.commissionBalance && parseFloat(affiliateWalletData.commissionBalance) > 0 && (
                      <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="font-semibold text-purple-900">Affiliate Wallet Balance</p>
                              <p className="text-sm text-purple-700">Use your commission earned from referrals</p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-purple-600">₹{parseFloat(affiliateWalletData.commissionBalance).toFixed(2)}</span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="useAffiliateWallet"
                              checked={affiliateWalletAmount > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAffiliateWalletAmount(parseFloat(affiliateWalletData.commissionBalance));
                                } else {
                                  setAffiliateWalletAmount(0);
                                }
                              }}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                            <Label htmlFor="useAffiliateWallet" className="cursor-pointer text-purple-900 font-medium">
                              Use affiliate wallet balance
                            </Label>
                          </div>

                          {affiliateWalletAmount > 0 && (
                            <div className="bg-purple-100 p-3 rounded border border-purple-300">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-purple-800 font-medium">Amount to be deducted:</span>
                                <span className="font-bold text-purple-900">₹{affiliateWalletAmount.toFixed(2)}</span>
                              </div>
                              <p className="text-xs text-purple-700 mt-2">This amount will be deducted from your total bill</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
            <span className="font-medium">₹{cartSubtotal.toLocaleString()}</span>
          </div>

                    {affiliateDiscountAmount > 0 && (
                      <div className="flex justify-between text-sm bg-purple-50 p-2 rounded border-l-4 border-purple-500">
                        <div>
                          <span className="text-purple-700 font-medium">🎁 Affiliate Discount</span>
                          <p className="text-xs text-purple-600">Applied from affiliate link</p>
                        </div>
                        <span className="font-semibold text-purple-600">-₹{Math.round(affiliateDiscountAmount).toLocaleString()}</span>
                      </div>
                    )}

                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Promo Discount</span>
                        <span className="font-semibold">-₹{promoDiscount.toLocaleString()}</span>
                      </div>
                    )}

                    {safeWalletAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Cashback Wallet</span>
                        <span className="font-semibold">-₹{safeWalletAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {safeAffiliateWalletAmount > 0 && (
                      <div className="flex justify-between text-sm text-purple-600">
                        <span>Affiliate Wallet</span>
                        <span className="font-semibold">-₹{safeAffiliateWalletAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-red-600">₹{(isNaN(total) ? 0 : total).toLocaleString()}</span>
                    </div>

                    {(affiliateDiscountAmount > 0 || promoDiscount > 0 || safeWalletAmount > 0 || safeAffiliateWalletAmount > 0) && (
                      <div className="text-xs text-green-600 text-center bg-green-50 p-2 rounded">
                        You saved ₹{((affiliateDiscountAmount || 0) + (promoDiscount || 0) + (safeWalletAmount || 0) + (safeAffiliateWalletAmount || 0)).toLocaleString()}!
                      </div>
                    )}

                    {/* {affiliateCommissionAmount > 0 && (
                      <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-purple-600" />
                            <span className="text-sm font-bold text-purple-800">Affiliate Commission Earned</span>
                          </div>
                          <span className="text-lg font-bold text-purple-600">₹{affiliateCommissionAmount.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-purple-700">Commission on affiliate products will be credited to your wallet after delivery</p>
                      </div>
                    )} */}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}