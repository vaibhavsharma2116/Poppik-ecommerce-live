import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CreditCard, MapPin, User, Package, CheckCircle, Gift, Award, ChevronDown, Tag, Check, Plus, Home, Building2, Phone, Mail } from "lucide-react";
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

// City to State and Pincode mapping
const cityLocationMap: Record<string, { state: string; pincodes: string[] }> = {
  mumbai: { state: "maharashtra", pincodes: ["400001", "400002", "400003", "400004", "400005", "400006", "400007", "400008", "400009", "400010"] },
  delhi: { state: "delhi", pincodes: ["110001", "110002", "110003", "110004", "110005", "110006", "110007", "110008", "110009", "110010"] },
  bangalore: { state: "karnataka", pincodes: ["560001", "560002", "560003", "560004", "560005", "560006", "560007", "560008", "560009", "560010"] },
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [shippingCost, setShippingCost] = useState<number>(99);
  const [loadingShipping, setLoadingShipping] = useState(false);

  const [redeemAmount, setRedeemAmount] = useState(() => {
    const saved = localStorage.getItem('redeemAmount');
    return saved ? parseFloat(saved) : 0;
  });

  const [walletAmount, setWalletAmount] = useState(() => {
    if (passedWalletAmount > 0) return passedWalletAmount;
    const saved = localStorage.getItem('redeemAmount');
    return saved ? parseFloat(saved) : 0;
  });

  const [affiliateWalletAmount, setAffiliateWalletAmount] = useState(() => {
    if (passedAffiliateWalletAmount > 0) return passedAffiliateWalletAmount;
    const saved = localStorage.getItem('affiliateWalletAmount');
    return saved ? parseFloat(saved) : 0;
  });

  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [hasPromoCode, setHasPromoCode] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(passedPromoDiscount);

  const [affiliateDiscountAmount, setAffiliateDiscountAmount] = useState(() => {
    if (passedAffiliateDiscount > 0) return passedAffiliateDiscount;
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
    deliveryInstructions: "",
    saturdayDelivery: false,
    sundayDelivery: false
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
    deliveryInstructions: '',
    saturdayDelivery: false,
    sundayDelivery: false,
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

  useEffect(() => {
    setRedeemAmount(walletAmount);
  }, [walletAmount]);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to proceed with checkout",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
    }

    const fetchAddresses = async () => {
      try {
        const response = await fetch(`/api/delivery-addresses?userId=${user.id}`);
        if (response.ok) {
          const addresses = await response.json();
          setSavedAddresses(addresses);

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

              localStorage.removeItem('selectedDeliveryAddress');
            } catch (error) {
              console.error('Error parsing selected address:', error);
            }
          } else {
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
  }, []);

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
            }
          } else {
            setShippingCost(99);
          }
        } catch (error) {
          console.error("Error fetching shipping cost:", error);
          setShippingCost(99);
        } finally {
          setLoadingShipping(false);
        }
      } else {
        setShippingCost(99);
      }
    };

    fetchShippingCost();
  }, [formData.zipCode, formData.paymentMethod, cartItems]);

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.originalPrice
        ? parseInt(item.originalPrice.replace(/[₹,]/g, ""))
        : parseInt(item.price.replace(/[₹,]/g, ""));
      return total + (price * item.quantity);
    }, 0);
  };

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
  const subtotalAfterAffiliate = cartSubtotalAfterProductDiscount - affiliateDiscountAmount;
  const subtotalAfterDiscount = subtotalAfterAffiliate - promoDiscount;
  const shipping = (promoDiscount > 0 || affiliateDiscountAmount > 0)
    ? shippingCost
    : (subtotalAfterAffiliate > 599 ? 0 : shippingCost);
  const totalBeforeRedemption = subtotalAfterDiscount + shipping;
  const total = Math.max(0, totalBeforeRedemption - walletAmount - affiliateWalletAmount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'city' && value) {
      const cityKey = value.toLowerCase().trim();
      const locationData = cityLocationMap[cityKey];

      if (locationData) {
        setFormData(prev => ({
          ...prev,
          city: value,
          state: locationData.state,
          zipCode: ""
        }));
      }
    }
  };

  const getAvailablePincodes = () => {
    if (!formData.city) return [];
    const cityKey = formData.city.toLowerCase().trim();
    const locationData = cityLocationMap[cityKey];
    return locationData?.pincodes || [];
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
      saturdayDelivery: address.saturdayDelivery === true,
      sundayDelivery: address.sundayDelivery === true,
      deliveryInstructions: address.deliveryInstructions || "",
    });
  };

  const handleAddressSelection = (addressId: number) => {
    setSelectedAddressId(addressId);
    const selectedAddress = savedAddresses.find(addr => addr.id === addressId);
    if (selectedAddress) {
      populateFormWithAddress(selectedAddress);
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
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );

          if (!response.ok) throw new Error('Failed to fetch location data');

          const data = await response.json();
          const address = data.address;

          const city = address.city || address.town || address.village || address.suburb || '';
          const state = address.state || '';
          const pincode = address.postcode || '';
          const area = address.road || address.neighbourhood || '';
          const landmark = address.amenity || '';

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
        toast({
          title: "Location Error",
          description: "Could not access your location",
          variant: "destructive",
        });
      }
    );
  };

  const handleNewAddressSubmit = async () => {
    if (!newAddressData.fullName || !newAddressData.mobile || !newAddressData.pincode ||
        !newAddressData.flat || !newAddressData.area || !newAddressData.town || !newAddressData.state) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

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

    if (!/^\d{6}$/.test(newAddressData.pincode)) {
      toast({
        title: "Invalid Pincode",
        description: "Please enter a valid 6-digit PIN code",
        variant: "destructive",
      });
      return;
    }

    const fullAddress = `${newAddressData.flat}, ${newAddressData.area}${newAddressData.landmark ? ', ' + newAddressData.landmark : ''}`;
    const [firstName, ...lastNameParts] = newAddressData.fullName.trim().split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    try {
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
          deliveryInstructions: newAddressData.deliveryInstructions,
          isDefault: newAddressData.makeDefault,
          saturdayDelivery: newAddressData.saturdayDelivery,
          sundayDelivery: newAddressData.sundayDelivery,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save address');
      }

      const savedAddress = await response.json();

      const addressesResponse = await fetch(`/api/delivery-addresses?userId=${user.id}`);
      if (addressesResponse.ok) {
        const updatedAddresses = await addressesResponse.json();
        setSavedAddresses(updatedAddresses);
        setSelectedAddressId(savedAddress.id);
        populateFormWithAddress(savedAddress);
      }

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

    if (appliedPromo && formData.affiliateCode) {
      toast({
        title: "Cannot Apply Both Discounts",
        description: "Please choose either a promo code or an affiliate code, not both. Remove one discount to proceed.",
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

            shippingAddressData = "Multiple Delivery Addresses - See individual items";
          } catch (error) {
            console.error('Error parsing multi-address mapping:', error);
          }
        }

        const orderData = {
          userId: user.id,
          totalAmount: Math.round(total),
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
          deliveryInstructions: formData.deliveryInstructions,
          saturdayDelivery: formData.saturdayDelivery,
          sundayDelivery: formData.sundayDelivery,
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center shadow-2xl border-2 border-green-200">
          <CardContent className="pt-8 pb-6 space-y-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Order Confirmed!</h2>
            <p className="text-gray-600 text-lg">
              Thank you for your purchase. Your order <span className="font-semibold text-red-600">{orderId}</span> has been confirmed.
            </p>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Estimated delivery</p>
              <p className="font-bold text-xl text-gray-900">3-5 business days</p>
            </div>
            <div className="space-y-3 pt-4">
              <Link href={`/track-order?orderId=${orderId}`}>
                <Button className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-6 text-lg shadow-lg">
                  Track Your Order
                </Button>
              </Link>
              <Link href="/order-history">
                <Button variant="outline" className="w-full border-2 border-gray-300 hover:bg-gray-50 py-6">
                  View All Orders
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-6">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <Package className="mx-auto h-32 w-32 text-gray-300 mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8 text-lg">Add some items to your cart before checking out.</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-lg shadow-lg">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <Link href="/cart" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4 font-medium transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Cart
          </Link>
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Secure Checkout</h1>
        </div>

        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold transition-all shadow-lg ${
                currentStep >= 1
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white scale-110'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 1 ? <Check className="h-5 w-5 sm:h-6 sm:w-6" /> : '1'}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-2 text-gray-700">Delivery</p>
            </div>

            <div className={`h-1 flex-1 mx-2 transition-all ${
              currentStep >= 2 ? 'bg-gradient-to-r from-red-600 to-pink-600' : 'bg-gray-200'
            }`} />

            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold transition-all shadow-lg ${
                currentStep >= 2
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white scale-110'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 2 ? <Check className="h-5 w-5 sm:h-6 sm:w-6" /> : '2'}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-2 text-gray-700">Payment</p>
            </div>

            <div className={`h-1 flex-1 mx-2 transition-all ${
              currentStep >= 3 ? 'bg-gradient-to-r from-red-600 to-pink-600' : 'bg-gray-200'
            }`} />

            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold transition-all shadow-lg ${
                currentStep >= 3
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white scale-110'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 3 ? <Check className="h-5 w-5 sm:h-6 sm:w-6" /> : '3'}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-2 text-gray-700">Review</p>
            </div>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <Card className="shadow-xl border-2 border-gray-100 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b-2 border-gray-100">
                      <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-gray-900">
                        <MapPin className="h-6 w-6 sm:h-7 sm:w-7 mr-3 text-red-600" />
                        Select Delivery Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 sm:p-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 shadow-sm">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-900 mb-2">Save time. Autofill your current location.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-300 text-blue-700 hover:bg-blue-100 font-medium"
                              type="button"
                              onClick={handleAutofillLocation}
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              Use My Location
                            </Button>
                          </div>
                        </div>
                      </div>

                      {savedAddresses.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-bold text-lg text-gray-900 flex items-center">
                            <Home className="h-5 w-5 mr-2 text-gray-600" />
                            Your Saved Addresses ({savedAddresses.length})
                          </h3>

                          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {savedAddresses.map((address) => (
                              <div
                                key={address.id}
                                className={`border-2 rounded-xl p-4 transition-all cursor-pointer hover:shadow-lg ${
                                  selectedAddressId === address.id
                                    ? 'border-red-500 bg-gradient-to-r from-red-50 to-pink-50 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                                onClick={() => handleAddressSelection(address.id)}
                              >
                                <div className="flex items-start space-x-3">
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                                      selectedAddressId === address.id
                                        ? 'bg-red-600 shadow-lg'
                                        : 'border-2 border-gray-300'
                                    }`}
                                  >
                                    {selectedAddressId === address.id && (
                                      <Check className="h-3 w-3 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className="font-bold text-gray-900">{address.recipientName}</p>
                                      {address.isDefault && (
                                        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs">
                                          Default
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700 mb-1">{address.addressLine1}</p>
                                    {address.addressLine2 && (
                                      <p className="text-sm text-gray-700 mb-1">{address.addressLine2}</p>
                                    )}
                                    <p className="text-sm text-gray-700 mb-2">
                                      {address.city}, {address.state} - {address.pincode}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Phone className="h-4 w-4" />
                                      <span>{address.phoneNumber}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {selectedAddressId && (
                            <Button
                              type="button"
                              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-6 text-lg shadow-lg"
                              onClick={() => setCurrentStep(2)}
                            >
                              Deliver to this address
                            </Button>
                          )}

                          <div className="space-y-2 pt-4 border-t-2 border-gray-100">
                            <Dialog open={showAddAddressDialog} onOpenChange={setShowAddAddressDialog}>
                              <DialogTrigger asChild>
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-semibold py-3 px-4 rounded-lg hover:bg-blue-50 transition-colors border-2 border-dashed border-blue-300"
                                >
                                  <Plus className="h-5 w-5" />
                                  Add a new delivery address
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-bold">Enter a new delivery address</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="newFullName" className="font-semibold">Full name (First and Last name) *</Label>
                                    <Input
                                      id="newFullName"
                                      value={newAddressData.fullName}
                                      onChange={(e) => setNewAddressData({...newAddressData, fullName: e.target.value})}
                                      required
                                      className="mt-1"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="newMobile" className="font-semibold">Mobile number *</Label>
                                    <Input
                                      id="newMobile"
                                      placeholder="10-digit mobile number"
                                      value={newAddressData.mobile}
                                      onChange={(e) => setNewAddressData({...newAddressData, mobile: e.target.value})}
                                      maxLength={10}
                                      required
                                      className="mt-1"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="newPincode" className="font-semibold">Pincode *</Label>
                                    <Input
                                      id="newPincode"
                                      placeholder="6 digits [0-9] PIN code"
                                      value={newAddressData.pincode}
                                      onChange={(e) => setNewAddressData({...newAddressData, pincode: e.target.value})}
                                      maxLength={6}
                                      required
                                      className="mt-1"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="newFlat" className="font-semibold">Flat, House no., Building, Company, Apartment *</Label>
                                    <Input
                                      id="newFlat"
                                      value={newAddressData.flat}
                                      onChange={(e) => setNewAddressData({...newAddressData, flat: e.target.value})}
                                      required
                                      className="mt-1"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="newArea" className="font-semibold">Area, Street, Sector, Village *</Label>
                                    <Input
                                      id="newArea"
                                      value={newAddressData.area}
                                      onChange={(e) => setNewAddressData({...newAddressData, area: e.target.value})}
                                      required
                                      className="mt-1"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="newTown" className="font-semibold">Town/City *</Label>
                                      <Input
                                        id="newTown"
                                        value={newAddressData.town}
                                        onChange={(e) => setNewAddressData({...newAddressData, town: e.target.value})}
                                        required
                                        className="mt-1"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="newState" className="font-semibold">State *</Label>
                                      <select
                                        id="newState"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                                        value={newAddressData.state}
                                        onChange={(e) => setNewAddressData({...newAddressData, state: e.target.value})}
                                      >
                                        <option value="">Select State</option>
                                        <option value="maharashtra">Maharashtra</option>
                                        <option value="delhi">Delhi</option>
                                        <option value="karnataka">Karnataka</option>
                                        <option value="tamil_nadu">Tamil Nadu</option>
                                        <option value="gujarat">Gujarat</option>
                                        <option value="uttar_pradesh">Uttar Pradesh</option>
                                        <option value="west_bengal">West Bengal</option>
                                        <option value="rajasthan">Rajasthan</option>
                                        <option value="andhra_pradesh">Andhra Pradesh</option>
                                        <option value="kerala">Kerala</option>
                                        <option value="punjab">Punjab</option>
                                        <option value="haryana">Haryana</option>
                                        <option value="madhya_pradesh">Madhya Pradesh</option>
                                        <option value="bihar">Bihar</option>
                                        <option value="telangana">Telangana</option>
                                        <option value="odisha">Odisha</option>
                                        <option value="assam">Assam</option>
                                        <option value="jharkhand">Jharkhand</option>
                                        <option value="chhattisgarh">Chhattisgarh</option>
                                        <option value="uttarakhand">Uttarakhand</option>
                                        <option value="himachal_pradesh">Himachal Pradesh</option>
                                        <option value="jammu_and_kashmir">Jammu and Kashmir</option>
                                        <option value="puducherry">Puducherry</option>
                                        <option value="tripura">Tripura</option>
                                        <option value="meghalaya">Meghalaya</option>
                                        <option value="manipur">Manipur</option>
                                        <option value="nagaland">Nagaland</option>
                                        <option value="mizoram">Mizoram</option>
                                        <option value="sikkim">Sikkim</option>
                                        <option value="goa">Goa</option>
                                        <option value="arunachal_pradesh">Arunachal Pradesh</option>
                                      </select>
                                    </div>
                                  </div>

                                  <Button
                                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-6"
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

                      {savedAddresses.length === 0 && (
                        <div className="text-center py-8">
                          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600 mb-6">No delivery addresses saved yet. Add a new address to proceed.</p>
                          <Dialog open={showAddAddressDialog} onOpenChange={setShowAddAddressDialog}>
                            <DialogTrigger asChild>
                              <Button className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold px-8 py-6">
                                <Plus className="h-5 w-5 mr-2" />
                                Add New Address
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <Card className="shadow-xl border-2 border-gray-100">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-gray-100">
                      <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                        <CreditCard className="h-6 w-6 sm:h-7 sm:w-7 mr-3 text-purple-600" />
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <RadioGroup
                        value={formData.paymentMethod}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                        className="space-y-4"
                      >
                        <div className="flex items-center space-x-3 p-5 border-2 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all cursor-pointer border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-md">
                          <RadioGroupItem value="cashfree" id="cashfree" className="h-5 w-5" />
                          <Label htmlFor="cashfree" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-lg">Online Payment</p>
                                <p className="text-sm text-gray-600">Pay with UPI, Cards, Net Banking & Wallets</p>
                              </div>
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                Secure
                              </Badge>
                            </div>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-3 p-5 border-2 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all cursor-pointer border-gray-200 hover:border-green-300 shadow-sm hover:shadow-md">
                          <RadioGroupItem value="cod" id="cod" className="h-5 w-5" />
                          <Label htmlFor="cod" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-lg">Cash on Delivery</p>
                                <p className="text-sm text-gray-600">Pay when you receive your order</p>
                              </div>
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                                No fees
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 py-6 border-2 font-semibold"
                    >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 py-6 font-bold shadow-lg"
                    >
                      Review Order
                      <ChevronDown className="h-5 w-5 ml-2 rotate-90" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <Card className="shadow-xl border-2 border-gray-100">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-gray-100">
                      <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                        <Package className="h-6 w-6 sm:h-7 sm:w-7 mr-3 text-green-600" />
                        Review Your Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-4 sm:p-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center">
                          <MapPin className="h-5 w-5 mr-2" />
                          Delivery Address
                        </h4>
                        {selectedAddressId && savedAddresses.find(addr => addr.id === selectedAddressId) && (
                          <div className="text-sm text-gray-700 space-y-1">
                            <p className="font-semibold">{savedAddresses.find(addr => addr.id === selectedAddressId)?.recipientName}</p>
                            <p>{savedAddresses.find(addr => addr.id === selectedAddressId)?.addressLine1}</p>
                            <p>{savedAddresses.find(addr => addr.id === selectedAddressId)?.city}, {savedAddresses.find(addr => addr.id === selectedAddressId)?.state} - {savedAddresses.find(addr => addr.id === selectedAddressId)?.pincode}</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                        <h4 className="font-bold text-purple-900 mb-3 flex items-center">
                          <CreditCard className="h-5 w-5 mr-2" />
                          Payment Method
                        </h4>
                        <p className="text-sm font-semibold text-gray-700">
                          {formData.paymentMethod === 'cashfree' ? 'Online Payment (Cashfree)' : 'Cash on Delivery'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 py-6 border-2 font-semibold"
                    >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 font-bold shadow-lg text-lg"
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Place Order"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Card className="shadow-xl border-2 border-gray-100 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <CardTitle className="text-xl font-bold">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h4>
                            <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                            <p className="text-sm font-bold text-red-600">{item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-semibold">₹{cartSubtotal.toLocaleString()}</span>
                      </div>
                      {productDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Product Discount</span>
                          <span className="font-semibold">-₹{productDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping</span>
                        <span className="font-semibold">{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-red-600">₹{total.toLocaleString()}</span>
                      </div>
                    </div>

                    {shipping === 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                        <p className="text-sm font-semibold text-green-700 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          You're getting FREE shipping!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}