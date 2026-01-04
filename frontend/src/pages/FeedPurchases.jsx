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
import { Plus, Pencil, Trash2, Wheat, Building2, ShoppingBag, Wallet, Printer, CheckCircle, Package, FileText, TrendingUp, AlertTriangle, Bell } from "lucide-react";
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
  const [feedInventory, setFeedInventory] = useState([]);
  const [feedReport, setFeedReport] = useState(null);
  const [feedAlerts, setFeedAlerts] = useState(null);
  
  // Dialog states
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [feedTypeDialogOpen, setFeedTypeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [minStockDialogOpen, setMinStockDialogOpen] = useState(false);
  const [selectedFeedType, setSelectedFeedType] = useState(null);
  const [minStockValue, setMinStockValue] = useState("");
  
  // Form states
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: "",
    supplier_name: "",
    supplier_code: "",
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
      const [purchasesRes, companiesRes, feedTypesRes, suppliersRes, inventoryRes, reportRes, alertsRes] = await Promise.all([
        axios.get(`${API}/feed-purchases`),
        axios.get(`${API}/feed-companies`),
        axios.get(`${API}/feed-types`),
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/feed-inventory`),
        axios.get(`${API}/reports/feed-purchases`),
        axios.get(`${API}/feed-inventory/alerts`),
      ]);
      setPurchases(purchasesRes.data);
      setCompanies(companiesRes.data);
      setFeedTypes(feedTypesRes.data);
      setSuppliers(suppliersRes.data);
      setFeedInventory(inventoryRes.data);
      setFeedReport(reportRes.data);
      setFeedAlerts(alertsRes.data);
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
      supplier_code: supplier?.code || supplierId?.slice(0,6) || "",
    });
    // For edit mode, add back the original amount to available balance
    let balance = supplier?.balance || 0;
    if (editingPurchase && editingPurchase.supplier_id === supplierId) {
      balance += editingPurchase.total_amount || 0;
    }
    setSelectedSupplierBalance(balance);
  };

  // Handle supplier code input - search by code
  const handleSupplierCodeChange = (code) => {
    setPurchaseForm({ ...purchaseForm, supplier_code: code, supplier_id: "", supplier_name: "" });
    setSelectedSupplierBalance(0);
    
    if (code.length >= 3) {
      // Search for supplier by code or id
      const supplier = suppliers.find((s) => 
        (s.code && s.code.toLowerCase().includes(code.toLowerCase())) ||
        s.id?.toLowerCase().includes(code.toLowerCase())
      );
      
      if (supplier && supplier.balance > 0) {
        setPurchaseForm({
          ...purchaseForm,
          supplier_code: code,
          supplier_id: supplier.id,
          supplier_name: supplier.name,
        });
        let balance = supplier.balance || 0;
        if (editingPurchase && editingPurchase.supplier_id === supplier.id) {
          balance += editingPurchase.total_amount || 0;
        }
        setSelectedSupplierBalance(balance);
      }
    }
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
    // Get all feed types for the table
    const feedTypesData = feedTypes || [];
    const printWindow = window.open('', '_blank');
    const printDate = new Date(purchase.purchase_date).toLocaleDateString('en-GB').replace(/\//g, '-');
    
    // Use the uploaded logo URL directly
    const logoUrl = 'https://customer-assets.emergentagent.com/job_milk-erp-1/artifacts/ciylod8k_image.png';
    
    // Build feed types rows
    let feedTypesRows = '';
    let slNo = 1;
    feedTypesData.forEach(ft => {
      const qty = ft.id === purchase.feed_type_id ? purchase.quantity : 0;
      feedTypesRows += `
        <tr>
          <td class="sl-col">${slNo}</td>
          <td class="product-col">${ft.name}</td>
          <td class="weight-col">${ft.kg_per_unit || 40}</td>
          <td class="qty-col" style="font-weight: ${qty > 0 ? 'bold' : 'normal'};">${qty}</td>
        </tr>
      `;
      slNo++;
    });

    // If no feed types, show just the purchased item
    if (feedTypesData.length === 0) {
      feedTypesRows = `
        <tr>
          <td class="sl-col">1</td>
          <td class="product-col">${purchase.feed_type_name}</td>
          <td class="weight-col">40</td>
          <td class="qty-col" style="font-weight: bold;">${purchase.quantity}</td>
        </tr>
      `;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>PURCHASE REQUEST - ${purchase.invoice_number || purchase.id.slice(0,8)}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: Arial, 'Tahoma', sans-serif; 
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
            font-size: 11px;
            line-height: 1.4;
            border: 1px solid #3b82f6;
          }
          
          /* Header Section */
          .header {
            display: flex;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          .logo {
            width: 85px;
            height: 85px;
            margin-right: 20px;
            flex-shrink: 0;
          }
          .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .company-info {
            flex: 1;
            text-align: center;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .company-details {
            font-size: 10px;
            color: #333;
          }
          .company-details div {
            margin: 2px 0;
          }
          
          /* Title */
          .title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px double #000;
          }
          
          /* Farmer Info Section */
          .farmer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding: 10px 0;
          }
          .farmer-left {
            font-size: 11px;
          }
          .farmer-left div {
            margin: 4px 0;
          }
          .farmer-name {
            color: #2563eb;
            font-weight: bold;
          }
          .farmer-right {
            text-align: right;
          }
          .ref-number {
            color: #db2777;
            font-weight: bold;
            font-size: 12px;
          }
          .ref-date {
            color: #db2777;
            font-size: 11px;
          }
          
          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px 5px;
          }
          th {
            background: #f3f4f6;
            font-weight: bold;
            font-size: 10px;
          }
          .sl-col { width: 8%; text-align: center; }
          .product-col { width: 52%; text-align: left; padding-left: 10px; }
          .weight-col { width: 20%; text-align: center; }
          .qty-col { width: 20%; text-align: center; }
          
          /* Remarks */
          .remarks {
            margin-top: 20px;
            font-size: 10px;
          }
          .remarks-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .remarks-content {
            display: flex;
          }
          .remarks-en {
            flex: 1;
            padding-right: 20px;
          }
          .remarks-ar {
            flex: 1;
            text-align: right;
            direction: rtl;
          }
          .remarks ol {
            margin-left: 15px;
          }
          .remarks li {
            margin: 5px 0;
          }
          
          /* Signature */
          .signature-section {
            margin-top: 40px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }
          .signature-line {
            width: 200px;
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
          }
          .signature-label {
            font-size: 10px;
          }
          .signature-label-ar {
            font-size: 10px;
            direction: rtl;
          }
          
          @media print { 
            body { 
              padding: 10px; 
              border: 1px solid #3b82f6;
            }
          }
        </style>
      </head>
      <body>
        <!-- Header with Logo and Company Info -->
        <div class="header">
          <div class="logo">
            <img src="${logoUrl}" alt="Al Morooj Dairy Logo" />
          </div>
          <div class="company-info">
            <div class="company-name">AL MOROOJ DAIRY CO SAOC</div>
            <div class="company-details">
              <div>CR NO: 1249988</div>
              <div>P.O BOX: 1385,PC-211</div>
              <div>VAT: OM1100091687</div>
              <div>SALALAH, SULTANATE OF OMAN</div>
            </div>
          </div>
        </div>
        
        <!-- Title -->
        <div class="title">PURCHASE REQUEST</div>
        
        <!-- Farmer Information -->
        <div class="farmer-section">
          <div class="farmer-left">
            <div><strong>Farmer Name</strong> <span class="farmer-name">${purchase.supplier_name}</span></div>
            <div><strong>Farmer Code</strong> ${purchase.supplier_id?.slice(0,4) || '0000'}</div>
            <div><strong>Farmer ID</strong> ${purchase.supplier_phone || '0000000'}</div>
          </div>
          <div class="farmer-right">
            <div class="ref-number">IDC/DFI/${purchase.invoice_number || 'H025-' + purchase.id.slice(0,4)}</div>
            <div class="ref-date">${printDate}</div>
          </div>
        </div>

        <!-- Products Table -->
        <table>
          <thead>
            <tr>
              <th class="sl-col">SL</th>
              <th class="product-col">Product / اسم المنتج</th>
              <th class="weight-col">Weight / الوزن بالكيلوا</th>
              <th class="qty-col">Quantity / الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${feedTypesRows}
          </tbody>
        </table>

        <!-- Remarks Section -->
        <div class="remarks">
          <div class="remarks-header">
            <span><strong>Remark:</strong></span>
            <span style="direction: rtl;"><strong>ملاحظة:</strong></span>
          </div>
          <div class="remarks-content">
            <div class="remarks-en">
              <ol>
                <li>The customer are agreed to transfer the full feeds as per the purchase request signed</li>
                <li>All the farmer should bring the ID copy. Without ID proof, feeds will not issue</li>
              </ol>
            </div>
            <div class="remarks-ar">
              <div>1- أنا العميل أوافق على ضمن الكمية الموضحة في طلب الشراء بالكامل</div>
              <div style="margin-top: 5px;">2- على جميع المربين احضار نسخة من البطاقة الشخصية ، بدون البطاقة الشخصية لن يتم صرف الأعلاف</div>
            </div>
          </div>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-line">
            <div class="signature-label-ar">توقيع العميل</div>
            <div class="signature-label">Customer Signature</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
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
      supplier_code: "",
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
    const supplier = suppliers.find(s => s.id === purchase.supplier_id);
    setPurchaseForm({
      supplier_id: purchase.supplier_id,
      supplier_name: purchase.supplier_name,
      supplier_code: supplier?.code || purchase.supplier_id?.slice(0,6) || "",
      feed_type_id: purchase.feed_type_id,
      feed_type_name: purchase.feed_type_name,
      company_name: purchase.company_name,
      quantity: purchase.quantity,
      price_per_unit: purchase.price_per_unit,
      unit: purchase.unit,
    });
    // Set balance including the current purchase amount (since it will be refunded if changed)
    setSelectedSupplierBalance((supplier?.balance || 0) + (purchase.total_amount || 0));
    setPurchaseDialogOpen(true);
  };

  // Update min stock alert
  const handleUpdateMinStock = async () => {
    if (!selectedFeedType || !minStockValue) return;
    try {
      await axios.put(`${API}/feed-types/${selectedFeedType.id}/min-stock?min_stock=${parseFloat(minStockValue)}`);
      toast.success(language === "ar" ? "تم تحديث الحد الأدنى للتنبيه" : "Min stock alert updated");
      setMinStockDialogOpen(false);
      setSelectedFeedType(null);
      setMinStockValue("");
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل التحديث" : "Update failed"));
    }
  };

  const openMinStockDialog = (feedType) => {
    setSelectedFeedType(feedType);
    setMinStockValue(feedType.min_stock_alert?.toString() || "0");
    setMinStockDialogOpen(true);
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
      {/* Alerts Banner */}
      {feedAlerts && feedAlerts.total_alerts > 0 && (
        <Card className="border-orange-300 bg-gradient-to-r from-orange-50 to-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-800">
                  {language === "ar" ? `${feedAlerts.total_alerts} تنبيه انخفاض مخزون` : `${feedAlerts.total_alerts} Low Stock Alerts`}
                </h3>
                <div className="flex gap-4 text-sm mt-1">
                  {feedAlerts.critical_count > 0 && (
                    <span className="text-red-600 font-medium">
                      {language === "ar" ? `${feedAlerts.critical_count} حرج (نفذ)` : `${feedAlerts.critical_count} Critical (Out)`}
                    </span>
                  )}
                  {feedAlerts.warning_count > 0 && (
                    <span className="text-orange-600 font-medium">
                      {language === "ar" ? `${feedAlerts.warning_count} تحذير (منخفض)` : `${feedAlerts.warning_count} Warning (Low)`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {feedAlerts.alerts?.slice(0, 3).map((alert, idx) => (
                  <Badge 
                    key={idx} 
                    className={alert.alert_level === "critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}
                  >
                    {alert.feed_type_name}: {alert.current_quantity} / {alert.min_stock_alert}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <TabsList className="grid w-full max-w-3xl grid-cols-5">
                <TabsTrigger value="purchases" className="gap-2" data-testid="tab-purchases">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("feed_purchases")}</span>
                  <span className="sm:hidden">{language === "ar" ? "مشتريات" : "Purchases"}</span>
                </TabsTrigger>
                <TabsTrigger value="inventory" className="gap-2" data-testid="tab-inventory">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === "ar" ? "المخزون" : "Inventory"}</span>
                  <span className="sm:hidden">{language === "ar" ? "مخزون" : "Stock"}</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-2" data-testid="tab-reports">
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === "ar" ? "التقارير" : "Reports"}</span>
                  <span className="sm:hidden">{language === "ar" ? "تقارير" : "Reports"}</span>
                </TabsTrigger>
                <TabsTrigger value="companies" className="gap-2" data-testid="tab-companies">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("feed_companies")}</span>
                  <span className="sm:hidden">{language === "ar" ? "شركات" : "Companies"}</span>
                </TabsTrigger>
                <TabsTrigger value="types" className="gap-2" data-testid="tab-types">
                  <Wheat className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("feed_types")}</span>
                  <span className="sm:hidden">{language === "ar" ? "أنواع" : "Types"}</span>
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
                    <TableHead>{language === "ar" ? "الحد الأدنى" : "Min Stock"}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className={feedType.min_stock_alert > 0 ? "text-orange-600" : "text-muted-foreground"}
                            onClick={() => openMinStockDialog(feedType)}
                          >
                            <Bell className="w-4 h-4 me-1" />
                            {feedType.min_stock_alert > 0 ? feedType.min_stock_alert : "-"}
                          </Button>
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

          {/* Inventory Tab */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              {/* Inventory Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-emerald-600 font-medium">
                      {language === "ar" ? "إجمالي الكمية" : "Total Quantity"}
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {feedInventory.reduce((sum, i) => sum + (i.quantity || 0), 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600 font-medium">
                      {language === "ar" ? "إجمالي القيمة" : "Total Value"}
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {feedInventory.reduce((sum, i) => sum + (i.total_value || 0), 0).toLocaleString()} {t("currency")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-purple-600 font-medium">
                      {language === "ar" ? "عدد الأصناف" : "Item Count"}
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {feedInventory.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Inventory Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{language === "ar" ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                      <TableHead>{language === "ar" ? "نوع العلف" : "Feed Type"}</TableHead>
                      <TableHead>{language === "ar" ? "الشركة" : "Company"}</TableHead>
                      <TableHead>{language === "ar" ? "المورد" : "Supplier"}</TableHead>
                      <TableHead>{language === "ar" ? "الكمية" : "Quantity"}</TableHead>
                      <TableHead>{language === "ar" ? "القيمة" : "Value"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {language === "ar" ? "لا توجد بيانات مخزون" : "No inventory data"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      feedInventory.map((item) => (
                        <TableRow key={item.id} className="table-row-hover">
                          <TableCell>
                            {item.created_at ? new Date(item.created_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.invoice_number || "-"}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-2">
                              <Wheat className="w-4 h-4 text-amber-500" />
                              {item.product_name}
                            </span>
                          </TableCell>
                          <TableCell>{item.company_name}</TableCell>
                          <TableCell>{item.supplier_name}</TableCell>
                          <TableCell>
                            {item.quantity?.toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            {item.total_value?.toLocaleString()} {t("currency")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && feedReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600 font-medium">
                      {language === "ar" ? "إجمالي المشتريات" : "Total Purchases"}
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {feedReport.summary?.total_purchases || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-amber-600 font-medium">
                      {language === "ar" ? "إجمالي المبلغ" : "Total Amount"}
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {feedReport.summary?.total_amount?.toLocaleString() || 0} {t("currency")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-green-600 font-medium">
                      {language === "ar" ? "إجمالي الكمية" : "Total Quantity"}
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {feedReport.summary?.total_quantity?.toLocaleString() || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-purple-600 font-medium">
                      {language === "ar" ? "متوسط الفاتورة" : "Avg. Purchase"}
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {feedReport.summary?.average_purchase_amount?.toFixed(2) || 0} {t("currency")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* By Supplier */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {language === "ar" ? "حسب المورد" : "By Supplier"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === "ar" ? "المورد" : "Supplier"}</TableHead>
                          <TableHead>{language === "ar" ? "عدد المشتريات" : "Purchases"}</TableHead>
                          <TableHead>{language === "ar" ? "الكمية" : "Quantity"}</TableHead>
                          <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedReport.by_supplier?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.supplier_name}</TableCell>
                            <TableCell>{item.purchase_count}</TableCell>
                            <TableCell>{item.total_quantity?.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold text-amber-600">
                              {item.total_amount?.toLocaleString()} {t("currency")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* By Feed Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wheat className="w-5 h-5" />
                    {language === "ar" ? "حسب نوع العلف" : "By Feed Type"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === "ar" ? "نوع العلف" : "Feed Type"}</TableHead>
                          <TableHead>{language === "ar" ? "الشركة" : "Company"}</TableHead>
                          <TableHead>{language === "ar" ? "عدد المشتريات" : "Purchases"}</TableHead>
                          <TableHead>{language === "ar" ? "الكمية" : "Quantity"}</TableHead>
                          <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedReport.by_feed_type?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.feed_type_name}</TableCell>
                            <TableCell>{item.company_name}</TableCell>
                            <TableCell>{item.purchase_count}</TableCell>
                            <TableCell>{item.total_quantity?.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold text-amber-600">
                              {item.total_amount?.toLocaleString()} {t("currency")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* By Month */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {language === "ar" ? "حسب الشهر" : "By Month"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === "ar" ? "الشهر" : "Month"}</TableHead>
                          <TableHead>{language === "ar" ? "عدد المشتريات" : "Purchases"}</TableHead>
                          <TableHead>{language === "ar" ? "الكمية" : "Quantity"}</TableHead>
                          <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedReport.by_month?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell>{item.purchase_count}</TableCell>
                            <TableCell>{item.total_quantity?.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold text-amber-600">
                              {item.total_amount?.toLocaleString()} {t("currency")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
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
            {/* Supplier Code Input */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "كود المورد" : "Supplier Code"} *</Label>
              <Input
                type="text"
                placeholder={language === "ar" ? "أدخل كود المورد..." : "Enter supplier code..."}
                value={purchaseForm.supplier_code}
                onChange={(e) => handleSupplierCodeChange(e.target.value)}
                data-testid="purchase-supplier-code-input"
                className="text-lg"
              />
            </div>

            {/* Supplier Info Display - Shows after code match */}
            {purchaseForm.supplier_id && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{language === "ar" ? "اسم المورد" : "Supplier Name"}</p>
                  <p className="font-medium text-sm">{purchaseForm.supplier_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{language === "ar" ? "الرصيد المتاح" : "Available Balance"}</p>
                  <p className="font-medium text-sm text-emerald-600">
                    {selectedSupplierBalance.toLocaleString()} {t("currency")}
                  </p>
                </div>
              </div>
            )}

            {/* No supplier found warning */}
            {purchaseForm.supplier_code.length >= 3 && !purchaseForm.supplier_id && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700">
                  {language === "ar" ? "لم يتم العثور على مورد بهذا الكود أو رصيده صفر" : "No supplier found with this code or balance is zero"}
                </p>
              </div>
            )}

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
                      {feedType.name} ({feedType.company_name})
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
                  readOnly
                  className="bg-muted/50"
                  data-testid="purchase-price-input"
                />
                {purchaseForm.feed_type_id && (
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" ? "السعر من نوع العلف" : "Price from feed type"}
                  </p>
                )}
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

      {/* Min Stock Alert Dialog */}
      <Dialog open={minStockDialogOpen} onOpenChange={setMinStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              {language === "ar" ? "إعداد تنبيه المخزون" : "Set Stock Alert"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? `تحديد الحد الأدنى للتنبيه عند انخفاض مخزون "${selectedFeedType?.name}"`
                : `Set minimum stock level alert for "${selectedFeedType?.name}"`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="minStock">
                {language === "ar" ? "الحد الأدنى للكمية" : "Minimum Quantity"} ({getUnitLabel(selectedFeedType?.unit || "kg")})
              </Label>
              <Input
                id="minStock"
                type="number"
                step="1"
                min="0"
                value={minStockValue}
                onChange={(e) => setMinStockValue(e.target.value)}
                placeholder={language === "ar" ? "أدخل الكمية" : "Enter quantity"}
                data-testid="min-stock-input"
              />
              <p className="text-xs text-muted-foreground">
                {language === "ar" 
                  ? "سيظهر تنبيه عندما ينخفض المخزون عن هذا الحد. أدخل 0 لإلغاء التنبيه."
                  : "An alert will show when stock falls below this level. Enter 0 to disable."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMinStockDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleUpdateMinStock}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="save-min-stock-btn"
            >
              <Bell className="w-4 h-4 me-2" />
              {language === "ar" ? "حفظ التنبيه" : "Save Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedPurchases;
