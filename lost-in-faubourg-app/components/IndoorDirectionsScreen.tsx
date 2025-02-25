import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  LayoutChangeEvent,
  GestureResponderEvent,
  TouchableWithoutFeedback,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Svg, { Polyline, Circle } from 'react-native-svg';

// -- 1) Floor Plan Images
import HallFloor1 from '../assets/floorplans/Hall-1.png';
import HallFloor2 from '../assets/floorplans/Hall-2.png';
import HallFloor8 from '../assets/floorplans/Hall-8.png';
import HallFloor9 from '../assets/floorplans/Hall-9.png';

//--------------------------------------
// TYPE DEFINITIONS
//--------------------------------------
type GraphNode = {
  x: number;         
  y: number;
  neighbors: string[]; 
};

// Nodes for each floor
const floorGraphs: Record<
  number, 
  Record<string, GraphNode> 
> = {
  1: {
    
  },
  2: {
    
  },
  8: {
    //hallway intersections
    hallwayLowerLeftCorner: { x: 70,  y: 289, neighbors: ['hallwayMiddleLower', 'hallwayMiddleLeft','h849', 'h847', 'h845', 'h843', 'h842', 'h841', 'h857', 'h855', 'h854', 'h853', 'h852', 'h851'] },
    hallwayLowerRightCorner: { x: 305,  y: 289, neighbors: ['hallwayMiddleLower', 'hallwayHigherRightCorner', 'h837', 'h835', 'h833', 'h832', 'h831', 'h829', 'h827', 'h825', 'h823', 'h822', 'h821', 'h820'] },
    hallwayHigherRightCorner: { x: 305,  y: 78, neighbors: ['hallwayMiddleUpper', 'hallwayLowerRightCorner', 'h827', 'h825', 'h823', 'h822', 'h821', 'h820', 'h819', 'h817', 'h815', 'h813', 'h811', 'mensBathroom'] },
    hallwayHigherLeftCorner: { x: 65,  y: 78, neighbors: ['hallwayHigherRightCorner', 'hallwayMiddleLeft', 'h807', 'h805', 'h803', 'h801', 'womensBathroom', 'h867', 'h865', 'h863', 'h861'   ] },
    hallwayMiddleLower: { x: 200,  y: 289, neighbors: ['hallwayMiddleMiddle', 'hallwayLowerLeftCorner', 'hallwayLowerRightCorner', 'h845', 'h843', 'h842', 'h841', 'h837', 'h835', 'h832' ] },
    hallwayMiddleMiddle: { x: 200,  y: 145, neighbors: ['hallwayMiddleUpper', 'hallwayMiddleLower', 'hallwayMiddleLeft', 'h806', 'h862', 'h860'] },
    hallwayMiddleUpper: { x: 200,  y: 78, neighbors: ['hallwayHigherRightCorner', 'hallwayHigherLeftCorner', 'hallwayMiddleMiddle','h806', 'h862', 'h860', 'h813', 'h811', 'h807', 'h806', 'h805', 'h803', 'h801', 'womensBathroom', 'mensBathroom'] },
    hallwayMiddleLeft:{ x: 65,  y: 145, neighbors: ['hallwayMiddleMiddle', 'hallwayLowerLeftCorner', 'hallwayHigherLeftCorner', 'h863', 'h862', 'h861', 'h860', 'h859', 'h857', 'h855', 'h854', 'h853', 'h852', ] },

    // lower section
    h849: { x: 30,  y: 325, neighbors: ['hallwayLowerLeftCorner'] },
    h847: { x: 70,  y: 325, neighbors: ['hallwayLowerLeftCorner'] },
    h845: { x: 105,  y: 325, neighbors: ['hallwayLowerLeftCorner', 'hallwayMiddleLower'] },
    h843: { x: 135,  y: 325, neighbors: ['hallwayLowerLeftCorner', 'hallwayMiddleLower'] },
    h842: { x: 145,  y: 235, neighbors: ['hallwayLowerLeftCorner', 'hallwayMiddleLower'] },
    h841: { x: 165,  y: 325, neighbors: ['hallwayLowerLeftCorner', 'hallwayMiddleLower'] },
    h837: { x: 235,  y: 325, neighbors: ['hallwayLowerRightCorner', 'hallwayMiddleLower'] },
    h835: { x: 265,  y: 325, neighbors: ['hallwayLowerRightCorner', 'hallwayMiddleLower'] },
    h833: { x: 300,  y: 325, neighbors: ['hallwayLowerRightCorner'] },
    h832: { x: 232,  y: 245, neighbors: ['hallwayLowerRightCorner','hallwayMiddleLower'] },
    h831: { x: 345,  y: 325, neighbors: ['hallwayLowerRightCorner'] },

    //Right section
    h829: { x: 345,  y: 285, neighbors: ['hallwayLowerRightCorner'] },
    h827: { x: 345,  y: 220, neighbors: ['hallwayLowerRightCorner', 'hallwayHigherRightCorner'] },
    h825: { x: 345,  y: 190, neighbors: ['hallwayLowerRightCorner', 'hallwayHigherRightCorner'] },
    h823: { x: 345,  y: 155, neighbors: ['hallwayLowerRightCorner', 'hallwayHigherRightCorner'] },
    h822: { x: 285,  y: 222, neighbors: ['hallwayLowerRightCorner', 'hallwayHigherRightCorner'] },
    h821: { x: 345,  y: 120, neighbors: ['hallwayLowerRightCorner', 'hallwayHigherRightCorner'] },
    h820: { x: 265,  y: 168, neighbors: ['hallwayLowerRightCorner', 'hallwayHigherRightCorner'] },
    h819: { x: 345,  y: 85, neighbors: [ 'hallwayHigherRightCorner'] },
    h817: { x: 345,  y: 50, neighbors: [ 'hallwayHigherRightCorner'] },

    //Top section
    h815: { x: 305,  y: 40, neighbors: [ 'hallwayHigherRightCorner'] },
    h813: { x: 270,  y: 40, neighbors: [ 'hallwayHigherRightCorner', 'hallwayMiddleUpper'] },
    h811: { x: 230,  y: 40, neighbors: [ 'hallwayHigherRightCorner', 'hallwayMiddleUpper'] },
    h807: { x: 173,  y: 40, neighbors: [ 'hallwayHigherLeftCorner', 'hallwayMiddleUpper'] },
    h806: { x: 176,  y: 120, neighbors: [ 'hallwayMiddleMiddle', 'hallwayMiddleUpper'] },
    h805: { x: 143,  y: 40, neighbors: [ 'hallwayHigherLeftCorner', 'hallwayMiddleUpper'] },
    h803: { x: 110,  y: 40, neighbors: [ 'hallwayHigherLeftCorner', 'hallwayMiddleUpper'] },
    h801: { x: 75,  y: 40, neighbors: [ 'hallwayHigherLeftCorner', 'hallwayMiddleUpper'] },
    womensBathroom: { x: 143,  y: 95, neighbors: [ 'hallwayHigherLeftCorner', 'hallwayMiddleUpper'] },
    mensBathroom: { x: 235,  y: 95, neighbors: [ 'hallwayHigherRightCorner', 'hallwayMiddleUpper'] },


    

    //Right section
    h867: { x: 35,  y: 40, neighbors: [ 'hallwayHigherLeftCorner',] },
    h865: { x: 27,  y: 64, neighbors: [ 'hallwayHigherLeftCorner',] },
    h863: { x: 27,  y: 90, neighbors: [ 'hallwayHigherLeftCorner', 'hallwayMiddleLeft'] },
    h862: { x: 138,  y: 165, neighbors: [ 'hallwayMiddleMiddle', 'hallwayMiddleLeft'] },    
    h861: { x: 27,  y: 120, neighbors: [ 'hallwayHigherLeftCorner', 'hallwayMiddleLeft'] },
    h860: { x: 98,  y: 180, neighbors: [ 'hallwayMiddleMiddle', 'hallwayMiddleLeft'] },    
    h859: { x: 27,  y: 150, neighbors: [ 'hallwayMiddleLeft'] },
    h857: { x: 27,  y: 180, neighbors: [ 'hallwayMiddleLeft', 'hallwayLowerLeftCorner'] },
    h855: { x: 27,  y: 215, neighbors: [ 'hallwayMiddleLeft', 'hallwayLowerLeftCorner'] },
    h854: { x: 98,  y: 215, neighbors: [ 'hallwayLowerLeftCorner', 'hallwayMiddleLeft'] },    
    h853: { x: 27,  y: 248, neighbors: [ 'hallwayMiddleLeft', 'hallwayLowerLeftCorner'] },
    h852: { x: 90,  y: 235, neighbors: [ 'hallwayLowerLeftCorner', 'hallwayMiddleLeft'] },    
    h851: { x: 27,  y: 285, neighbors: [ 'hallwayLowerLeftCorner'] },

    

  },
  9: {
    
  },
};

//--------------------------------------
// HELPER FUNCTIONS
//--------------------------------------
function findPathBFS(
  graph: Record<string, GraphNode>,
  startId: string,
  endId: string
): string[] {
  if (startId === endId) return [startId];

  const queue = [startId];
  const visited = new Set<string>([startId]);
  const cameFrom: Record<string, string | null> = { [startId]: null };

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endId) break;

    for (const neighbor of graph[current].neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        cameFrom[neighbor] = current;
        queue.push(neighbor);
      }
    }
  }

 
  if (!cameFrom[endId]) {
    return [];
  }

  
  const path: string[] = [];
  let node: string | null = endId;
  while (node) {
    path.unshift(node);
    node = cameFrom[node]!;
  }
  return path;
}


function findNearestNode(
  tapX: number,
  tapY: number,
  graph: Record<string, GraphNode>
): string {
  let closestNodeId = '';
  let minDist = Infinity;

  for (const nodeId in graph) {
    const { x, y } = graph[nodeId];
    const dx = x - tapX;
    const dy = y - tapY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closestNodeId = nodeId;
    }
  }
  return closestNodeId;
}


function getPathCoordinates(
  graph: Record<string, GraphNode>,
  nodeIds: string[]
): { x: number; y: number }[] {
  return nodeIds.map((id) => ({ x: graph[id].x, y: graph[id].y }));
}

//--------------------------------------
// COMPONENT
//--------------------------------------
export default function IndoorDirectionsScreen() {
  const [selectedFloor, setSelectedFloor] = useState<number>(1);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const [startNodeId, setStartNodeId] = useState<string | null>(null);
  const [endNodeId, setEndNodeId] = useState<string | null>(null);

  const [path, setPath] = useState<string[]>([]);

  // Floor => image mapping
  const floorImages: Record<number, any> = {
    1: HallFloor1,
    2: HallFloor2,
    8: HallFloor8,
    9: HallFloor9,
  };

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const handlePress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;

    const graph = floorGraphs[selectedFloor];
    if (!graph) {
      console.warn('No graph data for floor', selectedFloor);
      return;
    }

    const tappedNodeId = findNearestNode(locationX, locationY, graph);

    if (!startNodeId) {
      setStartNodeId(tappedNodeId);
      setEndNodeId(null);
      setPath([]);
      return;
    }

    if (!endNodeId) {
      setEndNodeId(tappedNodeId);
      const newPath = findPathBFS(graph, startNodeId, tappedNodeId);
      setPath(newPath);
      return;
    }

    setStartNodeId(tappedNodeId);
    setEndNodeId(null);
    setPath([]);
  };

  const pathCoords = getPathCoordinates(floorGraphs[selectedFloor] || {}, path);

  const polylinePoints = pathCoords.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hall Building Indoor Navigation</Text>

      {}
      <Picker
        selectedValue={selectedFloor}
        style={styles.picker}
        onValueChange={(itemValue) => {
          setSelectedFloor(itemValue);
          setStartNodeId(null);
          setEndNodeId(null);
          setPath([]);
        }}
      >
        <Picker.Item label="Floor 1" value={1} />
        <Picker.Item label="Floor 2" value={2} />
        <Picker.Item label="Floor 8" value={8} />
        <Picker.Item label="Floor 9" value={9} />
      </Picker>

      {}
      <View style={styles.imageContainer} onLayout={handleContainerLayout}>
        <TouchableWithoutFeedback onPress={handlePress}>
          <View style={styles.touchableArea}>
            {}
            <Image
              source={floorImages[selectedFloor]}
              style={styles.floorImage}
              resizeMode="contain"
            />

            {}
            <Svg
              style={StyleSheet.absoluteFill}
              viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
            >
              {}
              {path.length > 1 && (
                <Polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="blue"
                  strokeWidth={3}
                />
              )}

              {}
              {startNodeId && floorGraphs[selectedFloor]?.[startNodeId] && (
                <Circle
                  cx={floorGraphs[selectedFloor][startNodeId].x}
                  cy={floorGraphs[selectedFloor][startNodeId].y}
                  r="5"
                  fill="green"
                />
              )}

              {}
              {endNodeId && floorGraphs[selectedFloor]?.[endNodeId] && (
                <Circle
                  cx={floorGraphs[selectedFloor][endNodeId].x}
                  cy={floorGraphs[selectedFloor][endNodeId].y}
                  r="5"
                  fill="red"
                />
              )}
            </Svg>
          </View>
        </TouchableWithoutFeedback>
      </View>

      {}
      {path.length > 1 && (
        <View style={styles.pathInfo}>
          <Text style={{ fontWeight: 'bold' }}>Path Nodes:</Text>
          <Text>{path.join(' -> ')}</Text>
        </View>
      )}
    </View>
  );
}

//--------------------------------------
// Styles
//--------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  picker: {
    height: 50,
    width: 200,
  },
  imageContainer: {
    width: '90%',
    aspectRatio: 1, // or a fixed height
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    position: 'relative',
  },
  touchableArea: {
    flex: 1,
  },
  floorImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  pathInfo: {
    marginTop: 10,
    alignItems: 'center',
  },
});
