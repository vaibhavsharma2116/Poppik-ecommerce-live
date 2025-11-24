import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CreditCard, MapPin, User, Package, CheckCircle, Gift, Award, ChevronDown, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/utils";


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
  ghaziabad: { state: "uttar_pradesh", pincode: "201001" },
  ludhiana: { state: "punjab", pincode: "141001" },
  agra: { state: "uttar_pradesh", pincode: "282001" },
  nashik: { state: "maharashtra", pincode: "422001" },
  faridabad: { state: "haryana", pincode: "121001" },
  meerut: { state: "uttar_pradesh", pincode: "250001" },
  rajkot: { state: "gujarat", pincode: "360001" },
  kalyan: { state: "maharashtra", pincode: "421301" },
  vasai: { state: "maharashtra", pincode: "401201" },
  varanasi: { state: "uttar_pradesh", pincode: "221001" },
  srinagar: { state: "jammu_and_kashmir", pincode: "190001" },
  aurangabad: { state: "maharashtra", pincode: "431001" },
  dhanbad: { state: "jharkhand", pincode: "826001" },
  amritsar: { state: "punjab", pincode: "143001" },
  navi_mumbai: { state: "maharashtra", pincode: "400614" },
  allahabad: { state: "uttar_pradesh", pincode: "211001" },
  ranchi: { state: "jharkhand", pincode: "834001" },
  howrah: { state: "west_bengal", pincode: "711101" },
  coimbatore: { state: "tamil_nadu", pincode: "641001" },
  jabalpur: { state: "madhya_pradesh", pincode: "482001" },
  gwalior: { state: "madhya_pradesh", pincode: "474001" },
  vijayawada: { state: "andhra_pradesh", pincode: "520001" },
  jodhpur: { state: "rajasthan", pincode: "342001" },
  madurai: { state: "tamil_nadu", pincode: "625001" },
  raipur: { state: "chhattisgarh", pincode: "492001" },
  kota: { state: "rajasthan", pincode: "324001" },
  guwahati: { state: "assam", pincode: "781001" },
  chandigarh: { state: "chandigarh", pincode: "160001" },
  solapur: { state: "maharashtra", pincode: "413001" },
  hubli: { state: "karnataka", pincode: "580020" },
  mysore: { state: "karnataka", pincode: "570001" },
  tiruchirappalli: { state: "tamil_nadu", pincode: "620001" },
  bareilly: { state: "uttar_pradesh", pincode: "243001" },
  aligarh: { state: "uttar_pradesh", pincode: "202001" },
  tiruppur: { state: "tamil_nadu", pincode: "641601" },
  moradabad: { state: "uttar_pradesh", pincode: "244001" },
  mysuru: { state: "karnataka", pincode: "570001" },
  bhiwandi: { state: "maharashtra", pincode: "421302" },
  saharanpur: { state: "uttar_pradesh", pincode: "247001" },
  gorakhpur: { state: "uttar_pradesh", pincode: "273001" },
  guntur: { state: "andhra_pradesh", pincode: "522001" },
  bikaner: { state: "rajasthan", pincode: "334001" },
  amravati: { state: "maharashtra", pincode: "444601" },
  noida: { state: "uttar_pradesh", pincode: "201301" },
  jamshedpur: { state: "jharkhand", pincode: "831001" },
  bhilai: { state: "chhattisgarh", pincode: "490001" },
  cuttack: { state: "odisha", pincode: "753001" },
  firozabad: { state: "uttar_pradesh", pincode: "283203" },
  kochi: { state: "kerala", pincode: "682001" },
  nellore: { state: "andhra_pradesh", pincode: "524001" },
  bhavnagar: { state: "gujarat", pincode: "364001" },
  dehradun: { state: "uttarakhand", pincode: "248001" },
  durgapur: { state: "west_bengal", pincode: "713201" },
  asansol: { state: "west_bengal", pincode: "713301" },
  rourkela: { state: "odisha", pincode: "769001" },
  nanded: { state: "maharashtra", pincode: "431601" },
  kolhapur: { state: "maharashtra", pincode: "416001" },
  ajmer: { state: "rajasthan", pincode: "305001" },
  akola: { state: "maharashtra", pincode: "444001" },
  gulbarga: { state: "karnataka", pincode: "585101" },
  jamnagar: { state: "gujarat", pincode: "361001" },
  ujjain: { state: "madhya_pradesh", pincode: "456001" },
  loni: { state: "uttar_pradesh", pincode: "201102" },
  siliguri: { state: "west_bengal", pincode: "734001" },
  jhansi: { state: "uttar_pradesh", pincode: "284001" },
  ulhasnagar: { state: "maharashtra", pincode: "421001" },
  jammu: { state: "jammu_and_kashmir", pincode: "180001" },
  sangli: { state: "maharashtra", pincode: "416416" },
  mangalore: { state: "karnataka", pincode: "575001" },
  erode: { state: "tamil_nadu", pincode: "638001" },
  belgaum: { state: "karnataka", pincode: "590001" },
  ambattur: { state: "tamil_nadu", pincode: "600053" },
  tirunelveli: { state: "tamil_nadu", pincode: "627001" },
  malegaon: { state: "maharashtra", pincode: "423203" },
  gaya: { state: "bihar", pincode: "823001" },
  jalgaon: { state: "maharashtra", pincode: "425001" },
  udaipur: { state: "rajasthan", pincode: "313001" },
  maheshtala: { state: "west_bengal", pincode: "700141" },
  davanagere: { state: "karnataka", pincode: "577001" },
  kozhikode: { state: "kerala", pincode: "673001" },
  kurnool: { state: "andhra_pradesh", pincode: "518001" },
  rajpur_sonarpur: { state: "west_bengal", pincode: "700149" },
  rajahmundry: { state: "andhra_pradesh", pincode: "533101" },
  bokaro_steel_city: { state: "jharkhand", pincode: "827001" },
  south_dumdum: { state: "west_bengal", pincode: "700074" },
  bellary: { state: "karnataka", pincode: "583101" },
  patiala: { state: "punjab", pincode: "147001" },
  gopalpur: { state: "west_bengal", pincode: "743273" },
  agartala: { state: "tripura", pincode: "799001" },
  bhagalpur: { state: "bihar", pincode: "812001" },
  muzaffarnagar: { state: "uttar_pradesh", pincode: "251001" },
  bhatpara: { state: "west_bengal", pincode: "743123" },
  panihati: { state: "west_bengal", pincode: "700110" },
  latur: { state: "maharashtra", pincode: "413512" },
  dhule: { state: "maharashtra", pincode: "424001" },
  tirupati: { state: "andhra_pradesh", pincode: "517501" },
  rohtak: { state: "haryana", pincode: "124001" },
  korba: { state: "chhattisgarh", pincode: "495677" },
  bhilwara: { state: "rajasthan", pincode: "311001" },
  berhampur: { state: "odisha", pincode: "760001" },
  muzaffarpur: { state: "bihar", pincode: "846001" },
  ahmednagar: { state: "maharashtra", pincode: "414001" },
  mathura: { state: "uttar_pradesh", pincode: "281001" },
  kollam: { state: "kerala", pincode: "691001" },
  avadi: { state: "tamil_nadu", pincode: "600054" },
  kadapa: { state: "andhra_pradesh", pincode: "516001" },
  kamarhati: { state: "west_bengal", pincode: "700058" },
  sambalpur: { state: "odisha", pincode: "768001" },
  bilaspur: { state: "chhattisgarh", pincode: "495001" },
  shahjahanpur: { state: "uttar_pradesh", pincode: "242001" },
  satara: { state: "maharashtra", pincode: "415001" },
  bijapur: { state: "karnataka", pincode: "586101" },
  rampur: { state: "uttar_pradesh", pincode: "244901" },
  shivamogga: { state: "karnataka", pincode: "577201" },
  chandrapur: { state: "maharashtra", pincode: "442401" },
  junagadh: { state: "gujarat", pincode: "362001" },
  thrissur: { state: "kerala", pincode: "680001" },
  alwar: { state: "rajasthan", pincode: "301001" },
  bardhaman: { state: "west_bengal", pincode: "713101" },
  kulti: { state: "west_bengal", pincode: "713343" },
  kakinada: { state: "andhra_pradesh", pincode: "533001" },
  nizamabad: { state: "telangana", pincode: "503001" },
  parbhani: { state: "maharashtra", pincode: "431401" },
  tumkur: { state: "karnataka", pincode: "572101" },
  khammam: { state: "telangana", pincode: "507001" },
  ozhukarai: { state: "puducherry", pincode: "605013" },
  bihar_sharif: { state: "bihar", pincode: "803101" },
  panipat: { state: "haryana", pincode: "132103" },
  darbhanga: { state: "bihar", pincode: "846004" },
  bally: { state: "west_bengal", pincode: "711201" },
  aizawl: { state: "mizoram", pincode: "796001" },
  dewas: { state: "madhya_pradesh", pincode: "455001" },
  ichalkaranji: { state: "maharashtra", pincode: "416115" },
  karnal: { state: "haryana", pincode: "132001" },
  bathinda: { state: "punjab", pincode: "151001" },
  jalna: { state: "maharashtra", pincode: "431203" },
  eluru: { state: "andhra_pradesh", pincode: "534001" },
  kirari_suleman_nagar: { state: "delhi", pincode: "110086" },
  barasat: { state: "west_bengal", pincode: "700124" },
  purnia: { state: "bihar", pincode: "854301" },
  satna: { state: "madhya_pradesh", pincode: "485001" },
  mau: { state: "uttar_pradesh", pincode: "275101" },
  sonipat: { state: "haryana", pincode: "131001" },
  farrukhabad: { state: "uttar_pradesh", pincode: "209625" },
  sagar: { state: "madhya_pradesh", pincode: "470001" },
  rourkela: { state: "odisha", pincode: "769001" },
  durg: { state: "chhattisgarh", pincode: "491001" },
  imphal: { state: "manipur", pincode: "795001" },
  ratlam: { state: "madhya_pradesh", pincode: "457001" },
  hapur: { state: "uttar_pradesh", pincode: "245101" },
  arrah: { state: "bihar", pincode: "802301" },
  karimnagar: { state: "telangana", pincode: "505001" },
  anantapur: { state: "andhra_pradesh", pincode: "515001" },
  etawah: { state: "uttar_pradesh", pincode: "206001" },
  ambernath: { state: "maharashtra", pincode: "421501" },
  north_dumdum: { state: "west_bengal", pincode: "700074" },
  bharatpur: { state: "rajasthan", pincode: "321001" },
  begusarai: { state: "bihar", pincode: "851101" },
  new_delhi: { state: "delhi", pincode: "110001" },
  gandhidham: { state: "gujarat", pincode: "370201" },
  baranagar: { state: "west_bengal", pincode: "700036" },
  tiruvottiyur: { state: "tamil_nadu", pincode: "600019" },
  puducherry: { state: "puducherry", pincode: "605001" },
  sikar: { state: "rajasthan", pincode: "332001" },
  thoothukudi: { state: "tamil_nadu", pincode: "628001" },
  rewa: { state: "madhya_pradesh", pincode: "486001" },
  mirzapur: { state: "uttar_pradesh", pincode: "231001" },
  raichur: { state: "karnataka", pincode: "584101" },
  pali: { state: "rajasthan", pincode: "306401" },
  ramagundam: { state: "telangana", pincode: "505208" },
  haridwar: { state: "uttarakhand", pincode: "249401" },
  vijayanagaram: { state: "andhra_pradesh", pincode: "535001" },
  katihar: { state: "bihar", pincode: "854105" },
  naihati: { state: "west_bengal", pincode: "743165" },
  sambhal: { state: "uttar_pradesh", pincode: "244302" },
  nadiad: { state: "gujarat", pincode: "387001" },
  yamunanagar: { state: "haryana", pincode: "135001" },
  english_bazar: { state: "west_bengal", pincode: "732101" },
  unnao: { state: "uttar_pradesh", pincode: "209801" },
  morena: { state: "madhya_pradesh", pincode: "476001" },
  bhiwani: { state: "haryana", pincode: "127021" },
  purnea: { state: "bihar", pincode: "854301" },
  kharagpur: { state: "west_bengal", pincode: "721301" },
  dindigul: { state: "tamil_nadu", pincode: "624001" },
  gandhinagar: { state: "gujarat", pincode: "382010" },
  hospet: { state: "karnataka", pincode: "583201" },
  nangloi_jat: { state: "delhi", pincode: "110041" },
  malda: { state: "west_bengal", pincode: "732101" },
  ongole: { state: "andhra_pradesh", pincode: "523001" },
  deoghar: { state: "jharkhand", pincode: "814112" },
  chapra: { state: "bihar", pincode: "841301" },
  haldia: { state: "west_bengal", pincode: "721602" },
  khandwa: { state: "madhya_pradesh", pincode: "450001" },
  nandyal: { state: "andhra_pradesh", pincode: "518501" },
  chittoor: { state: "andhra_pradesh", pincode: "517001" },
  morbi: { state: "gujarat", pincode: "363641" },
  amroha: { state: "uttar_pradesh", pincode: "244221" },
  anand: { state: "gujarat", pincode: "388001" },
  bhusawal: { state: "maharashtra", pincode: "425201" },
  orai: { state: "uttar_pradesh", pincode: "285001" },
  bahraich: { state: "uttar_pradesh", pincode: "271801" },
  vellore: { state: "tamil_nadu", pincode: "632001" },
  mahesana: { state: "gujarat", pincode: "384001" },
  sambalpur: { state: "odisha", pincode: "768001" },
  raiganj: { state: "west_bengal", pincode: "733134" },
  sirsa: { state: "haryana", pincode: "125055" },
  danapur: { state: "bihar", pincode: "801503" },
  serampore: { state: "west_bengal", pincode: "712201" },
  sultan_pur_majra: { state: "delhi", pincode: "110086" },
  guna: { state: "madhya_pradesh", pincode: "473001" },
  jaunpur: { state: "uttar_pradesh", pincode: "222001" },
  panvel: { state: "maharashtra", pincode: "410206" },
  shillong: { state: "meghalaya", pincode: "793001" },
  tenali: { state: "andhra_pradesh", pincode: "522201" },
  khora: { state: "uttar_pradesh", pincode: "201301" },
  guntakal: { state: "andhra_pradesh", pincode: "515801" },
  puri: { state: "odisha", pincode: "752001" },
  compiegne: { state: "uttar_pradesh", pincode: "209801" },
  kishanganj: { state: "bihar", pincode: "855107" },
  supaul: { state: "bihar", pincode: "852131" },
  godda: { state: "jharkhand", pincode: "814133" },
  hazaribagh: { state: "jharkhand", pincode: "825301" },
  pakur: { state: "jharkhand", pincode: "816107" },
  paschim_bardhaman: { state: "west_bengal", pincode: "713101" },
  dharwad: { state: "karnataka", pincode: "580001" },
  medininagar: { state: "jharkhand", pincode: "822101" }
};


interface CartItem {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  image: string;
  quantity: number;
  inStock: boolean;
  cashbackPrice?: string;
  cashbackPercentage?: string;
  selectedShade?: {
    id?: number;
    name: string;
    imageUrl?: string;
    colorCode?: string;
  };
}

export default function CheckoutPage() {
  const [location, setLocation] = useLocation();
  const { items = [], walletAmount: passedWalletAmount = 0, affiliateWalletAmount: passedAffiliateWalletAmount = 0, promoCode = null, promoDiscount: passedPromoDiscount = 0, affiliateCode: passedAffiliateCode = "", affiliateDiscount: passedAffiliateDiscount = 0 } = (location as any).state || {};

  const user = getCurrentUser();

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
  const [affiliateWalletAmount, setAffiliateWalletAmount] = useState(() => {
    // Try to get from props first, then localStorage
    if (passedAffiliateWalletAmount > 0) {
      return passedAffiliateWalletAmount;
    }
    const saved = localStorage.getItem('affiliateWalletAmount');
    return saved ? parseFloat(saved) : 0;
  });

  // Promo code states
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [hasPromoCode, setHasPromoCode] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(passedPromoDiscount); // Initialize with passed value

  // Affiliate discount state - load from localStorage
  const [affiliateDiscountAmount, setAffiliateDiscountAmount] = useState(() => {
    // Try to get from passed props first
    if (passedAffiliateDiscount > 0) {
      return passedAffiliateDiscount;
    }
    // Then try localStorage
    const savedAffiliateDiscount = localStorage.getItem('affiliateDiscount');
    if (savedAffiliateDiscount) {
      try {
        const affiliateData = JSON.parse(savedAffiliateDiscount);
        return affiliateData.discount || 0;
      } catch (error) {
        console.error('Error parsing affiliate discount:', error);
        return 0;
      }
    }
    return 0;
  });


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
    affiliateDiscount: passedAffiliateDiscount || 0,
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

    // Fetch saved addresses
    const fetchAddresses = async () => {
      try {
        const response = await fetch(`/api/delivery-addresses?userId=${user.id}`);
        if (response.ok) {
          const addresses = await response.json();
          setSavedAddresses(addresses);

          // Check if address was selected from delivery address page
          const selectedAddressFromStorage = localStorage.getItem('selectedDeliveryAddress');

          if (selectedAddressFromStorage) {
            try {
              const selectedAddr = JSON.parse(selectedAddressFromStorage);
              const addressInList = addresses.find((addr: any) => addr.id === selectedAddr.id);

              if (addressInList) {
                setSelectedAddressId(addressInList.id);
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
              setSelectedAddressId(defaultAddress.id);
              populateFormWithAddress(defaultAddress);
            } else if (addresses.length > 0) {
              setSelectedAddressId(addresses[0].id);
              populateFormWithAddress(addresses[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      }
    };

    fetchAddresses();

    // Check if this is a multi-address order
    const isMultiAddress = localStorage.getItem('isMultiAddressOrder');
    if (isMultiAddress === 'true') {
      console.log('✅ Multi-address order detected');
    }

    // Load affiliate discount from localStorage
    const savedAffiliateDiscount = localStorage.getItem('affiliateDiscount');
    let loadedAffiliateDiscountAmount = 0;
    let loadedAffiliateCodeValue = '';

    if (savedAffiliateDiscount) {
      try {
        const affiliateData = JSON.parse(savedAffiliateDiscount);
        loadedAffiliateDiscountAmount = affiliateData.discount;
        loadedAffiliateCodeValue = affiliateData.code;

        setFormData(prev => ({
          ...prev,
          affiliateCode: affiliateData.code,
          affiliateDiscount: affiliateData.discount,
        }));

        // Set the affiliate discount state
        setAffiliateDiscountAmount(affiliateData.discount);

        console.log('✅ Loaded affiliate discount from localStorage:', affiliateData);
      } catch (error) {
        console.error('Error loading affiliate discount:', error);
        localStorage.removeItem('affiliateDiscount');
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

      // Auto-fill form data if profile has information and not already loaded
      if (userData && !profileDataLoaded) {
        // Parse address to extract city, state, zipCode from profile
        let city = "";
        let state = "";
        let zipCode = "";
        let streetAddress = userData.address || "";

        // Try to extract city, state, zipCode from full address if they exist
        if (streetAddress) {
          const addressParts = streetAddress.split(',').map(part => part.trim());
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
        setFormData({
          email: userData.email || "",
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          address: streetAddress,
          city: city,
          state: state,
          zipCode: zipCode,
          phone: userData.phone || "",
          paymentMethod: "cashfree",
          deliveryInstructions: userData.deliveryInstructions || "",
          saturdayDelivery: userData.saturdayDelivery === true, // Ensure boolean conversion
          sundayDelivery: userData.sundayDelivery === true // Ensure boolean conversion
        });

        setProfileDataLoaded(true);

        // Show notification that data was auto-filled
        if (userData.firstName || userData.lastName || userData.email || userData.phone || userData.address) {
          toast({
            title: "Profile Data Loaded",
            description: "Your contact information and shipping address have been filled automatically.",
          });
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
  }, [profileDataLoaded]);

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
      const response = await fetch('/api/payments/cashfree/verify', {
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
          localStorage.removeItem("affiliateDiscount");
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
      const price = item.originalPrice
        ? parseInt(item.originalPrice.replace(/[₹,]/g, ""))
        : parseInt(item.price.replace(/[₹,]/g, ""));
      return total + (price * item.quantity);
    }, 0);
  };

  // Calculate product discounts
  const productDiscount = cartItems.reduce((total, item) => {
    if (item.originalPrice) {
      const original = parseInt(item.originalPrice.replace(/[₹,]/g, ""));
      const current = parseInt(item.price.replace(/[₹,]/g, ""));
      return total + ((original - current) * item.quantity);
    }
    return total;
  }, 0);

  const cartSubtotal = calculateSubtotal();
  const cartSubtotalAfterProductDiscount = cartSubtotal - productDiscount;

  // Use affiliate discount state variable
  const subtotalAfterAffiliate = cartSubtotalAfterProductDiscount - affiliateDiscountAmount;

  const subtotalAfterDiscount = subtotalAfterAffiliate - promoDiscount;

  // Free shipping only if no promo code, no affiliate discount, and subtotal > 599
  const shipping = (promoDiscount > 0 || affiliateDiscountAmount > 0)
    ? shippingCost
    : (subtotalAfterAffiliate > 599 ? 0 : shippingCost);

  // Calculate total before redemption (same as cart page)
  const totalBeforeRedemption = subtotalAfterDiscount + shipping;

  // Apply wallet deductions at the end (same as cart page)
  const total = Math.max(0, totalBeforeRedemption - walletAmount - affiliateWalletAmount);


  // Fetch affiliate settings to get commission rate
  const { data: affiliateSettings } = useQuery({
    queryKey: ['/api/affiliate-settings'],
    queryFn: async () => {
      const res = await fetch('/api/affiliate-settings');
      if (!res.ok) throw new Error('Failed to fetch affiliate settings');
      return res.json();
    },
  });

  const commissionRate = affiliateSettings?.commissionRate || 10;
  const affiliateCommission = formData.affiliateCode
    ? Math.round(total * (commissionRate / 100))
    : 0;

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
      let streetAddress = userProfile.address || "";

      const addressParts = streetAddress.split(',').map(part => part.trim());
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
        email: userProfile.email || "",
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        address: streetAddress,
        city: city,
        state: state,
        zipCode: zipCode,
        phone: userProfile.phone || "",
        paymentMethod: "cashfree",
        deliveryInstructions: userProfile.deliveryInstructions || "",
        saturdayDelivery: userProfile.saturdayDelivery === true, // Ensure boolean
        sundayDelivery: userProfile.sundayDelivery === true // Ensure boolean
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
    setFormData({
      ...formData,
      firstName: address.recipientName.split(' ')[0] || "",
      lastName: address.recipientName.split(' ').slice(1).join(' ') || "",
      phone: address.phoneNumber || "",
      address: address.addressLine1 || "",
      city: address.city || "",
      state: address.state || "",
      zipCode: address.pincode || "",
      saturdayDelivery: address.saturdayDelivery === true, // Populate weekend delivery info as boolean
      sundayDelivery: address.sundayDelivery === true, // Populate weekend delivery info as boolean
      deliveryInstructions: address.deliveryInstructions || "", // Populate delivery instructions
    });
  };

  const handleAddressSelection = (addressId: number) => {
    setSelectedAddressId(addressId);
    const selectedAddress = savedAddresses.find(addr => addr.id === addressId);
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
      const response = await fetch('/api/delivery-addresses', {
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
      const addressesResponse = await fetch(`/api/delivery-addresses?userId=${user.id}`);
      if (addressesResponse.ok) {
        const updatedAddresses = await addressesResponse.json();
        setSavedAddresses(updatedAddresses);

        // Select the newly added address
        setSelectedAddressId(savedAddress.id);
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
      const res = await fetch('/api/wallet/redeem', {
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
      setWalletAmount(prev => prev - redeemAmount);
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

      const response = await fetch('/api/payments/cashfree/create-order', {
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
            const cashfree = window.Cashfree({
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

    if (!formData.email || !formData.firstName || !formData.lastName || !formData.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
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
        paymentSuccessful = await processCashfreePayment();
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
          deliveryInstructions: item.deliveryInstructions || null,
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
          affiliateDiscount: affiliateDiscountAmount > 0 ? Math.round(affiliateDiscountAmount) : null,
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
            const redeemResponse = await fetch('/api/wallet/redeem', {
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
              description: redeemError.message || "Failed to redeem cashback. Please try again.",
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Use Profile Information
            </DialogTitle>
            <DialogDescription>
              Fill the checkout form with your profile information. You can edit any field after filling.
            </DialogDescription>
          </DialogHeader>

          {userProfile && (
            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg border border-red-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-red-700 mb-2">Contact Information</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><span className="font-medium">Name:</span> {userProfile.firstName} {userProfile.lastName}</p>
                      <p><span className="font-medium">Email:</span> {userProfile.email}</p>
                      {userProfile.phone && <p><span className="font-medium">Phone:</span> {userProfile.phone}</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-red-700 mb-2">Shipping Address</h4>
                    <div className="text-sm text-gray-700">
                      {userProfile.address ? (
                        <p>{userProfile.address}</p>
                      ) : (
                        <p className="text-gray-500 italic">No address saved in profile</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs">ℹ</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    After using profile data, you can edit any field directly in the form. Use "Clear Form" button to start fresh.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleUseProfileData}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Use This Information
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipProfileData}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/cart" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">


              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Select a delivery address
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* No Saved Addresses - Show Add New Address Button */}
                  {savedAddresses.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Add delivery address</h3>
                      <p className="text-sm text-gray-600 mb-6">Enter your address to see delivery options</p>
                      <Dialog open={showAddAddressDialog} onOpenChange={(open) => {
                        setShowAddAddressDialog(open);
                        if (open) {
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

                            <div>
                              <Label htmlFor="newLandmark">Landmark</Label>
                              <Input
                                id="newLandmark"
                                placeholder="E.g. near apollo hospital"
                                value={newAddressData.landmark}
                                onChange={(e) => setNewAddressData({...newAddressData, landmark: e.target.value})}
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

                  {/* Saved Addresses Section */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Delivery addresses ({savedAddresses.length})</h3>

                      {savedAddresses.map((address) => (
                        <div
                          key={address.id}
                          className={`border-2 rounded-lg p-3 transition-colors ${
                            selectedAddressId === address.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 cursor-pointer ${
                                selectedAddressId === address.id
                                  ? 'bg-blue-600'
                                  : 'border-2 border-gray-300'
                              }`}
                              onClick={() => setSelectedAddressId(address.id)}
                            >
                              {selectedAddressId === address.id && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">
                                {address.recipientName}
                              </p>
                              <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{address.addressLine1}</p>
                              {address.addressLine2 && (
                                <p className="text-xs text-gray-700 line-clamp-1">{address.addressLine2}</p>
                              )}
                              <p className="text-xs text-gray-700 mt-0.5">
                                {address.city}, {address.state}, {address.pincode}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">Phone: {address.phoneNumber}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Deliver to this address button */}
                      {selectedAddressId && (
                        <Button
                          type="button"
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                          onClick={() => {
                            const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
                            if (selectedAddress) {
                              populateFormWithAddress(selectedAddress);

                              // Clear multi-address mode data
                              localStorage.removeItem('isMultiAddressOrder');
                              localStorage.removeItem('multiAddressItems');
                              localStorage.removeItem('multiAddressMapping');
                              localStorage.removeItem('multipleAddressMode');

                              // Force a re-render by updating state
                              setSelectedAddressId(selectedAddress.id);

                              // Reload cart items to remove multi-address assignments
                              const savedCart = localStorage.getItem("cart");
                              if (savedCart) {
                                try {
                                  const parsedCart = JSON.parse(savedCart);
                                  setCartItems(parsedCart);
                                } catch (error) {
                                  console.error("Error parsing cart data:", error);
                                }
                              }

                              toast({
                                title: "Address Selected",
                                description: `All items will be delivered to ${selectedAddress.recipientName} in ${selectedAddress.city}`,
                              });
                            }
                          }}
                        >
                          Deliver to this address
                        </Button>
                      )}

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Store only item IDs and quantities to avoid localStorage quota
                            const minimalCartData = cartItems.map(item => ({
                              id: item.id,
                              quantity: item.quantity
                            }));
                            localStorage.setItem('multipleAddressMode', 'true');
                            localStorage.setItem('checkoutCartItems', JSON.stringify(minimalCartData));
                            setLocation('/select-delivery-address');
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm hover:underline block"
                        >
                          Deliver to multiple addresses
                        </button>

                        <Dialog open={showAddAddressDialog} onOpenChange={(open) => {
                          setShowAddAddressDialog(open);
                          // Reset form when opening dialog
                          if (open) {
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
                          }
                        }}>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-700 text-sm hover:underline block"
                            >
                              + Add a new delivery address
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

                              <div>
                                <Label htmlFor="newLandmark">Landmark</Label>
                                <Input
                                  id="newLandmark"
                                  placeholder="E.g. near apollo hospital"
                                  value={newAddressData.landmark}
                                  onChange={(e) => setNewAddressData({...newAddressData, landmark: e.target.value})}
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


                    </div>
                  )}

                  {/* Manual Address Entry (fallback) */}
                  {/* {(!userProfile || !userProfile.address) && (
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  )}
                  {(!userProfile || !userProfile.address) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <select
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          required
                        >
                          <option value="">Select City</option>
                          <option value="mumbai">Mumbai</option>
                          <option value="delhi">Delhi</option>
                          <option value="bangalore">Bangalore</option>
                          <option value="hyderabad">Hyderabad</option>
                          <option value="ahmedabad">Ahmedabad</option>
                          <option value="chennai">Chennai</option>
                          <option value="kolkata">Kolkata</option>
                          <option value="pune">Pune</option>
                          <option value="jaipur">Jaipur</option>
                          <option value="lucknow">Lucknow</option>
                          <option value="kanpur">Kanpur</option>
                          <option value="nagpur">Nagpur</option>
                          <option value="surat">Surat</option>
                          <option value="indore">Indore</option>
                          <option value="thane">Thane</option>
                          <option value="bhopal">Bhopal</option>
                          <option value="visakhapatnam">Visakhapatnam</option>
                          <option value="patna">Patna</option>
                          <option value="vadodara">Vadodara</option>
                          <option value="ghaziabad">Ghaziabad</option>
                          <option value="ludhiana">Ludhiana</option>
                          <option value="agra">Agra</option>
                          <option value="nashik">Nashik</option>
                          <option value="faridabad">Faridabad</option>
                          <option value="meerut">Meerut</option>
                          <option value="rajkot">Rajkot</option>
                          <option value="kalyan">Kalyan</option>
                          <option value="vasai">Vasai</option>
                          <option value="varanasi">Varanasi</option>
                          <option value="srinagar">Srinagar</option>
                          <option value="aurangabad">Aurangabad</option>
                          <option value="dhanbad">Dhanbad</option>
                          <option value="amritsar">Amritsar</option>
                          <option value="navi_mumbai">Navi Mumbai</option>
                          <option value="allahabad">Allahabad</option>
                          <option value="ranchi">Ranchi</option>
                          <option value="howrah">Howrah</option>
                          <option value="coimbatore">Coimbatore</option>
                          <option value="jabalpur">Jabalpur</option>
                          <option value="gwalior">Gwalior</option>
                          <option value="vijayawada">Vijayawada</option>
                          <option value="jodhpur">Jodhpur</option>
                          <option value="madurai">Madurai</option>
                          <option value="raipur">Raipur</option>
                          <option value="kota">Kota</option>
                          <option value="guwahati">Guwahati</option>
                          <option value="chandigarh">Chandigarh</option>
                          <option value="solapur">Solapur</option>
                          <option value="hubli">Hubli</option>
                          <option value="tiruchirappalli">Tiruchirappalli</option>
                          <option value="bareilly">Bareilly</option>
                          <option value="mysore">Mysore</option>
                          <option value="tiruppur">Tiruppur</option>
                          <option value="gurgaon">Gurgaon</option>
                          <option value="aligarh">Aligarh</option>
                          <option value="jalandhar">Jalandhar</option>
                          <option value="bhubaneswar">Bhubaneswar</option>
                          <option value="salem">Salem</option>
                          <option value="warangal">Warangal</option>
                          <option value="mira_bhayandar">Mira Bhayandar</option>
                          <option value="thiruvananthapuram">Thiruvananthapuram</option>
                          <option value="bhiwandi">Bhiwandi</option>
                          <option value="saharanpur">Saharanpur</option>
                          <option value="guntur">Guntur</option>
                          <option value="amravati">Amravati</option>
                          <option value="bikaner">Bikaner</option>
                          <option value="noida">Noida</option>
                          <option value="jamshedpur">Jamshedpur</option>
                          <option value="bhilai_nagar">Bhilai Nagar</option>
                          <option value="cuttack">Cuttack</option>
                          <option value="firozabad">Firozabad</option>
                          <option value="kochi">Kochi</option>
                          <option value="nellore">Nellore</option>
                          <option value="bhavnagar">Bhavnagar</option>
                          <option value="dehradun">Dehradun</option>
                          <option value="durgapur">Durgapur</option>
                          <option value="asansol">Asansol</option>
                          <option value="rourkela">Rourkela</option>
                          <option value="nanded">Nanded</option>
                          <option value="kolhapur">Kolhapur</option>
                          <option value="ajmer">Ajmer</option>
                          <option value="akola">Akola</option>
                          <option value="gulbarga">Gulbarga</option>
                          <option value="jamnagar">Jamnagar</option>
                          <option value="ujjain">Ujjain</option>
                          <option value="loni">Loni</option>
                          <option value="siliguri">Siliguri</option>
                          <option value="jhansi">Jhansi</option>
                          <option value="ulhasnagar">Ulhasnagar</option>
                          <option value="jammu">Jammu</option>
                          <option value="sangli_miraj_kupwad">Sangli Miraj Kupwad</option>
                          <option value="mangalore">Mangalore</option>
                          <option value="erode">Erode</option>
                          <option value="belgaum">Belgaum</option>
                          <option value="ambattur">Ambattur</option>
                          <option value="tirunelveli">Tirunelveli</option>
                          <option value="malegaon">Malegaon</option>
                          <option value="gaya">Gaya</option>
                          <option value="jalgaon">Jalgaon</option>
                          <option value="udaipur">Udaipur</option>
                          <option value="maheshtala">Maheshtala</option>
                          <option value="davanagere">Davanagere</option>
                          <option value="kozhikode">Kozhikode</option>
                          <option value="kurnool">Kurnool</option>
                          <option value="rajpur_sonarpur">Rajpur Sonarpur</option>
                          <option value="rajahmundry">Rajahmundry</option>
                          <option value="bokaro_steel_city">Bokaro Steel City</option>
                          <option value="south_dumdum">South Dumdum</option>
                          <option value="bellary">Bellary</option>
                          <option value="patiala">Patiala</option>
                          <option value="gopalpur">Gopalpur</option>
                          <option value="agartala">Agartala</option>
                          <option value="bhagalpur">Bhagalpur</option>
                          <option value="muzaffarnagar">Muzaffarnagar</option>
                          <option value="bhatpara">Bhatpara</option>
                          <option value="latur">Latur</option>
                          <option value="dhule">Dhule</option>
                          <option value="rohtak">Rohtak</option>
                          <option value="korba">Korba</option>
                          <option value="bhilwara">Bhilwara</option>
                          <option value="berhampur">Berhampur</option>
                          <option value="muzaffarpur">Muzaffarpur</option>
                          <option value="ahmednagar">Ahmednagar</option>
                          <option value="mathura">Mathura</option>
                          <option value="kollam">Kollam</option>
                          <option value="avadi">Avadi</option>
                          <option value="kadapa">Kadapa</option>
                          <option value="kamarhati">Kamarhati</option>
                          <option value="sambalpur">Sambalpur</option>
                          <option value="bilaspur">Bilaspur</option>
                          <option value="shahjahanpur">Shahjahanpur</option>
                          <option value="satara">Satara</option>
                          <option value="bijapur">Bijapur</option>
                          <option value="rampur">Rampur</option>
                          <option value="shivamogga">Shivamogga</option>
                          <option value="chandrapur">Chandrapur</option>
                          <option value="junagadh">Junagadh</option>
                          <option value="thrissur">Thrissur</option>
                          <option value="alwar">Alwar</option>
                          <option value="bardhaman">Bardhaman</option>
                          <option value="kulti">Kulti</option>
                          <option value="kakinada">Kakinada</option>
                          <option value="nizamabad">Nizamabad</option>
                          <option value="parbhani">Parbhani</option>
                          <option value="tumkur">Tumkur</option>
                          <option value="khammam">Khammam</option>
                          <option value="ozhukarai">Ozhukarai</option>
                          <option value="bihar_sharif">Bihar Sharif</option>
                          <option value="panipat">Panipat</option>
                          <option value="darbhanga">Darbhanga</option>
                          <option value="bally">Bally</option>
                          <option value="aizawl">Aizawl</option>
                          <option value="dewas">Dewas</option>
                          <option value="ichalkaranji">Ichalkaranji</option>
                          <option value="karnal">Karnal</option>
                          <option value="bathinda">Bathinda</option>
                          <option value="jalna">Jalna</option>
                          <option value="eluru">Eluru</option>
                          <option value="kirari_suleman_nagar">Kirari Suleman Nagar</option>
                          <option value="barasat">Barasat</option>
                          <option value="purnia">Purnia</option>
                          <option value="satna">Satna</option>
                          <option value="mau">Mau</option>
                          <option value="sonipat">Sonipat</option>
                          <option value="farrukhabad">Farrukhabad</option>
                          <option value="sagar">Sagar</option>
                          <option value="durg">Durg</option>
                          <option value="imphal">Imphal</option>
                          <option value="ratlam">Ratlam</option>
                          <option value="hapur">Hapur</option>
                          <option value="arrah">Arrah</option>
                          <option value="karimnagar">Karimnagar</option>
                          <option value="anantapur">Anantapur</option>
                          <option value="etawah">Etawah</option>
                          <option value="ambernath">Ambernath</option>
                          <option value="north_dumdum">North Dumdum</option>
                          <option value="bharatpur">Bharatpur</option>
                          <option value="begusarai">Begusarai</option>
                          <option value="new_delhi">New Delhi</option>
                          <option value="gandhidham">Gandhidham</option>
                          <option value="baranagar">Baranagar</option>
                          <option value="tiruvottiyur">Tiruvottiyur</option>
                          <option value="puducherry">Pondicherry</option>
                          <option value="sikar">Sikar</option>
                          <option value="thoothukudi">Thoothukudi</option>
                          <option value="rewa">Rewa</option>
                          <option value="mirzapur">Mirzapur</option>
                          <option value="raichur">Raichur</option>
                          <option value="pali">Pali</option>
                          <option value="ramagundam">Ramagundam</option>
                          <option value="haridwar">Haridwar</option>
                          <option value="vijayanagaram">Vijayanagaram</option>
                          <option value="katihar">Katihar</option>
                          <option value="kharagpur">Kharagpur</option>
                          <option value="dindigul">Dindigul</option>
                          <option value="gandhinagar">Gandhinagar</option>
                          <option value="hospet">Hospet</option>
                          <option value="nangloi_jat">Nangloi Jat</option>
                          <option value="malda">Malda</option>
                          <option value="ongole">Ongole</option>
                          <option value="deoghar">Deoghar</option>
                          <option value="chapra">Chapra</option>
                          <option value="haldia">Haldia</option>
                          <option value="khandwa">Khandwa</option>
                          <option value="nandyal">Nandyal</option>
                          <option value="chittoor">Chittoor</option>
                          <option value="morbi">Morbi</option>
                          <option value="amroha">Amroha</option>
                          <option value="anand">Anand</option>
                          <option value="bhusawal">Bhusawal</option>
                          <option value="orai">Orai</option>
                          <option value="bahraich">Bahraich</option>
                          <option value="vellore">Vellore</option>
                          <option value="mahesana">Mahesana</option>
                          <option value="sambalpur">Sambalpur</option>
                          <option value="raiganj">Raiganj</option>
                          <option value="sirsa">Sirsa</option>
                          <option value="danapur">Danapur</option>
                          <option value="serampore">Serampore</option>
                          <option value="sultan_pur_majra">Sultan Pur Majra</option>
                          <option value="guna">Guna</option>
                          <option value="jaunpur">Jaunpur</option>
                          <option value="panvel">Panvel</option>
                          <option value="shillong">Shillong</option>
                          <option value="tenali">Tenali</option>
                          <option value="khora">Khora</option>
                          <option value="guntakal">Guntakal</option>
                          <option value="puri">Puri</option>
                          <option value="compiegne">Compiegne</option>
                          <option value="kishanganj">Kishanganj</option>
                          <option value="supaul">Supaul</option>
                          <option value="godda">Godda</option>
                          <option value="hazaribagh">Hazaribagh</option>
                          <option value="pakur">Pakur</option>
                          <option value="paschim_bardhaman">Paschim Bardhaman</option>
                          <option value="dharwad">Dharwad</option>
                          <option value="medininagar">Medininagar</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {(!userProfile || !userProfile.address) && (
                    <div>
                      <Label htmlFor="zipCode">PIN Code *</Label>
                      <select
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                        disabled={!formData.city}
                      >
                        <option value="">
                          {formData.city ? "Select PIN Code" : "Select city first"}
                        </option>
                        {getAvailablePincodes().map((pincode) => (
                          <option key={pincode} value={pincode}>
                            {pincode}
                          </option>
                        ))}
                      </select>
                      {!formData.city && (
                        <p className="text-xs text-gray-500 mt-1">Please select a city to see available PIN codes</p>
                      )}
                    </div>
                  )} */}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                    className="space-y-3"
                  >

                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="cashfree" id="cashfree" />
                      <Label htmlFor="cashfree" className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Online Payment</p>
                            <p className="text-sm text-gray-500">Pay with UPI, Cards, Net Banking & Wallets</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">CF</span>
                            </div>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Secure</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Cash on Delivery</p>
                            <p className="text-sm text-gray-500">Pay when you receive your order right away</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-lg">₹</span>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">No fees</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

            </div>

            <div className="space-y-6">


              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Show selected delivery address at top of order summary - only for single address mode */}
                    {selectedAddressId && savedAddresses.length > 0 && !localStorage.getItem('isMultiAddressOrder') && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Delivering to:</p>
                            {(() => {
                              const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
                              if (selectedAddress) {
                                return (
                                  <>
                                    <p className="text-sm font-medium text-gray-900">{selectedAddress.recipientName}</p>
                                    <p className="text-xs text-gray-700 mt-0.5">{selectedAddress.addressLine1}</p>
                                    {selectedAddress.addressLine2 && (
                                      <p className="text-xs text-gray-700">{selectedAddress.addressLine2}</p>
                                    )}
                                    <p className="text-xs text-gray-700">
                                      {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}, India
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">Phone: {selectedAddress.phoneNumber}</p>
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {cartItems.map((item) => {
                      // Get delivery addresses for this item from multi-address mapping
                      const multiAddressMapping = localStorage.getItem('multiAddressMapping');
                      let deliveryAddresses: any[] = [];
                      let hasInstanceMapping = false;

                      if (multiAddressMapping && savedAddresses.length > 0) {
                        try {
                          const mapping = JSON.parse(multiAddressMapping);

                          // Check if there are instance-based mappings (e.g., "123-0", "123-1")
                          const instanceKeys = Object.keys(mapping).filter(key => key.startsWith(`${item.id}-`));

                          if (instanceKeys.length > 0) {
                            // Item has individual addresses for each quantity
                            hasInstanceMapping = true;
                            deliveryAddresses = instanceKeys.map((key, index) => {
                              const addressId = mapping[key];
                              const address = savedAddresses.find(addr => addr.id === addressId);
                              return address ? {
                                instanceNumber: index + 1,
                                id: address.id,
                                recipientName: address.recipientName,
                                addressLine1: address.addressLine1,
                                addressLine2: address.addressLine2 || '',
                                city: address.city,
                                state: address.state,
                                pincode: address.pincode,
                                phone: address.phoneNumber,
                              } : null;
                            }).filter(Boolean);
                          } else {
                            // Single address for all quantities
                            const addressId = mapping[item.id];
                            if (addressId) {
                              const address = savedAddresses.find(addr => addr.id === addressId);
                              if (address) {
                                deliveryAddresses = [{
                                  instanceNumber: null,
                                  id: address.id,
                                  recipientName: address.recipientName,
                                  addressLine1: address.addressLine1,
                                  addressLine2: address.addressLine2 || '',
                                  city: address.city,
                                  state: address.state,
                                  pincode: address.pincode,
                                  phone: address.phoneNumber,
                                }];
                              }
                            }
                          }
                        } catch (error) {
                          console.error('Error parsing multi-address mapping:', error);
                        }
                      }

                      return (
                        <div key={item.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-center space-x-4">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-16 w-16 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                              {item.selectedShade && (
                                <Badge variant="secondary" className="mt-1 flex items-center gap-1.5 w-fit">
                                  {item.selectedShade.imageUrl ? (
                                    <img
                                      src={item.selectedShade.imageUrl}
                                      alt={item.selectedShade.name}
                                      className="w-3 h-3 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="w-3 h-3 rounded-full border"
                                      style={{ backgroundColor: item.selectedShade.colorCode }}
                                    />
                                  )}
                                  <span className="text-xs">{item.selectedShade.name}</span>
                                </Badge>
                              )}
                              <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>

                              {/* Show delivery addresses for multi-address orders */}
                              {deliveryAddresses.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {hasInstanceMapping && deliveryAddresses.length > 1 ? (
                                    // Multiple instances with different addresses
                                    deliveryAddresses.map((deliveryAddress, idx) => (
                                      <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                                        <div className="flex items-start gap-1.5">
                                          <MapPin className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-blue-900 mb-0.5">
                                              Item {deliveryAddress.instanceNumber}: {deliveryAddress.recipientName}
                                            </p>
                                            <p className="text-xs text-gray-700 leading-relaxed">
                                              {deliveryAddress.addressLine1}
                                              {deliveryAddress.addressLine2 && `, ${deliveryAddress.addressLine2}`}
                                            </p>
                                            <p className="text-xs text-gray-700">
                                              {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-0.5">
                                              Phone: {deliveryAddress.phone}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    // Single address for all quantities
                                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                                      <div className="flex items-start gap-1.5">
                                        <MapPin className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-blue-900 mb-0.5">
                                            {deliveryAddresses[0].recipientName}
                                          </p>
                                          <p className="text-xs text-gray-700 leading-relaxed">
                                            {deliveryAddresses[0].addressLine1}
                                            {deliveryAddresses[0].addressLine2 && `, ${deliveryAddresses[0].addressLine2}`}
                                          </p>
                                          <p className="text-xs text-gray-700">
                                            {deliveryAddresses[0].city}, {deliveryAddresses[0].state} - {deliveryAddresses[0].pincode}
                                          </p>
                                          <p className="text-xs text-gray-600 mt-0.5">
                                            Phone: {deliveryAddresses[0].phone}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {item.cashbackPrice && item.cashbackPercentage && (
                                <div className="mt-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-md p-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-orange-700">Cashback</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-orange-600">
                                        ₹{(Number(item.cashbackPrice) * item.quantity).toFixed(2)}
                                      </span>
                                      <span className="bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full text-xs">
                                        {item.cashbackPercentage}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-200 mt-6 pt-6 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                      <span>₹{cartSubtotal.toLocaleString()}</span>
                    </div>

                    {productDiscount > 0 && (
                      <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                        <span className="text-green-700 font-medium">Product Discount</span>
                        <span className="font-bold text-green-600">-₹{productDiscount.toLocaleString()}</span>
                      </div>
                    )}

                    {affiliateDiscountAmount > 0 && formData.affiliateCode && (
                      <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                        <span className="text-green-700 font-medium">Affiliate Discount ({formData.affiliateCode})</span>
                        <span className="font-bold text-green-600">-₹{Math.round(affiliateDiscountAmount).toLocaleString()}</span>
                      </div>
                    )}

                    {promoDiscount > 0 && appliedPromo && (
                      <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                        <span className="text-green-700 font-medium">Promo Code ({appliedPromo.code})</span>
                        <span className="font-bold text-green-600">-₹{promoDiscount.toLocaleString()}</span>
                      </div>
                    )}

                    {walletAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Cashback Wallet</span>
                        <span className="text-green-600 font-semibold">-₹{walletAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {affiliateWalletAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-600">Affiliate Wallet</span>
                        <span className="text-purple-600 font-semibold">-₹{affiliateWalletAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                    </div>

                    {shipping === 0 && (
                      <div className="text-xs text-green-600 bg-green-50 p-2 rounded font-medium">
                        ✓ Free shipping applied
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>

                    {(productDiscount > 0 || affiliateDiscountAmount > 0 || promoDiscount > 0 || walletAmount > 0 || affiliateWalletAmount > 0) && (
                      <div className="text-xs text-green-600 text-right mt-1">
                        You saved ₹{(productDiscount + affiliateDiscountAmount + promoDiscount + walletAmount + affiliateWalletAmount).toLocaleString()}!
                      </div>
                    )}

                    {affiliateCommission > 0 && (
                      <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                              <Award className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-base font-bold text-purple-800">Affiliate Earns!</span>
                          </div>
                          <span className="text-2xl font-bold text-purple-600">
                            ₹{affiliateCommission.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-purple-700 font-medium">
                          {commissionRate}% commission on payable amount will be credited to affiliate wallet
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-6 bg-red-600 hover:bg-red-700"
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Place Order - ₹{total.toLocaleString()}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 mt-4 text-center">
                    By placing your order, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}