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

      {/* Hikvision Devices List */}
      {hikvisionConfig.is_connected && hikvisionDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              الأجهزة والكاميرات المكتشفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hikvisionDevices.map((device, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold">{device.name || `جهاز ${index + 1}`}</span>
                    </div>
                    <Badge variant={device.is_online ? "success" : "destructive"}>
                      {device.is_online ? 'متصل' : 'غير متصل'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>IP: {device.ip_address || 'غير متاح'}</p>
                    <p>النوع: {device.device_type || 'كاميرا'}</p>
                    <p>الموديل: {device.model || 'غير محدد'}</p>
                    {device.channels && <p>القنوات: {device.channels}</p>}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-3"
                    onClick={() => {
                      setNewCamera({
                        ...newCamera,
                        name: device.name || `كاميرا ${index + 1}`,
                        ip_address: device.ip_address || '',
                        camera_type: 'hikvision'
                      });
                      setShowAddCamera(true);
                    }}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة للنظام
                  </Button>
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
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

        {/* Cameras Tab */}
        <TabsContent value="cameras">
          {/* Camera Slots Grid - 5 Fixed Slots */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">{t('camera_slots') || 'خانات الكاميرات'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((slotNum) => {
                const camera = cameras[slotNum - 1];
                return (
                  <Card 
                    key={slotNum} 
                    className={`relative ${camera ? (camera.is_online ? 'border-green-300' : 'border-red-300') : 'border-dashed border-gray-300'}`}
                    data-testid={`camera-slot-${slotNum}`}
                  >
                    <CardHeader className="pb-2 p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${camera ? (camera.is_online ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-400'}`}>
                            {slotNum}
                          </div>
                          <div>
                            <CardTitle className="text-sm">
                              {camera ? camera.name : `خانة ${slotNum}`}
                            </CardTitle>
                            {camera && (
                              <p className="text-xs text-gray-500">{camera.ip_address}:{camera.port}</p>
                            )}
                          </div>
                        </div>
                        {camera && (
                          <Badge variant={camera.is_online ? "success" : "destructive"} className="text-xs">
                            {camera.is_online ? 'متصل' : 'غير متصل'}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      {/* Camera Preview Area */}
                      <div className="bg-gray-900 h-32 rounded-lg flex items-center justify-center mb-3">
                        {camera ? (
                          camera.is_online ? (
                            <div className="text-center">
                              <Video className="h-8 w-8 text-gray-500 mx-auto mb-1" />
                              <p className="text-gray-400 text-xs">البث المباشر</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-1" />
                              <p className="text-red-400 text-xs">غير متصل</p>
                            </div>
                          )
                        ) : (
                          <div className="text-center">
                            <Plus className="h-8 w-8 text-gray-500 mx-auto mb-1" />
                            <p className="text-gray-400 text-xs">خانة فارغة</p>
                          </div>
                        )}
                      </div>
                      
                      {camera ? (
                        <>
                          <div className="space-y-1 text-xs mb-3">
                            <div className="flex justify-between">
                              <span className="text-gray-500">الموقع:</span>
                              <span className="truncate max-w-[100px]">{camera.location || 'غير محدد'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">النوع:</span>
                              <span className="capitalize">{camera.camera_type}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="flex-1 text-xs" disabled={!camera.is_online}>
                              <Play className="h-3 w-3 ml-1" />
                              مشاهدة
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedCamera(camera)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteCamera(camera.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => setShowAddCamera(true)}
                        >
                          <Plus className="h-3 w-3 ml-1" />
                          إضافة كاميرا
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Additional Cameras (beyond slot 5) */}
          {cameras.length > 5 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">كاميرات إضافية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cameras.slice(5).map((camera) => (
                  <Card key={camera.id} className={`relative ${!camera.is_online ? 'border-red-300' : 'border-green-300'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{camera.name}</CardTitle>
                          <p className="text-sm text-gray-500">{camera.ip_address}:{camera.port}</p>
                        </div>
                        <Badge variant={camera.is_online ? "success" : "destructive"}>
                          {camera.is_online ? 'متصل' : 'غير متصل'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-900 h-40 rounded-lg flex items-center justify-center mb-4">
                        {camera.is_online ? (
                          <div className="text-center">
                            <Video className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">البث المباشر</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                            <p className="text-red-400 text-sm">غير متصل</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">الموقع:</span>
                          <span>{camera.location || 'غير محدد'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">القناة:</span>
                          <span>{camera.channel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">النوع:</span>
                          <span className="capitalize">{camera.camera_type}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1" disabled={!camera.is_online}>
                          <Play className="h-4 w-4 ml-1" />
                          مشاهدة
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSelectedCamera(camera)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCamera(camera.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Empty state when no cameras */}
          {cameras.length === 0 && !loading && (
            <Card className="mt-4">
              <CardContent className="py-12 text-center">
                <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">لا توجد كاميرات مضافة حتى الآن</p>
                <p className="text-gray-400 text-sm mb-4">أضف كاميرا جديدة في إحدى الخانات أعلاه</p>
                <Button onClick={() => setShowAddCamera(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة كاميرا جديدة
                </Button>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
};

export default CCTVSystem;
