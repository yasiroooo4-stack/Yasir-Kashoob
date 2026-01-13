import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API, useLanguage } from "../App";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  Settings,
  Building,
  DollarSign,
  Package,
  Bell,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  MapPin,
  Phone,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const SystemSettings = () => {
  const { language } = useLanguage();
  const t = (ar, en) => language === "ar" ? ar : en;
  
  const [activeTab, setActiveTab] = useState("centers");
  const [loading, setLoading] = useState(false);
  
  // Centers
  const [centers, setCenters] = useState([]);
  const [centerDialogOpen, setCenterDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [centerForm, setCenterForm] = useState({ name: "", code: "", location: "", phone: "", is_active: true });
  
  // Milk Prices
  const [milkPrices, setMilkPrices] = useState([]);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  
  // Feed Types
  const [feedTypes, setFeedTypes] = useState([]);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);
  const [feedForm, setFeedForm] = useState({ name: "", price: "", unit: "كجم", stock: 0, min_stock: 100 });
  
  // Alerts Settings
  const [alertSettings, setAlertSettings] = useState({
    low_balance_threshold: 100,
    low_stock_threshold: 50,
    enable_sms: false,
    enable_email: false,
    alert_recipients: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch centers from API
      try {
        const centersRes = await axios.get(`${API}/api/centers`, { headers });
        const suppliersRes = await axios.get(`${API}/api/suppliers`, { headers });
        const centersWithCount = (centersRes.data || []).map(center => ({
          ...center,
          suppliers_count: (suppliersRes.data || []).filter(s => s.center_name === center.name).length,
        }));
        setCenters(centersWithCount);
      } catch {
        setCenters([]);
      }
      
      // Fetch milk prices
      try {
        const pricesRes = await axios.get(`${API}/api/settings/milk-prices`, { headers });
        if (pricesRes.data && pricesRes.data.length > 0) {
          setMilkPrices(pricesRes.data);
        } else {
          setMilkPrices([
            { id: "camel", name: t("حليب الإبل", "Camel Milk"), price: 0.350, is_active: true },
            { id: "cow", name: t("حليب الأبقار", "Cow Milk"), price: 0.250, is_active: true },
          ]);
        }
      } catch {
        setMilkPrices([
          { id: "camel", name: t("حليب الإبل", "Camel Milk"), price: 0.350, is_active: true },
          { id: "cow", name: t("حليب الأبقار", "Cow Milk"), price: 0.250, is_active: true },
        ]);
      }
      
      // Fetch feed types
      try {
        const feedRes = await axios.get(`${API}/api/feed-types`, { headers });
        setFeedTypes(feedRes.data || []);
      } catch {
        // Use default feed types
        setFeedTypes([
          { id: "barley", name: "شعير", price: 85, unit: "كجم", stock: 1000, min_stock: 100 },
          { id: "wheat_bran", name: "نخالة قمح", price: 70, unit: "كجم", stock: 800, min_stock: 100 },
          { id: "corn", name: "ذرة", price: 95, unit: "كجم", stock: 500, min_stock: 100 },
          { id: "alfalfa", name: "برسيم", price: 120, unit: "كجم", stock: 300, min_stock: 100 },
          { id: "mixed", name: "علف مخلوط", price: 100, unit: "كجم", stock: 600, min_stock: 100 },
        ]);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Center Functions
  const openCenterDialog = (center = null) => {
    if (center) {
      setEditingCenter(center);
      setCenterForm({ name: center.name, code: center.code, location: center.location, phone: center.phone || "", is_active: center.is_active });
    } else {
      setEditingCenter(null);
      setCenterForm({ name: "", code: "", location: "", phone: "", is_active: true });
    }
    setCenterDialogOpen(true);
  };

  const saveCenter = async () => {
    if (!centerForm.name) {
      toast.error(t("الرجاء إدخال اسم المركز", "Please enter center name"));
      return;
    }
    
    try {
      if (editingCenter) {
        // Update existing center via API
        await axios.put(`${API}/api/centers/${editingCenter.id}`, centerForm, { headers });
        toast.success(t("تم تحديث المركز بنجاح", "Center updated successfully"));
      } else {
        // Add new center via API
        await axios.post(`${API}/api/centers`, centerForm, { headers });
        toast.success(t("تم إضافة المركز بنجاح", "Center added successfully"));
      }
      setCenterDialogOpen(false);
      fetchAllData(); // Refresh data
    } catch (error) {
      toast.error(t("فشل في حفظ المركز", "Failed to save center"));
    }
  };

  const deleteCenter = async (centerId) => {
    if (!window.confirm(t("هل أنت متأكد من حذف هذا المركز؟", "Are you sure you want to delete this center?"))) {
      return;
    }
    try {
      await axios.delete(`${API}/api/centers/${centerId}`, { headers });
      toast.success(t("تم حذف المركز", "Center deleted"));
      fetchAllData();
    } catch (error) {
      toast.error(t("فشل في حذف المركز", "Failed to delete center"));
    }
  };

  // Price Functions
  const openPriceDialog = (price) => {
    setEditingPrice({ ...price });
    setPriceDialogOpen(true);
  };

  const savePrice = async () => {
    if (!editingPrice) return;
    
    try {
      // Save to backend
      await axios.post(`${API}/api/settings/milk-prices`, {
        milk_type: editingPrice.id,
        name: editingPrice.name,
        price: editingPrice.price,
        is_active: editingPrice.is_active
      }, { headers });
      
      // Update local state
      const updatedPrices = milkPrices.map(p => 
        p.id === editingPrice.id ? editingPrice : p
      );
      setMilkPrices(updatedPrices);
      setPriceDialogOpen(false);
      toast.success("تم حفظ السعر بنجاح");
    } catch (error) {
      console.error("Error saving price:", error);
      toast.error("فشل في حفظ السعر");
    }
  };

  // Feed Functions
  const openFeedDialog = (feed = null) => {
    if (feed) {
      setEditingFeed(feed);
      setFeedForm({ name: feed.name, price: feed.price, unit: feed.unit, stock: feed.stock, min_stock: feed.min_stock });
    } else {
      setEditingFeed(null);
      setFeedForm({ name: "", price: "", unit: "كجم", stock: 0, min_stock: 100 });
    }
    setFeedDialogOpen(true);
  };

  const saveFeed = () => {
    if (!feedForm.name || !feedForm.price) {
      toast.error("الرجاء إدخال جميع البيانات");
      return;
    }
    
    if (editingFeed) {
      const updatedFeeds = feedTypes.map(f => 
        f.id === editingFeed.id ? { ...f, ...feedForm, price: parseFloat(feedForm.price) } : f
      );
      setFeedTypes(updatedFeeds);
      toast.success("تم تحديث نوع العلف بنجاح");
    } else {
      const newFeed = {
        id: `feed_${Date.now()}`,
        ...feedForm,
        price: parseFloat(feedForm.price),
      };
      setFeedTypes([...feedTypes, newFeed]);
      toast.success("تم إضافة نوع العلف بنجاح");
    }
    setFeedDialogOpen(false);
  };

  const deleteFeed = (feedId) => {
    setFeedTypes(feedTypes.filter(f => f.id !== feedId));
    toast.success("تم حذف نوع العلف");
  };

  // Save Alert Settings
  const saveAlertSettings = () => {
    toast.success("تم حفظ إعدادات التنبيهات");
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-7 h-7" />
            {t("إعدادات النظام", "System Settings")}
          </h1>
          <p className="text-muted-foreground">{t("إدارة المراكز والأسعار والأعلاف والتنبيهات", "Manage centers, prices, feeds, and alerts")}</p>
        </div>
        <Button onClick={fetchAllData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="centers"><Building className="w-4 h-4 me-1" />{t("المراكز", "Centers")}</TabsTrigger>
          <TabsTrigger value="prices"><DollarSign className="w-4 h-4 me-1" />{t("الأسعار", "Prices")}</TabsTrigger>
          <TabsTrigger value="feeds"><Package className="w-4 h-4 me-1" />{t("الأعلاف", "Feeds")}</TabsTrigger>
          <TabsTrigger value="alerts"><Bell className="w-4 h-4 me-1" />{t("التنبيهات", "Alerts")}</TabsTrigger>
        </TabsList>

        {/* Centers Tab */}
        <TabsContent value="centers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("مراكز التجميع", "Collection Centers")}</CardTitle>
                  <CardDescription>{t("إدارة مراكز تجميع الحليب", "Manage milk collection centers")}</CardDescription>
                </div>
                <Button onClick={() => openCenterDialog()}>
                  <Plus className="w-4 h-4 me-2" />
                  {t("إضافة مركز", "Add Center")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {centers.map((center) => (
                  <Card key={center.id} className={`${center.is_active ? "" : "opacity-60"}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-5 h-5 text-primary" />
                          <h4 className="font-bold">{center.name}</h4>
                        </div>
                        <Badge variant={center.is_active ? "default" : "secondary"}>
                          {center.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {center.location || t("غير محدد", "Not specified")}
                        </div>
                        {center.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {center.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{center.suppliers_count} {t("مورد", "suppliers")}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openCenterDialog(center)}>
                          <Pencil className="w-4 h-4 me-2" />
                          {t("تعديل", "Edit")}
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteCenter(center.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteCenter(center.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prices Tab */}
        <TabsContent value="prices">
          <Card>
            <CardHeader>
              <CardTitle>{t("أسعار الحليب", "Milk Prices")}</CardTitle>
              <CardDescription>{t("تحديد سعر الشراء لكل نوع حليب", "Set purchase price for each milk type")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {milkPrices.map((price) => (
                  <Card key={price.id} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{price.id === "camel" ? "🐪" : "🐄"}</span>
                          <div>
                            <h4 className="font-bold">{price.name}</h4>
                            <p className="text-sm text-muted-foreground">{t("سعر اللتر", "Price per liter")}</p>
                          </div>
                        </div>
                        <Badge variant={price.is_active ? "default" : "secondary"}>
                          {price.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}
                        </Badge>
                      </div>
                      <div className="text-center mb-4">
                        <p className="text-4xl font-bold text-primary">{price.price.toFixed(3)}</p>
                        <p className="text-sm text-muted-foreground">{t("ريال عماني / لتر", "OMR / Liter")}</p>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => openPriceDialog(price)}>
                        <Pencil className="w-4 h-4 me-2" />
                        {t("تعديل السعر", "Edit Price")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feeds Tab */}
        <TabsContent value="feeds">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("أنواع الأعلاف", "Feed Types")}</CardTitle>
                  <CardDescription>{t("إدارة أنواع وأسعار الأعلاف", "Manage feed types and prices")}</CardDescription>
                </div>
                <Button onClick={() => openFeedDialog()}>
                  <Plus className="w-4 h-4 me-2" />
                  {t("إضافة نوع", "Add Type")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("النوع", "Type")}</TableHead>
                      <TableHead>{t("السعر", "Price")}</TableHead>
                      <TableHead>{t("الوحدة", "Unit")}</TableHead>
                      <TableHead>{t("المخزون", "Stock")}</TableHead>
                      <TableHead>{t("الحد الأدنى", "Min Stock")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                      <TableHead>{t("الإجراءات", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedTypes.map((feed) => (
                      <TableRow key={feed.id}>
                        <TableCell className="font-medium">{feed.name}</TableCell>
                        <TableCell className="text-green-600 font-bold">{feed.price} {t("ر.ع", "OMR")}</TableCell>
                        <TableCell>{feed.unit}</TableCell>
                        <TableCell>
                          <span className={feed.stock < feed.min_stock ? "text-red-600 font-bold" : ""}>
                            {feed.stock}
                          </span>
                        </TableCell>
                        <TableCell>{feed.min_stock}</TableCell>
                        <TableCell>
                          {feed.stock < feed.min_stock ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              منخفض
                            </Badge>
                          ) : (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" />
                              متوفر
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openFeedDialog(feed)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFeed(feed.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات التنبيهات</CardTitle>
              <CardDescription>تكوين التنبيهات والإشعارات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold">حدود التنبيه</h4>
                  <div className="space-y-2">
                    <Label>حد الرصيد المنخفض (ر.ع)</Label>
                    <Input
                      type="number"
                      value={alertSettings.low_balance_threshold}
                      onChange={(e) => setAlertSettings({ ...alertSettings, low_balance_threshold: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">تنبيه عند انخفاض رصيد المورد عن هذا المبلغ</p>
                  </div>
                  <div className="space-y-2">
                    <Label>حد المخزون المنخفض</Label>
                    <Input
                      type="number"
                      value={alertSettings.low_stock_threshold}
                      onChange={(e) => setAlertSettings({ ...alertSettings, low_stock_threshold: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">تنبيه عند انخفاض مخزون الأعلاف</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-bold">قنوات الإشعار</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>إشعارات SMS</Label>
                      <p className="text-xs text-muted-foreground">إرسال رسائل نصية</p>
                    </div>
                    <Switch
                      checked={alertSettings.enable_sms}
                      onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, enable_sms: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>إشعارات البريد</Label>
                      <p className="text-xs text-muted-foreground">إرسال بريد إلكتروني</p>
                    </div>
                    <Switch
                      checked={alertSettings.enable_email}
                      onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, enable_email: checked })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>مستلمي التنبيهات</Label>
                    <Input
                      placeholder="email@example.com, +968XXXXXXXX"
                      value={alertSettings.alert_recipients}
                      onChange={(e) => setAlertSettings({ ...alertSettings, alert_recipients: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <Button onClick={saveAlertSettings} className="w-full md:w-auto">
                <Save className="w-4 h-4 me-2" />
                حفظ الإعدادات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Center Dialog */}
      <Dialog open={centerDialogOpen} onOpenChange={setCenterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCenter ? "تعديل المركز" : "إضافة مركز جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المركز *</Label>
              <Input value={centerForm.name} onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الكود</Label>
              <Input value={centerForm.code} onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الموقع</Label>
              <Input value={centerForm.location} onChange={(e) => setCenterForm({ ...centerForm, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input value={centerForm.phone} onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>نشط</Label>
              <Switch checked={centerForm.is_active} onCheckedChange={(checked) => setCenterForm({ ...centerForm, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCenterDialogOpen(false)}>إلغاء</Button>
            <Button onClick={saveCenter}><Save className="w-4 h-4 me-2" />حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل سعر {editingPrice?.name}</DialogTitle>
          </DialogHeader>
          {editingPrice && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <span className="text-5xl">{editingPrice.id === "camel" ? "🐪" : "🐄"}</span>
              </div>
              <div className="space-y-2">
                <Label>السعر (ر.ع / لتر)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingPrice.price}
                  onChange={(e) => setEditingPrice({ ...editingPrice, price: parseFloat(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>نشط</Label>
                <Switch
                  checked={editingPrice.is_active}
                  onCheckedChange={(checked) => setEditingPrice({ ...editingPrice, is_active: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)}>إلغاء</Button>
            <Button onClick={savePrice}><Save className="w-4 h-4 me-2" />حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feed Dialog */}
      <Dialog open={feedDialogOpen} onOpenChange={setFeedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFeed ? "تعديل نوع العلف" : "إضافة نوع علف جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم العلف *</Label>
              <Input value={feedForm.name} onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>السعر (ر.ع) *</Label>
              <Input type="number" value={feedForm.price} onChange={(e) => setFeedForm({ ...feedForm, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الوحدة</Label>
              <Select value={feedForm.unit} onValueChange={(v) => setFeedForm({ ...feedForm, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="كجم">كجم</SelectItem>
                  <SelectItem value="طن">طن</SelectItem>
                  <SelectItem value="كيس">كيس</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المخزون الحالي</Label>
                <Input type="number" value={feedForm.stock} onChange={(e) => setFeedForm({ ...feedForm, stock: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>الحد الأدنى</Label>
                <Input type="number" value={feedForm.min_stock} onChange={(e) => setFeedForm({ ...feedForm, min_stock: parseInt(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedDialogOpen(false)}>إلغاء</Button>
            <Button onClick={saveFeed}><Save className="w-4 h-4 me-2" />حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemSettings;
