import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Wheat, Building2, ShoppingBag, Wallet, Printer, CheckCircle } from "lucide-react";
import { Badge } from "../components/ui/badge";

const FeedPurchases = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("purchases");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [purchases, setPurchases] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [feedTypes, setFeedTypes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Dialog states
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [feedTypeDialogOpen, setFeedTypeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  
  // Form states
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: "",
    supplier_name: "",
    feed_type_id: "",
    feed_type_name: "",
    company_name: "",
    quantity: "",
    price_per_unit: "",
    unit: "kg",
  });
  
  const [companyForm, setCompanyForm] = useState({
    name: "",
    phone: "",
    address: "",
  });
  
  const [feedTypeForm, setFeedTypeForm] = useState({
    name: "",
    company_id: "",
    company_name: "",
    unit: "kg",
    kg_per_unit: "",
    price_per_unit: "",
    description: "",
  });
  
  const [selectedSupplierBalance, setSelectedSupplierBalance] = useState(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [purchasesRes, companiesRes, feedTypesRes, suppliersRes] = await Promise.all([
        axios.get(`${API}/feed-purchases`),
        axios.get(`${API}/feed-companies`),
        axios.get(`${API}/feed-types`),
        axios.get(`${API}/suppliers`),
      ]);
      setPurchases(purchasesRes.data);
      setCompanies(companiesRes.data);
      setFeedTypes(feedTypesRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle supplier selection
  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    setPurchaseForm({
      ...purchaseForm,
      supplier_id: supplierId,
      supplier_name: supplier?.name || "",
    });
    // For edit mode, add back the original amount to available balance
    let balance = supplier?.balance || 0;
    if (editingPurchase && editingPurchase.supplier_id === supplierId) {
      balance += editingPurchase.total_amount || 0;
    }
    setSelectedSupplierBalance(balance);
  };

  // Handle feed type selection
  const handleFeedTypeChange = (feedTypeId) => {
    const feedType = feedTypes.find((f) => f.id === feedTypeId);
    setPurchaseForm({
      ...purchaseForm,
      feed_type_id: feedTypeId,
      feed_type_name: feedType?.name || "",
      company_name: feedType?.company_name || "",
      price_per_unit: feedType?.price_per_unit || "",
      unit: feedType?.unit || "kg",
    });
  };

  // Handle company selection for feed type
  const handleCompanyChange = (companyId) => {
    const company = companies.find((c) => c.id === companyId);
    setFeedTypeForm({
      ...feedTypeForm,
      company_id: companyId,
      company_name: company?.name || "",
    });
  };

  // Submit purchase (create or update)
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    const totalAmount = parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.price_per_unit);
    
    // For edit mode, calculate available balance differently
    let availableBalance = selectedSupplierBalance;
    
    if (totalAmount > availableBalance) {
      toast.error(t("insufficient_balance"));
      return;
    }
    
    try {
      const data = {
        ...purchaseForm,
        quantity: parseFloat(purchaseForm.quantity),
        price_per_unit: parseFloat(purchaseForm.price_per_unit),
      };
      
      if (editingPurchase) {
        await axios.put(`${API}/feed-purchases/${editingPurchase.id}`, data);
        toast.success(t("success"));
      } else {
        await axios.post(`${API}/feed-purchases`, data);
        toast.success(t("success"));
      }
      
      setPurchaseDialogOpen(false);
      resetPurchaseForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Approve feed purchase invoice
  const handleApproveInvoice = async (purchaseId) => {
    try {
      const response = await axios.post(`${API}/feed-purchases/${purchaseId}/approve`);
      toast.success(
        language === "ar" 
          ? `تم تصديق الفاتورة - كود: ${response.data.signature_code}`
          : `Invoice approved - Code: ${response.data.signature_code}`
      );
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل التصديق" : "Approval failed"));
    }
  };

  // Print feed purchase invoice
  const handlePrintInvoice = async (purchase) => {
    const printWindow = window.open('', '_blank');
    const printTime = new Date().toLocaleString('ar-SA');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة شراء أعلاف - ${purchase.invoice_number || purchase.id.slice(0,8)}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 30px; direction: rtl; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
          .invoice-title { text-align: center; font-size: 24px; margin: 20px 0; background: #f3f4f6; padding: 10px; border-radius: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .info-box h3 { margin: 0 0 10px 0; color: #2563eb; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .info-label { color: #666; }
          .info-value { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
          th { background: #2563eb; color: white; }
          .total-row { background: #f3f4f6; font-weight: bold; font-size: 18px; }
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; }
          .stamp { border: 3px solid #2563eb; padding: 20px; display: inline-block; border-radius: 10px; margin-top: 20px; }
          .stamp-approved { background: #dcfce7; border-color: #22c55e; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">شركة المروج للألبان</div>
            <div>Al Morooj Dairy Company</div>
            <div style="font-size: 12px;">سلطنة عمان</div>
          </div>
          <div style="text-align: left;">
            <strong>رقم الفاتورة:</strong> ${purchase.invoice_number || 'FP-' + purchase.id.slice(0,8)}<br>
            <strong>التاريخ:</strong> ${new Date(purchase.purchase_date).toLocaleDateString('ar-SA')}
          </div>
        </div>
        
        <div class="invoice-title">فاتورة استلام أعلاف</div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>بيانات المورد</h3>
            <div class="info-row"><span class="info-label">الاسم:</span> <span class="info-value">${purchase.supplier_name}</span></div>
            <div class="info-row"><span class="info-label">الهاتف:</span> <span class="info-value">${purchase.supplier_phone || '-'}</span></div>
            <div class="info-row"><span class="info-label">العنوان:</span> <span class="info-value">${purchase.supplier_address || '-'}</span></div>
          </div>
          <div class="info-box">
            <h3>بيانات الشراء</h3>
            <div class="info-row"><span class="info-label">الشركة المصنعة:</span> <span class="info-value">${purchase.company_name}</span></div>
            <div class="info-row"><span class="info-label">نوع العلف:</span> <span class="info-value">${purchase.feed_type_name}</span></div>
            <div class="info-row"><span class="info-label">منشئ الفاتورة:</span> <span class="info-value">${purchase.created_by_name || '-'}</span></div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>البند</th>
              <th>الكمية</th>
              <th>الوحدة</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${purchase.feed_type_name}</td>
              <td>${purchase.quantity.toLocaleString()}</td>
              <td>${purchase.unit}</td>
              <td>${purchase.price_per_unit.toLocaleString()} ر.ع</td>
              <td>${purchase.total_amount.toLocaleString()} ر.ع</td>
            </tr>
            <tr class="total-row">
              <td colspan="4">المجموع الكلي</td>
              <td>${purchase.total_amount.toLocaleString()} ر.ع</td>
            </tr>
          </tbody>
        </table>
        
        ${purchase.notes ? `<p><strong>ملاحظات:</strong> ${purchase.notes}</p>` : ''}
        
        <div class="signature-section">
          <div class="signature-box">
            <strong>توقيع المستلم</strong>
            <div class="signature-line">${purchase.supplier_name}</div>
          </div>
          <div class="signature-box">
            ${purchase.is_approved ? `
              <div class="stamp stamp-approved">
                <strong>مصدق إلكترونياً</strong><br>
                <span style="font-size: 11px;">كود التصديق:</span><br>
                <code style="font-size: 14px;">${purchase.signature_code}</code><br>
                <span style="font-size: 10px;">${purchase.approved_by_name}</span><br>
                <span style="font-size: 10px;">${new Date(purchase.approved_at).toLocaleDateString('ar-SA')}</span>
              </div>
            ` : `
              <div class="stamp">
                <strong>في انتظار التصديق</strong>
              </div>
            `}
          </div>
          <div class="signature-box">
            <strong>ختم الشركة</strong>
            <div class="signature-line">شركة المروج للألبان</div>
          </div>
        </div>
        
        <div class="footer">
          <p>تم طباعة هذه الفاتورة بتاريخ: ${printTime}</p>
          <p>هذه الفاتورة صادرة من نظام إدارة مراكز تجميع الحليب - شركة المروج للألبان</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Submit company
  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/feed-companies/${selectedItem.id}`, companyForm);
      } else {
        await axios.post(`${API}/feed-companies`, companyForm);
      }
      toast.success(t("success"));
      setCompanyDialogOpen(false);
      resetCompanyForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Submit feed type
  const handleFeedTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...feedTypeForm,
        price_per_unit: parseFloat(feedTypeForm.price_per_unit),
        kg_per_unit: feedTypeForm.kg_per_unit ? parseFloat(feedTypeForm.kg_per_unit) : null,
      };
      if (selectedItem) {
        await axios.put(`${API}/feed-types/${selectedItem.id}`, data);
      } else {
        await axios.post(`${API}/feed-types`, data);
      }
      toast.success(t("success"));
      setFeedTypeDialogOpen(false);
      resetFeedTypeForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    try {
      if (deleteType === "company") {
        await axios.delete(`${API}/feed-companies/${selectedItem.id}`);
      } else if (deleteType === "feedType") {
        await axios.delete(`${API}/feed-types/${selectedItem.id}`);
      } else if (deleteType === "purchase") {
        await axios.delete(`${API}/feed-purchases/${selectedItem.id}`);
      }
      toast.success(t("success"));
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Reset forms
  const resetPurchaseForm = () => {
    setPurchaseForm({
      supplier_id: "",
      supplier_name: "",
      feed_type_id: "",
      feed_type_name: "",
      company_name: "",
      quantity: "",
      price_per_unit: "",
      unit: "kg",
    });
    setSelectedSupplierBalance(0);
    setEditingPurchase(null);
  };

  const resetCompanyForm = () => {
    setCompanyForm({ name: "", phone: "", address: "" });
    setSelectedItem(null);
  };

  const resetFeedTypeForm = () => {
    setFeedTypeForm({
      name: "",
      company_id: "",
      company_name: "",
      unit: "kg",
      kg_per_unit: "",
      price_per_unit: "",
      description: "",
    });
    setSelectedItem(null);
  };

  // Edit handlers
  const openEditCompany = (company) => {
    setSelectedItem(company);
    setCompanyForm({
      name: company.name,
      phone: company.phone,
      address: company.address || "",
    });
    setCompanyDialogOpen(true);
  };

  const openEditFeedType = (feedType) => {
    setSelectedItem(feedType);
    setFeedTypeForm({
      name: feedType.name,
      company_id: feedType.company_id,
      company_name: feedType.company_name,
      unit: feedType.unit,
      kg_per_unit: feedType.kg_per_unit || "",
      price_per_unit: feedType.price_per_unit,
      description: feedType.description || "",
    });
    setFeedTypeDialogOpen(true);
  };

  const openEditPurchase = (purchase) => {
    setEditingPurchase(purchase);
    setPurchaseForm({
      supplier_id: purchase.supplier_id,
      supplier_name: purchase.supplier_name,
      feed_type_id: purchase.feed_type_id,
      feed_type_name: purchase.feed_type_name,
      company_name: purchase.company_name,
      quantity: purchase.quantity,
      price_per_unit: purchase.price_per_unit,
      unit: purchase.unit,
    });
    // Set balance including the current purchase amount (since it will be refunded if changed)
    const supplier = suppliers.find(s => s.id === purchase.supplier_id);
    setSelectedSupplierBalance((supplier?.balance || 0) + (purchase.total_amount || 0));
    setPurchaseDialogOpen(true);
  };

  const getUnitLabel = (unit) => {
    const units = { kg: t("kg"), bag: t("bag"), ton: t("ton") };
    return units[unit] || unit;
  };

  // Stats
  const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="feed-purchases-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("feed_purchases")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة مشتريات الأعلاف للموردين" : "Manage feed purchases for suppliers"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetPurchaseForm();
            setPurchaseDialogOpen(true);
          }}
          className="gradient-accent text-white"
          data-testid="add-feed-purchase-btn"
        >
          <Plus className="w-4 h-4 me-2" />
          {t("add_feed_purchase")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{purchases.length}</p>
              <p className="text-sm text-muted-foreground">{t("feed_purchases")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPurchases.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t("total_spent")} ({t("currency")})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{companies.length}</p>
              <p className="text-sm text-muted-foreground">{t("feed_companies")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
              <Wheat className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{feedTypes.length}</p>
              <p className="text-sm text-muted-foreground">{t("feed_types")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="purchases" className="gap-2" data-testid="tab-purchases">
                  <ShoppingBag className="w-4 h-4" />
                  {t("feed_purchases")}
                </TabsTrigger>
                <TabsTrigger value="companies" className="gap-2" data-testid="tab-companies">
                  <Building2 className="w-4 h-4" />
                  {t("feed_companies")}
                </TabsTrigger>
                <TabsTrigger value="types" className="gap-2" data-testid="tab-types">
                  <Wheat className="w-4 h-4" />
                  {t("feed_types")}
                </TabsTrigger>
              </TabsList>
              
              {activeTab === "companies" && (
                <Button
                  onClick={() => {
                    resetCompanyForm();
                    setCompanyDialogOpen(true);
                  }}
                  variant="outline"
                  className="gap-2"
                  data-testid="add-company-btn"
                >
                  <Plus className="w-4 h-4" />
                  {t("add_feed_company")}
                </Button>
              )}
              
              {activeTab === "types" && (
                <Button
                  onClick={() => {
                    resetFeedTypeForm();
                    setFeedTypeDialogOpen(true);
                  }}
                  variant="outline"
                  className="gap-2"
                  data-testid="add-feed-type-btn"
                >
                  <Plus className="w-4 h-4" />
                  {t("add_feed_type")}
                </Button>
              )}
            </div>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Purchases Tab */}
          {activeTab === "purchases" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{language === "ar" ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                    <TableHead>{t("supplier")}</TableHead>
                    <TableHead>{t("feed_type")}</TableHead>
                    <TableHead>{t("feed_company")}</TableHead>
                    <TableHead>{t("quantity")}</TableHead>
                    <TableHead>{t("total")}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {t("no_data")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchases.map((purchase) => (
                      <TableRow key={purchase.id} className="table-row-hover">
                        <TableCell>
                          {new Date(purchase.purchase_date).toLocaleDateString(
                            language === "ar" ? "ar-SA" : "en-US"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{purchase.invoice_number || '-'}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{purchase.supplier_name}</TableCell>
                        <TableCell>{purchase.feed_type_name}</TableCell>
                        <TableCell>{purchase.company_name}</TableCell>
                        <TableCell>
                          {purchase.quantity} {getUnitLabel(purchase.unit)}
                        </TableCell>
                        <TableCell className="font-semibold text-amber-600">
                          {purchase.total_amount?.toLocaleString()} {t("currency")}
                        </TableCell>
                        <TableCell>
                          {purchase.is_approved ? (
                            <Badge className="bg-green-100 text-green-700">
                              {language === "ar" ? "مصدق" : "Approved"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {language === "ar" ? "في الانتظار" : "Pending"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {!purchase.is_approved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleApproveInvoice(purchase.id)}
                                title={language === "ar" ? "تصديق" : "Approve"}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600"
                              onClick={() => handlePrintInvoice(purchase)}
                              title={language === "ar" ? "طباعة" : "Print"}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditPurchase(purchase)}
                              data-testid={`edit-purchase-${purchase.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedItem(purchase);
                                setDeleteType("purchase");
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`delete-purchase-${purchase.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Companies Tab */}
          {activeTab === "companies" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("phone")}</TableHead>
                    <TableHead>{t("address")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {t("no_data")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    companies.map((company) => (
                      <TableRow key={company.id} className="table-row-hover">
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            {company.name}
                          </span>
                        </TableCell>
                        <TableCell>{company.phone}</TableCell>
                        <TableCell>{company.address || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditCompany(company)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedItem(company);
                                setDeleteType("company");
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Feed Types Tab */}
          {activeTab === "types" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("feed_company")}</TableHead>
                    <TableHead>{t("unit")}</TableHead>
                    <TableHead>{t("kg_per_unit")}</TableHead>
                    <TableHead>{t("price_per_unit")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("no_data")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedTypes.map((feedType) => (
                      <TableRow key={feedType.id} className="table-row-hover">
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <Wheat className="w-4 h-4 text-amber-500" />
                            {feedType.name}
                          </span>
                        </TableCell>
                        <TableCell>{feedType.company_name}</TableCell>
                        <TableCell>{getUnitLabel(feedType.unit)}</TableCell>
                        <TableCell>
                          {feedType.kg_per_unit ? `${feedType.kg_per_unit} ${t("kg")}` : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {feedType.price_per_unit} {t("currency")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditFeedType(feedType)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedItem(feedType);
                                setDeleteType("feedType");
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPurchase ? t("edit_purchase") : t("add_feed_purchase")}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "شراء أعلاف من رصيد المورد" : "Buy feed from supplier balance"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePurchaseSubmit} className="space-y-4">
            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label>{t("supplier")} *</Label>
              <Select value={purchaseForm.supplier_id} onValueChange={handleSupplierChange}>
                <SelectTrigger data-testid="purchase-supplier-select">
                  <SelectValue placeholder={t("supplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.balance > 0 || (editingPurchase && s.id === editingPurchase.supplier_id)).map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} - {t("balance")}: {supplier.balance?.toLocaleString()} {t("currency")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSupplierBalance > 0 && (
                <p className="text-sm text-emerald-600 font-medium">
                  {t("available_balance")}: {selectedSupplierBalance.toLocaleString()} {t("currency")}
                </p>
              )}
            </div>

            {/* Feed Type Selection */}
            <div className="space-y-2">
              <Label>{t("feed_type")} *</Label>
              <Select value={purchaseForm.feed_type_id} onValueChange={handleFeedTypeChange}>
                <SelectTrigger data-testid="purchase-feed-type-select">
                  <SelectValue placeholder={t("feed_type")} />
                </SelectTrigger>
                <SelectContent>
                  {feedTypes.map((feedType) => (
                    <SelectItem key={feedType.id} value={feedType.id}>
                      {feedType.name} ({feedType.company_name}) - {feedType.price_per_unit} {t("currency")}/{getUnitLabel(feedType.unit)}
                      {feedType.kg_per_unit && ` (${feedType.kg_per_unit} ${t("kg")})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity and Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">{t("quantity")} *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                  required
                  data-testid="purchase-quantity-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_unit">{t("price_per_unit")} ({getUnitLabel(purchaseForm.unit)})</Label>
                <Input
                  id="price_per_unit"
                  type="number"
                  step="0.01"
                  value={purchaseForm.price_per_unit}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, price_per_unit: e.target.value })}
                  required
                  data-testid="purchase-price-input"
                />
              </div>
            </div>

            {/* Total Display */}
            {purchaseForm.quantity && purchaseForm.price_per_unit && (
              <div className={`p-4 rounded-lg ${
                parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.price_per_unit) > selectedSupplierBalance
                  ? "bg-red-50 border border-red-200"
                  : "bg-emerald-50 border border-emerald-200"
              }`}>
                <p className="text-sm text-muted-foreground">{t("total")}</p>
                <p className={`text-2xl font-bold ${
                  parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.price_per_unit) > selectedSupplierBalance
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}>
                  {(parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.price_per_unit)).toLocaleString()} {t("currency")}
                </p>
                {parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.price_per_unit) > selectedSupplierBalance && (
                  <p className="text-sm text-red-600 mt-1">{t("insufficient_balance")}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                className="gradient-accent text-white"
                disabled={
                  !purchaseForm.supplier_id ||
                  !purchaseForm.feed_type_id ||
                  !purchaseForm.quantity ||
                  parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.price_per_unit) > selectedSupplierBalance
                }
                data-testid="submit-purchase-btn"
              >
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? t("edit") : t("add_feed_company")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">{t("name")} *</Label>
              <Input
                id="company_name"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                required
                data-testid="company-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_phone">{t("phone")} *</Label>
              <Input
                id="company_phone"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                required
                data-testid="company-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_address">{t("address")}</Label>
              <Input
                id="company_address"
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                data-testid="company-address-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-secondary text-white" data-testid="submit-company-btn">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Feed Type Dialog */}
      <Dialog open={feedTypeDialogOpen} onOpenChange={setFeedTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? t("edit") : t("add_feed_type")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFeedTypeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feed_type_name">{t("name")} *</Label>
              <Input
                id="feed_type_name"
                value={feedTypeForm.name}
                onChange={(e) => setFeedTypeForm({ ...feedTypeForm, name: e.target.value })}
                required
                data-testid="feed-type-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("feed_company")} *</Label>
              <Select value={feedTypeForm.company_id} onValueChange={handleCompanyChange}>
                <SelectTrigger data-testid="feed-type-company-select">
                  <SelectValue placeholder={t("feed_company")} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("unit")}</Label>
                <Select
                  value={feedTypeForm.unit}
                  onValueChange={(value) => setFeedTypeForm({ ...feedTypeForm, unit: value })}
                >
                  <SelectTrigger data-testid="feed-type-unit-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">{t("kg")}</SelectItem>
                    <SelectItem value="bag">{t("bag")}</SelectItem>
                    <SelectItem value="ton">{t("ton")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kg_per_unit">{t("kg_per_unit")}</Label>
                <Input
                  id="kg_per_unit"
                  type="number"
                  step="0.1"
                  value={feedTypeForm.kg_per_unit}
                  onChange={(e) => setFeedTypeForm({ ...feedTypeForm, kg_per_unit: e.target.value })}
                  placeholder={language === "ar" ? "مثال: 25 كجم للكيس" : "e.g., 25 kg per bag"}
                  data-testid="feed-type-kg-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed_type_price">{t("price_per_unit")} *</Label>
              <Input
                id="feed_type_price"
                type="number"
                step="0.01"
                value={feedTypeForm.price_per_unit}
                onChange={(e) => setFeedTypeForm({ ...feedTypeForm, price_per_unit: e.target.value })}
                required
                data-testid="feed-type-price-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFeedTypeDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="bg-gradient-to-br from-violet-500 to-purple-600 text-white" data-testid="submit-feed-type-btn">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "purchase" ? (
                <>
                  {language === "ar"
                    ? `هل أنت متأكد من حذف هذه المشتراة؟`
                    : `Are you sure you want to delete this purchase?`}
                  <br />
                  <span className="text-emerald-600 font-medium">
                    {t("refund_note")}: {selectedItem?.total_amount?.toLocaleString()} {t("currency")}
                  </span>
                </>
              ) : (
                language === "ar"
                  ? `هل أنت متأكد من حذف "${selectedItem?.name}"؟`
                  : `Are you sure you want to delete "${selectedItem?.name}"?`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FeedPurchases;
