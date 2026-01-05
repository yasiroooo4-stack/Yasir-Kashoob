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
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';

const MESSAGE_TYPES = [
  { id: 'general', name: 'استفسار عام', icon: '❓' },
  { id: 'complaint', name: 'شكوى', icon: '⚠️' },
  { id: 'inquiry', name: 'استفسار مالي', icon: '💰' },
  { id: 'increase_quantity', name: 'طلب زيادة كمية', icon: '📈' },
];

const MessagesScreen = ({ navigation }) => {
  const { user, token } = useAuth();
  const [messageType, setMessageType] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!messageType) {
      Alert.alert('خطأ', 'يرجى اختيار نوع الرسالة');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال موضوع الرسالة');
      return;
    }
    if (!message.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة الرسالة');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        API.SEND_MESSAGE,
        {
          supplier_id: user.id,
          supplier_name: user.name,
          supplier_code: user.code,
          message_type: messageType.id,
          subject: subject.trim(),
          message: message.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        'نجاح',
        'تم إرسال رسالتك بنجاح. سيتم الرد عليك في أقرب وقت.',
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Message Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>نوع الرسالة</Text>
        <View style={styles.typesGrid}>
          {MESSAGE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                messageType?.id === type.id && styles.typeCardSelected,
              ]}
              onPress={() => setMessageType(type)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.typeName,
                  messageType?.id === type.id && styles.typeNameSelected,
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Subject */}
      <View style={styles.section}>
        <Text style={styles.label}>الموضوع</Text>
        <TextInput
          style={styles.input}
          placeholder="أدخل موضوع الرسالة"
          placeholderTextColor="#999"
          value={subject}
          onChangeText={setSubject}
        />
      </View>

      {/* Message */}
      <View style={styles.section}>
        <Text style={styles.label}>الرسالة</Text>
        <TextInput
          style={styles.textArea}
          placeholder="اكتب رسالتك هنا..."
          placeholderTextColor="#999"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!messageType || !subject || !message || loading) && styles.submitButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!messageType || !subject || !message || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>إرسال الرسالة</Text>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          💡 سيتم إرسال رسالتك إلى إدارة المركز وسيتم الرد عليك في أقرب وقت ممكن
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
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 15,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: '#1e88e5',
    backgroundColor: '#e3f2fd',
  },
  typeIcon: {
    fontSize: 25,
    marginBottom: 8,
  },
  typeName: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  typeNameSelected: {
    fontWeight: 'bold',
    color: '#1e88e5',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 150,
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
  infoCard: {
    backgroundColor: '#fff3e0',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  infoText: {
    fontSize: 13,
    color: '#e65100',
    textAlign: 'right',
    lineHeight: 22,
  },
});

export default MessagesScreen;
