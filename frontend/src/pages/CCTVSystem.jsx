import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import {
  Video,
  Camera,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Settings,
  RefreshCw,
  Play,
  Trash2,
  Edit,
  Activity,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CCTVSystem = () => {
  const { t } = useTranslation();
  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cameras');
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Hikvision Login State
  const [hikvisionConfig, setHikvisionConfig] = useState({
    server_url: '',
    username: '',
    password: '',
    is_connected: false
  });
  const [hikvisionDevices, setHikvisionDevices] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showHikvisionLogin, setShowHikvisionLogin] = useState(false);
  
  // Live Stream State
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [streamingDevice, setStreamingDevice] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  
  // Events & Notifications State
  const [showDeviceEvents, setShowDeviceEvents] = useState(false);
  const [deviceEvents, setDeviceEvents] = useState([]);
  const [selectedDeviceForEvents, setSelectedDeviceForEvents] = useState(null);
  
  // Playback State
  const [showPlayback, setShowPlayback] = useState(false);
  const [playbackDevice, setPlaybackDevice] = useState(null);
  const [playbackStartTime, setPlaybackStartTime] = useState('');
  const [playbackEndTime, setPlaybackEndTime] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [searchingRecordings, setSearchingRecordings] = useState(false);
  
  // Export State
  const [showExport, setShowExport] = useState(false);
  const [exportJobs, setExportJobs] = useState([]);
  const [exportRequest, setExportRequest] = useState({
    camera_id: '',
    start_time: '',
    end_time: '',
    format: 'mp4'
  });
  
  // Snapshot State
  const [snapshot, setSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  
  // Hik-Connect State
  const [hikConnectDevices, setHikConnectDevices] = useState([]);
  const [hikConnectDashboard, setHikConnectDashboard] = useState(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    host: '',
    port: 80,
    username: 'admin',
    password: '',
    rtsp_port: 554,
    device_name: ''
  });
  const [connectingDevice, setConnectingDevice] = useState(false);
  const [selectedDeviceChannels, setSelectedDeviceChannels] = useState([]);
  const [showDeviceChannels, setShowDeviceChannels] = useState(false);
  
  // Event Detection Settings
  const [eventSettings, setEventSettings] = useState({
    motion_detection: true,
    intrusion_detection: true,
    line_crossing: true,
    face_detection: false,
    notification_email: '',
    notification_sms: false,
    notification_push: true
  });

  const [newCamera, setNewCamera] = useState({
    name: '',
    ip_address: '',
    port: 554,
    username: '',
    password: '',
    channel: 1,
    location: '',
    camera_type: 'hikvision'
  });

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    console.log('CCTVSystem mounted');
    fetchDashboard();
    fetchCameras();
    fetchEvents();
    fetchAlerts();
    fetchSettings();
    fetchHikvisionConfig();
    fetchEventSettings();
  }, []);

  const fetchHikvisionConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/hikvision/config`, { headers });
      if (res.ok) {
        const config = await res.json();
        setHikvisionConfig(config);
        if (config.is_connected) {
          fetchHikvisionDevices();
        }
      }
    } catch (error) {
      console.error('Error fetching Hikvision config:', error);
    }
  };

  const fetchHikvisionDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/hikvision/devices`, { headers });
      if (res.ok) {
        setHikvisionDevices(await res.json());
      }
    } catch (error) {
      console.error('Error fetching Hikvision devices:', error);
    }
  };

  const handleHikvisionLogin = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch(`${API_URL}/api/cctv/hikvision/connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          server_url: hikvisionConfig.server_url,
          username: hikvisionConfig.username,
          password: hikvisionConfig.password
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setHikvisionConfig(prev => ({ ...prev, is_connected: true }));
        setHikvisionDevices(data.devices || []);
        toast.success('تم الاتصال بـ Hikvision بنجاح');
        setShowHikvisionLogin(false);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'فشل في الاتصال');
      }
    } catch (error) {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleHikvisionDisconnect = async () => {
    try {
      await fetch(`${API_URL}/api/cctv/hikvision/disconnect`, {
        method: 'POST',
        headers
      });
      setHikvisionConfig(prev => ({ ...prev, is_connected: false }));
      setHikvisionDevices([]);
      toast.success('تم قطع الاتصال');
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  // Live Stream Functions
  const handleOpenLiveStream = async (device) => {
    if (!device.is_online) {
      toast.error('الجهاز غير متصل');
      return;
    }
    
    setStreamingDevice(device);
    setLoadingSnapshot(true);
    
    try {
      // Get stream URL from backend
      const res = await fetch(`${API_URL}/api/cctv/stream/start`, { 
        method: 'POST',
        headers,
        body: JSON.stringify({
          camera_id: device.id || device.name,
          quality: 'main',
          protocol: 'rtsp'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setStreamUrl(data.stream_urls?.rtsp || '');
        
        // Also get snapshot
        const snapshotRes = await fetch(`${API_URL}/api/cctv/stream/snapshot/${device.id || device.name}`, { headers });
        if (snapshotRes.ok) {
          const snapshotData = await snapshotRes.json();
          setSnapshot(snapshotData.snapshot);
        }
      }
    } catch (error) {
      console.error('Error getting stream URL:', error);
      toast.error('فشل في جلب البث');
    }
    
    setLoadingSnapshot(false);
    setShowLiveStream(true);
  };

  const handleGetSnapshot = async (device) => {
    setLoadingSnapshot(true);
    try {
      const res = await fetch(`${API_URL}/api/cctv/stream/snapshot/${device.id || device.name}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data.snapshot);
        toast.success('تم جلب الصورة');
      } else {
        toast.error('فشل في جلب الصورة');
      }
    } catch (error) {
      toast.error('خطأ في الاتصال');
    }
    setLoadingSnapshot(false);
  };

  // Playback Functions
  const handleOpenPlayback = (device) => {
    if (!device.is_online) {
      toast.error('الجهاز غير متصل');
      return;
    }
    
    setPlaybackDevice(device);
    // Set default times (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setPlaybackStartTime(yesterday.toISOString().slice(0, 16));
    setPlaybackEndTime(now.toISOString().slice(0, 16));
    setRecordings([]);
    setShowPlayback(true);
  };

  const handleSearchRecordings = async () => {
    if (!playbackDevice) return;
    
    setSearchingRecordings(true);
    try {
      const res = await fetch(`${API_URL}/api/cctv/playback/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          camera_id: playbackDevice.id || playbackDevice.name,
          start_time: playbackStartTime,
          end_time: playbackEndTime,
          channel: playbackDevice.channel || 1
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecordings(data.recordings || []);
        if (data.recordings?.length === 0) {
          toast.info('لا توجد تسجيلات في هذه الفترة');
        } else {
          toast.success(`تم العثور على ${data.recordings.length} تسجيل`);
        }
      }
    } catch (error) {
      toast.error('خطأ في البحث');
    }
    setSearchingRecordings(false);
  };

  const handleStartPlayback = async (recording) => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/playback/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          camera_id: playbackDevice.id || playbackDevice.name,
          start_time: recording.start_time,
          end_time: recording.end_time,
          channel: playbackDevice.channel || 1
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Open playback URL or show in player
        if (data.playback_url) {
          toast.success('جاري تشغيل التسجيل');
          // Could open in new window or embedded player
          window.open(data.playback_url, '_blank');
        }
      }
    } catch (error) {
      toast.error('فشل في تشغيل التسجيل');
    }
  };

  // Export Functions
  const handleOpenExport = (device) => {
    setExportRequest({
      camera_id: device?.id || device?.name || '',
      start_time: '',
      end_time: '',
      format: 'mp4'
    });
    fetchExportJobs();
    setShowExport(true);
  };

  const fetchExportJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/export/list`, { headers });
      if (res.ok) {
        const jobs = await res.json();
        setExportJobs(jobs);
      }
    } catch (error) {
      console.error('Error fetching export jobs:', error);
    }
  };

  const handleRequestExport = async () => {
    if (!exportRequest.start_time || !exportRequest.end_time) {
      toast.error('يرجى تحديد وقت البداية والنهاية');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/cctv/export/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify(exportRequest)
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success('تم إنشاء طلب التصدير');
        fetchExportJobs();
      } else {
        toast.error('فشل في إنشاء الطلب');
      }
    } catch (error) {
      toast.error('خطأ في الاتصال');
    }
  };

  const handleViewRecordings = async (device) => {
    handleOpenPlayback(device);
  };

  const handleViewEvents = async (device) => {
    setSelectedDeviceForEvents(device);
    
    try {
      const res = await fetch(`${API_URL}/api/cctv/events?device_id=${device.id || device.name}&limit=100`, { headers });
      if (res.ok) {
        const events = await res.json();
        setDeviceEvents(events);
      }
    } catch (error) {
      console.error('Error fetching device events:', error);
    }
    
    setShowDeviceEvents(true);
  };

  // Event Settings Functions
  const fetchEventSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/event-settings`, { headers });
      if (res.ok) {
        setEventSettings(await res.json());
      }
    } catch (error) {
      console.error('Error fetching event settings:', error);
    }
  };

  const saveEventSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/event-settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(eventSettings)
      });
      
      if (res.ok) {
        toast.success('تم حفظ إعدادات الأحداث');
      } else {
        toast.error('فشل في حفظ الإعدادات');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/dashboard`, { headers });
      if (res.ok) {
        setDashboard(await res.json());
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchCameras = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/cameras`, { headers });
      if (res.ok) {
        setCameras(await res.json());
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/events?limit=50`, { headers });
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/alerts?is_resolved=false`, { headers });
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/settings`, { headers });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleAddCamera = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/cameras`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newCamera)
      });
      
      if (res.ok) {
        toast.success('تم إضافة الكاميرا بنجاح');
        setShowAddCamera(false);
        setNewCamera({ name: '', ip_address: '', port: 554, username: '', password: '', channel: 1, location: '', camera_type: 'hikvision' });
        fetchCameras();
        fetchDashboard();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'فشل في إضافة الكاميرا');
      }
    } catch (error) {
      toast.error('حدث خطأ في الاتصال');
    }
  };

  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الكاميرا؟')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/cctv/cameras/${cameraId}`, {
        method: 'DELETE',
        headers
      });
      
      if (res.ok) {
        toast.success('تم حذف الكاميرا بنجاح');
        fetchCameras();
        fetchDashboard();
      }
    } catch (error) {
      toast.error('حدث خطأ في الحذف');
    }
  };

  const handleCheckAllCameras = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch(`${API_URL}/api/cctv/cameras/check-all`, {
        method: 'POST',
        headers
      });
      
      if (res.ok) {
        const result = await res.json();
        toast.success(`تم فحص ${result.checked} كاميرا`);
        fetchCameras();
        fetchDashboard();
        fetchAlerts();
      }
    } catch (error) {
      toast.error('فشل في فحص الكاميرات');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers
      });
      
      if (res.ok) {
        toast.success('تم حل التنبيه');
        fetchAlerts();
        fetchDashboard();
      }
    } catch (error) {
      toast.error('فشل في حل التنبيه');
    }
  };

  const handleAcknowledgeEvent = async (eventId) => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/events/${eventId}/acknowledge`, {
        method: 'PUT',
        headers
      });
      
      if (res.ok) {
        toast.success('تم تأكيد الاستلام');
        fetchEvents();
      }
    } catch (error) {
      toast.error('فشل في تأكيد الاستلام');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        toast.success('تم حفظ الإعدادات بنجاح');
        setShowSettings(false);
      }
    } catch (error) {
      toast.error('فشل في حفظ الإعدادات');
    }
  };

  const handleTestConnection = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cctv/integration/test-connection`, {
        method: 'POST',
        headers
      });
      
      const result = await res.json();
      if (result.connected) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('فشل في اختبار الاتصال');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getEventTypeLabel = (type) => {
    const types = {
      motion: 'حركة',
      alarm: 'إنذار',
      line_crossing: 'عبور خط',
      intrusion: 'اقتحام',
      face_detection: 'كشف وجه',
      offline: 'انقطاع'
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" data-testid="cctv-system">
      <div className="bg-white rounded-xl shadow-xl p-6 m-4 space-y-6 border border-slate-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">نظام الكاميرات CCTV</h1>
            <p className="text-slate-600">Hikvision Integration</p>
          </div>
        <div className="flex gap-2">
          <Button 
            variant={hikvisionConfig.is_connected ? "destructive" : "default"} 
            onClick={() => hikvisionConfig.is_connected ? handleHikvisionDisconnect() : setShowHikvisionLogin(true)}
            data-testid="hikvision-connect-btn"
          >
            {hikvisionConfig.is_connected ? (
              <>
                <WifiOff className="h-4 w-4 ml-2" />
                قطع الاتصال
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 ml-2" />
                تسجيل دخول Hikvision
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleCheckAllCameras} disabled={checkingStatus}>
            <RefreshCw className={`h-4 w-4 ml-2 ${checkingStatus ? 'animate-spin' : ''}`} />
            فحص الكاميرات
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 ml-2" />
            الإعدادات
          </Button>
          <Button onClick={() => setShowAddCamera(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة كاميرا
          </Button>
        </div>
      </div>

      {/* Hikvision Connection Status */}
      {hikvisionConfig.is_connected && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <div>
                  <p className="font-semibold text-green-800">متصل بـ Hikvision</p>
                  <p className="text-sm text-green-600">المستخدم: {hikvisionConfig.username}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-green-700">الأجهزة المتاحة: {hikvisionDevices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">إجمالي الكاميرات</p>
                  <p className="text-2xl font-bold">{dashboard.cameras?.total || 0}</p>
                </div>
                <Camera className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">متصلة</p>
                  <p className="text-2xl font-bold text-green-600">{dashboard.cameras?.online || 0}</p>
                </div>
                <Wifi className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">غير متصلة</p>
                  <p className="text-2xl font-bold text-red-600">{dashboard.cameras?.offline || 0}</p>
                </div>
                <WifiOff className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">تنبيهات نشطة</p>
                  <p className="text-2xl font-bold text-orange-600">{dashboard.alerts?.unresolved || 0}</p>
                </div>
                <Bell className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cameras" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            الكاميرات
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            الأحداث
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            التنبيهات
            {alerts.length > 0 && (
              <Badge variant="destructive" className="mr-1">{alerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="detection" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            كشف الأحداث
          </TabsTrigger>
        </TabsList>

        {/* Cameras Tab - Hik-Connect Style */}
        <TabsContent value="cameras">
          {/* Devices with Cameras - Hik-Connect Style */}
          {hikvisionConfig.is_connected ? (
            <div className="space-y-4">
              {/* Device Cards */}
              {hikvisionDevices.map((device, deviceIndex) => (
                <Card key={deviceIndex} className="overflow-hidden">
                  {/* Device Header */}
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                          {device.device_type === 'NVR' ? (
                            <Activity className="h-6 w-6" />
                          ) : (
                            <Camera className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{device.name || `جهاز ${deviceIndex + 1}`}</h3>
                          <p className="text-gray-300 text-sm">{device.model || 'Hikvision'} • {device.device_type || 'NVR'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={device.is_online ? 'bg-green-500' : 'bg-red-500'}>
                          {device.is_online ? '● متصل' : '○ غير متصل'}
                        </Badge>
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Camera Grid - Like Hik-Connect */}
                  <CardContent className="p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {/* Generate camera tiles based on device channels */}
                      {Array.from({ length: device.channels || 8 }, (_, i) => i + 1).map((channelNum) => (
                        <div 
                          key={channelNum}
                          className="relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer group aspect-video"
                          onClick={() => handleOpenLiveStream({...device, channel: channelNum, name: `Camera ${String(channelNum).padStart(2, '0')}`})}
                          data-testid={`camera-tile-${deviceIndex}-${channelNum}`}
                        >
                          {/* Camera Preview */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-gray-600" />
                          </div>
                          
                          {/* Live Indicator */}
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          </div>
                          
                          {/* Channel Label */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-white text-xs font-medium">Camera {String(channelNum).padStart(2, '0')}</p>
                          </div>
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Play className="h-10 w-10 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Device Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        إجمالي الكاميرات: {device.channels || 8}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewRecordings(device)}>
                          <Clock className="h-4 w-4 ml-1" />
                          التسجيلات
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenExport(device)}>
                          📤
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleViewEvents(device)}>
                          <Bell className="h-4 w-4 ml-1" />
                          الأحداث
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* No devices message */}
              {hikvisionDevices.length === 0 && (
                <Card className="border-dashed border-2">
                  <CardContent className="py-12 text-center">
                    <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">لم يتم العثور على أجهزة</p>
                    <p className="text-gray-400 text-sm">تأكد من اتصالك بـ Hikvision</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Not Connected State */
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wifi className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">اتصل بـ Hikvision</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  قم بتسجيل الدخول إلى حساب Hikvision الخاص بك لعرض جميع الأجهزة والكاميرات المرتبطة
                </p>
                <Button size="lg" onClick={() => setShowHikvisionLogin(true)}>
                  <Wifi className="h-5 w-5 ml-2" />
                  تسجيل دخول Hikvision
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Manual Cameras Section */}
          {cameras.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">كاميرات مضافة يدوياً</h3>
                <Button size="sm" variant="outline" onClick={() => setShowAddCamera(true)}>
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة كاميرا
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {cameras.map((camera) => (
                  <div 
                    key={camera.id}
                    className="relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer group aspect-video"
                    onClick={() => handleOpenLiveStream(camera)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-600" />
                    </div>
                    
                    {camera.is_online && (
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      </div>
                    )}
                    
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs font-medium truncate">{camera.name}</p>
                      <p className="text-gray-400 text-[10px]">{camera.ip_address}</p>
                    </div>
                    
                    <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Play className="h-10 w-10 text-white drop-shadow-lg" />
                    </div>
                    
                    {/* Edit/Delete buttons on hover */}
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-6 w-6 bg-white/80"
                        onClick={(e) => { e.stopPropagation(); setSelectedCamera(camera); }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCamera(camera.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add Camera Button when connected but no manual cameras */}
          {hikvisionConfig.is_connected && cameras.length === 0 && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => setShowAddCamera(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة كاميرا يدوياً
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>سجل الأحداث</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className={`p-4 rounded-lg border ${event.is_acknowledged ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full ${getSeverityColor(event.severity)}`} />
                        <div>
                          <p className="font-medium">{event.description}</p>
                          <p className="text-sm text-gray-500">
                            {event.camera_name} • {getEventTypeLabel(event.event_type)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            <Clock className="h-3 w-3 inline ml-1" />
                            {new Date(event.created_at).toLocaleString('ar-OM')}
                          </p>
                        </div>
                      </div>
                      {!event.is_acknowledged && (
                        <Button size="sm" variant="outline" onClick={() => handleAcknowledgeEvent(event.id)}>
                          <CheckCircle className="h-4 w-4 ml-1" />
                          تأكيد
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {events.length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد أحداث مسجلة</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                التنبيهات النشطة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border-r-4 ${
                    alert.severity === 'critical' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'warning'}>
                            {alert.severity === 'critical' ? 'حرج' : 'تحذير'}
                          </Badge>
                          <span className="font-medium">{alert.camera_name}</span>
                        </div>
                        <p className="text-gray-700">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.created_at).toLocaleString('ar-OM')}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => handleResolveAlert(alert.id)}>
                        <CheckCircle className="h-4 w-4 ml-1" />
                        تم الحل
                      </Button>
                    </div>
                  </div>
                ))}
                
                {alerts.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد تنبيهات نشطة</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Detection Settings Tab */}
        <TabsContent value="detection">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detection Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  أنواع الكشف
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">كشف الحركة</p>
                      <p className="text-sm text-gray-500">اكتشاف أي حركة في منطقة المراقبة</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventSettings.motion_detection}
                    onChange={(e) => setEventSettings({...eventSettings, motion_detection: e.target.checked})}
                    className="h-5 w-5"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">كشف التسلل</p>
                      <p className="text-sm text-gray-500">تنبيه عند دخول شخص لمنطقة محظورة</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventSettings.intrusion_detection}
                    onChange={(e) => setEventSettings({...eventSettings, intrusion_detection: e.target.checked})}
                    className="h-5 w-5"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">عبور الخط</p>
                      <p className="text-sm text-gray-500">تنبيه عند عبور خط افتراضي محدد</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventSettings.line_crossing}
                    onChange={(e) => setEventSettings({...eventSettings, line_crossing: e.target.checked})}
                    className="h-5 w-5"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Camera className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">كشف الوجوه</p>
                      <p className="text-sm text-gray-500">تسجيل وتحليل الوجوه المكتشفة</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventSettings.face_detection}
                    onChange={(e) => setEventSettings({...eventSettings, face_detection: e.target.checked})}
                    className="h-5 w-5"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-500" />
                  إعدادات الإشعارات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">إشعارات فورية</p>
                      <p className="text-sm text-gray-500">إشعارات داخل النظام</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventSettings.notification_push}
                    onChange={(e) => setEventSettings({...eventSettings, notification_push: e.target.checked})}
                    className="h-5 w-5"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">رسائل SMS</p>
                      <p className="text-sm text-gray-500">إرسال رسالة نصية للمسؤولين</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventSettings.notification_sms}
                    onChange={(e) => setEventSettings({...eventSettings, notification_sms: e.target.checked})}
                    className="h-5 w-5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>البريد الإلكتروني للتنبيهات</Label>
                  <Input
                    type="email"
                    value={eventSettings.notification_email}
                    onChange={(e) => setEventSettings({...eventSettings, notification_email: e.target.value})}
                    placeholder="admin@company.com"
                  />
                  <p className="text-xs text-gray-500">سيتم إرسال التنبيهات الحرجة لهذا البريد</p>
                </div>
                
                <Button className="w-full" onClick={saveEventSettings}>
                  <CheckCircle className="h-4 w-4 ml-2" />
                  حفظ إعدادات الإشعارات
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Detections */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                آخر الاكتشافات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      event.event_type === 'motion' ? 'bg-yellow-100' :
                      event.event_type === 'intrusion' ? 'bg-red-100' :
                      'bg-blue-100'
                    }`}>
                      {event.event_type === 'motion' ? <Activity className="h-6 w-6 text-yellow-600" /> :
                       event.event_type === 'intrusion' ? <AlertTriangle className="h-6 w-6 text-red-600" /> :
                       <Camera className="h-6 w-6 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{getEventTypeLabel(event.event_type)}</p>
                      <p className="text-sm text-gray-500">{event.camera_name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-500">{new Date(event.created_at).toLocaleTimeString('ar-OM')}</p>
                      <p className="text-xs text-gray-400">{new Date(event.created_at).toLocaleDateString('ar-OM')}</p>
                    </div>
                  </div>
                ))}
                
                {events.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>لا توجد اكتشافات حديثة</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Camera Dialog */}
      <Dialog open={showAddCamera} onOpenChange={setShowAddCamera}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة كاميرا جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الكاميرا</Label>
              <Input
                value={newCamera.name}
                onChange={(e) => setNewCamera({...newCamera, name: e.target.value})}
                placeholder="مثال: كاميرا المدخل الرئيسي"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>عنوان IP</Label>
                <Input
                  value={newCamera.ip_address}
                  onChange={(e) => setNewCamera({...newCamera, ip_address: e.target.value})}
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <Label>المنفذ (Port)</Label>
                <Input
                  type="number"
                  value={newCamera.port}
                  onChange={(e) => setNewCamera({...newCamera, port: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>اسم المستخدم</Label>
                <Input
                  value={newCamera.username}
                  onChange={(e) => setNewCamera({...newCamera, username: e.target.value})}
                  placeholder="admin"
                />
              </div>
              <div>
                <Label>كلمة المرور</Label>
                <Input
                  type="password"
                  value={newCamera.password}
                  onChange={(e) => setNewCamera({...newCamera, password: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>القناة</Label>
                <Input
                  type="number"
                  value={newCamera.channel}
                  onChange={(e) => setNewCamera({...newCamera, channel: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>نوع الكاميرا</Label>
                <Select value={newCamera.camera_type} onValueChange={(v) => setNewCamera({...newCamera, camera_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hikvision">Hikvision</SelectItem>
                    <SelectItem value="dahua">Dahua</SelectItem>
                    <SelectItem value="generic">Generic RTSP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>الموقع</Label>
              <Input
                value={newCamera.location}
                onChange={(e) => setNewCamera({...newCamera, location: e.target.value})}
                placeholder="مثال: المدخل الرئيسي"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddCamera(false)}>إلغاء</Button>
              <Button onClick={handleAddCamera}>إضافة</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إعدادات CCTV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Dairy System Integration */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-700">🔗 ربط نظام الألبان</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700"
                  onClick={() => {
                    setSettings({
                      ...settings, 
                      dairy_system_url: 'https://dairy-erp-1.preview.emergentagent.com',
                      dairy_api_key: 'sk-emergent-57a636238E2E8C04f1'
                    });
                    toast.success('تم تحديث البيانات تلقائياً');
                  }}
                  data-testid="auto-fill-settings-btn"
                >
                  <RefreshCw className="h-4 w-4 ml-1" />
                  تحديث تلقائي
                </Button>
              </div>
              <div>
                <Label>رابط نظام الألبان</Label>
                <Input
                  value={settings.dairy_system_url || ''}
                  onChange={(e) => setSettings({...settings, dairy_system_url: e.target.value})}
                  placeholder="https://dairy-system.com"
                  className="bg-white"
                  data-testid="dairy-system-url-input"
                />
              </div>
              <div>
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={settings.dairy_api_key || ''}
                    onChange={(e) => setSettings({...settings, dairy_api_key: e.target.value})}
                    className="bg-white"
                    data-testid="dairy-api-key-input"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      const input = document.querySelector('[data-testid="dairy-api-key-input"]');
                      if (input) {
                        input.type = input.type === 'password' ? 'text' : 'password';
                      }
                    }}
                  >
                    👁
                  </Button>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full bg-white" 
                onClick={handleTestConnection}
                data-testid="test-connection-btn"
              >
                <Wifi className="h-4 w-4 ml-2" />
                اختبار الاتصال بنظام الألبان
              </Button>
            </div>

            {/* Sync Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <Label className="text-sm">المزامنة التلقائية</Label>
                <input
                  type="checkbox"
                  checked={settings.auto_sync_enabled || false}
                  onChange={(e) => setSettings({...settings, auto_sync_enabled: e.target.checked})}
                  className="h-5 w-5 accent-blue-600"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <Label className="text-sm">كشف الحركة</Label>
                <input
                  type="checkbox"
                  checked={settings.motion_detection_enabled !== false}
                  onChange={(e) => setSettings({...settings, motion_detection_enabled: e.target.checked})}
                  className="h-5 w-5 accent-green-600"
                />
              </div>
            </div>

            {/* Alerts & Retention */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>بريد التنبيهات</Label>
                <Input
                  type="email"
                  value={settings.alert_email || ''}
                  onChange={(e) => setSettings({...settings, alert_email: e.target.value})}
                  placeholder="alerts@company.com"
                />
              </div>
              <div>
                <Label>مدة الاحتفاظ (أيام)</Label>
                <Input
                  type="number"
                  value={settings.retention_days || 30}
                  onChange={(e) => setSettings({...settings, retention_days: parseInt(e.target.value)})}
                  min={1}
                  max={365}
                />
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowSettings(false)}>إلغاء</Button>
              <Button onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="h-4 w-4 ml-2" />
                حفظ الإعدادات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hikvision Login Dialog */}
      <Dialog open={showHikvisionLogin} onOpenChange={setShowHikvisionLogin}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              تسجيل دخول Hikvision
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>عنوان الخادم (Server URL)</Label>
              <Input
                value={hikvisionConfig.server_url}
                onChange={(e) => setHikvisionConfig({...hikvisionConfig, server_url: e.target.value})}
                placeholder="https://192.168.1.100 أو https://cloud.hikvision.com"
                data-testid="hikvision-server-url"
              />
              <p className="text-xs text-gray-500 mt-1">أدخل عنوان NVR/DVR أو Hik-Connect Cloud</p>
            </div>
            <div>
              <Label>اسم المستخدم</Label>
              <Input
                value={hikvisionConfig.username}
                onChange={(e) => setHikvisionConfig({...hikvisionConfig, username: e.target.value})}
                placeholder="Almoroojcctv"
                data-testid="hikvision-username"
              />
            </div>
            <div>
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={hikvisionConfig.password}
                onChange={(e) => setHikvisionConfig({...hikvisionConfig, password: e.target.value})}
                placeholder="••••••••"
                data-testid="hikvision-password"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowHikvisionLogin(false)}>إلغاء</Button>
              <Button 
                onClick={handleHikvisionLogin} 
                disabled={isConnecting || !hikvisionConfig.server_url || !hikvisionConfig.username}
                data-testid="hikvision-login-submit"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                    جاري الاتصال...
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 ml-2" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Stream Dialog */}
      <Dialog open={showLiveStream} onOpenChange={setShowLiveStream}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-red-500" />
              بث مباشر - {streamingDevice?.name || 'كاميرا'}
              <div className="flex items-center gap-1 mr-4">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-xs text-red-500">LIVE</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Video Player Area */}
            <div className="bg-black aspect-video rounded-lg flex items-center justify-center relative">
              {streamUrl ? (
                <iframe 
                  src={streamUrl} 
                  className="w-full h-full rounded-lg"
                  allow="autoplay; fullscreen"
                  title="Live Stream"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Video className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg">البث المباشر</p>
                  <p className="text-sm mt-2">
                    رابط RTSP: rtsp://{streamingDevice?.ip_address}:{streamingDevice?.port || 554}/Streaming/Channels/101
                  </p>
                  <p className="text-xs mt-4 text-gray-500">
                    للمشاهدة المباشرة، استخدم تطبيق Hik-Connect أو VLC Player
                  </p>
                </div>
              )}
              
              {/* Overlay Controls */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="bg-black/50 hover:bg-black/70">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="bg-black/50 hover:bg-black/70">
                    تسجيل
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-black/50 hover:bg-black/70">
                    ملء الشاشة
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Device Info */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">الجهاز</p>
                <p className="font-semibold">{streamingDevice?.name}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">IP</p>
                <p className="font-mono">{streamingDevice?.ip_address}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">الحالة</p>
                <p className="text-green-600 font-semibold">● متصل</p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLiveStream(false)}>إغلاق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Device Events Dialog */}
      <Dialog open={showDeviceEvents} onOpenChange={setShowDeviceEvents}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              أحداث الجهاز - {selectedDeviceForEvents?.name || 'كاميرا'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Event Filters */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="cursor-pointer hover:bg-blue-50">الكل</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-yellow-50">
                <AlertTriangle className="h-3 w-3 ml-1" />
                حركة
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-red-50">
                <XCircle className="h-3 w-3 ml-1" />
                تسلل
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-purple-50">
                <Activity className="h-3 w-3 ml-1" />
                عبور خط
              </Badge>
            </div>
            
            {/* Events List */}
            <div className="space-y-2">
              {deviceEvents.length > 0 ? (
                deviceEvents.map((event, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.severity === 'critical' ? 'bg-red-100 text-red-600' :
                      event.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {event.event_type === 'motion' ? <Activity className="h-5 w-5" /> :
                       event.event_type === 'intrusion' ? <AlertTriangle className="h-5 w-5" /> :
                       <Bell className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{event.description || getEventTypeLabel(event.event_type)}</p>
                          <p className="text-sm text-gray-500">{event.camera_name}</p>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(event.created_at).toLocaleString('ar-OM')}</span>
                      </div>
                    </div>
                    {event.snapshot_url && (
                      <div className="w-20 h-14 bg-gray-200 rounded overflow-hidden">
                        <img src={event.snapshot_url} alt="Snapshot" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-300" />
                  <p>لا توجد أحداث مسجلة</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeviceEvents(false)}>إغلاق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Playback / Recordings Dialog */}
      <Dialog open={showPlayback} onOpenChange={setShowPlayback}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              مشاهدة التسجيلات - {playbackDevice?.name || 'كاميرا'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search Controls */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-blue-700">🔍 البحث في التسجيلات</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>من تاريخ/وقت</Label>
                  <Input
                    type="datetime-local"
                    value={playbackStartTime}
                    onChange={(e) => setPlaybackStartTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label>إلى تاريخ/وقت</Label>
                  <Input
                    type="datetime-local"
                    value={playbackEndTime}
                    onChange={(e) => setPlaybackEndTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSearchRecordings} 
                disabled={searchingRecordings}
                className="w-full"
              >
                {searchingRecordings ? (
                  <>
                    <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                    جاري البحث...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 ml-2" />
                    بحث عن التسجيلات
                  </>
                )}
              </Button>
            </div>
            
            {/* Recordings List */}
            <div className="space-y-2">
              <h3 className="font-semibold">📹 التسجيلات المتاحة ({recordings.length})</h3>
              {recordings.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {recordings.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Video className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-semibold text-sm">
                            {new Date(rec.start_time).toLocaleString('ar-SA')}
                          </p>
                          <p className="text-xs text-gray-500">
                            حتى {new Date(rec.end_time).toLocaleString('ar-SA')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleStartPlayback(rec)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Play className="h-4 w-4 ml-1" />
                          تشغيل
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setExportRequest({
                              camera_id: playbackDevice?.id || playbackDevice?.name,
                              start_time: rec.start_time,
                              end_time: rec.end_time,
                              format: 'mp4'
                            });
                            setShowExport(true);
                          }}
                        >
                          تصدير
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>حدد الفترة الزمنية وابحث عن التسجيلات</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPlayback(false)}>إغلاق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📤 تصدير مقطع فيديو
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Export Form */}
            <div className="bg-green-50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-green-700">إنشاء طلب تصدير جديد</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>من تاريخ/وقت</Label>
                  <Input
                    type="datetime-local"
                    value={exportRequest.start_time}
                    onChange={(e) => setExportRequest({...exportRequest, start_time: e.target.value})}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label>إلى تاريخ/وقت</Label>
                  <Input
                    type="datetime-local"
                    value={exportRequest.end_time}
                    onChange={(e) => setExportRequest({...exportRequest, end_time: e.target.value})}
                    className="bg-white"
                  />
                </div>
              </div>
              <div>
                <Label>صيغة الملف</Label>
                <Select value={exportRequest.format} onValueChange={(v) => setExportRequest({...exportRequest, format: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="avi">AVI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRequestExport} className="w-full bg-green-600 hover:bg-green-700">
                إنشاء طلب التصدير
              </Button>
            </div>
            
            {/* Export Jobs List */}
            <div className="space-y-2">
              <h3 className="font-semibold">📋 طلبات التصدير السابقة ({exportJobs.length})</h3>
              {exportJobs.length > 0 ? (
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {exportJobs.map((job, index) => (
                    <div key={index} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">
                          {new Date(job.start_time).toLocaleString('ar-SA')} - {new Date(job.end_time).toLocaleString('ar-SA')}
                        </p>
                        <p className="text-xs text-gray-500">
                          طلب بواسطة: {job.requested_by} | {job.format?.toUpperCase()}
                        </p>
                      </div>
                      <Badge variant={
                        job.status === 'completed' ? 'default' :
                        job.status === 'processing' ? 'secondary' :
                        job.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {job.status === 'completed' ? '✅ مكتمل' :
                         job.status === 'processing' ? '⏳ جاري...' :
                         job.status === 'failed' ? '❌ فشل' : '⏸ معلق'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">لا توجد طلبات سابقة</p>
              )}
            </div>
            
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowExport(false)}>إغلاق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detection Settings in Main Settings Tab */}
      </div>
    </div>
  );
};

export default CCTVSystem;
