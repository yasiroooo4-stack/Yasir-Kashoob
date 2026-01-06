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
  }, []);

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
    <div className="min-h-screen" data-testid="cctv-system">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6 m-4 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">نظام الكاميرات CCTV</h1>
            <p className="text-gray-600">Hikvision Integration</p>
          </div>
        <div className="flex gap-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameras.map((camera) => (
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
                    {camera.last_check && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">آخر فحص:</span>
                        <span>{new Date(camera.last_check).toLocaleString('ar-OM')}</span>
                      </div>
                    )}
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
            
            {cameras.length === 0 && !loading && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد كاميرات مضافة</p>
                  <Button onClick={() => setShowAddCamera(true)} className="mt-4">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة كاميرا جديدة
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
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
      </div>
    </div>
  );
};

export default CCTVSystem;
