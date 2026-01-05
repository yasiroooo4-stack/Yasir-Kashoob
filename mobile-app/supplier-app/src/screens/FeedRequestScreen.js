import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';

const FEED_TYPES = [
  { id: 'barley', name: 'شعير', price: 85, icon: '🌾' },
  { id: 'wheat_bran', name: 'نخالة قمح', price: 70, icon: '🌿' },
  { id: 'corn', name: 'ذرة', price: 95, icon: '🌽' },
  { id: 'alfalfa', name: 'برسيم', price: 120, icon: '🌱' },
  { id: 'mixed', name: 'علف مخلوط', price: 100, icon: '📦' },
];

const QUANTITIES = [25, 50, 100, 200, 500, 1000];

const FeedRequestScreen = ({ navigation }) => {
  const { user, token } = useAuth();
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateAmount = () => {
    if (!selectedFeed || !selectedQuantity) return 0;
    return selectedFeed.price * selectedQuantity;
  };

  const handleSubmit = async () => {
    if (!selectedFeed) {
      Alert.alert('خطأ', 'يرجى اختيار نوع العلف');
      return;
    }
    if (!selectedQuantity) {
      Alert.alert('خطأ', 'يرجى اختيار الكمية');
      return;
    }

    const amount = calculateAmount();
    if (amount > (user?.balance || 0)) {
      Alert.alert('خطأ', 'رصيدك غير كافي لهذا الطلب');
      return;
    }

    Alert.alert(
      'تأكيد الطلب',
      `نوع العلف: ${selectedFeed.name}\nالكمية: ${selectedQuantity} كجم\nالمبلغ: ${amount.toLocaleString()} ريال\n\nسيتم خصم المبلغ من رصيدك بعد الموافقة.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تأكيد', onPress: submitRequest },
      ]
    );
  };

  const submitRequest = async () => {
    setLoading(true);
    try {
      await axios.post(
        API.SUBMIT_FEED_REQUEST,
        {
          supplier_id: user.id,
          supplier_name: user.name,
          supplier_code: user.code,
          feed_type: selectedFeed.id,
          quantity: selectedQuantity,
          amount_to_deduct: calculateAmount(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        'نجاح',
        'تم إرسال طلبك بنجاح. سيتم مراجعته من قبل الإدارة.',
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Balance Info */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>رصيدك الحالي</Text>
        <Text style={styles.balanceAmount}>
          {(user?.balance || 0).toLocaleString()} ريال
        </Text>
      </View>

      {/* Feed Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>اختر نوع العلف</Text>
        <View style={styles.feedGrid}>
          {FEED_TYPES.map((feed) => (
            <TouchableOpacity
              key={feed.id}
              style={[
                styles.feedCard,
                selectedFeed?.id === feed.id && styles.feedCardSelected,
              ]}
              onPress={() => setSelectedFeed(feed)}
            >
              <Text style={styles.feedIcon}>{feed.icon}</Text>
              <Text style={styles.feedName}>{feed.name}</Text>
              <Text style={styles.feedPrice}>{feed.price} ريال/كجم</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quantity Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>اختر الكمية (كجم)</Text>
        <View style={styles.quantityGrid}>
          {QUANTITIES.map((qty) => (
            <TouchableOpacity
              key={qty}
              style={[
                styles.quantityCard,
                selectedQuantity === qty && styles.quantityCardSelected,
              ]}
              onPress={() => setSelectedQuantity(qty)}
            >
              <Text
                style={[
                  styles.quantityText,
                  selectedQuantity === qty && styles.quantityTextSelected,
                ]}
              >
                {qty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary */}
      {selectedFeed && selectedQuantity && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>ملخص الطلب</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{selectedFeed.name}</Text>
            <Text style={styles.summaryLabel}>نوع العلف:</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{selectedQuantity} كجم</Text>
            <Text style={styles.summaryLabel}>الكمية:</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{selectedFeed.price} ريال</Text>
            <Text style={styles.summaryLabel}>السعر:</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalValue}>
              {calculateAmount().toLocaleString()} ريال
            </Text>
            <Text style={styles.totalLabel}>الإجمالي:</Text>
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!selectedFeed || !selectedQuantity || loading) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!selectedFeed || !selectedQuantity || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>إرسال الطلب</Text>
        )}
      </TouchableOpacity>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          ⚠️ سيتم خصم المبلغ من رصيدك بعد موافقة الإدارة على الطلب
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  balanceCard: {
    backgroundColor: '#4caf50',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 15,
  },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  feedCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  feedCardSelected: {
    borderColor: '#1e88e5',
    backgroundColor: '#e3f2fd',
  },
  feedIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  feedName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  feedPrice: {
    fontSize: 12,
    color: '#4caf50',
  },
  quantityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quantityCard: {
    width: '30%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quantityCardSelected: {
    borderColor: '#1e88e5',
    backgroundColor: '#1e88e5',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityTextSelected: {
    color: '#fff',
  },
  summary: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  submitButton: {
    backgroundColor: '#1e88e5',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#90caf9',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  note: {
    padding: 20,
    paddingTop: 0,
  },
  noteText: {
    fontSize: 12,
    color: '#ff9800',
    textAlign: 'center',
  },
});

export default FeedRequestScreen;
