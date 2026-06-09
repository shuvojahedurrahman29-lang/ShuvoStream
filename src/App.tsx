/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tv,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  Maximize,
  RotateCw,
  Sliders,
  Check,
  RefreshCw,
  Layers,
  AlertCircle,
  ChevronDown,
  Cast,
  Settings,
  Edit2,
  Save,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  Bell,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Channel, VideoResolution, VideoOrientation } from './types';
import { CHANNELS_DATA } from './data';
import Hls from 'hls.js';

// Firebase Integrations
import { auth, appletAuth, db, handleFirestoreError, OperationType, signInWithPopup, signOut, googleProvider, signInWithCredential, GoogleAuthProvider } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, addDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  
  // Video player stage options
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<VideoResolution>('Auto');
  const [selectedOrientation, setSelectedOrientation] = useState<VideoOrientation>('landscape');
  const [volume, setVolume] = useState(80);
  const [isResolutionDropdownOpen, setIsResolutionDropdownOpen] = useState(false);
  
  // Real Stream states
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [playerMode, setPlayerMode] = useState<'video' | 'visualizer'>('video');
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  
  // Custom Controls Overlays states
  const [controlsVisible, setControlsVisible] = useState(true);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Carousel autoplay timer reference
  const autoplayRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Dynamic Datastore States
  const [dbChannels, setDbChannels] = useState<Channel[]>([]);
  const [dbBanners, setDbBanners] = useState<any[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]); // for Admin view
  
  // Admin triggers
  const [logoClicks, setLogoClicks] = useState(0);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [fallbackAdminSignedIn, setFallbackAdminSignedIn] = useState(false); // fallback bypass authentication
  
  // Active notification shown to user
  const [displayedNotification, setDisplayedNotification] = useState<any | null>(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    } catch {
      return [];
    }
  });

  // Mobile navigation menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Admin forms
  const [adminActiveTab, setAdminActiveTab] = useState<'banners' | 'channels' | 'notifications'>('banners');
  const [adminChannelSearch, setAdminChannelSearch] = useState('');
  
  // Edit Channel Form states
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelGroup, setEditChannelGroup] = useState('');
  const [editChannelUrl, setEditChannelUrl] = useState('');
  
  // Add Channel Form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelGroup, setNewChannelGroup] = useState('Bangla');
  const [newChannelLogo, setNewChannelLogo] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [channelLogoFile, setChannelLogoFile] = useState<File | null>(null);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  
  // Add Banner Form
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [newBannerLink, setNewBannerLink] = useState('');
  const [newBannerImageBase64, setNewBannerImageBase64] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  
  // Add Notification Form
  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifMessage, setNewNotifMessage] = useState('');
  const [newNotifImageBase64, setNewNotifImageBase64] = useState('');
  const [notifFile, setNotifFile] = useState<File | null>(null);
  const [isAddingNotif, setIsAddingNotif] = useState(false);

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Subscriptions
  useEffect(() => {
    // 1. Subscribe to channels
    const channelsQuery = query(collection(db, 'channels'), orderBy('createdAt', 'desc'));
    const unsubscribeChannels = onSnapshot(channelsQuery, (snapshot) => {
      const newList: Channel[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        newList.push({
          id: doc.id,
          name: d.name || '',
          logo: d.logo || '',
          group: d.group || '',
          url: d.url || ''
        });
      });
      setDbChannels(newList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'channels');
    });

    // 2. Subscribe to banners
    const bannersQuery = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
      const newList: any[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        newList.push({
          id: doc.id,
          title: d.title || '',
          subtitle: d.subtitle || '',
          image: d.image || '',
          link: d.link || '',
          createdAt: d.createdAt
        });
      });
      setDbBanners(newList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'banners');
    });

    // 3. Subscribe to notifications
    const notifsQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribeNotifs = onSnapshot(notifsQuery, (snapshot) => {
      const activeList: any[] = [];
      const allList: any[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        const item = {
          id: doc.id,
          title: d.title || '',
          message: d.message || '',
          image: d.image || '',
          active: d.active || false,
          createdAt: d.createdAt
        };
        allList.push(item);
        if (d.active) {
          activeList.push(item);
        }
      });
      setAllNotifications(allList);
      setActiveNotifications(activeList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => {
      unsubscribeChannels();
      unsubscribeBanners();
      unsubscribeNotifs();
    };
  }, []);

  // Check for popups that are active and not dismissed
  useEffect(() => {
    if (activeNotifications.length > 0) {
      // Find first notif that is NOT dismissed yet
      const nextNotif = activeNotifications.find(n => !dismissedNotificationIds.includes(n.id));
      if (nextNotif) {
        setDisplayedNotification(nextNotif);
      } else {
        setDisplayedNotification(null);
      }
    } else {
      setDisplayedNotification(null);
    }
  }, [activeNotifications, dismissedNotificationIds]);

  const dismissNotification = (id: string) => {
    const updated = [...dismissedNotificationIds, id];
    setDismissedNotificationIds(updated);
    setDisplayedNotification(null);
    localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
  };

  // Autoplay slider logic
  useEffect(() => {
    if (dbBanners.length === 0) return;
    autoplayRef.current = setInterval(() => {
      setCurrentSlideIndex((prevIdx) => (prevIdx + 1) % dbBanners.length);
    }, 6000);

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [dbBanners.length]);

  const handleSlideChange = (index: number) => {
    setCurrentSlideIndex(index);
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      if (dbBanners.length > 0) {
        autoplayRef.current = setInterval(() => {
          setCurrentSlideIndex((prevIdx) => (prevIdx + 1) % dbBanners.length);
        }, 6000);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAdminLoginError('');
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== 'shuvojahedurrahman29@gmail.com') {
        setAdminLoginError('অনুমোদিত অ্যাডমিন অ্যাকাউন্ট নয়!');
        await signOut(auth);
        await signOut(appletAuth);
      } else {
        // Since we are also using applet database for data persistence,
        // we must sign in to the appletAuth instance as well with the google credentials.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
          await signInWithCredential(appletAuth, credential);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAdminLoginError('গুগল লগইন ব্যর্থ হয়েছে। পাসকোড দিয়ে প্রবেশ করুন।');
    }
  };

  const handleToggleNotification = async (id: string, currentStatus: boolean) => {
    try {
      await setDoc(doc(db, 'notifications', id), { active: !currentStatus }, { merge: true });
    } catch (err: any) {
      console.error(err);
      alert('স্ট্যাটাস পরিবর্তন ব্যর্থ: ' + err.message);
    }
  };

  // Helper for local image resizing / gallery compress
  const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.65); // high compression for lightning fast DB loads
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Image load error"));
      };
      reader.onerror = () => reject(new Error("File read error"));
    });
  };

  // Helper for resizing banner to exactly 425x228
  const compressBannerImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 425;
          canvas.height = 228;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, 425, 228);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Image load error"));
      };
      reader.onerror = () => reject(new Error("File read error"));
    });
  };

  // Helper for translating categories to Bangla
  const getGroupLabel = (group: string) => {
    if (group === 'Bangla' || group === 'বাংলা') return 'বাংলা';
    if (group === 'Sports' || group === 'খেলাধুলা') return 'খেলাধুলা';
    if (group === 'Religious' || group === 'ধর্মীয়') return 'ধর্মীয়';
    return group;
  };

  // Merge static channels list with custom firebase channels, supporting logo overrides and deleted flags
  const allChannels = [
    ...CHANNELS_DATA.map(sc => {
      const override = dbChannels.find(dbc => dbc.id === sc.id);
      if (override) {
        return { ...sc, ...override };
      }
      return sc;
    }).filter(sc => {
      const override = dbChannels.find(dbc => dbc.id === sc.id);
      return !override?.deleted;
    }),
    ...dbChannels.filter(dbc => dbc.id.startsWith('custom-') && !dbc.deleted)
  ];

  // Filter channels based solely on search query
  const filteredSearchChannels = allChannels.filter((channel) => {
    const query = searchQuery.toLowerCase();
    return (
      channel.name.toLowerCase().includes(query) ||
      channel.group.toLowerCase().includes(query) ||
      getGroupLabel(channel.group).toLowerCase().includes(query)
    );
  });

  // Unique channel groups list to build horizontal sections dynamically
  const groupBangla = allChannels.filter(c => c.group === 'Bangla' || c.group === 'বাংলা');
  const groupSports = allChannels.filter(c => c.group === 'Sports' || c.group === 'খেলাধুলা');
  const groupReligious = allChannels.filter(c => c.group === 'Religious' || c.group === 'ধর্মীয়');

  const playChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setIsPlaying(true);
    // Smooth scroll to the top of the player area
    const playerElement = document.getElementById('media-player-stage');
    if (playerElement) {
      playerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle keys copying for sharing
  const [shareFeedback, setShareFeedback] = useState(false);
  const copyShareLink = (channel: Channel) => {
    const link = `${window.location.origin}${window.location.pathname}?channel=${channel.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    }).catch(() => {
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    });
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('player-container-wrapper');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.log('Error triggering fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const getPrevNextChannels = () => {
    if (!activeChannel) return { prev: null, next: null };
    const list = filteredSearchChannels.length > 0 ? filteredSearchChannels : CHANNELS_DATA;
    const index = list.findIndex(c => c.id === activeChannel.id);
    if (index === -1) return { prev: null, next: null };
    const prevIndex = (index - 1 + list.length) % list.length;
    const nextIndex = (index + 1) % list.length;
    return {
      prev: list[prevIndex],
      next: list[nextIndex]
    };
  };

  const effectiveDuration = duration > 0 ? duration : 2501;
  const effectiveCurrentTime = currentTime > 0 ? (currentTime % effectiveDuration) : 0;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const targetVal = Number(e.target.value);
    video.currentTime = targetVal;
    setCurrentTime(targetVal);
    resetControlsTimeout();
  };

  // URL parsing parameter launcher
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const channelId = params.get('channel');
    if (channelId) {
      const match = CHANNELS_DATA.find((c) => c.id === channelId);
      if (match) {
        setActiveChannel(match);
      }
    }
  }, []);

  // Controls overlay auto-hide logic
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 3500);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, activeChannel]);

  // Track continuous playback progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    const handleDurationChange = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      } else {
        setDuration(0);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [activeChannel]);

  // Real dynamic streaming HLS.js configuration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset error state and start loading
    setStreamError(null);
    setIsStreamLoading(true);

    if (!activeChannel) {
      video.src = '';
      return;
    }

    // Check for HTTPS vs HTTP mixed content warning on browser/mobile
    if (window.location.protocol === 'https:' && activeChannel.url.startsWith('http://')) {
      setStreamError("আপনার ব্রাউজারে নিরাপত্তাজনিত কারণে 'HTTP' লাইভ চ্যানেল প্লে করা ব্লক করা হয়েছে। এটি একটি HTTPS ওয়েবসাইটে 'Mixed Content' নিরাপত্তা সমস্যা। সমাধান পেতে অনুগ্রহ করে ব্রাউজার সেটিংসে গিয়ে Insecure Content পারমিশন Allow দিন অথবা অন্য কোনো HTTPS চ্যানেল প্লে করুন।");
      setIsStreamLoading(false);
      return;
    }

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        maxBufferSize: 15 * 1024 * 1024, // Keep memory profile lightweight
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      setHlsInstance(hls);
      hls.loadSource(activeChannel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsStreamLoading(false);
        if (isPlaying) {
          video.play().catch((err) => {
            console.log("Stream play triggered but browser auto-play blocked it:", err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn("HLS stream warning/error details:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Fatal network error - trying recovery.");
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Fatal media error - trying recovery.");
              hls?.recoverMediaError();
              break;
            default:
              setStreamError("লাইভ চ্যানেলটি আপনার ব্রাউজার বা নেটওয়ার্কে লোড করা যাচ্ছে না। এটি একটি ইন্টারনেট স্ট্রিমিং লিঙ্ক যা সাময়িক ডাউন হতে পারে অথবা ব্রাউজার সিকিউরিটি ব্লকিংয়ের শিকার হতে পারে।");
              setIsStreamLoading(false);
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Direct stream play if native support is present (like iOS, macOS Safari)
      video.src = activeChannel.url;
      const handleLoadMeta = () => {
        setIsStreamLoading(false);
        if (isPlaying) {
          video.play().catch(err => console.log("Stream play failed:", err));
        }
      };
      const handleStreamErr = () => {
        setStreamError("লাইভ চ্যানেলটি লোড করা যাচ্ছে না। স্পনসর করা লিঙ্কটি নিষ্ক্রিয় বা ডাউন থাকতে পারে।");
        setIsStreamLoading(false);
      };

      video.addEventListener('loadedmetadata', handleLoadMeta);
      video.addEventListener('error', handleStreamErr);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadMeta);
        video.removeEventListener('error', handleStreamErr);
      };
    } else {
      setStreamError("আপনার ব্রাউজারে HLS (.m3u8) মিডিয়া স্ট্রিমিং সাপোর্ট করে না।");
      setIsStreamLoading(false);
    }

    return () => {
      if (hls) {
        hls.destroy();
        setHlsInstance(null);
      }
    };
  }, [activeChannel]);

  // Sync play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync volume state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = volume / 100;
  }, [volume, isMuted]);

  if (activeChannel) {
    return (
      <div 
        id="player-container-wrapper"
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
        onClick={resetControlsTimeout}
        className="fixed inset-0 bg-black text-white flex flex-col justify-center items-center select-none font-sans overflow-hidden z-50"
      >
        {/* Top Header Controls hud overlay */}
        <div className={`absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 to-transparent p-4 md:p-6 flex items-center justify-between transition-opacity duration-300 ${
          controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {/* Channel Logo & Name details */}
          <div className="flex items-center gap-3">
            <img
              src={activeChannel.logo}
              alt={activeChannel.name}
              className="w-10 h-10 object-contain rounded bg-white p-1 shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png';
              }}
            />
            <div>
              <h2 className="text-sm md:text-base font-bold font-bengali text-white flex items-center gap-1.5">
                {activeChannel.name}
                <span className="text-[10px] bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded border border-red-650/40 font-bengali font-bold">
                  লাইভ
                </span>
              </h2>
              <span className="text-[11px] text-zinc-400 font-bengali block">
                ● লাইভ এইচডি প্রবাহে সংযুক্ত
              </span>
            </div>
          </div>

          {/* Close Indicator X Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveChannel(null);
            }}
            className="p-2.5 bg-zinc-900/80 hover:bg-red-600 hover:border-red-600 text-white rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md border border-white/10"
            title="বাহির হোন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central visual frame container */}
        <div 
          onClick={() => setControlsVisible(!controlsVisible)}
          className="relative w-full h-full max-w-5xl bg-black overflow-hidden flex items-center justify-center cursor-pointer"
        >
          <video
            ref={videoRef}
            className="w-full max-h-[85vh] object-contain bg-black pointer-events-none"
            autoPlay={isPlaying}
            muted={isMuted}
            playsInline
            controls={false}
          />

          {/* Buffering Indicator */}
          {isStreamLoading && !streamError && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col justify-center items-center z-10 space-y-3 pointer-events-none">
              <RefreshCw className="w-10 h-10 text-red-600 animate-spin" />
              <p className="font-bengali text-xs text-zinc-350">বাফারিং হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন</p>
            </div>
          )}

          {/* Error Message Display */}
          {streamError && (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col justify-center items-center z-20 px-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-500 animate-bounce" />
              <p className="font-bengali text-sm text-zinc-200 max-w-md">{streamError}</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveChannel(null);
                }}
                className="bg-red-650 hover:bg-red-700 bg-red-600 font-bengali font-bold text-xs text-white px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                বন্ধ করে ফিরে যান
              </button>
            </div>
          )}

          {/* Giant Glassy Central Round Trigger for Play / Pause state */}
          {!isStreamLoading && !streamError && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
                resetControlsTimeout();
              }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-5 bg-white text-zinc-950 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-90 z-30 cursor-pointer ${
                controlsVisible || !isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-zinc-950 text-zinc-950" />
              ) : (
                <Play className="w-8 h-8 fill-zinc-950 text-zinc-950 ml-1" />
              )}
            </button>
          )}
        </div>

        {/* Bottom Hud Timeline / Volume Overlays */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 md:p-6 transition-opacity duration-300 md:px-8 ${
            controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Red Scrubber */}
          <div className="relative pt-1 pb-2 px-1 flex items-center">
            <input
              type="range"
              min="0"
              max={effectiveDuration}
              value={effectiveCurrentTime}
              onChange={handleScrubberChange}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-600 transition-all duration-100"
              style={{
                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(effectiveCurrentTime / effectiveDuration) * 100}%, rgba(255,255,255,0.2) ${(effectiveCurrentTime / effectiveDuration) * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            {/* Direct elapsed time indicator */}
            <div className="bg-black/70 px-3 py-1 rounded-lg text-xs font-mono text-zinc-200 flex items-center gap-2 border border-white/5 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
              <span className="font-bengali">
                {formatTime(effectiveCurrentTime)} / {formatTime(effectiveDuration)}
              </span>
            </div>

            {/* Speaker & Screens */}
            <div className="flex items-center gap-3">
              {/* Volume Sound controller */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="p-2 text-white hover:text-red-500 transition-colors bg-black/60 hover:bg-black/80 rounded-full border border-white/5 cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-500 animate-pulse" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 md:w-20 accent-red-600 h-1 bg-zinc-800 rounded-lg cursor-pointer"
              />

              {/* Fullscreen Trigger */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-2 text-white hover:text-red-500 transition-colors bg-black/60 hover:bg-black/80 rounded-full border border-white/5 cursor-pointer"
              >
                <Maximize className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white pb-0 selection:bg-red-600 selection:text-white">
      
      {/* Header Container */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-zinc-950/95 border-b border-zinc-900 px-4 py-3 md:px-8 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSearchQuery(''); setIsMobileMenuOpen(false); }}>
          <img 
            src="https://i.postimg.cc/Hxw9J7r5/20260606-132813.png" 
            alt="Logo" 
            className="h-14 md:h-18 w-auto object-contain hover:scale-[1.03] transition-all duration-300 rounded"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Menu layouts & Interactive links */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold font-bengali">
            <button
              onClick={() => {
                setSearchQuery('');
              }}
              className={`transition-all py-1.5 px-2 border-b-2 hover:text-white cursor-pointer ${
                searchQuery === ''
                  ? 'text-red-500 border-red-500 font-bold'
                  : 'text-zinc-400 border-transparent hover:border-zinc-800'
              }`}
            >
              সব চ্যানেল
            </button>
            <button
              onClick={() => {
                setSearchQuery('Bangla');
              }}
              className={`transition-all py-1.5 px-2 border-b-2 hover:text-white cursor-pointer ${
                searchQuery === 'Bangla' || searchQuery === 'বাংলা'
                  ? 'text-red-500 border-red-500 font-bold'
                  : 'text-zinc-400 border-transparent hover:border-zinc-800'
              }`}
            >
              বিনোদন
            </button>
            <button
              onClick={() => {
                setSearchQuery('Sports');
              }}
              className={`transition-all py-1.5 px-2 border-b-2 hover:text-white cursor-pointer ${
                searchQuery === 'Sports' || searchQuery === 'খেলাধুলা'
                  ? 'text-red-500 border-red-500 font-bold'
                  : 'text-zinc-400 border-transparent hover:border-zinc-800'
              }`}
            >
              খেলাধুলা
            </button>
            <button
              onClick={() => {
                setSearchQuery('Religious');
              }}
              className={`transition-all py-1.5 px-2 border-b-2 hover:text-white cursor-pointer ${
                searchQuery === 'Religious' || searchQuery === 'ধর্মীয়'
                  ? 'text-red-500 border-red-500 font-bold'
                  : 'text-zinc-400 border-transparent hover:border-zinc-800'
              }`}
            >
              ধর্মীয়
            </button>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-all cursor-pointer md:hidden border border-zinc-900"
            title="মেনু"
          >
            {isMobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
          </button>
        </div>
      </header>

      {/* Floating Dropdown Mobile Menu Block */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="md:hidden sticky top-[73px] z-39 w-full bg-zinc-950/98 backdrop-blur-lg border-b border-zinc-900 px-4 py-4 space-y-3.5 shadow-2xl font-bengali text-sm font-semibold flex flex-col"
          >
            <button
              onClick={() => {
                setSearchQuery('');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full py-2 px-3.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                searchQuery === ''
                  ? 'bg-red-650/10 bg-red-600/10 text-red-500 border border-red-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <span>সব চ্যানেল</span>
              {searchQuery === '' && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
            </button>

            <button
              onClick={() => {
                setSearchQuery('Bangla');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full py-2 px-3.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                searchQuery === 'Bangla' || searchQuery === 'বাংলা'
                  ? 'bg-red-600/10 text-red-500 border border-red-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <span>বিনোদন টেলিভিশন</span>
              {(searchQuery === 'Bangla' || searchQuery === 'বাংলা') && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
            </button>

            <button
              onClick={() => {
                setSearchQuery('Sports');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full py-2 px-3.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                searchQuery === 'Sports' || searchQuery === 'খেলাধুলা'
                  ? 'bg-red-600/10 text-red-500 border border-red-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <span>লাইভ স্পোর্টস</span>
              {(searchQuery === 'Sports' || searchQuery === 'খেলাধুলা') && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
            </button>

            <button
              onClick={() => {
                setSearchQuery('Religious');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full py-2 px-3.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                searchQuery === 'Religious' || searchQuery === 'ধর্মীয়'
                  ? 'bg-red-600/10 text-red-500 border border-red-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <span>ধর্মীয় অনুষ্ঠান</span>
              {(searchQuery === 'Religious' || searchQuery === 'ধর্মীয়') && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-4 space-y-6">

        {/* Search Bar section */}
        <section className="w-full">
          <div className="relative w-full max-w-2xl mx-auto">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-zinc-500">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="চ্যানেল খুঁজুন..."
              className="w-full bg-zinc-900/90 text-white placeholder-zinc-500 pl-11 pr-10 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-zinc-900 transition-all border border-zinc-800 hover:border-zinc-700 font-bengali"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Dynamic Promotional Banner Slider (Only displays if banners exist in Firestore and no active channel) */}
        {dbBanners.length > 0 && !activeChannel && (
          <section className="w-full max-w-4xl mx-auto relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl aspect-[425/228]">
            <div className="relative w-full h-full overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlideIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 w-full h-full"
                >
                  {/* Banner Image */}
                  <img
                    src={dbBanners[currentSlideIndex].image}
                    alt={dbBanners[currentSlideIndex].title || 'ব্যানার'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Shadow Gradient Mask */}
                  {(dbBanners[currentSlideIndex].title || dbBanners[currentSlideIndex].link) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-transparent flex flex-col justify-end p-4 md:p-6">
                      <div className="flex items-end justify-between gap-4">
                        <div className="max-w-xl space-y-1 md:space-y-2">
                          {dbBanners[currentSlideIndex].title && (
                            <h2 className="text-xs md:text-xl font-bold text-white font-bengali tracking-tight leading-tight">
                              {dbBanners[currentSlideIndex].title}
                            </h2>
                          )}
                          {dbBanners[currentSlideIndex].subtitle && (
                            <p className="text-[10px] md:text-xs text-zinc-300 font-bengali line-clamp-1">
                              {dbBanners[currentSlideIndex].subtitle}
                            </p>
                          )}
                        </div>
                        
                        {dbBanners[currentSlideIndex].link && (
                          <div className="shrink-0 mb-0.5">
                            <button
                              onClick={() => {
                                const ch = allChannels.find(c => c.id === dbBanners[currentSlideIndex].link);
                                if (ch) playChannel(ch);
                              }}
                              className="bg-red-650/90 hover:bg-solid text-white font-semibold font-bengali text-[10px] md:text-xs px-3.5 py-1.5 md:px-4 md:py-2 rounded-full cursor-pointer transition-all duration-200 active:scale-95 shadow-md flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>এখনই দেখুন</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              
              {/* Manual navigation arrows */}
              {dbBanners.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const prev = (currentSlideIndex - 1 + dbBanners.length) % dbBanners.length;
                      handleSlideChange(prev);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const next = (currentSlideIndex + 1) % dbBanners.length;
                      handleSlideChange(next);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            
            {/* Visual Dot Indicators */}
            {dbBanners.length > 1 && (
              <div className="absolute right-6 bottom-4 flex items-center gap-1.5 z-10">
                {dbBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSlideChange(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlideIndex ? 'w-4 bg-red-600' : 'w-1.5 bg-zinc-600 hover:bg-zinc-500'}`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Dynamic Video Player Stage at the top if activeChannel is set */}
        <AnimatePresence>
          {activeChannel && (
            <motion.section
              key="video-player-stage"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              id="media-player-stage"
              className="w-full bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl p-4 md:p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    className="w-10 h-10 object-contain rounded bg-white p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png';
                    }}
                  />
                  <div>
                    <h2 className="text-base md:text-lg font-bold font-bengali text-white flex items-center gap-2">
                      {activeChannel.name} 
                      <span className="text-xs bg-red-600/15 text-red-500 px-2 py-0.5 rounded border border-red-600/30 font-bengali font-semibold">
                        লাইভ
                      </span>
                    </h2>
                    <span className="text-xs text-red-500 font-semibold tracking-tight block font-bengali">
                      ● সরাসরি সম্প্রচার সচল রয়েছে
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyShareLink(activeChannel)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 font-bengali relative"
                  >
                    <Share2 className="w-4 h-4 text-red-500" />
                    <span>{shareFeedback ? 'সংযুক্ত হ লিঙ্ক কপিড' : 'শেয়ার লিঙ্ক'}</span>
                  </button>
                  <button
                    onClick={() => setActiveChannel(null)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Video Monitor Stage Wrapper */}
              <div className="relative w-full flex flex-col items-center justify-center">
                
                {/* Responsive container based on selected orientation of preview */}
                <div
                  id="player-container-wrapper"
                  onMouseMove={resetControlsTimeout}
                  onTouchStart={resetControlsTimeout}
                  onClick={resetControlsTimeout}
                  className={`group relative bg-black border border-zinc-950 shadow-inner overflow-hidden transition-all duration-500 w-full ${
                    selectedOrientation === 'landscape'
                      ? 'aspect-[16/9] max-w-4xl rounded-2xl'
                      : 'aspect-[9/16] max-w-sm rounded-[32px] border-8 border-zinc-800'
                  }`}
                >
                  {/* Real video stream renderer */}
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-contain bg-zinc-950 ${playerMode === 'video' && !streamError ? 'block' : 'hidden'}`}
                    autoPlay={isPlaying}
                    muted={isMuted}
                    playsInline
                    controls={false}
                  />

                  {/* Centered notification text / "মাঝ বরাবর লেখা" when video is playing & controls are visible */}
                  {playerMode === 'video' && !streamError && !isStreamLoading && (isPlaying || controlsVisible) && (
                    <div className="absolute top-[18%] left-1/2 -translate-x-1/2 pointer-events-none z-10 select-none animate-fade-in text-center max-w-[85%]">
                      <p className="text-zinc-100 font-bengali text-xs md:text-sm font-semibold bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-xl tracking-wide uppercase">
                        {activeChannel.name} লাইভ সম্প্রচারিত হচ্ছে
                      </p>
                    </div>
                  )}

                  {/* Custom Controls HUD Layer overlaying the video player */}
                  {playerMode === 'video' && !streamError && !isStreamLoading && (
                    <div 
                      className={`absolute inset-0 bg-black/30 flex flex-col justify-between p-4 z-20 transition-opacity duration-300 ${
                        controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      {/* Top Overlay Bar */}
                      <div className="flex items-center justify-between">
                        {/* Left: Down arrow to close/minimize */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveChannel(null); }} 
                          className="p-2 text-white/90 hover:text-white transition-all bg-black/55 hover:bg-black/75 rounded-full cursor-pointer hover:scale-105 active:scale-95 shadow-md border border-white/5"
                          title="বন্ধ করুন"
                        >
                          <ChevronDown className="w-5 h-5 text-white" />
                        </button>

                        {/* Top Center: Custom Autoplay toggle switch */}
                        <div className="flex items-center gap-2 bg-black/55 px-3 py-1.5 rounded-full border border-white/5 shadow-md">
                          <span className="text-[10px] font-bengali font-bold tracking-wide text-white/95">অটোপ্লে</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setAutoPlayNext(!autoPlayNext);
                            }} 
                            className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${autoPlayNext ? 'bg-red-600' : 'bg-zinc-700'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 flex items-center justify-center ${autoPlayNext ? 'translate-x-4' : 'translate-x-0'}`}>
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                            </span>
                          </button>
                        </div>

                        {/* Top Right: Cast, CC, Settings icons */}
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); alert("ক্রোমকাস্ট স্ক্রিন ডিভাইস অনুসন্ধান করা হচ্ছে..."); }} 
                            className="p-2 text-white/90 hover:text-white transition-all bg-black/55 hover:bg-black/75 rounded-full cursor-pointer hover:scale-105 active:scale-95 shadow-md border border-white/5"
                            title="ক্রোমকাস্ট"
                          >
                            <Cast className="w-4 h-4 text-white" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); alert("সাবটাইটেল ভাষা: বাংলা (স্বয়ংক্রিয়)"); }} 
                            className="p-2 text-white/90 hover:text-white transition-all bg-black/55 hover:bg-black/75 rounded-full cursor-pointer hover:scale-105 active:scale-95 shadow-md border border-white/5 text-[10px] font-black leading-none"
                            title="সাবটাইটেল"
                          >
                            CC
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsResolutionDropdownOpen(!isResolutionDropdownOpen); }} 
                            className="p-2 text-white/90 hover:text-white transition-all bg-black/55 hover:bg-black/75 rounded-full cursor-pointer hover:scale-105 active:scale-95 shadow-md border border-white/5 relative"
                            title="সেটিংস"
                          >
                            <Settings className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>

                      {/* Center Overlay: Prev Channel, Big Play/Pause, Next Channel */}
                      <div className="flex items-center justify-center gap-7 md:gap-14">
                        {/* Prev Channel Zapper */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const { prev } = getPrevNextChannels();
                            if (prev) playChannel(prev);
                          }}
                          className="p-3 bg-black/55 hover:bg-black/75 text-white hover:text-red-500 rounded-full transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-lg border border-white/5"
                          title="পূর্ববর্তী চ্যানেল"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>

                        {/* Central Play/Pause Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPlaying(!isPlaying);
                          }}
                          className="p-5 md:p-6 bg-black/60 hover:bg-black/80 text-white hover:text-red-500 rounded-full transition-all cursor-pointer hover:scale-110 active:scale-90 shadow-xl border border-white/10"
                          title={isPlaying ? "বন্ধ করুন" : "চালু করুন"}
                        >
                          {isPlaying ? (
                            <Pause className="w-8 h-8 fill-current" />
                          ) : (
                            <Play className="w-8 h-8 fill-current ml-1" />
                          )}
                        </button>

                        {/* Next Channel Zapper */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const { next } = getPrevNextChannels();
                            if (next) playChannel(next);
                          }}
                          className="p-3 bg-black/55 hover:bg-black/75 text-white hover:text-red-500 rounded-full transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-lg border border-white/5"
                          title="পরবর্তী চ্যানেল"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Bottom Overlay Info & Scrubber */}
                      <div className="space-y-4">
                        <div className="flex items-end justify-between px-1">
                          {/* Left: Standard Duration label */}
                          <div className="bg-black/55 px-2.5 py-1 rounded-md text-xs font-mono text-zinc-100 flex items-center gap-1.5 border border-white/5 shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-650 bg-red-600 animate-pulse"></span>
                            <span>{formatTime(effectiveCurrentTime)} / {formatTime(effectiveDuration)}</span>
                          </div>

                          {/* Right: Fullscreen expander arrow */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFullscreen();
                            }}
                            className="p-2 text-white/90 hover:text-white transition-all bg-black/55 hover:bg-black/75 rounded-full cursor-pointer hover:scale-105 active:scale-95 shadow-md border border-white/5"
                            title="ফুলস্ক্রিন"
                          >
                            <Maximize className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        {/* Interactive red timeline progress bar */}
                        <div className="relative pt-1 pb-1 px-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="range"
                            min="0"
                            max={effectiveDuration}
                            value={effectiveCurrentTime}
                            onChange={handleScrubberChange}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-600 transition-all duration-100"
                            style={{
                              background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(effectiveCurrentTime / effectiveDuration) * 100}%, rgba(255,255,255,0.2) ${(effectiveCurrentTime / effectiveDuration) * 100}%, rgba(255,255,255,0.2) 100%)`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Equalizer view OR loading/error overlays */}
                  {(playerMode === 'visualizer' || streamError || isStreamLoading) && (
                    <div className="absolute inset-0 flex flex-col justify-between p-6 bg-zinc-950 bg-opacity-90">
                      {/* Simulated digital noise and color scanline backdrop */}
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/[0.02] to-transparent bg-[length:100%_4px]"></div>
                      
                      {/* Active streaming monitor indicator bars */}
                      <div className="flex items-center justify-between z-10 animate-fade-in">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${streamError ? 'bg-amber-500' : 'bg-red-600 animate-ping'}`}></span>
                          <span className="text-[10px] font-mono tracking-wider text-red-500 uppercase bg-red-950/80 px-2 py-0.5 rounded border border-red-900/30">
                            {streamError ? 'সংযোগে ত্রুটি রয়েছে' : 'এইচডি লাইভ সম্প্রচার'}
                          </span>
                        </div>
                        
                        <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                          {selectedResolution} • {selectedOrientation === 'landscape' ? 'ল্যান্ডস্কেপ (১৬:৯)' : 'পোর্ট্রেট (৯:১৬)'}
                        </div>
                      </div>

                      {/* Video states loading/error/equalizer */}
                      <div className="flex flex-col items-center justify-center py-10 text-center select-none space-y-4">
                        {isStreamLoading && !streamError ? (
                          <div className="flex flex-col items-center space-y-3 animate-pulse">
                            <RefreshCw className="w-10 h-10 text-red-500 animate-spin" />
                            <p className="font-bengali text-sm text-zinc-300">মিডিয়া বাফার লোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন</p>
                          </div>
                        ) : streamError ? (
                          <div className="flex flex-col items-center space-y-3 max-w-md px-4">
                            <AlertCircle className="w-12 h-12 text-amber-500 animate-bounce" />
                            <p className="font-bengali text-sm text-zinc-100 font-semibold">{streamError}</p>
                            <p className="font-bengali text-[11px] text-zinc-400 leading-relaxed">
                              পরামর্শ: কিছু ইন্টারনেট ব্রাউজার মিক্সড প্রোটোকল (HTTPS সাইটে HTTP লিঙ্ক) সিকিউরিটি ব্লকিংয়ের কারণে লাইভ স্ট্রিমিং রান করতে বাধা দেয়। এছাড়া আইপি জিও-ব্লকিং কিংবা ডাউন লিঙ্কের জন্য এমন হতে পারে।
                            </p>
                          </div>
                        ) : playerMode === 'visualizer' && isPlaying ? (
                          <div className="flex items-end justify-center gap-1.5 h-16">
                            {Array.from({ length: selectedOrientation === 'landscape' ? 24 : 12 }).map((_, i) => {
                              const durationNum = 0.5 + Math.abs(Math.sin(i)) * 1.5;
                              return (
                                <motion.div
                                  key={i}
                                  animate={{ height: [12, 64, 16, 48, 12] }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: durationNum,
                                    ease: 'easeInOut'
                                  }}
                                  className="w-1.5 rounded-full bg-gradient-to-t from-red-650 via-red-500 to-amber-500"
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-16 flex items-center justify-center">
                            <span className="text-zinc-600 font-mono tracking-widest text-xs uppercase font-bengali">
                              প্লেব্যাক স্থগিত
                            </span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <p className="font-bengali text-xs text-zinc-400">
                            {activeChannel.name} • স্ট্রিমিং সোর্স সক্রিয়
                          </p>
                        </div>
                      </div>

                      {/* Live stats watermarks inside video frame */}
                      <div className="flex items-center justify-between z-10 text-zinc-400 text-[10px] font-mono">
                        <div className="bg-black/40 px-2 py-1 rounded font-bengali">
                          <span>ফ্রেম রেট: ৬০</span>
                        </div>
                        <div className="bg-black/40 px-2 py-1 rounded flex items-center gap-1.5 font-bengali">
                          <RefreshCw className="w-3 h-3 text-red-500 animate-spin" />
                          <span>অবস্থা: সচল</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Corner indicator overlay when playing video so you know it's live */}
                  {playerMode === 'video' && !streamError && (
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded backdrop-blur-sm shadow border border-white/5">
                      <span className="w-2 h-2 rounded-full bg-red-650 bg-red-600 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider font-bengali">
                        লাইভ ভিডিও
                      </span>
                    </div>
                  )}
                </div>

                {/* Simulated Custom Player Overlay Controls Bar (Bottom Settings Bar) */}
                <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 mt-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-md shadow-red-600/10 active:scale-95 cursor-pointer"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    {/* Volume management layout */}
                    <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2 border border-zinc-800">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(Number(e.target.value));
                          if (isMuted) setIsMuted(false);
                        }}
                        className="w-16 md:w-24 accent-red-600 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* View mode & Portrait/Landscape Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    
                    {/* View Mode Switcher (Video/Visualizer) */}
                    <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-855 border-zinc-800">
                      <button
                        onClick={() => {
                          setPlayerMode('video');
                          setStreamError(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-bengali transition-all cursor-pointer ${
                          playerMode === 'video'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        সরাসরি ভিডিও
                      </button>
                      <button
                        onClick={() => setPlayerMode('visualizer')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-bengali transition-all cursor-pointer ${
                          playerMode === 'visualizer'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        ভিজ্যুয়ালাইজার
                      </button>
                    </div>

                    {/* Portrait/Landscape Viewport Orientation Selector */}
                    <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                      <button
                        onClick={() => setSelectedOrientation('landscape')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-bengali transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedOrientation === 'landscape'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        ল্যান্ডস্কেপ
                      </button>
                      <button
                        onClick={() => setSelectedOrientation('portrait')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-bengali transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedOrientation === 'portrait'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        পোর্ট্রেট
                      </button>
                    </div>

                    {/* Resolution selector dropdown toggler */}
                    <div className="relative">
                      <button
                        onClick={() => setIsResolutionDropdownOpen(!isResolutionDropdownOpen)}
                        className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold font-bengali tracking-wide rounded-xl flex items-center gap-2 text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-red-500" />
                        <span>রেজোলিউশন: {selectedResolution === 'Auto' ? 'অটো' : (selectedResolution === '1080p' ? '১০৮০p' : (selectedResolution === '720p' ? '৭২০p' : '৪৮০p'))}</span>
                      </button>

                      <AnimatePresence>
                        {isResolutionDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 bottom-full mb-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden"
                          >
                            <div className="p-1 space-y-1">
                              {(['Auto', '1080p', '720p', '480p'] as const).map((res) => (
                                <button
                                  key={res}
                                  onClick={() => {
                                    setSelectedResolution(res);
                                    setIsResolutionDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bengali flex items-center justify-between transition-colors cursor-pointer ${
                                    selectedResolution === res
                                      ? 'bg-red-600/20 text-red-500 font-bold'
                                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                  }`}
                                >
                                  <span>{res === 'Auto' ? 'অটো রেজোলিউশন' : (res === '1080p' ? '১০৮০p ফুল এইচডি' : (res === '720p' ? '৭২০p এইচডি' : '৪৮০p সাধারণ'))}</span>
                                  {selectedResolution === res && <Check className="w-3.5 h-3.5 text-red-500" />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

              </div>
            </motion.section>
          )}
        </AnimatePresence>


        {/* Custom channels stream display section */}
        {searchQuery ? (
          <section className="space-y-4 pt-2">
            <div className="border-b border-zinc-900 pb-2">
              <h2 className="text-md md:text-lg font-bold font-bengali text-white">
                অনুসন্ধান ফলাফল: "{searchQuery}"
              </h2>
            </div>

            {filteredSearchChannels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredSearchChannels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => playChannel(channel)}
                    className="group flex flex-col cursor-pointer"
                  >
                    {/* Cards with pure white background */}
                    <div className="aspect-[4/3] bg-white relative flex items-center justify-center rounded-2xl p-4 shadow-xl border border-zinc-100 hover:border-red-500 hover:scale-[1.04] transition-all duration-300 overflow-hidden select-none">
                      
                      {/* LIVE identifier */}
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 font-bengali">
                        <span className="w-1.5 h-1.5 rounded-full bg-white block animate-pulse"></span>
                        লাইভ
                      </span>

                      {/* Channel logo centered */}
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-16 h-10 object-contain hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png';
                        }}
                      />

                      {/* Group label */}
                      <span className="absolute bottom-2 left-2 text-[8px] font-bold text-zinc-400 tracking-wide uppercase">
                        {getGroupLabel(channel.group)}
                      </span>
                    </div>

                    {/* Channel name below matching Hind Siliguri */}
                    <div className="mt-2.5 px-1 text-center">
                      <h3 className="text-xs md:text-sm font-semibold text-zinc-100 group-hover:text-red-500 transition-colors font-bengali truncate">
                        {channel.name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {getGroupLabel(channel.group)} ক্যাটাগরি
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800">
                <p className="font-bengali text-zinc-400 text-sm">কোনো চ্যানেল খুঁজে পাওয়া যায়নি। দয়া করে সঠিক বানান পুনরায় চেক করুন।</p>
              </div>
            )}
          </section>
        ) : (
          /* Landscape Lists - Three Main Categories Rows as requested */
          <div className="space-y-8">
            
            {/* ROW 1: জনপ্রিয় বাংলা টেলিভিশন */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                <h2 className="text-base md:text-lg font-bold font-bengali text-white flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-red-600 rounded"></span>
                  বাংলা ও বিনোদন চ্যানেল
                </h2>
                <button
                  onClick={() => setSearchQuery('Bangla')}
                  className="text-xs text-red-500 font-bold hover:underline font-bengali"
                >
                  সব দেখুন
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {groupBangla.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => playChannel(channel)}
                    className="group flex flex-col cursor-pointer"
                  >
                    {/* Channel logo container card - pure white background layout */}
                    <div className="aspect-[4/3] bg-white relative flex items-center justify-center rounded-2xl p-4 shadow-xl border border-zinc-100 hover:border-red-500 hover:scale-[1.04] transition-all duration-300 overflow-hidden select-none">
                      
                      {/* Absolute red badge on TOP-LEFT */}
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow animate-pulse-live font-bengali">
                        <span className="w-1.5 h-1.5 rounded-full bg-white block"></span>
                        লাইভ
                      </span>

                      {/* Centered logo */}
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-16 h-10 object-contain hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png';
                        }}
                      />

                      {/* Tiny category group string */}
                      <span className="absolute bottom-2 left-2 text-[8px] font-bold text-zinc-400 tracking-wide uppercase">
                        {getGroupLabel(channel.group)}
                      </span>
                    </div>

                    {/* Label list below the channel card */}
                    <div className="mt-2 px-1 text-center">
                      <h3 className="text-xs md:text-sm font-semibold text-zinc-100 group-hover:text-red-500 transition-colors font-bengali truncate">
                        {channel.name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {getGroupLabel(channel.group)} চ্যানেল
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ROW 2: স্পোর্টস টিভি */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                <h2 className="text-base md:text-lg font-bold font-bengali text-white flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-red-600 rounded"></span>
                  লাইভ স্পোর্টস চ্যানেল
                </h2>
                <button
                  onClick={() => setSearchQuery('Sports')}
                  className="text-xs text-red-500 font-bold hover:underline font-bengali"
                >
                  সব দেখুন
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {groupSports.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => playChannel(channel)}
                    className="group flex flex-col cursor-pointer"
                  >
                    {/* Channel logo container card - pure white background layout */}
                    <div className="aspect-[4/3] bg-white relative flex items-center justify-center rounded-2xl p-4 shadow-xl border border-zinc-100 hover:border-red-500 hover:scale-[1.04] transition-all duration-300 overflow-hidden select-none">
                      
                      {/* Absolute red badge on TOP-LEFT */}
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow animate-pulse-live font-bengali">
                        <span className="w-1.5 h-1.5 rounded-full bg-white block"></span>
                        লাইভ
                      </span>

                      {/* Centered logo */}
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-16 h-10 object-contain hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png';
                        }}
                      />

                      {/* Tiny category group string */}
                      <span className="absolute bottom-2 left-2 text-[8px] font-bold text-zinc-400 tracking-wide uppercase">
                        {getGroupLabel(channel.group)}
                      </span>
                    </div>

                    {/* Label list below the channel card */}
                    <div className="mt-2 px-1 text-center">
                      <h3 className="text-xs md:text-sm font-semibold text-zinc-100 group-hover:text-red-505 group-hover:text-red-500 transition-colors font-bengali truncate">
                        {channel.name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {getGroupLabel(channel.group)} চ্যানেল
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ROW 3: ধর্মীয় অনুষ্ঠান */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                <h2 className="text-base md:text-lg font-bold font-bengali text-white flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-red-600 rounded"></span>
                  লাইভ ধর্মীয় অনুষ্ঠান
                </h2>
                <button
                  onClick={() => setSearchQuery('Religious')}
                  className="text-xs text-red-500 font-bold hover:underline font-bengali"
                >
                  সব দেখুন
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {groupReligious.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => playChannel(channel)}
                    className="group flex flex-col cursor-pointer"
                  >
                    {/* Channel logo container card - pure white background layout */}
                    <div className="aspect-[4/3] bg-white relative flex items-center justify-center rounded-2xl p-4 shadow-xl border border-zinc-100 hover:border-red-500 hover:scale-[1.04] transition-all duration-300 overflow-hidden select-none">
                      
                      {/* Absolute red badge on TOP-LEFT */}
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow animate-pulse-live font-bengali">
                        <span className="w-1.5 h-1.5 rounded-full bg-white block"></span>
                        লাইভ
                      </span>

                      {/* Centered logo */}
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-16 h-10 object-contain hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png';
                        }}
                      />

                      {/* Tiny category group string */}
                      <span className="absolute bottom-2 left-2 text-[8px] font-bold text-zinc-400 tracking-wide uppercase">
                        {getGroupLabel(channel.group)}
                      </span>
                    </div>

                    {/* Label list below the channel card */}
                    <div className="mt-2 px-1 text-center">
                      <h3 className="text-xs md:text-sm font-semibold text-zinc-100 group-hover:text-red-500 transition-colors font-bengali truncate">
                        {channel.name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {getGroupLabel(channel.group)} চ্যানেল
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}
      </main>

      {/* Solid footer with design properties */}
      <footer className="mt-12 border-t border-zinc-900 py-6 px-4 pb-2 text-center bg-zinc-950/80">
        <div className="max-w-2xl mx-auto space-y-1 flex flex-col items-center">
          <img 
            onClick={() => {
              setLogoClicks(prev => {
                const next = prev + 1;
                if (next >= 5) {
                  setIsAdminDashboardOpen(true);
                  return 0;
                }
                return next;
              });
            }}
            src="https://i.postimg.cc/Hxw9J7r5/20260606-132813.png" 
            alt="Logo" 
            className="h-12 w-auto object-contain opacity-85 select-none"
            referrerPolicy="no-referrer"
          />
          <div className="text-zinc-400 font-bengali text-sm select-none font-medium">
            ©২০২৬ শুভ স্ট্রিম এইচডি
          </div>
        </div>
      </footer>

      {/* Live Push Popup Notification Modal overlay */}
      <AnimatePresence>
        {displayedNotification && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-905 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Close Button top-right */}
              <button
                onClick={() => dismissNotification(displayedNotification.id)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800 rounded-full p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-red-650/15 rounded-full border border-red-600/30 text-red-500 animate-pulse">
                  <Bell className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest font-mono">
                    জরুরী বার্তা • LIVE ALERT
                  </span>
                  <h3 className="text-lg font-bold text-white font-bengali leading-snug">
                    {displayedNotification.title}
                  </h3>
                  <p className="text-sm text-zinc-300 font-bengali leading-relaxed">
                    {displayedNotification.message}
                  </p>
                </div>

                {displayedNotification.image && (
                  <div className="w-full aspect-[16/10] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 mt-2">
                    <img
                      src={displayedNotification.image}
                      alt="Notification promo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="pt-2 w-full">
                  <button
                    onClick={() => dismissNotification(displayedNotification.id)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold font-bengali text-sm py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-red-600/10"
                  >
                    ঠিক আছে, বুঝতে পেরেছি
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Dashboard Sidebar/Modal panel */}
      <AnimatePresence>
        {isAdminDashboardOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-end bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl h-full bg-zinc-950 border-l border-zinc-900 flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-600/10 rounded-lg text-red-500 border border-red-600/20">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-white font-bengali">অ্যাডমিন কন্ট্রোল পোর্টাল</h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdminDashboardOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!((currentUser?.email === 'shuvojahedurrahman29@gmail.com') || fallbackAdminSignedIn) ? (
                  /* Admin LogIn Form wrapper */
                  <div className="max-w-md mx-auto py-12 space-y-8 flex flex-col justify-center h-full">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-red-600/10 border border-red-600/30 rounded-full flex items-center justify-center text-red-500 mx-auto">
                        <LogIn className="w-8 h-8" />
                      </div>
                      <h4 className="text-lg font-bold text-white font-bengali">অ্যাডমিন লগইন</h4>
                    </div>

                    <div className="space-y-4">
                      {/* Google Sign In option */}
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold py-3 px-4 rounded-xl transition-all font-bengali shadow cursor-pointer active:scale-95 text-sm"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3s2.822-6.3 6.3-6.3c1.706 0 3.24.68 4.363 1.774l3.076-3.076C19.188 2.502 15.938 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.898 0 10.743-4.254 10.743-11.24 0-.648-.068-1.295-.17-1.955H12.24z"
                          />
                        </svg>
                        <span>গুগল দিয়ে সাইন ইন করুন</span>
                      </button>

                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-zinc-850"></div>
                        <span className="flex-shrink mx-4 text-zinc-600 text-[10px] font-mono tracking-widest">অথবা সিকিউর পাসকোড</span>
                        <div className="flex-grow border-t border-zinc-850"></div>
                      </div>

                      {/* Passcode fallback option in case embedded iframes block custom oauth popups */}
                      <div className="space-y-2 bg-zinc-900/60 p-4 rounded-xl border border-zinc-850">
                        <label className="text-xs text-zinc-400 font-bengali block">সহজ পাসকোড ভেরিফিকেশন (বিকল্প পদ্ধতি):</label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="পাসকোড দিন..."
                            value={adminPasscode}
                            onChange={(e) => setAdminPasscode(e.target.value)}
                            className="bg-zinc-950 text-white border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-red-650 flex-1 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (adminPasscode === '2929' || adminPasscode === 'shuvo29') {
                                setFallbackAdminSignedIn(true);
                              } else {
                                setAdminLoginError('ভুল পাসকোড! দয়া করে shuvo29 অথবা 2929 ব্যবহার করে চেষ্টা করুন।');
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95 text-center font-bengali"
                          >
                            যাচাই করুন
                          </button>
                        </div>
                      </div>

                      {adminLoginError && (
                        <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs text-center font-bengali">
                          {adminLoginError}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Admin Console Dashboard panel */
                  <div className="space-y-6">
                    
                    {/* User profile identifier bar */}
                    <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                      <div>
                        <p className="text-xs font-bold text-green-400 font-mono">
                          {currentUser?.email || 'shuvojahedurrahman29@gmail.com'}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await signOut(auth);
                          await signOut(appletAuth);
                          setFallbackAdminSignedIn(false);
                          setIsAdminDashboardOpen(false);
                        }}
                        className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1.5 text-xs font-bold rounded-lg transition-all border border-red-600/20 cursor-pointer text-center font-bengali"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>প্রস্থান করুন</span>
                      </button>
                    </div>

                    {/* Tabs navigation list */}
                    <div className="grid grid-cols-3 gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                      <button
                        onClick={() => setAdminActiveTab('banners')}
                        className={`py-2 text-xs font-bold font-bengali rounded-lg transition-all cursor-pointer ${adminActiveTab === 'banners' ? 'bg-red-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
                      >
                        ব্যানার আপলোড
                      </button>
                      <button
                        onClick={() => setAdminActiveTab('channels')}
                        className={`py-2 text-xs font-bold font-bengali rounded-lg transition-all cursor-pointer ${adminActiveTab === 'channels' ? 'bg-red-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
                      >
                        চ্যানেল আপলোড
                      </button>
                      <button
                        onClick={() => setAdminActiveTab('notifications')}
                        className={`py-2 text-xs font-bold font-bengali rounded-lg transition-all cursor-pointer ${adminActiveTab === 'notifications' ? 'bg-red-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
                      >
                        পপ-আপ অ্যালার্ট
                      </button>
                    </div>

                    {/* TAB CONTENT 1: BANNERS */}
                    {adminActiveTab === 'banners' && (
                      <div className="space-y-6">
                        {/* Form area */}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newBannerImageBase64 && !bannerFile) {
                              return alert('দয়া করে গ্যালারি থেকে ছবি সিলেক্ট করুন!');
                            }
                            setIsAddingBanner(true);
                            try {
                              let base64 = newBannerImageBase64;
                              if (bannerFile) {
                                base64 = await compressBannerImage(bannerFile);
                              }
                              const bannerId = 'banner-' + Date.now();
                              const docRef = doc(db, 'banners', bannerId);
                              await setDoc(docRef, {
                                id: bannerId,
                                title: '',
                                subtitle: '',
                                image: base64,
                                link: newBannerLink,
                                createdAt: new Date()
                              });
                              setNewBannerTitle('');
                              setNewBannerSubtitle('');
                              setNewBannerLink('');
                              setNewBannerImageBase64('');
                              setBannerFile(null);
                              alert('ব্যানার ছবি সফলভাবে আপলোড হয়েছে!');
                            } catch (err: any) {
                              console.error(err);
                              alert('আপলোড ত্রুটি: ' + err.message);
                            } finally {
                              setIsAddingBanner(false);
                            }
                          }}
                          className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800 space-y-4"
                        >
                          <h4 className="text-sm font-bold text-white font-bengali flex items-center gap-2 border-b border-zinc-800/60 pb-2">
                            <Upload className="w-4 h-4 text-red-500" />
                            মোবাইল গ্যালারি থেকে ব্যানার ছবি আপলোড করুন
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-400 font-bengali block">মোবাইল গ্যালারি থেকে ইমেজ পছন্দ করুন (সাইজ: ৪২৫ × ২২৮):</label>
                              <div className="relative flex items-center justify-center border border-dashed border-zinc-800 bg-zinc-950/70 rounded-lg p-3 hover:bg-zinc-950 hover:border-zinc-700 transition-colors">
                                <input
                                  type="file"
                                  accept="image/*"
                                  required={!newBannerImageBase64}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setBannerFile(file);
                                      try {
                                        const base64 = await compressBannerImage(file);
                                        setNewBannerImageBase64(base64);
                                      } catch (err) {
                                        console.error('Error compressing:', err);
                                      }
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-1 text-center">
                                  <ImageIcon className="mx-auto h-6 w-6 text-zinc-500" />
                                  <span className="text-zinc-400 font-bengali text-[11px] block">
                                    {bannerFile ? bannerFile.name : 'গ্যালারি থেকে ফটো নির্বাচন করুন'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-400 font-bengali block">অন-ক্লিক প্লে চ্যানেল (সিলেক্ট করুন):</label>
                              <select
                                value={newBannerLink}
                                onChange={(e) => setNewBannerLink(e.target.value)}
                                className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-red-650"
                              >
                                <option value="">কোনো লিঙ্ক সংযুক্ত নেই</option>
                                {allChannels.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.group})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {newBannerImageBase64 && (
                            <div className="mt-2 flex flex-col items-center bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                              <span className="text-[11px] text-zinc-400 block mb-2 font-bengali">আপলোডকৃত ব্যানার প্রিভিউ (সাইজ: ৪২৫ × ২২৮):</span>
                              <div className="w-[425px] max-w-full aspect-[425/228] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center">
                                <img
                                  src={newBannerImageBase64}
                                  alt="Banner preview"
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isAddingBanner}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-semibold font-bengali py-2.5 rounded-xl transition-all cursor-pointer shadow-md text-xs active:scale-[0.98] flex items-center justify-center gap-1.5 font-bold"
                          >
                            {isAddingBanner ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>সংরক্ষণ হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>ব্যানার আপলোড ও সচল করুন</span>
                              </>
                            )}
                          </button>
                        </form>

                        {/* Banner List */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-zinc-450 uppercase tracking-wider text-zinc-400">বর্তমানে সচল ব্যানার সমূহ ({dbBanners.length})</h4>
                          {dbBanners.length === 0 ? (
                            <p className="text-xs text-zinc-600 font-bengali">আপলোড করা কোনো ব্যানার পাওয়া যায়নি। নতুন ব্যানার যোগ করুন।</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              {dbBanners.map((bnr) => (
                                <div key={bnr.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col justify-between space-y-2 relative overflow-hidden group">
                                  <img
                                    src={bnr.image}
                                    alt={bnr.title || 'ব্যানার'}
                                    className="aspect-[425/228] w-full object-contain bg-zinc-950 rounded border border-zinc-850"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="space-y-1">
                                    {bnr.title && (
                                      <h5 className="text-[11px] font-bold text-white truncate font-bengali mb-0.5">{bnr.title}</h5>
                                    )}
                                    {bnr.link ? (
                                      <span className="text-[10px] text-red-500 font-bold font-bengali block">
                                        সংযুক্ত চ্যানেল: 📺 {allChannels.find(c => c.id === bnr.link)?.name || bnr.link}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-zinc-500 font-bengali block">কোনো লিঙ্ক সংযুক্ত নেই</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!confirm('আপনি কি সত্যিই এই ব্যানারটি মুছে ফেলতে চান?')) return;
                                      try {
                                        await deleteDoc(doc(db, 'banners', bnr.id));
                                        alert('ব্যানার মুছে ফেলা হয়েছে!');
                                      } catch (err: any) {
                                        alert('মুছে ফেলতে ব্যর্থ: ' + err.message);
                                      }
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer shadow"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT 2: CHANNELS */}
                    {adminActiveTab === 'channels' && (
                      <div className="space-y-6">
                        {/* Channel Form */}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newChannelName || !newChannelUrl) {
                              return alert('চ্যানেলর নাম এবং স্ট্রিমিং লিঙ্ক প্রদান করুন!');
                            }
                            setIsAddingChannel(true);
                            try {
                              let logoUrl = newChannelLogo || 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png';
                              if (channelLogoFile) {
                                logoUrl = await compressImage(channelLogoFile, 300, 200);
                              }
                              const channelId = 'custom-' + newChannelName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                              const docRef = doc(db, 'channels', channelId);
                              await setDoc(docRef, {
                                id: channelId,
                                name: newChannelName,
                                group: newChannelGroup,
                                logo: logoUrl,
                                url: newChannelUrl,
                                createdAt: new Date()
                              });
                              setNewChannelName('');
                              setNewChannelUrl('');
                              setNewChannelLogo('');
                              setChannelLogoFile(null);
                              alert('নতুন চ্যানেল সফলভাবে আপলোড করা হয়েছে!');
                            } catch (err: any) {
                              console.error(err);
                              alert('আপলোড ত্রুটি: ' + err.message);
                            } finally {
                              setIsAddingChannel(false);
                            }
                          }}
                          className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800 space-y-4"
                        >
                          <h4 className="text-sm font-bold text-white font-bengali flex items-center gap-2 border-b border-zinc-801 pb-2">
                            <Plus className="w-4 h-4 text-red-500" />
                            শুভ স্ট্রিম এইচডি-তে নতুন লাইভ চ্যানেল যোগ করুন
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-400 font-bengali block">চ্যানেলের নাম (বাংলায়):</label>
                              <input
                                type="text"
                                required
                                placeholder="উদা: আরটিভি স্পোর্টস লাইভ"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-red-650"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-400 font-bengali block">ক্যাটাগরি নির্বাচন করুন:</label>
                              <select
                                value={newChannelGroup}
                                onChange={(e) => setNewChannelGroup(e.target.value)}
                                className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-red-650"
                              >
                                <option value="Bangla">বাংলা ও বিনোদন</option>
                                <option value="Sports">লাইভ স্পোর্টস</option>
                                <option value="Religious">ধর্মীয় অনুষ্ঠান</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-400 font-bengali block">লোগো ছবি (গ্যালারি থেকে ফটো অথবা অনলাইন URL):</label>
                              <div className="flex gap-2">
                                <div className="relative flex items-center justify-center border border-dashed border-zinc-800 bg-zinc-950 rounded-lg p-2 hover:bg-zinc-900 cursor-pointer w-2/5 text-center">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setChannelLogoFile(file);
                                        const base64 = await compressImage(file, 200, 150);
                                        setNewChannelLogo(base64);
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  <span className="text-zinc-400 font-bengali text-[10px] truncate">
                                    {channelLogoFile ? 'লোগো সিলেক্টেড' : 'গ্যালারি আপলোড'}
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="অথবা লোগো URL বসান..."
                                  value={newChannelLogo.startsWith('data:') ? '' : newChannelLogo}
                                  onChange={(e) => {
                                    setNewChannelLogo(e.target.value);
                                    setChannelLogoFile(null);
                                  }}
                                  className="w-3/5 bg-zinc-950 text-white border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-red-650"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-400 font-bengali block">H264 / M3U8 ব্রডকাস্ট স্ট্রিম লিঙ্ক:</label>
                              <input
                                type="text"
                                required
                                placeholder="উদা: https://example.com/live/index.m3u8"
                                value={newChannelUrl}
                                onChange={(e) => setNewChannelUrl(e.target.value)}
                                className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-red-650"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isAddingChannel}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-semibold font-bengali py-2.5 rounded-xl transition-all cursor-pointer shadow-md text-xs active:scale-[0.98] flex items-center justify-center gap-1.5 font-bold"
                          >
                            {isAddingChannel ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>সংরক্ষণ হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>নতুন লাইভ চ্যানেল সংযুক্ত করুন</span>
                              </>
                            )}
                          </button>
                        </form>

                        {/* Customer Channels List */}
                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-bengali">
                              সকল লাইভ চ্যানেল সমূহ ({allChannels.length})
                            </h4>
                            {/* Search box within administrator view */}
                            <input
                              type="text"
                              placeholder="চ্যানেল খুঁজুন (নাম বা ক্যাটাগরি)..."
                              value={adminChannelSearch}
                              onChange={(e) => setAdminChannelSearch(e.target.value)}
                              className="bg-zinc-950 text-white border border-zinc-800 rounded-lg py-1.5 px-3 text-xs w-full sm:w-64 focus:outline-none focus:border-red-600 font-bengali"
                            />
                          </div>

                          {allChannels.filter(ch => 
                            ch.name.toLowerCase().includes(adminChannelSearch.toLowerCase()) ||
                            getGroupLabel(ch.group).toLowerCase().includes(adminChannelSearch.toLowerCase())
                          ).length === 0 ? (
                            <p className="text-xs text-zinc-500 font-bengali">কোনো চ্যানেল খুঁজে পাওয়া যায়নি।</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {allChannels.filter(ch => 
                                ch.name.toLowerCase().includes(adminChannelSearch.toLowerCase()) ||
                                getGroupLabel(ch.group).toLowerCase().includes(adminChannelSearch.toLowerCase())
                              ).map((ch) => (
                                <div key={ch.id} className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl flex flex-col justify-between space-y-3">
                                  {editingChannelId === ch.id ? (
                                    /* Inline editing view */
                                    <div className="space-y-3 bg-zinc-950/40 p-2.5 rounded-lg border border-red-500/20">
                                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                                        <span className="text-[11px] font-bold text-red-500 font-bengali">চ্যানেল এডিট করুন</span>
                                        <button
                                          type="button"
                                          onClick={() => setEditingChannelId(null)}
                                          className="text-zinc-500 hover:text-white transition-all cursor-pointer p-0.5"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div>
                                          <label className="text-[9px] text-zinc-400 font-bengali block mb-0.5">চ্যানেলের নাম:</label>
                                          <input
                                            type="text"
                                            value={editChannelName}
                                            onChange={(e) => setEditChannelName(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-2 text-xs text-white focus:outline-none focus:border-red-650 font-bengali"
                                          />
                                        </div>

                                        <div>
                                          <label className="text-[9px] text-zinc-400 font-bengali block mb-0.5">স্ট্রিমিং লিঙ্ক (M3U8 / MP4...):</label>
                                          <input
                                            type="text"
                                            value={editChannelUrl}
                                            onChange={(e) => setEditChannelUrl(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-2 text-xs text-white focus:outline-none focus:border-red-650 font-mono"
                                          />
                                        </div>

                                        <div>
                                          <label className="text-[9px] text-zinc-400 font-bengali block mb-0.5">ক্যাটাগরি বা গ্রুপ:</label>
                                          <select
                                            value={editChannelGroup}
                                            onChange={(e) => setEditChannelGroup(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-1.5 text-xs text-white focus:outline-none focus:border-red-650 font-bengali"
                                          >
                                            <option value="Bangla">বাংলা ও বিনোদন (Bangla)</option>
                                            <option value="Sports">লাইভ স্পোর্টস (Sports)</option>
                                            <option value="Religious">ধর্মীয় অনুষ্ঠান (Religious)</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="flex gap-2 pt-1">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (!editChannelName.trim() || !editChannelUrl.trim()) {
                                              return alert('চ্যানেল নাম এবং স্ট্রিমিং লিঙ্ক খালি রাখা যাবে না!');
                                            }
                                            try {
                                              const docRef = doc(db, 'channels', ch.id);
                                              // Ensure all required schema fields (logo, createdAt) are present for database rule validation
                                              await setDoc(docRef, {
                                                id: ch.id,
                                                name: editChannelName,
                                                url: editChannelUrl,
                                                group: editChannelGroup,
                                                logo: ch.logo || 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png',
                                                createdAt: ch.createdAt || new Date()
                                              }, { merge: true });
                                              
                                              alert('চ্যানেলের তথ্য সফলভাবে আপডেট করা হয়েছে!');
                                              setEditingChannelId(null);
                                            } catch (err: any) {
                                              handleFirestoreError(err, OperationType.WRITE, 'channels');
                                            }
                                          }}
                                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bengali font-semibold text-[10px] py-1.5 rounded flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                                        >
                                          <Save className="w-3 h-3" />
                                          সংরক্ষণ
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingChannelId(null)}
                                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 font-bengali text-[10px] py-1.5 rounded text-center cursor-pointer transition-all active:scale-95"
                                        >
                                          বাতিল
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Normal Display Mode */
                                    <>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                          <img
                                            src={ch.logo}
                                            alt={ch.name}
                                            className="w-10 h-10 object-contain rounded bg-white p-1 flex-shrink-0"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = 'https://ssl.com.bd/sites/default/files/BTV%20Logo%20Gallery.png';
                                            }}
                                          />
                                          <div className="overflow-hidden">
                                            <h5 className="text-[11px] font-bold text-white font-bengali truncate">{ch.name}</h5>
                                            <span className="inline-block bg-zinc-800 px-2 py-0.5 rounded text-[8px] text-zinc-450 font-bengali">
                                              {getGroupLabel(ch.group)} ক্যাটাগরি
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          {/* Edit Trigger Trigger */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingChannelId(ch.id);
                                              setEditChannelName(ch.name);
                                              setEditChannelUrl(ch.url);
                                              setEditChannelGroup(ch.group);
                                            }}
                                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                                            title="তথ্য পরিবর্তন করুন"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>

                                          {/* Delete channel trigger */}
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (!confirm(`আপনি কি সত্যিই "${ch.name}" চ্যানেলটি ডিলিট করতে চান?`)) return;
                                              try {
                                                const docRef = doc(db, 'channels', ch.id);
                                                if (ch.id.startsWith('custom-')) {
                                                  await deleteDoc(docRef);
                                                } else {
                                                  // Soft delete static channels by setting a soft delete override flag in Firestore
                                                  await setDoc(docRef, { id: ch.id, deleted: true }, { merge: true });
                                                }
                                                alert('চ্যানেলটি সফলভাবে ডিলিট করা হয়েছে!');
                                              } catch (err: any) {
                                                alert('ডিলিট করতে ত্রুটি হয়েছে: ' + err.message);
                                              }
                                            }}
                                            className="p-1.5 text-red-500 hover:bg-red-550/10 rounded-lg transition-all cursor-pointer"
                                            title="ডিলিট করুন"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Custom Logo edit container */}
                                      <div className="pt-2 border-t border-zinc-800/60 space-y-1.5 bg-zinc-950/20 p-2 rounded-lg">
                                        <span className="text-[10px] text-zinc-400 font-bengali block">লোগো পরিবর্তন করুন:</span>
                                        <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
                                          {/* File upload trigger */}
                                          <div className="relative flex items-center justify-center border border-dashed border-zinc-750 bg-zinc-950 rounded-lg py-1 px-2.5 hover:bg-zinc-900 cursor-pointer w-full sm:w-auto text-center shrink-0">
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  try {
                                                    const base64 = await compressImage(file, 300, 200);
                                                    const docRef = doc(db, 'channels', ch.id);
                                                    if (ch.id.startsWith('custom-')) {
                                                      await setDoc(docRef, { logo: base64 }, { merge: true });
                                                    } else {
                                                      await setDoc(docRef, {
                                                        id: ch.id,
                                                        name: ch.name,
                                                        group: ch.group,
                                                        url: ch.url,
                                                        logo: base64,
                                                        createdAt: new Date()
                                                      }, { merge: true });
                                                    }
                                                    alert('লোগো সফলভাবে পরিবর্তন করা হয়েছে!');
                                                  } catch (err: any) {
                                                    alert('ছবি আপলোড ব্যর্থ: ' + err.message);
                                                  }
                                                }
                                              }}
                                            />
                                            <span className="text-zinc-300 font-bengali text-[10px] whitespace-nowrap">
                                              গ্যালারি আপলোড
                                            </span>
                                          </div>

                                          {/* Or web-link input */}
                                          <input
                                            type="text"
                                            placeholder="অথবা লোগো URL বসিয়ে Enter চাপুন..."
                                            className="bg-zinc-950 text-white text-[10px] px-2.5 py-1.5 border border-zinc-800 rounded-lg w-full flex-1 focus:outline-none focus:border-red-650"
                                            onKeyDown={async (e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const value = (e.currentTarget as HTMLInputElement).value.trim();
                                                if (value) {
                                                  try {
                                                    const docRef = doc(db, 'channels', ch.id);
                                                    if (ch.id.startsWith('custom-')) {
                                                      await setDoc(docRef, { logo: value }, { merge: true });
                                                    } else {
                                                      await setDoc(docRef, {
                                                        id: ch.id,
                                                        name: ch.name,
                                                        group: ch.group,
                                                        url: ch.url,
                                                        logo: value,
                                                        createdAt: new Date()
                                                      }, { merge: true });
                                                    }
                                                    alert('লোগো সফলভাবে পরিবর্তন করা হয়েছে!');
                                                    (e.target as HTMLInputElement).value = '';
                                                  } catch (err: any) {
                                                    alert('লোগো লিঙ্ক সেট করা ব্যর্থ: ' + err.message);
                                                  }
                                                }
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT 3: POPUPS/ALERTS */}
                    {adminActiveTab === 'notifications' && (
                      <div className="space-y-6">
                        {/* Notification Form */}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newNotifTitle || !newNotifMessage) {
                              return alert('শিরোনাম এবং বার্তার বিবরণ আবশ্যক!');
                            }
                            setIsAddingNotif(true);
                            try {
                              let base64 = newNotifImageBase64;
                              if (notifFile) {
                                base64 = await compressImage(notifFile, 600, 360);
                              }
                              const notifId = 'notif-' + Date.now();
                              const docRef = doc(db, 'notifications', notifId);
                              await setDoc(docRef, {
                                id: notifId,
                                title: newNotifTitle,
                                message: newNotifMessage,
                                image: base64,
                                active: true,
                                createdAt: new Date()
                              });
                              setNewNotifTitle('');
                              setNewNotifMessage('');
                              setNewNotifImageBase64('');
                              setNotifFile(null);
                              alert('ব্যবহারকারীদের জন্য পুশ পপ-আপ নোটিফিকেশন সচল ও প্রেরণ করা হয়েছে!');
                            } catch (err: any) {
                              console.error(err);
                              alert('আপলোড ত্রুটি: ' + err.message);
                            } finally {
                              setIsAddingNotif(false);
                            }
                          }}
                          className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800 space-y-4"
                        >
                          <h4 className="text-sm font-bold text-white font-bengali flex items-center gap-2 border-b border-zinc-801 pb-2">
                            <Bell className="w-4 h-4 text-red-500" />
                            ইউজারদের জন্য নতুন পুশ পপ-আপ মেসেজ তৈরি করুন
                          </h4>

                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400 font-bengali block">পপ-আপ টাইটেল/শিরোনাম (বাংলায়):</label>
                            <input
                              type="text"
                              required
                              placeholder="উদা: আর্জেন্টিনা বনাম ব্রাজিল ম্যাচ সরাসরি শুরু হয়েছে!"
                              value={newNotifTitle}
                              onChange={(e) => setNewNotifTitle(e.target.value)}
                              className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-red-650"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400 font-bengali block">পপ-আপ মেসেজ বিবরণ (বাংলায়):</label>
                            <textarea
                              required
                              rows={3}
                              placeholder="খেলার বিবরণ বা জরুরি আপডেট লিখুন যা ব্যবহারকারীদের স্ক্রিনে তাৎক্ষণিক ভেসে উঠবে..."
                              value={newNotifMessage}
                              onChange={(e) => setNewNotifMessage(e.target.value)}
                              className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-red-650 resize-none font-bengali"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400 font-bengali block">পপ-আপের কাস্টম ইমেজ (মোবাইলের গ্যালারি থেকে):</label>
                            <div className="relative flex items-center justify-center border border-dashed border-zinc-800 bg-zinc-950 rounded-lg p-3 hover:bg-zinc-950/70 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setNotifFile(file);
                                    try {
                                      const base64 = await compressImage(file, 450, 270);
                                      setNewNotifImageBase64(base64);
                                    } catch (err) {
                                      console.error('Error compressing:', err);
                                    }
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="space-y-1 text-center">
                                <ImageIcon className="mx-auto h-5 w-5 text-zinc-500" />
                                <span className="text-zinc-400 font-bengali text-[10px] block">
                                  {notifFile ? notifFile.name : 'ছবি সংযোগ করুন (অপশনাল)'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {newNotifImageBase64 && (
                            <div className="mt-2 text-center bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                              <span className="text-[9px] text-zinc-500 block mb-1">ইমেজ প্রিভিউ:</span>
                              <img
                                src={newNotifImageBase64}
                                alt="Promo Preview"
                                className="mx-auto h-16 w-auto object-cover rounded border border-zinc-800 shadow"
                              />
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isAddingNotif}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-semibold font-bengali py-2.5 rounded-xl transition-all cursor-pointer shadow-md text-xs active:scale-[0.98] flex items-center justify-center gap-1.5 font-bold"
                          >
                            {isAddingNotif ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>নোটিফিকেশন প্রেরণ করা হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-4 h-4" />
                                <span>পপ-আপ অ্যালার্ট সরাসরি পুশ করুন</span>
                              </>
                            )}
                          </button>
                        </form>

                        {/* Recent Alerts List */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">রিসেন্ট অ্যালার্ট রিসিভার ({allNotifications.length})</h4>
                          {allNotifications.length === 0 ? (
                            <p className="text-xs text-zinc-650 font-bengali">অ্যালার্ট কন্ট্রোল ডেস্কে কোনো অ্যালার্ট পাওয়া যায়নি।</p>
                          ) : (
                            <div className="space-y-2">
                              {allNotifications.map((noti) => (
                                <div key={noti.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                                  <div className="flex-1 min-w-0 pr-4 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`h-2 w-2 rounded-full ${noti.active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                                      <h5 className="text-[11px] font-bold text-white font-bengali truncate">{noti.title}</h5>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 font-bengali line-clamp-1">{noti.message}</p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleNotification(noti.id, noti.active)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold font-bengali transition-colors cursor-pointer ${noti.active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'}`}
                                    >
                                      {noti.active ? 'সচল' : 'বন্ধ'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!confirm('আপনি কি সত্যিই এই নোটিফিকেশনটি মুছে ফেলতে চান?')) return;
                                        try {
                                          await deleteDoc(doc(db, 'notifications', noti.id));
                                          alert('নোটিফিকেশন মুছে ফেলা হয়েছে!');
                                        } catch (err: any) {
                                          alert('ত্রুটি: ' + err.message);
                                        }
                                      }}
                                      className="p-1 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
