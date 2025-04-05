import React, { useState, useMemo } from 'react';
import { View, Text, Switch, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install expo/vector-icons

// Create a context for accessibility settings
export const AccessibilityContext = React.createContext({
    isBlackAndWhite: false,
    isLargeText: false,
    setIsBlackAndWhite: (value: boolean) => {},
    setIsLargeText: (value: boolean) => {},
});

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
    const [isLargeText, setIsLargeText] = useState(false);

    const contextValue = useMemo(() => ({
        isBlackAndWhite,
        isLargeText,
        setIsBlackAndWhite,
        setIsLargeText,
    }), [isBlackAndWhite, isLargeText]);

    return (
        <AccessibilityContext.Provider value={contextValue}>
            {children}
        </AccessibilityContext.Provider>
    );
};

const AccessibilitySettings = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const { isBlackAndWhite, setIsBlackAndWhite, isLargeText, setIsLargeText } = React.useContext(AccessibilityContext);

    return (
        <>
            <Pressable 
                style={styles.settingsButton} 
                onPress={() => setModalVisible(true)}
                testID="settings-button" // <-- added testID
            >
                <Ionicons name="settings" size={24} color="black" />
            </Pressable>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isBlackAndWhite && styles.blackAndWhite]}>
                        <Pressable 
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                            testID="close-button" // <-- added testID for close button
                        >
                            <Ionicons name="close" size={24} color="black" />
                        </Pressable>

                        <Text style={[styles.header, isLargeText && styles.largeText]}>
                            Accessibility Settings
                        </Text>
                        
                        <View style={styles.option}>
                            <Text style={[styles.optionText, isLargeText && styles.largeText]}>
                                Black and White Mode
                            </Text>
                            <Switch
                                value={isBlackAndWhite}
                                onValueChange={setIsBlackAndWhite}
                                testID="black-and-white-switch" // <-- added testID
                            />
                        </View>
                        
                        <View style={styles.option}>
                            <Text style={[styles.optionText, isLargeText && styles.largeText]}>
                                Larger Text
                            </Text>
                            <Switch
                                value={isLargeText}
                                onValueChange={setIsLargeText}
                                testID="larger-text-switch" // <-- added testID
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    blackAndWhite: {
        backgroundColor: '#e2e2e2',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    largeText: {
        fontSize: 30,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    optionText: {
        fontSize: 18,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    settingsButton: {
        position: 'absolute',
        top: 54,
        right: 7, // Moved more towards the left
        padding: 10,
        zIndex: 1000,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 5,
    },
});

export default AccessibilitySettings;