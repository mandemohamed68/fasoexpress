import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DeliveryRequest, CommissionSettings } from '../types';
import { Compass, History as HistoryIcon, Wallet, User, Navigation, Package, DollarSign, Zap, CheckCircle, ShieldCheck, MapPin, X, ArrowRight, ArrowLeft, ChevronRight, Menu, List, Check, Info, Camera, Target, FileText, FileCheck, MessageSquare, Phone, HelpCircle, Truck, MessageCircle, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { api } from '../services/apiService';
import L from 'leaflet';
import { cn, calculateDistance, compressImage } from '../lib/utils';
import { playNotificationSound } from '../lib/audio';
import LoadingScreen from '../components/LoadingScreen';
import AnnouncementBanner from '../components/AnnouncementBanner';
import NotificationBell from '../components/NotificationBell';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { Chat } from '../components/Chat';
import { sendNotification } from '../lib/notificationService';
import toast from 'react-hot-toast';
import UserGuide from '../components/UserGuide';
import StaticFAQ from '../components/StaticFAQ';

const mockChartData = [
  { name: 'Lun', amount: 15000 },
  { name: 'Mar', amount: 20000 },
  { name: 'Mer', amount: 25000 },
  { name: 'Jeu', amount: 5000 },
  { name: 'Ven', amount: 35000 },
  { name: 'Sam', amount: 45000 },
  { name: 'Dim', amount: 12000 },
];

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  const lat = center?.[0];
  const lng = center?.[1];
  useEffect(() => {
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 15, { duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

export default function DriverDashboard() {
  const { profile, logout: signOut, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const queryTab = queryParams.get('tab');
  
  const [currentTab, setCurrentTab] = useState<'radar' | 'history' | 'wallet' | 'profile'>(
    (queryTab as 'radar' | 'history' | 'wallet' | 'profile') || 'radar'
  );
  
  useEffect(() => {
    if (queryTab) {
      setCurrentTab(queryTab as 'radar' | 'history' | 'wallet' | 'profile');
    } else {
      setCurrentTab('radar');
    }
  }, [queryTab]);
  
  const [pendingJobs, setPendingJobs] = useState<DeliveryRequest[]>([]);
  const [activeJobs, setActiveJobs] = useState<DeliveryRequest[]>([]);
  const [pendingPaymentJobs, setPendingPaymentJobs] = useState<DeliveryRequest[]>([]);
  const [deliveredJobs, setDeliveredJobs] = useState<DeliveryRequest[]>([]);
  const [appConfig, setAppConfig] = useState<any>(null);

  const maxMissionsLimit = appConfig?.maxMissionsBeforeRestriction ?? 3;
  const hasIncompleteDossier = profile?.verificationStatus !== 'verified';
  const isAccountRestricted = hasIncompleteDossier && deliveredJobs.length >= maxMissionsLimit;
  
  const prevPendingJobIds = useRef<string[]>([]);
  useEffect(() => {
    const newJobs = pendingJobs.filter(j => !prevPendingJobIds.current.includes(j.id));
    if (newJobs.length > 0 && newJobs.some(j => j.status === 'pending')) {
      playNotificationSound();
    }
    prevPendingJobIds.current = pendingJobs.map(j => j.id);
  }, [pendingJobs]);
  
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDeliveryId, setChatDeliveryId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set());
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const prevDeliveriesRef = useRef<Record<string, string>>({});
  const isOnline = profile ? (profile.status === 'online' || profile.status === 'busy') : false;

  const filteredPendingJobs = useMemo(() => {
    if (!profile) return [];
    if (isAccountRestricted) return [];
    return pendingJobs.filter(job => 
      !job.rejectedBy?.includes(profile.userId) && 
      job.pickupCode !== 'SUPPORT'
    );
  }, [pendingJobs, profile, isAccountRestricted]);

  const [showMissionDetails, setShowMissionDetails] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelJob = async (jobId: string) => {
    if (!cancelReason) {
      toast.error("Veuillez saisir un motif d'annulation");
      return;
    }
    setIsCancelling(true);
    try {
      await api.deliveries.update(jobId, {
        status: 'cancelled',
        cancelReason: cancelReason,
        cancelledBy: profile?.userId,
        updatedAt: new Date().toISOString()
      });
      toast.success("Course annulée avec succès");
      setShowMissionDetails(false);
      setCancelReason('');
      setRadarMode('search');
      setFocusedJobId(null);
    } catch (err: any) {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setIsCancelling(false);
    }
  };
  
  useEffect(() => {
    if (!profile || profile.role !== 'driver') return;
    const isCurrentlyOnline = profile.status === 'online' || profile.status === 'busy';
    
    // Auto-go-online by default once per session on mount
    const hasCheckedSession = sessionStorage.getItem('driver_default_online_set');
    if (!isCurrentlyOnline && !hasCheckedSession) {
      sessionStorage.setItem('driver_default_online_set', 'true');
      const maxSimultaneous = commissionSettings?.maxSimultaneousDeliveries || 2;
      const initialStatus = activeJobs.length >= maxSimultaneous ? 'busy' : 'online';
      updateProfile({ status: initialStatus }).catch(() => {});
      return;
    }

    if (!isCurrentlyOnline) return;

    const maxSimultaneous = commissionSettings?.maxSimultaneousDeliveries || 2;
    const newStatus = activeJobs.length >= maxSimultaneous ? 'busy' : 'online';
    
    if (newStatus !== profile.status) {
      api.profile.update({ status: newStatus }).catch(() => {});
    }
  }, [activeJobs.length, profile?.status, commissionSettings]);

  useEffect(() => {
    // Check for new chat messages in active jobs
    activeJobs.forEach(job => {
      const prevVal = prevDeliveriesRef.current[job.id];
      if (job.lastMessageAt && prevVal !== undefined && job.lastMessageAt !== prevVal) {
        if (!chatOpen || chatDeliveryId !== job.id) {
          setUnreadChats(prev => new Set(prev).add(job.id));
          playNotificationSound();
        }
      }
      prevDeliveriesRef.current[job.id] = job.lastMessageAt || '';
    });
  }, [activeJobs, chatOpen, chatDeliveryId]);

  useEffect(() => {
    if (chatOpen && chatDeliveryId) {
      setUnreadChats(prev => {
        const next = new Set(prev);
        next.delete(chatDeliveryId);
        return next;
      });
    }
  }, [chatOpen, chatDeliveryId]);

  const [radarMode, setRadarMode] = useState<'search' | 'focus'>('search');
  const [isListView, setIsListView] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    guarantorName: '',
    guarantorPhone: '',
    cniFront: null as string | null,
    cniBack: null as string | null,
    criminalRecord: null as string | null,
    rib: ''
  });

  const openVerificationModal = () => {
    setVerificationForm({
      guarantorName: profile?.guarantorName || '',
      guarantorPhone: profile?.guarantorPhone || '',
      cniFront: profile?.identityCardUrl || '',
      cniBack: profile?.identityCardBackUrl || '',
      criminalRecord: profile?.criminalRecordUrl || '',
      rib: profile?.rib || ''
    });
    setIsVerificationModalOpen(true);
  };

  const handleVerificationSubmit = async () => {
    if (!profile) return;
    setIsProcessingAction(true);
    try {
      const updates = {
        verificationStatus: 'pending',
        guarantorName: verificationForm.guarantorName,
        guarantorPhone: verificationForm.guarantorPhone,
        identityCardUrl: verificationForm.cniFront,
        identityCardBackUrl: verificationForm.cniBack,
        criminalRecordUrl: verificationForm.criminalRecord,
        rib: verificationForm.rib,
        updatedAt: new Date().toISOString()
      };
      await api.profile.update(updates);
      
      setIsVerificationModalOpen(false);
      setToastMessage("Dossier soumis avec succès !");
      refreshProfile?.();
    } catch (e) {
      console.error(e);
      setToastMessage("Erreur lors de la soumission");
    }
    setIsProcessingAction(false);
  };
  const [selectedPendingJob, setSelectedPendingJob] = useState<DeliveryRequest | null>(null);
  const [showAvailableMissionsModal, setShowAvailableMissionsModal] = useState(false);
  const [myBidOnJob, setMyBidOnJob] = useState<any | null>(null);
  const [fetchingBids, setFetchingBids] = useState(false);

  const sortedPendingJobs = useMemo(() => {
    return [...filteredPendingJobs].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredPendingJobs]);

  useEffect(() => {
    if (!selectedPendingJob || !profile) {
      setMyBidOnJob(null);
      return;
    }
    const fetchBidsForJob = async () => {
      setFetchingBids(true);
      try {
        const bidsList = await api.deliveries.bids.list(selectedPendingJob.id);
        const myBid = (bidsList || []).find((b: any) => b.driverId === profile.userId);
        setMyBidOnJob(myBid || null);
      } catch (err) {
        console.warn("Could not fetch bids for selected job", err);
        setMyBidOnJob(null);
      } finally {
        setFetchingBids(false);
      }
    };
    fetchBidsForJob();
  }, [selectedPendingJob, profile]);
  
  // Bid State
  const [bidPrice, setBidPrice] = useState<number | ''>('');
  const [bidTime, setBidTime] = useState<number | ''>('');
  const [bidReason, setBidReason] = useState<string>('');
  const [showBidForm, setShowBidForm] = useState(false);

  useEffect(() => {
    if (!selectedPendingJob) {
      setShowBidForm(false);
      setBidPrice('');
      setBidTime('');
      setBidReason('');
    }
  }, [selectedPendingJob]);
  
  // Focus State
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  
  // Active Action State
  const [showKeypadFor, setShowKeypadFor] = useState<'pickup' | 'delivery' | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Withdraw state
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [selectedHistoryJob, setSelectedHistoryJob] = useState<DeliveryRequest | null>(null);
  
  const [activeDriverCount, setActiveDriverCount] = useState(0);
  
  useEffect(() => {
    // Real-time listener for competition count - Placeholder for local API count or skip
    setActiveDriverCount(5); // Simulated or simplified for now to avoid complexity
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const comm = await api.config.get('commissions');
        if (comm) setCommissionSettings(comm as CommissionSettings);
        const config = await api.config.get('app_config');
        if (config) setAppConfig(config);
      } catch (e) {
        console.warn("Could not fetch settings locally");
      }
    };
    fetchSettings();
  }, []);

  const profileRef = useRef(profile);
  const isOnlineRef = useRef(isOnline);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const requestGeolocation = async () => {
    if (!userLocation) {
      setLoading(true);
    }
    let lastUpdate = 0;
    let lastCoords: { lat: number, lng: number } | null = null;
    
    // Dynamically import the custom GeolocationService
    const { GeolocationService } = await import('../services/GeolocationService');

    const watchId = await GeolocationService.watchPosition(
      (coords) => {
        const now = Date.now();
        
        // Critical: Distance check to avoid redundant writes if stationary
        // Also avoid excessive state updates to prevent re-rendering the whole dashboard
        let significantMove = true;
        if (lastCoords) {
          const distance = calculateDistance(lastCoords.lat, lastCoords.lng, coords.lat, coords.lng);
          significantMove = distance > 0.005; // More than 5 meters
        }

        if (!lastCoords || significantMove || (now - lastUpdate > 30000)) {
          setUserLocation(coords);
          setGpsError(null);
          setLoading(false);
        }

        const currentProfile = profileRef.current;
        if (currentProfile?.role === 'driver' && (now - lastUpdate > 30000 || (significantMove && now - lastUpdate > 10000))) { 
          lastUpdate = now;
          lastCoords = coords;
          api.profile.update({ 
            currentLocation: coords, 
            updatedAt: new Date().toISOString() 
          }).catch(() => {});
        }
      },
      (err) => {
        setLoading(false);
        setGpsError("Erreur GPS ou permission refusée.");
      }
    );
    return watchId;
  };

  const fetchData = async () => {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    try {
      await refreshProfile().catch(() => {});
      const jobs = await api.deliveries.list();
      
      const supportList = jobs.filter((d: any) => 
        d.pickupCode === 'SUPPORT' && 
        (d.clientId === currentProfile.userId || d.driverId === currentProfile.userId)
      );
      setSupportChats(supportList);
      
      const allMyJobs = jobs.filter((j: any) => 
        j.driverId === currentProfile.userId && 
        j.pickupCode !== 'SUPPORT'
      );
      allMyJobs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const activeList = allMyJobs.filter((j: any) => ['accepted', 'picked_up', 'ready_for_pickup'].includes(j.status));
      const pendingPaymentList = allMyJobs.filter((j: any) => j.paymentStatus === 'pending' && j.status !== 'cancelled');
      const deliveredList = allMyJobs.filter((j: any) => j.status === 'delivered');
      
      setActiveJobs(activeList);
      setPendingPaymentJobs(pendingPaymentList);
      setDeliveredJobs(deliveredList);
      
      const wdList = await api.withdrawals.list().catch(() => []);
      setWithdrawals(Array.isArray(wdList) ? wdList : []);

      if (isOnlineRef.current) {
        setPendingJobs(jobs.filter((j: any) => j.status === 'pending'));
      } else {
        setPendingJobs([]);
      }
    } catch (err) {
      console.warn("Local API fetch failed in driver dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = profile?.userId;
    if (!userId) {
      setLoading(false);
      return;
    }

    let currentWatchId: string | undefined | null;
    let isActive = true;

    requestGeolocation().then(id => {
       if (isActive) currentWatchId = id;
    });

    fetchData();
    const interval = setInterval(fetchData, 8000);

    return () => {
      isActive = false;
      if (currentWatchId) {
        import('../services/GeolocationService').then(({ GeolocationService }) => {
           GeolocationService.clearWatch(currentWatchId as string);
        });
      }
      clearInterval(interval);
    };
  }, [profile?.userId]);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [isOnline]);

  // Keep track of previous active jobs length to only auto-switch when a new job is accepted
  const prevActiveJobsLength = useRef(0);
  
  useEffect(() => {
    if (activeJobs.length > 0) {
      if (activeJobs.length > prevActiveJobsLength.current) {
        setRadarMode('focus');
      }
      if (!focusedJobId || !activeJobs.find(j => j.id === focusedJobId)) {
        setFocusedJobId(activeJobs[0].id);
      }
    } else {
      setRadarMode('search');
      setFocusedJobId(null);
    }
    prevActiveJobsLength.current = activeJobs.length;
  }, [activeJobs, focusedJobId]);

  const handleRejectJob = async (jobId: string) => {
    if (!profile) return;
    try {
      const job = pendingJobs.find(j => j.id === jobId);
      if (job) {
        const rejectedBy = job.rejectedBy || [];
        if (!rejectedBy.includes(profile.userId)) {
          await api.deliveries.update(jobId, {
            rejectedBy: [...rejectedBy, profile.userId],
            updatedAt: new Date().toISOString()
          });
        }
      }
      setSelectedPendingJob(null);
      setToastMessage("Mission refusée");
    } catch (e) {
      console.error("Error rejecting job:", e);
      setToastMessage("Erreur lors du refus");
    }
  };

  useEffect(() => {
    // Route fetching for focused active job
    if (radarMode === 'focus' && focusedJobId && userLocation) {
      const job = activeJobs.find(j => j.id === focusedJobId);
      if (job) {
        const target = job.status === 'accepted' ? job.from : job.to;
        fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${target.lng},${target.lat}?overview=full&geometries=geojson`)
          .then(res => {
            if (!res.ok) throw new Error("Network response was not ok");
            return res.json();
          })
          .then(data => {
            if (data.routes?.[0]) {
              setRouteCoords(data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]));
            }
          })
          .catch((e) => {
             console.log("Routing error", e);
             if (userLocation && typeof userLocation.lat === 'number' && target && typeof target.lat === 'number') {
               setRouteCoords([[userLocation.lat, userLocation.lng], [target.lat, target.lng]]);
             } else {
               setRouteCoords([]);
             }
          });
      }
    } else {
      setRouteCoords([]);
    }
  }, [radarMode, focusedJobId, userLocation, activeJobs]);

  const focusedJob = useMemo(() => activeJobs.find(j => j.id === focusedJobId), [activeJobs, focusedJobId]);
  
  const earnings = useMemo(() => {
    // We now use the calculated balance from the profile (backend-driven)
    // profile.earnings is the total balance
    // profile.availableBalance is earnings minus pending withdrawals
    return profile?.availableBalance || 0;
  }, [profile?.availableBalance]);

  const dailyEarnings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const dailyTotal = deliveredJobs
        .filter(job => {
          if (job.pickupCode === 'SUPPORT') return false;
          const updatedAtStr = job.updatedAt && (typeof (job.updatedAt as any).toDate === 'function' ? (job.updatedAt as any).toDate().toISOString() : job.updatedAt);
          const createdAtStr = job.createdAt && (typeof (job.createdAt as any).toDate === 'function' ? (job.createdAt as any).toDate().toISOString() : job.createdAt);
          return (updatedAtStr?.startsWith(today)) || (createdAtStr?.startsWith(today));
        })
        .reduce((acc, job) => acc + (job.clientProposedPrice || job.cost || 0), 0);
    const share = commissionSettings?.driverSharePercent || 85;
    return Math.floor((dailyTotal * share) / 100);
  }, [deliveredJobs, commissionSettings]);

  const [isBidding, setIsBidding] = useState(false);

  const submitBid = async (jobId: string, isDirectAccept = false) => {
    if (!profile) return;
    if (isAccountRestricted) {
      setToastMessage("Votre compte est restreint. Veuillez compléter votre dossier pour avoir de nouvelles missions.");
      return;
    }
    const maxSimultaneous = commissionSettings?.maxSimultaneousDeliveries || 2;
    if (activeJobs.length >= maxSimultaneous) {
      setToastMessage(`Maximum ${maxSimultaneous} missions simultanées !`);
      return;
    }
    const job = pendingJobs.find(j => j.id === jobId);
    if (!job) return;

    setIsBidding(true);
    if (isDirectAccept) {
      try {
      const updates = {
        status: 'accepted',
        driverId: profile.userId,
        driverName: profile.name,
        cost: job.clientProposedPrice || job.cost,
        updatedAt: new Date().toISOString()
      };
      await api.deliveries.update(jobId, updates);
      
      await sendNotification(job.clientId, "Livreur assigné", `${profile.name} a accepté la course. Veuillez payer pour générer les codes.`, 'success', `/client`);
      setToastMessage("Mission acceptée !");
      setSelectedPendingJob(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      setToastMessage("Erreur d'acceptation");
    }
      setIsBidding(false);
      return;
    }

    // Bid logic
    const price = Number(bidPrice);
    const time = Number(bidTime);
    if (!price || !time) { setToastMessage("Remplissez prix et temps"); setIsBidding(false); return; }

    try {
      await api.deliveries.bids.place(jobId, {
        price,
        proposedTime: time,
        reason: bidReason,
        driverId: profile.userId,
        driverName: profile.name,
      });
      await sendNotification(job.clientId, "Nouvelle offre", `${profile.name} propose ${price} FCFA.`, 'info', '/client');
      setToastMessage("Offre envoyée !");
      setSelectedPendingJob(null);
      setBidPrice(''); setBidTime(''); setBidReason('');
      await fetchData();
    } catch(e) { setToastMessage("Erreur réseau"); }
    setIsBidding(false);
  };

  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<'mobile_money' | 'bank_transfer'>('mobile_money');
  const [withdrawalInfo, setWithdrawalInfo] = useState('');

  const initWithdrawal = () => {
    if (profile?.withdrawalPhone) {
      setWithdrawalMethod('mobile_money');
      setWithdrawalInfo(profile.withdrawalPhone);
    } else if (profile?.rib) {
      setWithdrawalMethod('bank_transfer');
      setWithdrawalInfo(profile.rib);
    } else {
      setWithdrawalMethod('mobile_money');
      setWithdrawalInfo('');
    }
    setIsWithdrawalModalOpen(true);
  };

  const handleWithdrawal = async () => {
    const amount = Number(withdrawalAmountInput);
    if (!profile || earnings < 100) { setToastMessage("Solde insuffisant"); return; }
    if (!amount || amount < 100 || amount > earnings) { setToastMessage("Montant invalide"); return; }
    if (!withdrawalInfo) { setToastMessage("Veuillez renseigner les coordonnées de retrait"); return; }
    
    setIsWithdrawing(true);
    try {
      await api.withdrawals.create({
        amount: amount,
        method: withdrawalMethod,
        phone: withdrawalMethod === 'mobile_money' ? withdrawalInfo : '',
        withdrawalInfo: withdrawalInfo
      });
      setToastMessage("Votre demande a bien été envoyée à l'administrateur.");
      setIsWithdrawalModalOpen(false);
      setWithdrawalAmountInput('');
      fetchData();
    } catch (err) {
      console.error(err);
      setToastMessage("Erreur lors de la demande");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const processJobAction = async () => {
    if (!focusedJob || !showKeypadFor) return;
    setIsProcessingAction(true);

    if (showKeypadFor === 'pickup') {
      if (enteredCode !== focusedJob.pickupCode) {
        setToastMessage("Code d'enlèvement invalide !");
        setEnteredCode('');
        setIsProcessingAction(false);
        return;
      }
      const data: any = { status: 'picked_up', updatedAt: new Date().toISOString() };
      if (proofImage) {
        data.proofImage = proofImage;
        data.pickupProofImage = proofImage;
      }
      await api.deliveries.update(focusedJob.id, data);
      
      await api.notifications.create({
        userId: focusedJob.clientId,
        title: "Colis récupéré",
        message: "Votre colis est en route.",
        type: 'success',
        link: `/delivery/${focusedJob.id}`
      }).catch(() => {});

      setToastMessage("Colis récupéré !");
      setShowKeypadFor(null);
    } 
    else if (showKeypadFor === 'delivery') {
      if (enteredCode !== focusedJob.deliveryCode) {
        setToastMessage("Code de livraison invalide !");
        setEnteredCode('');
        setIsProcessingAction(false);
        return;
      }
      const data: any = { status: 'delivered', updatedAt: new Date().toISOString() };
      if (proofImage) {
        data.proofImage = proofImage;
        data.deliveryProofImage = proofImage;
      }
      await api.deliveries.update(focusedJob.id, data);
      
      await api.notifications.create({
        userId: focusedJob.clientId,
        title: "Colis livré",
        message: "Succès de la livraison !",
        type: 'success',
        link: `/delivery/${focusedJob.id}`
      }).catch(() => {});

      setToastMessage("Livraison terminée !");
      setShowKeypadFor(null);
    }

    setProofImage(null);
    setEnteredCode('');
    setIsProcessingAction(false);
    await fetchData();
  };

  const cancelJob = async (jobId: string) => {
    // Proceed directly for iframe compatibility without confirm
    await api.deliveries.update(jobId, {
      status: 'pending', 
      driverId: null, 
      driverName: null, 
      updatedAt: new Date().toISOString()
    });
    await fetchData();
  };

  const toggleOnline = async () => {
    if (!profile) return;
    
    if (isAccountRestricted) {
      setToastMessage("Votre compte est restreint. Veuillez compléter votre dossier pour pouvoir recevoir des missions.");
      return;
    }
    
    // Check if account is actually active for missions
    if (profile.accountStatus === 'pending_approval' || profile.verificationStatus !== 'verified') {
      setToastMessage("Attention: Votre dossier est incomplet. Finalisez votre KYC pour recevoir des missions.");
    }

    const currentIsOnline = profile.status === 'online' || profile.status === 'busy';
    const newLogicalOnline = !currentIsOnline;
    
    const newStatus = newLogicalOnline ? (activeJobs.length >= (commissionSettings?.maxSimultaneousDeliveries || 2) ? 'busy' : 'online') : 'offline';
    
    try {
      await updateProfile({
         status: newStatus,
         updatedAt: new Date().toISOString()
      });
      setToastMessage(newStatus !== 'offline' ? "Vous êtes EN LIGNE" : "Vous êtes HORS LIGNE");
    } catch (err) {
      console.error("Failed to update status", err);
      setToastMessage("Erreur de connexion. Réessayez.");
    }
  };

  const getPaymentLogo = (method?: string | null) => {
    if (!method) return null;
    const id = method.replace('_ussd', '').toLowerCase();
    const validMethods = ['orange', 'moov', 'telecel', 'coris'];
    if (validMethods.includes(id)) {
      return `/payments/${id}.png`;
    }
    return null;
  };

  return (
    <div className="relative flex-1 bg-slate-50 flex flex-col font-sans overflow-hidden">
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1 overflow-hidden bg-indigo-100">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="h-full w-1/3 bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]"
          />
        </div>
      )}
      {/* Dynamic Main Content */}
      <div className="flex-1 relative overflow-hidden bg-slate-100">
        <AnimatePresence mode="wait">
          
          {/* RADAR / ACTIVE VIEW */}
          {currentTab === 'radar' && (
             <motion.div key="radar" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0">
                {/* MAP BACKGROUND */}
                <div className="absolute inset-0 z-0 bg-slate-200">
{isAccountRestricted && (
                     <div className="absolute top-28 left-4 right-4 z-[40]">
                       <div className="bg-rose-500 text-white p-5 rounded-[28px] shadow-2xl border border-rose-400 flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                           <ShieldCheck className="w-5 h-5 text-white animate-pulse shrink-0" />
                           <p className="text-[10px] font-black uppercase tracking-wider">Compte Restreint</p>
                         </div>
                         <p className="text-xs font-bold opacity-90 leading-tight">
                           Votre dossier de vérification est incomplet. Vous avez atteint la limite de {maxMissionsLimit} missions d'essai autorisées. Veuillez compléter votre dossier pour débloquer votre compte.
                         </p>
                         <button 
                           onClick={() => { setCurrentTab('profile'); navigate('/driver?tab=profile'); }}
                           className="text-[9px] font-black uppercase tracking-widest bg-white text-rose-600 px-4 py-2 rounded-xl w-fit mt-1 shadow active:scale-95 transition-all self-start"
                         >
                           Compléter mon dossier
                         </button>
                       </div>
                     </div>
                   )}

                                      {gpsError && (
                     <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[40]">
                       <div className="bg-rose-500/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                         {gpsError}
                       </div>
                     </div>
                   )}

                   <MapContainer center={[12.3714, -1.5197]} zoom={13} className="h-full w-full" zoomControl={false} ref={(r) => { if (r) (window as any).driverMap = r; }}>
                     <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
                     
                     {radarMode === 'search' && filteredPendingJobs.map(job => {
                        const isHighValue = (job.clientProposedPrice || job.cost || 0) >= 2000;
                        const isUrgent = job.isUrgent;
                        const pulseBg = isUrgent ? 'bg-rose-500/30' : (isHighValue ? 'bg-orange-500/30' : 'bg-indigo-500/30');
                        const bgColor = isUrgent ? 'bg-rose-500' : (isHighValue ? 'bg-orange-500' : 'bg-indigo-500');
                        if (!job.from || typeof job.from.lat !== 'number' || typeof job.from.lng !== 'number') return null;
                        return (
                          <Marker key={job.id} position={[job.from.lat, job.from.lng]} 
                            eventHandlers={{ click: () => setSelectedPendingJob(job) }}
                            icon={new L.DivIcon({ className: 'custom-pulse', html: `<div class="relative w-8 h-8"><div class="absolute inset-0 ${pulseBg} rounded-full animate-ping"></div><div class="relative w-8 h-8 ${bgColor} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">${isUrgent ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-2 10h9L7 22l2-10H1L13 2z"/></svg>' : ''}</div></div>`, iconAnchor: [16,16] })}
                          />
                        );
                     })}

                     {radarMode === 'focus' && focusedJob && (
                        <>
                           <Marker position={[focusedJob.from.lat, focusedJob.from.lng]} icon={new L.DivIcon({ className: '', html: `<div class="w-6 h-6 bg-slate-900 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[10px] font-black">A</div>`, iconAnchor: [12,12] })} />
                           <Marker position={[focusedJob.to.lat, focusedJob.to.lng]} icon={new L.DivIcon({ className: '', html: `<div class="w-6 h-6 bg-indigo-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[10px] font-black">B</div>`, iconAnchor: [12,12] })} />
                        </>
                     )}

                     {routeCoords.length > 0 && radarMode === 'focus' && <Polyline positions={routeCoords} color="#4f46e5" weight={5} opacity={0.8} />}
                     
                     {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={new L.DivIcon({ className: '', html: `<div class="relative w-10 h-10"><div class="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div><div class="relative w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg></div></div>`, iconAnchor: [20,20] })} />
                     )}
                     
                     {userLocation && radarMode === 'search' && <ChangeView center={[userLocation.lat, userLocation.lng]} />}
                     {focusedJob && radarMode === 'focus' && <ChangeView center={focusedJob.status === 'accepted' ? [focusedJob.from.lat, focusedJob.from.lng] : [focusedJob.to.lat, focusedJob.to.lng]} />}
                   </MapContainer>

                   {/* Map Controls */}
                   <div className="absolute top-28 right-4 z-10 flex flex-col gap-3 pointer-events-auto">
                     <button onClick={() => setIsListView(!isListView)} className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-700 hover:text-indigo-600 transition-colors">
                        {isListView ? <Compass className="w-4 h-4 sm:w-5 sm:h-5" /> : <List className="w-4 h-4 sm:w-5 sm:h-5" />}
                     </button>
                     <button onClick={() => { if(userLocation) (window as any).driverMap?.flyTo([userLocation.lat, userLocation.lng], 15) }} className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-700 hover:text-indigo-600 transition-colors">
                        <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                     </button>
                     {radarMode === 'focus' && focusedJob && (
                        <button onClick={() => { 
                          const target = focusedJob.status === 'accepted' ? [focusedJob.from.lat, focusedJob.from.lng] : [focusedJob.to.lat, focusedJob.to.lng];
                          (window as any).driverMap?.flyTo(target, 15);
                        }} className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full shadow-lg border border-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all shadow-indigo-100">
                           <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                     )}
                   </div>
                </div>

                      <div className="absolute inset-0 z-20 pointer-events-none p-2 sm:p-4 flex flex-col gap-2 justify-between">
                   {/* Top HUD Layout - Improved for Mobile */}
                   <div className="flex flex-row justify-between items-start gap-2">
                       {/* Left HUD: Status & Quick Actions */}
                       <div className="flex flex-col items-start gap-2 pointer-events-auto">
                           {activeJobs.length > 0 && radarMode === 'focus' ? (
                                <div className="bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-slate-800 shadow-2xl flex items-center gap-2 pointer-events-auto">
                                   <div className="flex bg-slate-800 rounded-xl p-1 overflow-x-auto no-scrollbar">
                                     {activeJobs.length > 1 ? (
                                       activeJobs.map((j, i) => (
                                         <button key={j.id} onClick={() => setFocusedJobId(j.id)} className={cn("px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap", focusedJobId === j.id ? "bg-indigo-500 text-white shadow-md" : "text-slate-400 hover:text-white")}>
                                           M#{i+1}
                                         </button>
                                       ))
                                     ) : (
                                       <div className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                         <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                         Active
                                       </div>
                                     )}
                                   </div>
                                   <button onClick={() => setRadarMode('search')} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 flex-shrink-0" title="Radar">
                                       <Compass className="w-3.5 h-3.5" />
                                   </button>
                                </div>
                             ) : (
                                <div className="bg-white/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 shadow-lg pointer-events-auto">
                                    <div className="flex items-center gap-3 justify-between">
                                       <div>
                                          <p className={cn("text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5", profile?.status === 'online' ? "text-emerald-500" : (profile?.status === 'busy' ? "text-orange-500" : "text-slate-400"))}>
                                             <span className={cn("w-1.5 h-1.5 rounded-full", profile?.status === 'online' ? "bg-emerald-500 animate-pulse" : (profile?.status === 'busy' ? "bg-orange-500" : "bg-slate-300"))} /> 
                                             {profile?.status === 'online' ? "Online" : (profile?.status === 'busy' ? "Occupé" : "Offline")}
                                          </p>
                                          <h2 className="text-[10px] font-black italic tracking-tighter text-slate-900 leading-none">FASO EXPRESS</h2>
                                       </div>
                                       <button onClick={toggleOnline} className={cn("p-2 rounded-xl transition-all shadow-sm", isOnline ? "bg-slate-900 text-white" : "bg-emerald-500 text-white")}>
                                           <Zap className="w-3 h-3" />
                                       </button>
                                    </div>
                                </div>
                             )}
                             
                             {/* Available Missions Indicator */}
                             {isOnline && (
                                <motion.button 
                                  key={`avail-${filteredPendingJobs.length}`}
                                  initial={{ x: -20, opacity: 0 }} 
                                  animate={{ x: 0, opacity: 1 }} 
                                  onClick={() => setShowAvailableMissionsModal(true)}
                                  className={cn(
                                    "px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-xl pointer-events-auto border select-none transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 text-left",
                                    filteredPendingJobs.length > 0 
                                      ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white border-white/20" 
                                      : "bg-slate-900/90 backdrop-blur-xl text-slate-300 border-slate-800"
                                  )}
                                >
                                   {filteredPendingJobs.length > 0 ? (
                                      <div className="relative flex h-2 w-2 shrink-0">
                                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                         <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                      </div>
                                   ) : (
                                      <div className="relative flex h-2 w-2 shrink-0">
                                         <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-500/50 opacity-75"></span>
                                         <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                      </div>
                                   )}
                                   <div className="text-left font-sans">
                                      <p className={cn("text-[8px] font-black uppercase tracking-widest leading-none", filteredPendingJobs.length > 0 ? "text-orange-100" : "text-slate-400")}>
                                         {filteredPendingJobs.length > 0 ? "Missions Dispo." : "Radar de course"}
                                      </p>
                                      <p className={cn("text-[11px] font-black mt-0.5 leading-none", filteredPendingJobs.length > 0 ? "text-white" : "text-slate-200")}>
                                         {filteredPendingJobs.length > 0 
                                            ? `${filteredPendingJobs.length} ${filteredPendingJobs.length > 1 ? 'disponibles' : 'disponible'}`
                                            : "0 mission disponible"
                                         }
                                      </p>
                                   </div>
                                </motion.button>
                             )}

                             {/* Verification Warning Floating below status */}
                             {profile?.verificationStatus !== 'verified' && (
                                <motion.button 
                                  initial={{ x: -20, opacity: 0 }} 
                                  animate={{ x: 0, opacity: 1 }} 
                                  onClick={() => { setCurrentTab('profile'); navigate('/driver?tab=profile'); }}
                                  className={cn("backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-xl pointer-events-auto border border-white/20", profile?.verificationStatus === 'pending' ? 'bg-amber-600/95' : profile?.verificationStatus === 'rejected' ? 'bg-rose-600/95' : 'bg-indigo-600/95')}
                                >
                                   <ShieldCheck className="w-4 h-4 text-white" />
                                   <div className="text-left ml-3">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-orange-100 leading-none">{profile?.verificationStatus === 'pending' ? 'Dossier Soumis' : profile?.verificationStatus === 'rejected' ? 'Dossier Rejeté' : 'Dossier Incomplet'}</p>
                                      <p className="text-[9px] font-bold text-white mt-1">{profile?.verificationStatus === 'pending' ? 'Validation en cours' : profile?.verificationStatus === 'rejected' ? 'Veuillez corriger' : 'Finalisez KYC'}</p>
                                   </div>
                                </motion.button>
                             )}

                             {(!profile?.licensePlate || !profile?.carteGriseUrl) && (
                                 <motion.button 
                                   initial={{ x: -20, opacity: 0 }} 
                                   animate={{ x: 0, opacity: 1 }}
                                   transition={{ delay: 0.2 }}
                                   onClick={() => navigate('/settings')}
                                   className="bg-amber-500/95 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-xl pointer-events-auto border border-white/20"
                                 >
                                    <Truck className="w-4 h-4 text-white" />
                                    <div className="text-left ml-3">
                                       <p className="text-[8px] font-black uppercase tracking-widest text-amber-100 leading-none">Dossier Logistique</p>
                                       <p className="text-[9px] font-bold text-white mt-1">Plaque / Carte Grise</p>
                                    </div>
                                 </motion.button>
                              )}

                              {!profile?.photoURL && (
                                <motion.button 
                                  initial={{ x: -20, opacity: 0 }} 
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ delay: 0.1 }}
                                  onClick={() => navigate('/settings')}
                                  className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-xl pointer-events-auto border border-slate-200"
                                >
                                   <Camera className="w-4 h-4 text-slate-400" />
                                   <div className="text-left ml-3">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none">Profil Incomplet</p>
                                      <p className="text-[9px] font-bold text-slate-900 mt-1">Ajoutez une photo</p>
                                   </div>
                                </motion.button>
                             )}
                       </div>

                       <div className="flex flex-col gap-2 items-end">
                            <div className="pointer-events-auto shrink-0 shadow-sm">
                              <NotificationBell lightMode={true} />
                            </div>
                            <motion.div 
                              initial={{ x: 20, opacity: 0 }} 
                              animate={{ x: 0, opacity: 1 }}
                              className="bg-white/95 backdrop-blur-md border border-slate-200 p-2 px-3 rounded-2xl flex items-center gap-3 shadow-lg h-[44px] sm:h-auto"
                            >
                               <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                                  <DollarSign className="w-3.5 h-3.5" />
                               </div>
                               <div>
                                  <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Gains</p>
                                  <p className="text-[11px] font-black text-slate-900 leading-none">{dailyEarnings} F</p>
                               </div>
                               <div className="pl-2 border-l border-slate-100 flex flex-col items-center shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mb-0.5" />
                                  <span className="text-[6px] font-black text-emerald-500">LIVE</span>
                               </div>
                            </motion.div>
                       </div>
                   </div>

                   {/* Footer Info (Active Mission) */}
                   <div className="mt-auto pointer-events-none pb-8">
                       <div className="pointer-events-auto px-4 w-full max-w-sm mx-auto relative">
                          {/* FOCUS MODE BOTTOM SHEET */}
                          {radarMode === 'focus' && focusedJob && !showKeypadFor && (
                             <motion.div onClick={() => setShowMissionDetails(true)} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("rounded-3xl p-5 shadow-2xl border relative z-[60] cursor-pointer hover:shadow-emerald-100 transition-shadow", focusedJob.status === 'picked_up' ? "bg-indigo-50 border-indigo-100" : "bg-white border-slate-100 border-2 border-emerald-400")}>
                                {focusedJob.status === 'accepted' ? (
                                   <>
                                  <div className="flex justify-between items-start mb-4">
                                     <div className="flex-1">
                                        <div className="flex gap-2 items-center mb-1">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Étape 1 : Collecte</p>
                                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest">#{focusedJob.id.slice(-4).toUpperCase()}</span>
                                          {userLocation && (
                                             <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black">
                                                {calculateDistance(userLocation.lat, userLocation.lng, focusedJob.from.lat, focusedJob.from.lng).toFixed(1)} km
                                             </span>
                                          )}
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 leading-tight line-clamp-1">{focusedJob.from.address}</h3>
                                        {focusedJob.from.precision && (
                                           <div className="mt-1 flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold w-fit">
                                              <span>📍 {focusedJob.from.precision}</span>
                                           </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                           <p className="text-[10px] font-bold text-slate-500 truncate">{focusedJob.clientName}</p>
                                           <span className="text-[10px] text-slate-300">•</span>
                                           <p className="text-[9px] font-bold text-slate-400 uppercase">Trajet: {calculateDistance(focusedJob.from.lat, focusedJob.from.lng, focusedJob.to.lat, focusedJob.to.lng).toFixed(1)} km</p>
                                        </div>
                                     </div>
                                     <div className="flex gap-2">
                                     <a 
                                        href={`tel:${focusedJob.senderPhone || ''}`}
                                        onClick={(e) => !focusedJob.senderPhone && e.preventDefault()}
                                        className={cn(
                                          "w-12 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-100 transition-all active:scale-95",
                                          !focusedJob.senderPhone && "opacity-50 cursor-not-allowed"
                                        )}
                                        title={focusedJob.senderPhone ? `Appeler Expéditeur (${focusedJob.senderPhone})` : "Tel. Expéditeur Inconnu"}
                                     >
                                        <Phone className="w-5 h-5" />
                                     </a>
                                    <button 
                                       onClick={() => {
                                          setChatDeliveryId(focusedJob.id);
                                          setChatOpen(true);
                                       }}
                                       className="relative w-12 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-100 transition-all active:scale-95"
                                       title="Chat avec client"
                                    >
                                       <MessageSquare className="w-5 h-5" />
                                        {unreadChats.has(focusedJob.id) && (
                                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-bounce" />
                                        )}
                                    </button>
                                    {(focusedJob.isPaid || focusedJob.paymentMethod === 'cash') ? (
                                      <button onClick={() => { setProofImage(null); setShowKeypadFor('pickup'); }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                                         Récupéré <Package className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <div className="flex-1 py-4 bg-orange-50 text-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-orange-100 italic">
                                         Attente paiement client
                                      </div>
                                    )}
                                    <button 
                                       onClick={() => {
                                         const target = focusedJob.status === 'accepted' ? focusedJob.from : focusedJob.to;
                                         window.open(`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`, '_blank');
                                       }} 
                                       className="relative w-12 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-100 transition-all active:scale-95"
                                       title="Ouvrir GPS"
                                    >
                                       <Navigation className="w-5 h-5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setShowMissionDetails(true); }} className="w-12 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:text-rose-500 transition-all active:scale-95">
                                       <X className="w-5 h-5" />
                                    </button>
                                  </div>
                               </div>
                            </>
                         ) : (
                               <>
                                  <div className="flex justify-between items-start mb-4">
                                     <div className="flex-1">
                                        <div className="flex gap-2 items-center mb-1">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Étape 2 : Livraison</p>
                                          <span className="bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest">#{focusedJob.id.slice(-4).toUpperCase()}</span>
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 leading-tight line-clamp-1">{focusedJob.to.address}</h3>
                                        {focusedJob.to.precision && (
                                           <div className="mt-1 flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px] font-bold w-fit">
                                              <span>📍 {focusedJob.to.precision}</span>
                                           </div>
                                        )}
                                        <div className="flex gap-2 items-center">
                                            <a 
                                              href={`tel:${focusedJob.recipientPhone || ''}`} 
                                              onClick={(e) => !focusedJob.recipientPhone && e.preventDefault()}
                                              className={cn(
                                                  "px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-indigo-200 transition-colors",
                                                  !focusedJob.recipientPhone && "opacity-50 cursor-not-allowed"
                                              )}
                                            >
                                              <Phone className="w-3 h-3" /> {focusedJob.recipientPhone || 'Inconnu'}
                                            </a>
                                         </div>
                                     </div>
                                     <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black italic shadow-md shrink-0 ml-2">
                                        {focusedJob.cost} F
                                     </div>
                                  </div>
                                  <button onClick={() => { setProofImage(null); setShowKeypadFor('delivery'); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                                     Insérer le code pour terminer la course <CheckCircle className="w-4 h-4" />
                                  </button>
                               </>
                            )}
                         </motion.div>
                      )}

                      {/* COMPACT CENTERED KEYPAD MODAL */}
                      {showKeypadFor && (
                         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
                            <motion.div 
                               initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                               animate={{ scale: 1, opacity: 1, y: 0 }} 
                               className="bg-white rounded-2xl w-full max-w-[340px] p-6 shadow-2xl relative my-auto"
                            >
                               <button onClick={() => { setShowKeypadFor(null); setEnteredCode(''); }} className="absolute top-4 right-4 w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:scale-95"><X className="w-4 h-4" /></button>
                               
                               <div className="text-center mb-6">
                                  <div className={cn("w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-inner", showKeypadFor === 'delivery' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600')}>
                                     {showKeypadFor === 'delivery' ? <CheckCircle className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                                  </div>
                                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Code {showKeypadFor === 'pickup' ? 'Collecte' : 'Livraison'}</h2>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Saisissez le code fourni par le client</p>
                               </div>

                               <div className="relative mb-6">
                                  <input 
                                     ref={codeInputRef}
                                     type="text"
                                     value={enteredCode}
                                     onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                                     placeholder="EX: 7GZ4"
                                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-[0.2em] text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none uppercase"
                                     maxLength={8}
                                     autoFocus
                                  />
                               </div>
                               
                               <div className="space-y-4">
                                  <input 
                                     type="file" 
                                     accept="image/*" 
                                     capture="environment" 
                                     id="proofImageInput"
                                     className="hidden"
                                     onChange={async (e) => {
                                       const file = e.target.files?.[0];
                                       if (file) {
                                         try {
                                           setToastMessage("Compression de l'image...");
                                           const base64 = await compressImage(file);
                                           setProofImage(base64);
                                           setToastMessage("");
                                         } catch (err: any) {
                                           setToastMessage(err.message || "Erreur lors de la compression");
                                         }
                                       }
                                     }}
                                  />
                                  {!proofImage ? (
                                     <label htmlFor="proofImageInput" className="bg-slate-50 border-2 border-dashed border-slate-200 w-full rounded-2xl py-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-400 group">
                                       <Camera className="w-6 h-6 group-hover:text-slate-600" />
                                       <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-slate-700">Preuve Photo (Optionnelle)</span>
                                     </label>
                                  ) : (
                                     <div className="relative w-full h-32 rounded-2xl overflow-hidden border-2 border-indigo-100 group">
                                       <img src={proofImage} alt="Proof" className="w-full h-full object-cover" />
                                       <button onClick={() => setProofImage(null)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><X className="w-6 h-6" /></button>
                                     </div>
                                  )}

                                  <button 
                                     onClick={processJobAction} 
                                     disabled={enteredCode.length < 4 || isProcessingAction} 
                                     className={cn(
                                       "w-full py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl", 
                                       showKeypadFor === 'delivery' ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700' : 'bg-slate-900 text-white shadow-slate-900/30 hover:bg-black',
                                       (enteredCode.length < 4 || isProcessingAction) && 'opacity-30'
                                     )}
                                  >
                                     {isProcessingAction ? 'Traitement...' : 'Confirmer Validation'}
                                  </button>
                               </div>
                            </motion.div>
                         </div>
                      )}

                      {/* SEARCH MODE BOTTOM SHEET (Selected Job) */}
                      {radarMode === 'search' && selectedPendingJob && (
                       <motion.div 
                         initial={{ y: '100%' }} 
                         animate={{ y: 0 }} 
                      className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] xl:bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md bg-white rounded-[28px] p-5 sm:p-6 shadow-2xl border border-slate-100/80 z-[110] max-h-[65vh] overflow-y-auto hide-scrollbar"
                       >
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="flex gap-2">
                                  <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    Prioritaire
                                  </span>
                                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    #{selectedPendingJob.id.slice(-6).toUpperCase()}
                                  </span>
                                  {userLocation && (
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                                      {calculateDistance(userLocation.lat, userLocation.lng, selectedPendingJob.from.lat, selectedPendingJob.from.lng).toFixed(1)} km
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 mt-2">{selectedPendingJob.clientProposedPrice || selectedPendingJob.cost} <span className="text-[14px]">FCFA</span>
                                    <span className="ml-4 text-sm font-bold text-slate-400 not-italic tracking-normal">({calculateDistance(selectedPendingJob.from.lat, selectedPendingJob.from.lng, selectedPendingJob.to.lat, selectedPendingJob.to.lng).toFixed(1)} km)</span>
                                 </h3>
                              </div>
                              <button onClick={() => setSelectedPendingJob(null)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
                           </div>
                           
                           <div className="space-y-3 mb-6 relative pl-3">
                              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
                              <div className="relative z-10 pl-5">
                                 <div className="absolute left-[-2px] top-1.5 w-2 h-2 rounded-full bg-slate-400" />
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Collecte</p>
                                 <p className="text-sm font-bold text-slate-900 truncate">{selectedPendingJob.from.address}</p>
                                 {selectedPendingJob.senderPhone && <a href={`tel:${selectedPendingJob.senderPhone}`} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline block mt-1">📞 Appeler Client</a>}
                              </div>
                              <div className="relative z-10 pl-5">
                                 <div className="absolute left-[-2px] top-1.5 w-2 h-2 rounded-full bg-orange-500" />
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Livraison</p>
                                 <p className="text-sm font-bold text-slate-900 truncate">{selectedPendingJob.to.address}</p>
                              </div>
                           </div>

                            {/* Package Details & Image Section */}
                            {selectedPendingJob.packageDetails && (
                              <div className="mb-4 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5 text-indigo-500" /> Détails du Colis
                                  </span>
                                  <div className="flex gap-1.5">
                                    {selectedPendingJob.packageDetails.size && (
                                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-extrabold uppercase">
                                        Taille : {selectedPendingJob.packageDetails.size}
                                      </span>
                                    )}
                                    {selectedPendingJob.packageDetails.weightStr && (
                                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[9px] font-extrabold">
                                        Poids : {selectedPendingJob.packageDetails.weightStr} kg
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {selectedPendingJob.packageDetails.notes && (
                                  <p className="text-xs font-bold text-slate-800 mb-2">
                                    Nature : <span className="font-medium text-slate-600">{selectedPendingJob.packageDetails.notes}</span>
                                  </p>
                                )}

                                {selectedPendingJob.packageDetails.imageUrl ? (
                                  <div className="mt-2.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                      📷 Photo du colis :
                                    </p>
                                    <div 
                                      onClick={() => setPreviewModalImage(selectedPendingJob.packageDetails?.imageUrl || null)}
                                      className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group bg-slate-900 shadow-inner"
                                    >
                                      <img 
                                        src={selectedPendingJob.packageDetails.imageUrl} 
                                        alt="Photo du colis" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                        <Eye className="w-4 h-4" /> Cliquer pour agrandir
                                      </div>
                                      <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md text-white rounded-lg text-[9px] font-bold flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> Zoom
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium italic">
                                    <span>Pas de photo jointe par le client</span>
                                  </div>
                                )}
                              </div>
                            )}

                           {/* Affichage de l'état des négociations en cours ou refusées */}
                           {myBidOnJob && (
                             <div className={cn(
                               "p-4 rounded-2xl text-xs font-bold mb-4 border leading-relaxed w-full",
                               myBidOnJob.status === 'pending' ? "bg-amber-50 text-amber-800 border-amber-200" :
                               myBidOnJob.status === 'rejected' && myBidOnJob.attempts < 2 ? "bg-orange-50 text-orange-800 border-orange-200" :
                               "bg-slate-100 text-slate-600 border-slate-200"
                             )}>
                               {myBidOnJob.status === 'pending' && (
                                 <p>⏳ Vous avez proposé {myBidOnJob.price} FCFA. Proposition en cours d'examen par le client (Tentative {myBidOnJob.attempts}/2)...</p>
                               )}
                               {myBidOnJob.status === 'rejected' && myBidOnJob.attempts == 1 && (
                                 <p>❌ Votre offre de {myBidOnJob.price} FCFA a été refusée. Le client vous autorise une seconde et dernière proposition de tarif !</p>
                               )}
                               {myBidOnJob.status === 'rejected' && myBidOnJob.attempts >= 2 && (
                                 <p>🔒 Limite de négociations de prix atteinte (2/2). L'offre initiale reste disponible en acceptation directe.</p>
                               )}
                             </div>
                           )}

                           <div className="flex gap-2">
                             {(!myBidOnJob || myBidOnJob.status !== 'pending') && (
                              <button 
                                 onClick={() => submitBid(selectedPendingJob.id, true)} 
                                 disabled={isBidding} 
                                 className={cn(
                                   "h-14 flex-[2.2] bg-[#111827] text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center",
                                   isBidding ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-800"
                                 )}
                               >
                                 {isBidding ? "..." : "Accepter"}
                              </button>
                             )}
                              {(!myBidOnJob || (myBidOnJob.status === 'rejected' && myBidOnJob.attempts < 2)) && (
                               <button onClick={() => {
                                 setBidPrice(selectedPendingJob.clientProposedPrice || selectedPendingJob.cost || 2000);
                                 const dist = calculateDistance(selectedPendingJob.from.lat, selectedPendingJob.from.lng, selectedPendingJob.to.lat, selectedPendingJob.to.lng);
                                 setBidTime(Math.max(15, Math.ceil(dist * 4) + 10)); // realistic default time based on distance
                                 setShowBidForm(true);
                                 setRadarMode('search'); // keep search mode
                              }} disabled={isBidding} className={cn("h-14 flex-1 bg-[#FFF5ED] text-[#E05615] rounded-2xl text-[11px] font-bold uppercase tracking-[0.1em] active:scale-95 transition-all flex items-center justify-center border border-orange-100/50", isBidding ? "opacity-50 cursor-not-allowed" : "hover:bg-[#FFEBE0]")}>
                                 Négocier
                              </button>
                              )}
                              <button onClick={() => handleRejectJob(selectedPendingJob.id)} className="w-14 h-14 bg-[#FFF0F2] text-[#E11D48] rounded-2xl flex items-center justify-center hover:bg-[#FFE4E8] active:scale-95 transition-all shrink-0 border border-rose-100/50" title="Refuser">
                                 <X className="w-5 h-5 stroke-[2.5]" />
                              </button>
                           </div>
                           {/* Quick Bid Inline Expansion */}
                           {showBidForm && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <input type="number" placeholder="FCFA" value={bidPrice} onChange={e => setBidPrice(Number(e.target.value) || '')} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                                  <input type="number" placeholder="Min" value={bidTime} onChange={e => setBidTime(Number(e.target.value) || '')} className="w-20 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-center" />
                                </div>
                                <select value={bidReason} onChange={e => setBidReason(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                                  <option value="">Sélectionner un motif...</option>
                                  <option value="Distance trop longue">Distance trop longue</option>
                                  <option value="Trafic dense dans la zone">Trafic dense dans la zone</option>
                                  <option value="Charge encombrante/lourde">Charge encombrante/lourde</option>
                                  <option value="Heure de pointe">Heure de pointe</option>
                                  <option value="Autre">Autre</option>
                                </select>
                                <button onClick={() => submitBid(selectedPendingJob.id)} className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mt-2">Envoyer l'offre</button>
                              </motion.div>
                           )}
                        </motion.div>
                      )}

                   </div>
                </div>
              </div>

                 {/* OVERLAY PENDING MISSIONS LIST */}
                 {radarMode === 'search' && !selectedPendingJob && filteredPendingJobs.length > 0 && (
                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] xl:bottom-8 left-0 right-0 z-[40] pointer-events-none"
                    >
                      <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x hide-scrollbar pointer-events-auto w-full md:max-w-2xl md:mx-auto">
                        <AnimatePresence>
                          {filteredPendingJobs.map((job, index) => (
                             <motion.div 
                               key={job.id} 
                               initial={{ x: 50, opacity: 0 }}
                               animate={{ x: 0, opacity: 1 }}
                               transition={{ delay: index * 0.1 }}
                               onClick={() => setSelectedPendingJob(job)} 
                               className="bg-white rounded-2xl p-4 shadow-xl border border-slate-100 min-w-[260px] snap-center shrink-0 active:scale-95 transition-all relative group"
                             >
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectJob(job.id);
                                  }}
                                  className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="flex justify-between items-center mb-3">
                                   <div className="flex gap-1.5">
                                     <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[8px] font-black italic tracking-widest">#{job.id.slice(-4).toUpperCase()}</span>
                                     {!!job.isUrgent && <Zap className="w-3 h-3 text-rose-500 fill-rose-500" />}
                                   </div>
                                   <span className="text-sm font-black text-slate-900">{job.clientProposedPrice || job.cost} F</span>
                                </div>
                                <div className="space-y-1.5 border-l-2 border-slate-100 ml-1 pl-3 relative">
                                   <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-300" />
                                   <p className="text-[10px] font-bold text-slate-500 truncate">{job.from.address}</p>
                                   <div className="absolute -left-[5px] bottom-1 w-2 h-2 rounded-full bg-indigo-500" />
                                   <p className="text-[10px] font-bold text-slate-900 truncate">{job.to.address}</p>
                                </div>
                             </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                 )}

                 {!isOnline && (
                    <motion.div 
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] xl:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[40]"
                    >
                      <div className="bg-slate-900/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-800 flex flex-col items-center justify-between gap-4 pointer-events-auto">
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center shrink-0">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          </div>
                          <div className="text-left flex-1">
                            <h4 className="text-white text-xs font-black uppercase tracking-wider">Vous êtes Hors Ligne</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                              Activez votre statut pour recevoir les requêtes de livraison.
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={toggleOnline} 
                          className="w-full px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all text-center cursor-pointer"
                        >
                          Passer En Ligne
                        </button>
                      </div>
                    </motion.div>
                 )}

                 {isOnline && filteredPendingJobs.length === 0 && activeJobs.length === 0 && !selectedPendingJob && (
                    <motion.div 
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] xl:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[40]"
                    >
                      <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-slate-800 flex flex-col items-center gap-3 pointer-events-auto">
                        <div className="flex items-center gap-3 w-full">
                          <div className="relative w-10 h-10 shrink-0 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-indigo-500/35 animate-ping opacity-75" />
                            <Compass className="w-4 h-4 animate-spin-slow" />
                          </div>
                          <div className="text-left flex-1">
                            <h4 className="text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-2">
                              <span>Radar Actif (En Ligne)</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </h4>
                            <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">
                              0 mission disponible • Recherche de commandes en cours...
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                 )}
             </motion.div>
          )}

          {/* HISTORY TAB */}
          {currentTab === 'history' && (
             <motion.div key="history" initial={{opacity:0, scale: 0.98}} animate={{opacity:1, scale: 1}} exit={{opacity:0}} className="absolute inset-0 overflow-y-auto pb-32 px-6 pt-12 bg-slate-50">
                <div className="flex items-center gap-4 mb-8">
                   <button onClick={() => { setCurrentTab('radar'); navigate('/driver'); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm active:scale-90 transition-all">
                      <ArrowLeft className="w-5 h-5" />
                   </button>
                   <h1 className="text-4xl font-black italic tracking-tighter text-slate-900"><span className="text-indigo-600">Historique</span>.</h1>
                </div>
                
                <div className="space-y-4">
                  {deliveredJobs.length === 0 ? (
                    <div className="bg-white rounded-3xl p-5 lg:p-6 text-center border border-slate-200">
                      <HistoryIcon className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-500">Aucune mission terminée.</p>
                    </div>
                  ) : (
                    deliveredJobs.map(job => {
                      const logo = getPaymentLogo(job.paymentMethod);
                      return (
                        <div key={job.id} onClick={() => setSelectedHistoryJob(job)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 group hover:shadow-md transition-all cursor-pointer hover:border-slate-300">
                           <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                 <div className={cn(
                                   "w-8 h-8 rounded-lg flex items-center justify-center text-indigo-600 overflow-hidden shrink-0",
                                   logo ? "bg-white p-1 border border-slate-100" : "bg-indigo-50"
                                 )}>
                                    {logo ? (
                                      <img src={logo} alt={job.paymentMethod || ''} className="w-full h-full object-contain" />
                                    ) : (
                                      <Package className="w-4 h-4" />
                                    )}
                                 </div>
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                   {(() => {
                                     if (!job.createdAt) return '-';
                                     let dDate;
                                     if (typeof (job.createdAt as any).toDate === 'function') {
                                       dDate = (job.createdAt as any).toDate();
                                     } else {
                                       dDate = new Date(job.createdAt);
                                     }
                                     return isNaN(dDate.getTime()) ? '-' : dDate.toLocaleDateString('fr-FR');
                                   })()}
                                 </span>
                              </div>
                              <span className="text-xs font-black text-emerald-600">+{job.cost} F</span>
                           </div>
                           <div className="space-y-1.5 border-l-2 border-slate-100 ml-4 pl-4 relative">
                              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-300" />
                              <p className="text-[11px] font-medium text-slate-500 truncate">{job.from.address}</p>
                              <div className="absolute -left-[5px] bottom-1 w-2 h-2 rounded-full bg-indigo-500" />
                              <p className="text-[11px] font-bold text-slate-900 truncate">{job.to.address}</p>
                           </div>
                        </div>
                      );
                    })
                  )}
                </div>
             </motion.div>
          )}

          {/* WALLET TAB */}
          {currentTab === 'wallet' && (
             <motion.div key="wallet" initial={{opacity:0, scale: 0.98}} animate={{opacity:1, scale: 1}} exit={{opacity:0}} className="absolute inset-0 overflow-y-auto pb-32 px-6 pt-12 bg-slate-50">
                <div className="flex items-center gap-4 mb-8">
                   <button onClick={() => { setCurrentTab('radar'); navigate('/driver'); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm active:scale-90 transition-all">
                      <ArrowLeft className="w-5 h-5" />
                   </button>
                   <h1 className="text-4xl font-black italic tracking-tighter text-slate-900">Mon <span className="text-indigo-600">Portefeuille.</span></h1>
                </div>
                
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200 mb-8 relative overflow-hidden">
                   <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] -mr-16 -mt-16" />
                   <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400 mb-1 flex items-center gap-2">Solde Disponible</p>
                        <div className="flex items-baseline gap-1">
                          <div className="flex flex-col items-center">
                            <h2 className="text-4xl font-black tracking-tight">{earnings.toLocaleString('fr-FR')}</h2>
                            <p className="text-[10px] font-bold text-indigo-200 mt-1 uppercase tracking-widest">Solde Disponible</p>
                            {profile?.pendingWithdrawals > 0 && (
                              <p className="text-[9px] text-white/60 font-medium italic mt-1">({profile.pendingWithdrawals.toLocaleString('fr-FR')} F en attente)</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-500">FCFA</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center">
                         <Wallet className="w-5 h-5 text-indigo-400" />
                      </div>
                   </div>
                   
                   <button onClick={initWithdrawal} disabled={earnings < 100} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-95">
                      <ArrowRight className="w-3 h-3" /> Demander un retrait
                   </button>
                </div>

                <div className="flex gap-4 mb-8">
                   <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-2">
                         <span className="font-bold text-xs">MM</span>
                      </div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Orange / MTN</p>
                   </div>
                   <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-2">
                         <DollarSign className="w-5 h-5" />
                      </div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Cash Direct</p>
                   </div>
                </div>

                <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-4 px-2">Évolution Hebdomadaire</p>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-8 shadow-sm" style={{ minWidth: 0 }}>
                   <div style={{ width: '100%', height: '180px', minWidth: 0, minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height={180}>
                         <LineChart data={mockChartData}>
                           <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                           <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                         </LineChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                
                <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100 flex items-start gap-4">
                  <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-orange-800 mb-1">Commission actuelle</h4>
                    <p className="text-xs font-medium text-orange-600">Vous conservez {commissionSettings?.driverSharePercent || 85}% des revenus générés sur vos courses.</p>
                  </div>
                </div>

                {/* Historique des Retraits */}
                <div className="mt-8">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Historique des Retraits</h3>
                   {withdrawals.length === 0 ? (
                      <div className="bg-white rounded-3xl p-6 text-center border border-slate-100 text-xs text-slate-400 font-bold">
                         Aucun retrait initié pour le moment.
                      </div>
                   ) : (
                      <div className="space-y-3">
                         {withdrawals.map((wd: any) => (
                            <div key={wd.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center text-left">
                               <div>
                                  <p className="text-sm font-black text-slate-900">{wd.amount} FCFA</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Méthode: {wd.method === 'mobile_money' ? 'Mobile Money' : 'Cash'}</p>
                                  <p className="text-[9px] text-slate-400 mt-1">Saisi le : {new Date(wd.createdAt || Date.now()).toLocaleDateString('fr-FR')}</p>
                               </div>
                               <div>
                                  {wd.status === 'valide' ? (
                                     <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Validé</span>
                                  ) : wd.status === 'rejete' ? (
                                     <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Rejeté</span>
                                  ) : (
                                     <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">En cours</span>
                                  )}
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </motion.div>
          )}

          {/* PROFILE TAB */}
          {currentTab === 'profile' && (
             <motion.div key="profile" initial={{opacity:0, scale: 0.98}} animate={{opacity:1, scale: 1}} exit={{opacity:0}} className="absolute inset-0 overflow-y-auto pb-32 px-6 pt-12 bg-slate-50">
                <div className="flex items-center gap-4 mb-8">
                   <button onClick={() => { setCurrentTab('radar'); navigate('/driver'); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm active:scale-90 transition-all">
                      <ArrowLeft className="w-5 h-5" />
                   </button>
                   <h1 className="text-4xl font-black italic tracking-tighter text-slate-900"><span className="text-indigo-600">Profil</span>.</h1>
                </div>
                
                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-6 mb-8">
                    <div 
                       onClick={() => document.getElementById('driverPhotoInput')?.click()}
                       className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border-4 border-slate-50 shadow-inner overflow-hidden relative cursor-pointer group"
                    >
                       {profile?.photoURL ? (
                          <>
                            <img src={profile.photoURL} alt="Profil" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <Camera className="w-6 h-6 text-white" />
                            </div>
                          </>
                       ) : (
                          <User className="w-8 h-8" />
                       )}
                       <input id="driverPhotoInput" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setToastMessage("Téléchargement...");
                              const base64 = await compressImage(file);
                              await api.profile.update({ photoURL: base64 });
                              await refreshProfile?.();
                              setToastMessage("Photo mise à jour !");
                            } catch (err: any) {
                              setToastMessage(err.message || "Erreur photo");
                            }
                          }
                       }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{profile?.displayName || profile?.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-2">
                        {profile?.vehicleType || 'Livreur'} • ⭐ {profile?.performanceScore ? (profile.performanceScore / 20).toFixed(1) : '5.0'}
                      </p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <button 
                          onClick={() => setIsWithdrawalModalOpen(true)}
                          className="px-2 py-1 bg-orange-100 text-orange-600 rounded-md text-[8px] font-black uppercase hover:bg-orange-200 transition-colors"
                        >
                          Demander un retrait
                        </button>
                        <button 
                          onClick={() => navigate('/settings')}
                          className="px-2 py-1 bg-slate-900 text-white rounded-md text-[8px] font-black uppercase hover:bg-slate-800 transition-colors"
                        >
                          Modifier le Profil
                        </button>
                        {profile?.verificationStatus === 'verified' ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-md text-[8px] font-black uppercase">Vérifié</span>
                        ) : profile?.verificationStatus === 'pending' ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-md text-[8px] font-black uppercase">En attente</span>
                        ) : profile?.verificationStatus === 'rejected' ? (
                          <span className="px-2 py-1 bg-rose-100 text-rose-600 rounded-md text-[8px] font-black uppercase">Dossier Rejeté</span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-400 rounded-md text-[8px] font-black uppercase">Non configuré</span>
                        )}
                      </div>
                    </div>
                 </div>

                 {/* Stats Grid */}
                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                       <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 leading-none">Annulations</p>
                       <p className="text-2xl font-black text-slate-900 leading-none">{profile?.cancellationRate || 0}%</p>
                       <div className="w-full h-1 bg-slate-100 mt-3 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${profile?.cancellationRate || 5}%` }} />
                       </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                       <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 leading-none">Score Global</p>
                       <p className="text-2xl font-black text-slate-900 leading-none">{profile?.performanceScore || 100}/100</p>
                       <div className="w-full h-1 bg-slate-100 mt-3 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${profile?.performanceScore || 95}%` }} />
                       </div>
                    </div>
                 </div>

                 {/* Wallet & Earnings */}
                 <div className="bg-slate-900 rounded-2xl p-6 text-white mb-8 relative overflow-hidden">
                    <div className="relative z-10">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mes Revenus</h4>
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                       </div>
                       <div className="space-y-3">
                          <div className="flex justify-between items-end bg-white/5 p-3 rounded-xl border border-white/10 mb-4">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Gains d'aujourd'hui</span>
                            <span className="text-xl font-black text-emerald-400">{dailyEarnings.toLocaleString('fr-FR')} F</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Gains Totaux (Historique)</span>
                            <span className="text-lg font-black">{(profile?.totalNetEarnings || 0).toLocaleString('fr-FR')} F</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Déjà Retiré</span>
                            <span className="text-lg font-bold text-slate-300">{(profile?.totalWithdrawn || 0).toLocaleString('fr-FR')} F</span>
                          </div>
                          <div className="w-full h-px bg-white/5 my-2" />
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-indigo-400 uppercase">Solde Total</span>
                            <span className="text-xl font-black text-white">{(profile?.earnings || 0).toLocaleString('fr-FR')} F</span>
                          </div>
                          {profile?.pendingWithdrawals > 0 && (
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-bold text-orange-400 uppercase">En attente (Admin)</span>
                              <span className="text-sm font-bold text-orange-300">-{profile.pendingWithdrawals.toLocaleString('fr-FR')} F</span>
                            </div>
                          )}
                          <div className="pt-3 flex justify-between items-end border-t border-white/10">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Solde Disponible</span>
                            <span className="text-2xl font-black text-emerald-400">{earnings.toLocaleString('fr-FR')} F</span>
                          </div>
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 mt-2 italic text-left">Chaque course complète s'ajoute ici instantanément.</p>
                       <button 
                         onClick={() => setIsWithdrawalModalOpen(true)}
                         className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                       >
                         <DollarSign className="w-3.5 h-3.5" />
                         Demander un retrait
                       </button>
                    </div>
                    {/* Decorative radial gradient */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2" />
                 </div>

                {/* Badges Section */}
                <div className="mb-8">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Performances & Badges</h3>
                   <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar px-2 -mx-2">
                      <div className="bg-orange-50 shrink-0 w-32 rounded-2xl p-4 border border-orange-100/50 flex flex-col items-center text-center">
                         <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-3">
                            <Zap className="w-6 h-6" />
                         </div>
                         <span className="text-[10px] font-black uppercase text-orange-800">Top Livreur</span>
                         <span className="text-[9px] font-bold text-orange-600/70 mt-1">Quartier ZAD</span>
                      </div>
                      <div className="bg-indigo-50 shrink-0 w-32 rounded-2xl p-4 border border-indigo-100/50 flex flex-col items-center text-center">
                         <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle className="w-6 h-6" />
                         </div>
                         <span className="text-[10px] font-black uppercase text-indigo-800">100 Courses</span>
                         <span className="text-[9px] font-bold text-indigo-600/70 mt-1">Sans incident</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                  {/* Aide & Guides pour Livreur */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mt-6">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 text-left">Aide & Support</h3>
                     <div className="grid grid-cols-2 gap-4">
                       <button 
                         onClick={() => setIsGuideOpen(true)}
                         className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-orange-500/20 hover:bg-orange-50/10 transition-all text-left group cursor-pointer"
                       >
                         <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform animate-pulse">
                           <Compass className="w-4.5 h-4.5" />
                         </div>
                         <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-tight">Mode d'emploi</h4>
                         <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Guide étape par étape</p>
                       </button>

                       <button 
                         onClick={() => setIsFaqOpen(true)}
                         className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-500/20 hover:bg-indigo-50/10 transition-all text-left group cursor-pointer"
                       >
                         <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                           <HelpCircle className="w-4.5 h-4.5" />
                         </div>
                         <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-tight">FAQ Livreur</h4>
                         <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Questions fréquentes</p>
                       </button>
                     </div>
                  </div>

                  <button onClick={openVerificationModal} className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500"><ShieldCheck className="w-5 h-5"/></div>
                      <div>
                        <span className="font-bold text-slate-700 block text-left">Documents & Vérification</span>
                        {profile?.verificationStatus === 'pending' && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block">En attente</span>}
                        {profile?.verificationStatus === 'verified' && <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block">Vérifié</span>}
                        {profile?.verificationStatus === 'rejected' && <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block font-bold">Rejeté / À corriger</span>}
                        {isAccountRestricted && <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block ml-2 animate-pulse">Compte Restreint</span>}
                        {!profile?.verificationStatus && <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block">Non configuré</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>
                  <button onClick={() => signOut()} className="w-full bg-rose-50 rounded-3xl p-5 border border-rose-100 flex items-center justify-between text-rose-600 hover:bg-rose-100 mt-8">
                     <span className="font-black uppercase tracking-widest text-[12px]">Déconnexion</span>
                  </button>
                </div>
             </motion.div>
          )}

        </AnimatePresence>

        {/* VERIFICATION MODAL */}
        <AnimatePresence>
          {isVerificationModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-3xl p-5 lg:p-6 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Dossier de Vérification</h3>
                    <button onClick={() => setIsVerificationModalOpen(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><X className="w-5 h-5" /></button>
                 </div>

                 <div className="space-y-6 mb-8">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Identité du Guaranteur</label>
                       <div className="space-y-2">
                          <input 
                             type="text" 
                             placeholder="Nom complet du garant" disabled={profile?.verificationStatus === 'pending' || profile?.verificationStatus === 'verified'} 
                             value={verificationForm.guarantorName} 
                             onChange={e => setVerificationForm({...verificationForm, guarantorName: e.target.value})}
                             className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-500 outline-none"
                          />
                          <input 
                             type="tel" 
                             placeholder="Téléphone du garant" disabled={profile?.verificationStatus === 'pending' || profile?.verificationStatus === 'verified'} 
                             value={verificationForm.guarantorPhone} 
                             onChange={e => setVerificationForm({...verificationForm, guarantorPhone: e.target.value})}
                             className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-500 outline-none"
                          />
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">RIB / IBAN de Compensation (Opt.)</label>
                       <input 
                          type="text" 
                          placeholder="Ex: CM21..." disabled={profile?.verificationStatus === 'pending' || profile?.verificationStatus === 'verified'} 
                          value={verificationForm.rib} 
                          onChange={e => setVerificationForm({...verificationForm, rib: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-500 outline-none"
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">CNIB (Recto)</label>
                          <div className={cn("relative h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden", verificationForm.cniFront ? 'border-indigo-500' : '')}>
                             {verificationForm.cniFront ? (
                                <img src={verificationForm.cniFront} className="w-full h-full object-cover" />
                             ) : (
                                <Camera className="w-6 h-6 text-slate-300" />
                             )}
                             <input type="file" accept="image/*" disabled={profile?.verificationStatus === 'pending' || profile?.verificationStatus === 'verified'} className="absolute inset-0 opacity-0 disabled:pointer-events-none cursor-pointer" onChange={async e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                   try {
                                     setToastMessage("Traitement...");
                                     const base64 = await compressImage(file);
                                     setVerificationForm({...verificationForm, cniFront: base64});
                                     setToastMessage("");
                                   } catch (err: any) {
                                     setToastMessage(err.message || "Erreur image");
                                   }
                                }
                             }} />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">CNIB (Verso)</label>
                          <div className={cn("relative h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden", verificationForm.cniBack ? 'border-indigo-500' : '')}>
                             {verificationForm.cniBack ? (
                                <img src={verificationForm.cniBack} className="w-full h-full object-cover" />
                             ) : (
                                <Camera className="w-6 h-6 text-slate-300" />
                             )}
                             <input type="file" accept="image/*" disabled={profile?.verificationStatus === 'pending' || profile?.verificationStatus === 'verified'} className="absolute inset-0 opacity-0 disabled:pointer-events-none cursor-pointer" onChange={async e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                   try {
                                     setToastMessage("Traitement...");
                                     const base64 = await compressImage(file);
                                     setVerificationForm({...verificationForm, cniBack: base64});
                                     setToastMessage("");
                                   } catch (err: any) {
                                     setToastMessage(err.message || "Erreur image");
                                   }
                                }
                             }} />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2 mb-8">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block pb-2">Casier Judiciaire / Autres (Opt.)</label>
                    <div className={cn("relative h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden", verificationForm.criminalRecord ? 'border-indigo-500' : '')}>
                       {verificationForm.criminalRecord ? (
                          <div className="text-emerald-500 flex flex-col items-center">
                             <FileCheck className="w-8 h-8" />
                             <span className="text-[8px] font-bold mt-1 uppercase tracking-widest">Document OK</span>
                          </div>
                       ) : (
                          <div className="flex flex-col items-center text-slate-300">
                            <FileText className="w-6 h-6" />
                            <span className="text-[8px] font-black uppercase tracking-widest mt-1">PDF ou IMAGE</span>
                          </div>
                       )}
                       <input type="file" accept="image/*,application/pdf" disabled={profile?.verificationStatus === 'pending' || profile?.verificationStatus === 'verified'} className="absolute inset-0 opacity-0 disabled:pointer-events-none cursor-pointer" onChange={async e => {
                          const file = e.target.files?.[0];
                          if (file) {
                             try {
                               setToastMessage("Traitement...");
                               const base64 = await compressImage(file);
                               setVerificationForm({...verificationForm, criminalRecord: base64});
                               setToastMessage("");
                             } catch (err: any) {
                               setToastMessage(err.message || "Erreur fichier");
                             }
                          }
                       }} />
                    </div>
                 </div>

                 <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3 mb-8">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium text-indigo-700 leading-relaxed">
                       Ces informations sont strictement confidentielles. Elles permettent de certifier votre compte et de protéger la plateforme.
                    </p>
                 </div>

                 {!(profile?.verificationStatus === 'pending' || profile?.verificationStatus === 'verified') && (
                    <button 
                     onClick={handleVerificationSubmit}
                     disabled={isProcessingAction}
                     className="w-full py-5 text-white bg-indigo-600 shadow-indigo-200 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                       {isProcessingAction 
                         ? 'Envoi en cours...' 
                         : profile?.verificationStatus === 'rejected' 
                           ? 'Corriger & Soumettre mon dossier' 
                           : 'Soumettre mon dossier'}
                    </button>
                 )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isWithdrawalModalOpen && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[150] flex items-center justify-center p-6 pb-32">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsWithdrawalModalOpen(false)} />
              <motion.div initial={{scale:0.95, opacity:0, y:20}} animate={{scale:1, opacity:1, y:0}} exit={{scale:0.95, opacity:0, y:20}} className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl flex flex-col gap-6">
                 <div>
                     <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Retrait des gains</h2>
                     <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-slate-500 font-bold">Solde Disponible : <span className="text-emerald-600 font-black">{earnings.toLocaleString('fr-FR')} FCFA</span></p>
                        {profile?.pendingWithdrawals > 0 && (
                          <p className="text-[9px] text-orange-500 font-bold italic">({profile.pendingWithdrawals.toLocaleString('fr-FR')} FCFA en attente de validation)</p>
                        )}
                      </div>
                 </div>
                 
                  <div className="space-y-4 mb-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                         onClick={() => {
                           setWithdrawalMethod('mobile_money');
                           setWithdrawalInfo(profile?.withdrawalPhone || '');
                         }}
                         type="button"
                         className={cn("flex-1 py-1 px-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all", withdrawalMethod === 'mobile_money' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400')}
                      >
                         Mobile Money
                      </button>
                      <button 
                         onClick={() => {
                           setWithdrawalMethod('bank_transfer');
                           setWithdrawalInfo(profile?.rib || '');
                         }}
                         type="button"
                         className={cn("flex-1 py-1 px-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all", withdrawalMethod === 'bank_transfer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400')}
                      >
                         RIB / IBAN
                      </button>
                    </div>

                    <div className="space-y-1.5 px-1">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                          {withdrawalMethod === 'mobile_money' ? 'Numéro de retrait' : 'Coordonnées Bancaires (RIB)'}
                       </label>
                       <input 
                          type="text" 
                          placeholder={withdrawalMethod === 'mobile_money' ? "Ex: 0707..." : "Ex: CM21..."}
                          value={withdrawalInfo}
                          onChange={e => setWithdrawalInfo(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold focus:border-indigo-500 outline-none"
                       />
                    </div>
                  </div>

                 <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Montant à retirer</label>
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                       <span className="text-slate-400 font-bold">FCFA</span>
                    </div>
                    <input 
                      type="number"
                      value={withdrawalAmountInput}
                      onChange={e => setWithdrawalAmountInput(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full pl-16 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 placeholder:font-medium"
                    />
                 </div>
                 
                 <div className="flex gap-4">
                    <button onClick={() => setIsWithdrawalModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                      Annuler
                    </button>
                    <button onClick={handleWithdrawal} disabled={isWithdrawing || !withdrawalAmountInput || Number(withdrawalAmountInput) < 100 || Number(withdrawalAmountInput) > earnings || !withdrawalInfo} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50">
                      Confirmer
                    </button>
                 </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* DETAILS DE LA COURSE MODAL */}
        <AnimatePresence>
          {selectedHistoryJob && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
              <div className="absolute inset-0" onClick={() => setSelectedHistoryJob(null)} />
              <motion.div initial={{ y: '100%', opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: '100%', opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 flex flex-col gap-6">
                 <div className="flex justify-between items-center text-left">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Détails de la course</h3>
                    <button onClick={() => setSelectedHistoryJob(null)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><X className="w-5 h-5" /></button>
                 </div>

                 <div className="space-y-6 text-left">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID de course</p>
                          <p className="text-sm font-bold text-slate-800">#{selectedHistoryJob.id.toUpperCase()}</p>
                       </div>
                       <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">Livré</span>
                    </div>

                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Points d'itinéraire</p>
                       <div className="space-y-4 border-l-2 border-slate-100 pl-4 relative ml-2">
                          <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white shadow-sm" />
                          <div>
                             <p className="text-[10px] font-black uppercase text-slate-400">Origine</p>
                             <p className="text-sm font-bold text-slate-800">{selectedHistoryJob.from.address}</p>
                          </div>
                          <div className="absolute -left-[5px] bottom-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-sm" />
                          <div>
                             <p className="text-[10px] font-black uppercase text-slate-400">Destination</p>
                             <p className="text-sm font-bold text-slate-800">{selectedHistoryJob.to.address}</p>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-left">
                       <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#a1a1aa]">Montant</p>
                          <p className="text-sm font-black text-slate-900 mt-1">{selectedHistoryJob.cost} F</p>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#a1a1aa]">Distance</p>
                          <p className="text-sm font-black text-slate-900 mt-1">
                            {calculateDistance(
                              selectedHistoryJob.from?.lat || 0,
                              selectedHistoryJob.from?.lng || 0,
                              selectedHistoryJob.to?.lat || 0,
                              selectedHistoryJob.to?.lng || 0
                            ).toFixed(1)} km
                          </p>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#a1a1aa]">Règlement</p>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 truncate">{selectedHistoryJob.paymentMethod || 'Espèces'}</p>
                       </div>
                    </div>

                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Informations Commanditaire</p>
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                          <div className="flex justify-between">
                             <span className="text-xs font-medium text-slate-400 font-bold">Nom complet:</span>
                             <span className="text-xs font-black text-slate-800">{selectedHistoryJob.clientName || 'Anonyme'}</span>
                          </div>
                          {selectedHistoryJob.clientPhone && (
                             <div className="flex justify-between">
                                <span className="text-xs font-medium text-slate-400 font-bold">Téléphone:</span>
                                <span className="text-xs font-black text-slate-800">{selectedHistoryJob.clientPhone}</span>
                             </div>
                          )}
                          <div className="flex justify-between">
                             <span className="text-xs font-bold text-slate-400">État du Paiement:</span>
                             <span className="text-xs font-black text-[10px] uppercase text-emerald-600 font-black">{selectedHistoryJob.paymentStatus === 'paid' ? 'Payé (Compte)' : 'Régler cash / Terminée'}</span>
                          </div>
                       </div>
                    </div>

                    {selectedHistoryJob.notes && (
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Notes spécifiques</p>
                          <p className="text-xs font-medium text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">{selectedHistoryJob.notes}</p>
                       </div>
                    )}
                 </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-2xl flex items-center gap-3">
           <Zap className="w-4 h-4 text-orange-500" />
           {toastMessage}
        </div>
      )}
      
      {/* Interactive Guide Modal */}
      <AnimatePresence>
        {isGuideOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-4xl shadow-2xl border border-slate-100 relative max-h-[95vh] flex flex-col overflow-hidden"
            >
              <button 
                onClick={() => setIsGuideOpen(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white/80 backdrop-blur-sm hover:bg-slate-50 rounded-full transition-colors z-50 cursor-pointer shadow-sm border border-slate-100"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <UserGuide />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive FAQ Modal */}
      <AnimatePresence>
        {isFaqOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-3xl shadow-2xl border border-slate-100 relative max-h-[95vh] flex flex-col overflow-hidden"
            >
              <button 
                onClick={() => setIsFaqOpen(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white/80 backdrop-blur-sm hover:bg-slate-50 rounded-full transition-colors z-50 cursor-pointer shadow-sm border border-slate-100"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <StaticFAQ />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Available Missions List Modal */}
      <AnimatePresence>
        {showAvailableMissionsModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-50 rounded-[32px] w-full max-w-lg p-6 shadow-2xl border border-slate-100 relative max-h-[85vh] overflow-y-auto flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black italic text-slate-900 tracking-tighter uppercase flex items-center gap-2">
                    <Compass className="w-5 h-5 text-orange-500 animate-spin-slow" />
                    Radar de course
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                    Missions disponibles (Du plus récent au plus ancien)
                  </p>
                </div>
                <button 
                  onClick={() => setShowAvailableMissionsModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {sortedPendingJobs.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-200">
                      <Compass className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Aucune mission disponible</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      Le radar cherche en temps réel... Restez connecté !
                    </p>
                  </div>
                ) : (
                  sortedPendingJobs.map((job) => {
                    const distanceToPickup = userLocation 
                      ? calculateDistance(userLocation.lat, userLocation.lng, job.from.lat, job.from.lng)
                      : null;
                    const distanceToDropoff = calculateDistance(job.from.lat, job.from.lng, job.to.lat, job.to.lng);
                    
                    return (
                      <div 
                        key={job.id}
                        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all relative flex flex-col gap-4 group"
                      >
                        {/* Header: ID, Price, Time, and Type */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                #{job.id.slice(-6).toUpperCase()}
                              </span>
                              {!!job.isUrgent && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                  <Zap className="w-2.5 h-2.5 fill-rose-500 text-rose-500 animate-pulse" /> Urgent
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                {job.vehicleType || "moto"}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Publié {formatTimeAgo(job.createdAt)}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xl font-black italic tracking-tight text-slate-900 block leading-none">
                              {job.clientProposedPrice || job.cost} FCFA
                            </span>
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block mt-1">
                              {distanceToDropoff.toFixed(1)} km de course
                            </span>
                          </div>
                        </div>

                        {/* Route details */}
                        <div className="space-y-3 relative pl-3 border-l-2 border-dashed border-slate-200 ml-1">
                          <div className="relative">
                            <div className="absolute left-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Ramassage (Collecte)</p>
                            <p className="text-xs font-bold text-slate-700 truncate mt-1">{job.from.address}</p>
                            {distanceToPickup !== null && (
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                                📍 À {distanceToPickup.toFixed(1)} km de votre position
                              </p>
                            )}
                          </div>
                          <div className="relative">
                            <div className="absolute left-[-17px] bottom-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-white" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Livraison (Destinataire)</p>
                            <p className="text-xs font-bold text-slate-900 truncate mt-1">{job.to.address}</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setSelectedPendingJob(job);
                              setRadarMode('search');
                              setShowAvailableMissionsModal(false);
                            }}
                            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 cursor-pointer text-center"
                          >
                            Sélectionner &amp; Continuer
                          </button>
                          
                          <button 
                            onClick={() => {
                              handleRejectJob(job.id);
                            }}
                            className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-rose-100"
                            title="Masquer cette mission"
                          >
                            Masquer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

     {profile && chatDeliveryId && (
        <Chat 
           deliveryId={chatDeliveryId} 
           currentUser={profile} 
           isOpen={chatOpen} 
           onClose={() => setChatOpen(false)} 
        />
      )}

      {/* MISSION DETAILS MODAL */}
      <AnimatePresence>
        {showMissionDetails && focusedJob && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white rounded-t-[40px] sm:rounded-3xl w-full max-w-lg p-6 pb-12 sm:pb-6 shadow-2xl overflow-y-auto max-h-[90vh] pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Détails de la Mission</h3>
                <button onClick={() => setShowMissionDetails(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expéditeur</p>
                  <p className="text-sm font-bold text-slate-900">{focusedJob.clientName}</p>
                  <p className="text-xs text-slate-500 mt-1">{focusedJob.from.address}</p>
                  {focusedJob.senderPhone && (
                    <button onClick={() => window.open(`tel:${focusedJob.senderPhone}`)} className="mt-3 flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                      <Phone className="w-3.5 h-3.5" /> Appeler l'expéditeur
                    </button>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Destinataire</p>
                  <p className="text-sm font-bold text-slate-900">{focusedJob.to.address}</p>
                  {focusedJob.recipientPhone && (
                    <button onClick={() => window.open(`tel:${focusedJob.recipientPhone}`)} className="mt-3 flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                      <Phone className="w-3.5 h-3.5" /> Appeler le destinataire
                    </button>
                  )}
                </div>

                {/* Package Details in Mission Details */}
                {focusedJob.packageDetails && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-indigo-500" /> Information Colis
                    </p>
                    <div className="flex gap-2 mb-2">
                      {focusedJob.packageDetails.size && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-extrabold uppercase">
                          Taille: {focusedJob.packageDetails.size}
                        </span>
                      )}
                      {focusedJob.packageDetails.weightStr && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-extrabold">
                          Poids: {focusedJob.packageDetails.weightStr} kg
                        </span>
                      )}
                    </div>
                    {focusedJob.packageDetails.notes && (
                      <p className="text-xs font-bold text-slate-800 mb-2">
                        Nature: <span className="font-normal text-slate-600">{focusedJob.packageDetails.notes}</span>
                      </p>
                    )}
                    {focusedJob.packageDetails.imageUrl && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Photo du colis :</p>
                        <div 
                          onClick={() => setPreviewModalImage(focusedJob.packageDetails?.imageUrl || null)}
                          className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-slate-900"
                        >
                          <img src={focusedJob.packageDetails.imageUrl} alt="Colis" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1">
                            <Eye className="w-4 h-4" /> Agrandir
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Gains Prévus</p>
                    <p className="text-lg font-black text-emerald-700">{focusedJob.cost} FCFA</p>
                  </div>
                </div>

                {/* Cancellation Section */}
                {focusedJob.status === 'accepted' && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Annulation de Course</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                      Si le client met trop de temps pour effectuer le paiement ou si vous rencontrez un problème majeur.
                    </p>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motif d'annulation</label>
                       <select 
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-rose-100 outline-none"
                       >
                          <option value="">Sélectionnez un motif</option>
                          <option value="client_slow_payment">Délai de paiement trop long</option>
                          <option value="client_unreachable">Client injoignable</option>
                          <option value="vehicle_breakdown">Panne de véhicule</option>
                          <option value="other">Autre motif</option>
                       </select>
                    </div>
                    <button 
                      disabled={isCancelling || !cancelReason}
                      onClick={() => handleCancelJob(focusedJob.id)}
                      className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all disabled:opacity-50"
                    >
                      {isCancelling ? 'Annulation...' : 'Annuler la mission'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Support Chat Button */}
      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => navigate('/messaging')}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 relative group border-2 border-white/20 cursor-pointer"
        >
          <MessageCircle className="w-6 h-6" />
          
          {/* Unread badge logic */}
          {(() => {
            const hasUnread = (supportChats || []).some((chat: any) => {
              const lastRead = localStorage.getItem('last_read_' + chat.id);
              return chat.lastMessageAt && (!lastRead || new Date(chat.lastMessageAt) > new Date(lastRead));
            });
            return hasUnread;
          })() && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
          )}
          
          {/* Tooltip */}
          <span className="absolute right-16 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
            SUPPORT CHAT
          </span>
        </button>
      </div>

      {/* Modal d'Agrandissement Photo du Colis */}
      <AnimatePresence>
        {previewModalImage && (
          <div 
            onClick={() => setPreviewModalImage(null)}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setPreviewModalImage(null)}
                  className="w-10 h-10 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2 flex-1 overflow-auto flex items-center justify-center">
                <img 
                  src={previewModalImage} 
                  alt="Agrandissement photo colis" 
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl"
                />
              </div>
              <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-t border-white/10">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" /> Photo du colis transmise par le client
                </span>
                <button
                  onClick={() => setPreviewModalImage(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Utility to format elapsed time in French
const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `il y a ${diffHours} h`;
    return `le ${new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return '';
  }
};
