import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';

const DashboardScreen = ({ navigation }) => {
  const { user, token, logout, updateUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentSupplies, setRecentSupplies] = useState([]);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await axios.get(API.GET_DASHBOARD(user.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardData(response.data);
      updateUser({ balance: response.data.balance });
    } catch (error) {
      console.log('Error fetching dashboard:', error);
    }
  }, [user?.id, token]);

  const fetchRecentSupplies = useCallback(async () => {
    try {
      const response = await axios.get(API.GET_SUPPLIES(user.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecentSupplies(response.data.slice(0, 5));
    } catch (error) {
      console.log('Error fetching supplies:', error);
    }
  }, [user?.id, token]);

  useEffect(() => {
    fetchDashboard();
    fetchRecentSupplies();
  }, [fetchDashboard, fetchRecentSupplies]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchRecentSupplies()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'خروج', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `${(amount || 0).toLocaleString()} ريال`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>مرحباً</Text>
            <Text style={styles.userName}>{user?.name || 'المورد'}</Text>
          </View>
        </View>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>كود المورد:</Text>
          <Text style={styles.codeValue}>{user?.code}</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>الرصيد الحالي</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(dashboardData?.balance || user?.balance)}
        </Text>
        <View style={styles.balanceDetails}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemValue}>
              {(dashboardData?.total_supplied || user?.total_supplied || 0).toLocaleString()}
            </Text>
            <Text style={styles.balanceItemLabel}>إجمالي التوريد (لتر)</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemValue}>
              {dashboardData?.supplies_count || 0}
            </Text>
            <Text style={styles.balanceItemLabel}>عدد التوريدات</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>الخدمات</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
            onPress={() => navigation.navigate('FeedRequest')}
          >
            <Text style={styles.actionIcon}>🌾</Text>
            <Text style={styles.actionText}>طلب أعلاف</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#2196f3' }]}
            onPress={() => navigation.navigate('Supplies')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>سجل التوريدات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ff9800' }]}
            onPress={() => navigation.navigate('Messages')}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>إرسال رسالة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#9c27b0' }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>الإعدادات</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Supplies */}
      <View style={styles.recentContainer}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => navigation.navigate('Supplies')}>
            <Text style={styles.seeAllText}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>آخر التوريدات</Text>
        </View>

        {recentSupplies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>لا توجد توريدات حديثة</Text>
          </View>
        ) : (
          recentSupplies.map((supply, index) => (
            <View key={supply.id || index} style={styles.supplyItem}>
              <View style={styles.supplyLeft}>
                <Text style={styles.supplyAmount}>
                  {supply.quantity?.toLocaleString()} لتر
                </Text>
                <Text style={styles.supplyPrice}>
                  {formatCurrency(supply.total_price)}
                </Text>
              </View>
              <View style={styles.supplyRight}>
                <Text style={styles.supplyDate}>{formatDate(supply.date)}</Text>
                <Text style={styles.supplyType}>
                  {supply.milk_type === 'cow' ? '🐄 بقري' : '🐪 إبل'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Center Info */}
      <View style={styles.centerInfo}>
        <Text style={styles.centerLabel}>المركز:</Text>
        <Text style={styles.centerName}>{user?.center_name || '-'}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1e88e5',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  codeLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginLeft: 5,
  },
  codeValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: -30,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 20,
  },
  balanceDetails: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceItemLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  actionsContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  actionIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recentContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    color: '#1e88e5',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  supplyItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  supplyRight: {
    alignItems: 'flex-end',
  },
  supplyDate: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  supplyType: {
    fontSize: 12,
    color: '#666',
  },
  supplyLeft: {
    alignItems: 'flex-start',
  },
  supplyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  supplyPrice: {
    fontSize: 14,
    color: '#4caf50',
    marginTop: 5,
  },
  centerInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  centerLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  centerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default DashboardScreen;
