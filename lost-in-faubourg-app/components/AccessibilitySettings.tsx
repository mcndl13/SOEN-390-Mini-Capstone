import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

const AccessibilitySettings = () => {
    const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
    const [isLargeText, setIsLargeText] = useState(false);

    return (
        <View style={[styles.container, isBlackAndWhite && styles.blackAndWhite]}>
            <Text style={[styles.header, isLargeText && styles.largeText]}>Accessibility Settings</Text>
            
            <View style={styles.option}>
                <Text style={[styles.optionText, isLargeText && styles.largeText]}>Black and White Mode</Text>
                <Switch
                    value={isBlackAndWhite}
                    onValueChange={setIsBlackAndWhite}
                />
            </View>
            
            <View style={styles.option}>
                <Text style={[styles.optionText, isLargeText && styles.largeText]}>Larger Text</Text>
                <Switch
                    value={isLargeText}
                    onValueChange={setIsLargeText}
                />
            </View>
        </View>
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
});

export default AccessibilitySettings;