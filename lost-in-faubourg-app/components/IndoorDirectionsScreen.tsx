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

//--------------------------------------
// 1) Import Floor Plan Images
//--------------------------------------

// SGW Campus - Hall Building
import HallFloor1 from '../assets/floorplans/Hall-1.png';
import HallFloor2 from '../assets/floorplans/Hall-2.png';
import HallFloor8 from '../assets/floorplans/Hall-8.png';
import HallFloor9 from '../assets/floorplans/Hall-9.png';
// SGW Campus - CC Building
import CCFloor1 from '../assets/floorplans/CC1.png';
// SGW Campus - John Molson Building
import JMFloor1 from '../assets/floorplans/MB-1.png';
import JMFloor2 from '../assets/floorplans/MB-S2.png';
// Loyola Campus - Vanier Extension Building
import VEFloor1 from '../assets/floorplans/VE-1.png';
import VEFloor2 from '../assets/floorplans/VE-2.png';
// Loyola Campus - Vanier Library Building
import VLFloor1 from '../assets/floorplans/VL-1.png';
import VLFloor2 from '../assets/floorplans/VL-2.png';

//--------------------------------------
// 2) TYPE DEFINITIONS
//--------------------------------------
type GraphNode = {
  x: number;
  y: number;
  neighbors: string[];
};

//--------------------------------------
// 3) Define Graph Data per Floor per Building
//--------------------------------------

// (For brevity, only Hall Building floor 8 nodes are shown with dummy data.)

const hallFloorGraphs: Record<number, Record<string, GraphNode>> = {

  //HALL BUILDING NODES
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

// CC BUILDING NODES
const ccFloorGraphs: Record<number, Record<string, GraphNode>> = {
  1: {
    
  },
};

// JOHN MOLSON BUILDING NODES
const jmFloorGraphs: Record<number, Record<string, GraphNode>> = {
  1: {
    
  },
  2: {
    
  },
};

// VANIER EXTENSION BUILDING NDOES
const veFloorGraphs: Record<number, Record<string, GraphNode>> = {
  1: {
    
  },
  2: {
    
  },
};

// VANIER LIBRARY BUILDING NODES
const vlFloorGraphs: Record<number, Record<string, GraphNode>> = {
  1: {
   
  },
  2: {
    
  },
};


//--------------------------------------
// 4) Create Centralized Building Data
//--------------------------------------
const buildingData: Record<
  string,
  {
    floors: Record<number, { image: any; graph: Record<string, GraphNode> }>;
  }
> = {
  // SGW Campus
  Hall: {
    floors: {
      1: { image: HallFloor1, graph: hallFloorGraphs[1] },
      2: { image: HallFloor2, graph: hallFloorGraphs[2] },
      8: { image: HallFloor8, graph: hallFloorGraphs[8] },
      9: { image: HallFloor9, graph: hallFloorGraphs[9] },
    },
  },
  CC: {
    floors: {
      1: { image: CCFloor1, graph: ccFloorGraphs[1] },
    },
  },
  'John Molson': {
    floors: {
      1: { image: JMFloor1, graph: jmFloorGraphs[1] },
      2: { image: JMFloor2, graph: jmFloorGraphs[2] },
    },
  },
  // Loyola Campus
  'Vanier Extension': {
    floors: {
      1: { image: VEFloor1, graph: veFloorGraphs[1] },
      2: { image: VEFloor2, graph: veFloorGraphs[2] },
    },
  },
  'Vanier Library': {
    floors: {
      1: { image: VLFloor1, graph: vlFloorGraphs[1] },
      2: { image: VLFloor2, graph: vlFloorGraphs[2] },
    },
  },
};

//--------------------------------------
// 5) Helper Functions
//--------------------------------------

// Compute BFS path from start to end (returns an array of node IDs)
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
  if (!cameFrom[endId]) return [];
  const path: string[] = [];
  let node: string | null = endId;
  while (node) {
    path.unshift(node);
    node = cameFrom[node]!;
  }
  return path;
}

// Find the nearest node to a tap (using Euclidean distance)
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

// Convert an array of node IDs into an array of coordinates
function getPathCoordinates(
  graph: Record<string, GraphNode>,
  nodeIds: string[]
): { x: number; y: number }[] {
  return nodeIds.map((id) => ({ x: graph[id].x, y: graph[id].y }));
}

// Compute total distance along a path (in drawing units)
function computePathDistance(coords: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i].x - coords[i - 1].x;
    const dy = coords[i].y - coords[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

//--------------------------------------
// 6) COMPONENT
//--------------------------------------
export default function IndoorDirectionsScreen() {
  // Building selection
  const [selectedBuilding, setSelectedBuilding] = useState<string>('Hall');
  // Floor selection (for current building)
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  // Container size for the image
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // Start and end node IDs
  const [startNodeId, setStartNodeId] = useState<string | null>(null);
  const [endNodeId, setEndNodeId] = useState<string | null>(null);
  // Computed path (list of node IDs)
  const [path, setPath] = useState<string[]>([]);

  // Get current building and floor data
  const currentBuilding = buildingData[selectedBuilding];
  const currentFloorData = currentBuilding.floors[selectedFloor];

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const handlePress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const graph = currentFloorData.graph;
    if (!graph) {
      console.warn('No graph data for', selectedBuilding, 'floor', selectedFloor);
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
    // Reset: new start node
    setStartNodeId(tappedNodeId);
    setEndNodeId(null);
    setPath([]);
  };

  const pathCoords = getPathCoordinates(currentFloorData.graph, path);
  const polylinePoints = pathCoords.map((p) => `${p.x},${p.y}`).join(' ');

  // --- Distance Calculation ---
// Assume a conversion factor: for a 1:1000 scale, suppose 1 drawing unit equals 0.01 meters
const PIXEL_TO_METER = 0.1; 
  const drawingDistance = computePathDistance(pathCoords);
  const distanceInMeters = drawingDistance * PIXEL_TO_METER;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Indoor Navigation</Text>

      {/* Building Picker */}
      <Picker
        selectedValue={selectedBuilding}
        style={styles.picker}
        onValueChange={(itemValue) => {
          setSelectedBuilding(itemValue);
          setSelectedFloor(1);
          setStartNodeId(null);
          setEndNodeId(null);
          setPath([]);
        }}
      >
        {Object.keys(buildingData).map((b) => (
          <Picker.Item key={b} label={b} value={b} />
        ))}
      </Picker>

      {/* Floor Picker */}
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
        {Object.keys(currentBuilding.floors).map((floor) => (
          <Picker.Item key={floor} label={`Floor ${floor}`} value={parseInt(floor, 10)} />
        ))}
      </Picker>

      {/* Image Container */}
      <View style={styles.imageContainer} onLayout={handleContainerLayout}>
        <TouchableWithoutFeedback onPress={handlePress}>
          <View style={styles.touchableArea}>
            <Image
              source={currentFloorData.image}
              style={styles.floorImage}
              resizeMode="contain"
            />
            <Svg
              style={StyleSheet.absoluteFill}
              viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
            >
              {path.length > 1 && (
                <Polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="blue"
                  strokeWidth="3"
                />
              )}
              {startNodeId && currentFloorData.graph[startNodeId] && (
                <Circle
                  cx={currentFloorData.graph[startNodeId].x}
                  cy={currentFloorData.graph[startNodeId].y}
                  r="5"
                  fill="green"
                />
              )}
              {endNodeId && currentFloorData.graph[endNodeId] && (
                <Circle
                  cx={currentFloorData.graph[endNodeId].x}
                  cy={currentFloorData.graph[endNodeId].y}
                  r="5"
                  fill="red"
                />
              )}
            </Svg>
          </View>
        </TouchableWithoutFeedback>
      </View>

      {path.length > 1 && (
        <View style={styles.pathInfo}>
          <Text style={{ fontWeight: 'bold' }}>Path Nodes:</Text>
          <Text>{path.join(' -> ')}</Text>
          <Text style={{ marginTop: 5 }}>
            Distance: {distanceInMeters.toFixed(2)} m
          </Text>
        </View>
      )}
    </View>
  );
}

//--------------------------------------
// STYLES
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
    aspectRatio: 1,
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
