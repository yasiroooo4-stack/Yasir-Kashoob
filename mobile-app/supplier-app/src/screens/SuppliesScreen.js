import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';

const SuppliesScreen = () => {
  const { user, token } = useAuth();
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSupplies = useCallback(async () => {
    try {
      const response = await axios.get(API.GET_SUPPLIES(user.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSupplies(response.data);
    } catch (error) {
      console.log('Error fetching supplies:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, token]);

  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSupplies();
    setRefreshing(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `${(amount || 0).toLocaleString()} ريال`;
  };

  const getMilkTypeInfo = (type) => {
    if (type === 'cow') return { icon: '🐄', name: 'حليب بقري' };
    if (type === 'camel') return { icon: '🐪', name: 'حليب إبل' };
    return { icon: '🥛', name: type || 'حليب' };
  };

  const renderSupplyItem = ({ item }) => {
    const milkInfo = getMilkTypeInfo(item.milk_type);
    
    return (
      <View style={styles.supplyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
          </View>
          <Text style={styles.milkType}>
            {milkInfo.icon} {milkInfo.name}
          </Text>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{item.quantity?.toLocaleString()}</Text>
              <Text style={styles.infoLabel}>الكمية (لتر)</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{item.fat_percentage || '-'}%</Text>
              <Text style={styles.infoLabel}>نسبة الدسم</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{item.price_per_liter || '-'}</Text>
              <Text style={styles.infoLabel}>سعر اللتر</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>الإجمالي:</Text>
          <Text style={styles.totalValue}>{formatCurrency(item.total_price)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{supplies.length}</Text>
          <Text style={styles.summaryLabel}>عدد التوريدات</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {supplies.reduce((sum, s) => sum + (s.quantity || 0), 0).toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>إجمالي الكمية (لتر)</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={supplies}
        renderItem={renderSupplyItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>لا توجد توريدات</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#1e88e5',
    padding: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 15,
  },
  listContent: {
    padding: 15,
  },
  supplyCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  date: {
    fontSize: 12,
    color: '#1e88e5',
    fontWeight: '500',
  },
  milkType: {
    fontSize: 14,
    color: '#333',
  },
  cardBody: {
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
  },
  infoDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 50,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default SuppliesScreen;
