import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = ({ navigation }) => {
  const { user, logout, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة غير متطابقة');
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (result.success) {
      Alert.alert('نجاح', 'تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert('خطأ', result.error);
    }
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

  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0) || '👤'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userCode}>كود المورد: {user?.code}</Text>
        <Text style={styles.userCenter}>{user?.center_name}</Text>
      </View>

      {/* Change Password Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>تغيير كلمة المرور</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>كلمة المرور الحالية</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل كلمة المرور الحالية"
            placeholderTextColor="#999"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPasswords}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>كلمة المرور الجديدة</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل كلمة المرور الجديدة"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPasswords}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>تأكيد كلمة المرور الجديدة</Text>
          <TextInput
            style={styles.input}
            placeholder="أعد إدخال كلمة المرور الجديدة"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPasswords}
          />
        </View>

        <TouchableOpacity
          style={styles.showPasswordButton}
          onPress={() => setShowPasswords(!showPasswords)}
        >
          <Text style={styles.showPasswordText}>
            {showPasswords ? '🙈 إخفاء كلمات المرور' : '👁️ إظهار كلمات المرور'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.changeButton, loading && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.changeButtonText}>تغيير كلمة المرور</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات الحساب</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoValue}>{user?.phone || '-'}</Text>
          <Text style={styles.infoLabel}>رقم الهاتف:</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoValue}>
            {user?.milk_type === 'cow' ? '🐄 بقري' : 
             user?.milk_type === 'camel' ? '🐪 إبل' : user?.milk_type || '-'}
          </Text>
          <Text style={styles.infoLabel}>نوع الحليب:</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoValue}>{user?.center_name || '-'}</Text>
          <Text style={styles.infoLabel}>المركز:</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.infoValue, { color: '#4caf50' }]}>
            {(user?.balance || 0).toLocaleString()} ريال
          </Text>
          <Text style={styles.infoLabel}>الرصيد:</Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>المروج للألبان - بوابة الموردين</Text>
        <Text style={styles.versionText}>الإصدار 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userCard: {
    backgroundColor: '#1e88e5',
    padding: 30,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 35,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userCode: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  userCenter: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  showPasswordButton: {
    alignItems: 'center',
    marginBottom: 15,
  },
  showPasswordText: {
    color: '#1e88e5',
    fontSize: 14,
  },
  changeButton: {
    backgroundColor: '#4caf50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 30,
  },
  appInfoText: {
    fontSize: 14,
    color: '#999',
  },
  versionText: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 5,
  },
});

export default SettingsScreen;
