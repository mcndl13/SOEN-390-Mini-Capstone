import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";

export default function IndoorDirectionsScreen() {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const webViewRef = useRef(null);

  const buildings = [
    { name: "CC Building", url: "https://app.mappedin.com/map/67de35d1aa7c59000baf8d78" },
    { name: "Hall Building", url: "https://app.mappedin.com/map/67dcca42656e1c000bc7d3d1" },
    { name: "JMSB", url: "https://app.mappedin.com/map/67ddb21b656e1c000bc7d3f0" },
    { name: "VE Building", url: "https://app.mappedin.com/map/67de2ce7656e1c000bc7d40f" },
    { name: "VL Building", url: "https://app.mappedin.com/map/67de30cb50cb29000b302ad9" }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Building</Text>
      {buildings.map((building, index) => (
        <TouchableOpacity
          key={index}
          style={styles.buildingButton}
          onPress={() => setSelectedBuilding(building)}
        >
          <Text style={styles.buildingButtonText}>{building.name}</Text>
        </TouchableOpacity>
      ))}

      <Modal
        visible={selectedBuilding !== null}
        animationType="slide"
        onRequestClose={() => setSelectedBuilding(null)}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedBuilding(null)}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => webViewRef.current && webViewRef.current.reload()}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Reload</Text>
            </TouchableOpacity>
          </View>
          {selectedBuilding && (
            <WebView
              ref={webViewRef}
              source={{ uri: selectedBuilding.url }}
              style={styles.webView}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  webView: {
    flex: 1, 
    paddingBottom : 30, 
    backgroundColor: "#912338", 
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  buildingButton: {
    backgroundColor: "#912338",
    padding: 20,
    margin: 5,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  buildingButtonText: { 
    color: "white",
    fontSize: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#912338",
    paddingTop: 45,
    paddingBottom : 0,
  },
  headerButton: {
    padding: 10,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",

  },
  webView: {
    flex: 1, 
    paddingBottom : 30, 
    backgroundColor: "#912338", 
  }
});
