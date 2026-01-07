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
    
    try {
      // Get stream URL from backend
      const res = await fetch(`${API_URL}/api/cctv/hikvision/stream/${device.id || device.name}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStreamUrl(data.stream_url || '');
      }
    } catch (error) {
      console.error('Error getting stream URL:', error);
    }
    
    setShowLiveStream(true);
  };

  const handleViewRecordings = async (device) => {
    if (!device.is_online) {
      toast.error('الجهاز غير متصل');
      return;
    }
    toast.info('جاري تحميل التسجيلات...');
    // Navigate to recordings or open dialog
    setSelectedCamera(device);
    setActiveTab('events');
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

      {/* Hikvision Devices List - Similar to Hik-Connect */}
      {hikvisionConfig.is_connected && hikvisionDevices.length > 0 && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-600" />
                الأجهزة والكاميرات المرتبطة بـ {hikvisionConfig.username}
              </CardTitle>
              <Badge className="bg-blue-600">
                {hikvisionDevices.length} جهاز
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Devices Grid with Live Preview */}
            <div className="divide-y">
              {hikvisionDevices.map((device, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Live Preview / Thumbnail Area */}
                    <div 
                      className="w-48 h-32 bg-gray-900 rounded-lg flex-shrink-0 relative overflow-hidden cursor-pointer group"
                      onClick={() => handleOpenLiveStream(device)}
                      data-testid={`device-preview-${index}`}
                    >
                      {device.is_online ? (
                        <>
                          {device.snapshot_url ? (
                            <img 
                              src={device.snapshot_url} 
                              alt={device.name}
                              className="w-full h-full object-cover"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="h-10 w-10 text-gray-500" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="h-12 w-12 text-white" />
                          </div>
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs text-white bg-black/50 px-1 rounded">LIVE</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <WifiOff className="h-10 w-10 text-red-500 mb-2" />
                          <span className="text-red-400 text-xs">غير متصل</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Device Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            {device.device_type === 'NVR' ? (
                              <Activity className="h-5 w-5 text-purple-500" />
                            ) : (
                              <Camera className="h-5 w-5 text-blue-500" />
                            )}
                            {device.name || `جهاز ${index + 1}`}
                          </h3>
                          <p className="text-sm text-gray-500">{device.device_type || 'كاميرا'} - {device.model || 'Hikvision'}</p>
                        </div>
                        <Badge variant={device.is_online ? "success" : "destructive"} className="text-sm">
                          {device.is_online ? '● متصل' : '○ غير متصل'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">IP:</span>
                          <span className="font-mono">{device.ip_address || 'N/A'}</span>
                        </div>
                        {device.channels && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">القنوات:</span>
                            <span>{device.channels}</span>
                          </div>
                        )}
                        {device.serial_number && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">الرقم التسلسلي:</span>
                            <span className="font-mono text-xs">{device.serial_number}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleOpenLiveStream(device)}
                          disabled={!device.is_online}
                          data-testid={`live-stream-btn-${index}`}
                        >
                          <Play className="h-4 w-4 ml-1" />
                          بث مباشر
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewRecordings(device)}
                          disabled={!device.is_online}
                        >
                          <Clock className="h-4 w-4 ml-1" />
                          التسجيلات
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewEvents(device)}
                        >
                          <Bell className="h-4 w-4 ml-1" />
                          الأحداث
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedCamera(device);
                            setShowSettings(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sub-cameras for NVR */}
                  {device.device_type === 'NVR' && device.cameras && device.cameras.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-3">الكاميرات المتصلة ({device.cameras.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {device.cameras.map((cam, camIndex) => (
                          <div 
                            key={camIndex}
                            className="relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => handleOpenLiveStream(cam)}
                          >
                            <div className="aspect-video flex items-center justify-center">
                              <Camera className="h-6 w-6 text-gray-500" />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 p-2">
                              <p className="text-white text-xs truncate">{cam.name || `قناة ${camIndex + 1}`}</p>
                            </div>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إعدادات CCTV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>رابط نظام الألبان</Label>
              <Input
                value={settings.dairy_system_url || ''}
                onChange={(e) => setSettings({...settings, dairy_system_url: e.target.value})}
                placeholder="https://dairy-system.com"
              />
            </div>
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={settings.dairy_api_key || ''}
                onChange={(e) => setSettings({...settings, dairy_api_key: e.target.value})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>المزامنة التلقائية</Label>
              <input
                type="checkbox"
                checked={settings.auto_sync_enabled || false}
                onChange={(e) => setSettings({...settings, auto_sync_enabled: e.target.checked})}
                className="h-4 w-4"
              />
            </div>
            <div>
              <Label>كشف الحركة</Label>
              <input
                type="checkbox"
                checked={settings.motion_detection_enabled !== false}
                onChange={(e) => setSettings({...settings, motion_detection_enabled: e.target.checked})}
                className="h-4 w-4 mr-2"
              />
            </div>
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
              <Label>مدة الاحتفاظ بالتسجيلات (أيام)</Label>
              <Input
                type="number"
                value={settings.retention_days || 30}
                onChange={(e) => setSettings({...settings, retention_days: parseInt(e.target.value)})}
              />
            </div>
            
            <Button variant="outline" className="w-full" onClick={handleTestConnection}>
              اختبار الاتصال بنظام الألبان
            </Button>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSettings(false)}>إلغاء</Button>
              <Button onClick={handleSaveSettings}>حفظ</Button>
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

      {/* Event Detection Settings in Main Settings Tab */}
      </div>
    </div>
  );
};

export default CCTVSystem;
