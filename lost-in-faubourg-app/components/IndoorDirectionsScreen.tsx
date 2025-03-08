import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  LayoutChangeEvent,
  GestureResponderEvent,
  TouchableWithoutFeedback,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
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

type Destination = {
  building: string;
  node: string;
  floor: number;
};

type FloorData = {
  image: any;
  graph: Record<string, GraphNode>;
  originalDimensions: { width: number; height: number };
};

//--------------------------------------
// 3) Define Graph Data per Floor per Building
//--------------------------------------


const hallFloorGraphs: Record<number, Record<string, GraphNode>> = {

  //HALL BUILDING NODES
  1: {
    Hall_Entrance: { x: 110,  y: 360, neighbors: ['Main_walway', 'Hall_1st_Basement_Escalator'] },
    Main_walway: { x: 110,  y: 292, neighbors: ['Hall_Entrance','Hallway'] },
    Hallway: { x: 265,  y: 292, neighbors: ['Main_walway', 'Hall_1st_Elevator'] },
    Hall_1st_Elevator: { x: 265,  y: 302, neighbors: ['Hallway'] },

    Hall_1st_Basement_Escalator: { x: 275,  y: 360, neighbors: ['Hall_Entrance'] },

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
    //Hallway Nodes
    hallwayLowerLeftCorner: { x: 73,  y: 289, neighbors: ['hallwayMiddleLower', 'hallwayMiddleLeftCorner' ] },
    hallwayMiddleLeftCorner: { x: 73,  y: 140, neighbors: ['hallwayLowerLeftCorner','hallwayHigherLeftCorner' ] },
    hallwayHigherLeftCorner: { x: 73,  y: 66, neighbors: ['hallwayMiddleLeftCorner' ,'h929' ] },
    hallwayMiddleLower: { x: 178,  y: 289, neighbors: ['hallwayLowerLeftCorner', 'hallwayLowerRightCorner','womensBathroom'] },
    hallwayLowerRightCorner: { x: 305,  y: 289, neighbors: ['hallwayMiddleLower',  ] },
    
    h929: { x: 53,  y: 66, neighbors: ['hallwayHigherLeftCorner',  ] },
    womensBathroom: { x: 228,  y: 275, neighbors: ['hallwayMiddleLower',  ] },
    Elevator9th: { x: 241,  y: 235, neighbors: ['h962',  ] },
    h962: { x: 235,  y: 205, neighbors: ['Elevator9th',  ] },


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
    Tunnel: { x: 53,  y: 176, neighbors: [ 'hallway' ] },
    hallway: { x: 168,  y: 166, neighbors: [ 'Tunnel','s2101' ] },
    s2101: { x: 168,  y: 60, neighbors: [ 'hallway' ] },


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
    floors: Record<number, FloorData>;
  }
> = {
  Hall: {
    floors: {
      1: { image: HallFloor1, graph: hallFloorGraphs[1], originalDimensions: { width: 370, height: 370 } },
      2: { image: HallFloor2, graph: hallFloorGraphs[2], originalDimensions: { width: 370, height: 370 } },
      8: { image: HallFloor8, graph: hallFloorGraphs[8], originalDimensions: { width: 370, height: 370 } },
      9: { image: HallFloor9, graph: hallFloorGraphs[9], originalDimensions: { width: 370, height: 370 } },
    },
  },
  CC: {
    floors: {
      1: { image: CCFloor1, graph: ccFloorGraphs[1], originalDimensions: { width: 370, height: 370 } },
    },
  },
  'John Molson': {
    floors: {
      1: { image: JMFloor1, graph: jmFloorGraphs[1], originalDimensions: { width: 370, height: 370 } },
      2: { image: JMFloor2, graph: jmFloorGraphs[2], originalDimensions: { width: 370, height: 370 } },
    },
  },
  'Vanier Extension': {
    floors: {
      1: { image: VEFloor1, graph: veFloorGraphs[1], originalDimensions: { width: 370, height: 370 } },
      2: { image: VEFloor2, graph: veFloorGraphs[2], originalDimensions: { width: 370, height: 370 } },
    },
  },
  'Vanier Library': {
    floors: {
      1: { image: VLFloor1, graph: vlFloorGraphs[1], originalDimensions: { width: 370, height: 370 } },
      2: { image: VLFloor2, graph: vlFloorGraphs[2], originalDimensions: { width: 370, height: 370 } },
    },
  },
};

//--------------------------------------
// 5) Helper Functions
//--------------------------------------
// Scale node coordinates from original dimensions to container dimensions
function scaleCoordinates(
  coord: { x: number; y: number },
  original: { width: number; height: number },
  container: { width: number; height: number }
): { x: number; y: number } {
  const scaleX = container.width / original.width;
  const scaleY = container.height / original.height;
  return { x: coord.x * scaleX, y: coord.y * scaleY };
}

// Get scaled coordinates for an array of node IDs
function getPathCoordinates(
  graph: Record<string, GraphNode>,
  nodeIds: string[],
  original: { width: number; height: number },
  container: { width: number; height: number }
): { x: number; y: number }[] {
  return nodeIds.map((id) =>
    scaleCoordinates({ x: graph[id].x, y: graph[id].y }, original, container)
  );
}

function computePathDistance(coords: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i].x - coords[i - 1].x;
    const dy = coords[i].y - coords[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

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

// Get all nodes from all floors in all buildings
function getAllNodes(): Array<{ building: string; node: string; floor: number }> {
  const nodes: Array<{ building: string; node: string; floor: number }> = [];
  Object.keys(buildingData).forEach((b) => {
    Object.keys(buildingData[b].floors).forEach((floorStr) => {
      const floor = parseInt(floorStr, 10);
      const graph = buildingData[b].floors[floor].graph;
      Object.keys(graph).forEach((node) => {
        nodes.push({ building: b, node, floor });
      });
    });
  });
  return nodes;
}

// Formats a raw node name by replacing underscores with spaces and capitalizing each word.
function formatNodeName(node: string): string {
  return node
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generates step-by-step directions from a path of node IDs.
function generateDirections(path: string[]): string[] {
  if (!path || path.length === 0) return [];
  const directions = [];
  directions.push(`Start at ${formatNodeName(path[0])}.`);
  for (let i = 1; i < path.length - 1; i++) {
    directions.push(`Then, take a turn at ${formatNodeName(path[i])}.`);
  }
  if (path.length > 1) {
    directions.push(`Finally, arrive at ${formatNodeName(path[path.length - 1])}.`);
  }
  return directions;
}

//--------------------------------------
// 6) COMPONENT
//--------------------------------------
export default function IndoorDirectionsScreen() {
  // Search state for destinations
  const [startSearch, setStartSearch] = useState<string>('');
  const [endSearch, setEndSearch] = useState<string>('');
  // Selected destinations now include building info.
  const [startDest, setStartDest] = useState<Destination | null>(null);
  const [endDest, setEndDest] = useState<Destination | null>(null);
  // Also keep building and floor (for current view) for non–cross–building navigation
  const [selectedBuilding, setSelectedBuilding] = useState<string>('Hall');
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // For same-floor routing (when using map tap)
  const [path, setPath] = useState<string[]>([]);
  // Full screen toggle
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  // Elevator Only check box (currently does nothing)
  const [elevatorOnly, setElevatorOnly] = useState<boolean>(false);

  // When no search destination is chosen, we use the currently selected building/floor view.
  const currentBuilding = buildingData[selectedBuilding];
  const currentFloorData = currentBuilding.floors[selectedFloor];

  // Get all nodes across all buildings for search suggestions
  const allNodes = getAllNodes();

  const filteredStartNodes = allNodes.filter((item) =>
    item.node.toLowerCase().includes(startSearch.toLowerCase())
  );
  const filteredEndNodes = allNodes.filter((item) =>
    item.node.toLowerCase().includes(endSearch.toLowerCase())
  );

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const handlePress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    // Use current floor's graph for tap (for same–floor selection)
    const graph = currentFloorData.graph;
    if (!graph) {
      console.warn('No graph data for', selectedBuilding, 'floor', selectedFloor);
      return;
    }
    const tappedNodeId = findNearestNode(locationX, locationY, graph);
    // Clear search fields when tapping
    setStartSearch('');
    setEndSearch('');
    // For map tap, use the currently selected building and floor.
    if (!startDest) {
      setStartDest({ building: selectedBuilding, node: tappedNodeId, floor: selectedFloor });
      setEndDest(null);
      setPath([]);
      return;
    }
    if (!endDest) {
      setEndDest({ building: selectedBuilding, node: tappedNodeId, floor: selectedFloor });
      // If same building and floor, compute same–floor path.
      if (selectedBuilding === startDest.building && startDest.floor === selectedFloor) {
        const newPath = findPathBFS(graph, startDest.node, tappedNodeId);
        setPath(newPath);
      }
      return;
    }
    // Otherwise, reset start with new tap on current floor.
    setStartDest({ building: selectedBuilding, node: tappedNodeId, floor: selectedFloor });
    setEndDest(null);
    setPath([]);
  };

  // Determine routing based on destination selection:
  // We distinguish three cases:
  // 1) Same building, same floor (sameFloor)
  // 2) Same building, different floors (only implemented for Hall)
  // 3) Cross-building routing (for simplicity, only implemented for Hall -> John Molson)
  let sameFloor = false;
  let startFloorPath: string[] = [];
  let endFloorPath: string[] = [];
  if (startDest && endDest) {
    if (startDest.building === endDest.building) {
      if (startDest.floor === endDest.floor) {
        sameFloor = true;
        const graph = buildingData[startDest.building].floors[startDest.floor].graph;
        startFloorPath = findPathBFS(graph, startDest.node, endDest.node);
      } else if (startDest.building === 'Hall') {
        // Cross–floor within Hall building (using elevator logic)
        const startGraph = buildingData['Hall'].floors[startDest.floor].graph;
        const endGraph = buildingData['Hall'].floors[endDest.floor].graph;
        startFloorPath = findPathBFS(startGraph, startDest.node, "Hall_1st_Elevator");
        endFloorPath = findPathBFS(endGraph, "Elevator9th", endDest.node);
      }
    } else if (startDest.building === 'Hall' && endDest.building === 'John Molson') {
      // Cross–building routing: from Hall (start) to John Molson (end)
      const startGraph = buildingData['Hall'].floors[startDest.floor].graph;
      const endGraph = buildingData['John Molson'].floors[endDest.floor].graph;
      startFloorPath = findPathBFS(startGraph, startDest.node, "Hall_1st_Basement_Escalator");
      endFloorPath = findPathBFS(endGraph, "Tunnel", endDest.node);
    }
  }

  // For same–floor view, scale path coordinates from the current floor's original dimensions
  const scaledPathCoords = sameFloor
    ? getPathCoordinates(
        buildingData[startDest?.building || selectedBuilding].floors[startDest?.floor || selectedFloor].graph,
        startFloorPath,
        buildingData[startDest?.building || selectedBuilding].floors[startDest?.floor || selectedFloor].originalDimensions,
        containerSize
      )
    : [];
  const polylinePoints = scaledPathCoords.map((p) => `${p.x},${p.y}`).join(' ');
  const PIXEL_TO_METER = 0.1;
  const drawingDistance = sameFloor ? computePathDistance(scaledPathCoords) : 0;
  const distanceInMeters = drawingDistance * PIXEL_TO_METER;

  // Reset handler to clear destinations and path
  const handleReset = () => {
    setStartDest(null);
    setEndDest(null);
    setPath([]);
    setStartSearch('');
    setEndSearch('');
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        <Text style={styles.title}>Indoor Navigation</Text>
        {/* Search Bar for Start Destination */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>Start Destination:</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Type start destination"
            value={startSearch}
            onChangeText={setStartSearch}
          />
          {startSearch.length > 0 && (
            <ScrollView style={styles.suggestionList} nestedScrollEnabled={true}>
              {filteredStartNodes.map((item) => (
                <TouchableOpacity key={item.building + "_" + item.node + "_" + item.floor} onPress={() => {
                  setStartDest(item);
                  setStartSearch('');
                }}>
                  <Text style={styles.suggestionItem}>
                    {item.node} (Building: {item.building}, Floor {item.floor})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        {/* Search Bar for End Destination */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>End Destination:</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Type end destination"
            value={endSearch}
            onChangeText={setEndSearch}
          />
          {endSearch.length > 0 && (
            <ScrollView style={styles.suggestionList} nestedScrollEnabled={true}>
              {filteredEndNodes.map((item) => (
                <TouchableOpacity key={item.building + "_" + item.node + "_" + item.floor} onPress={() => {
                  setEndDest(item);
                  setEndSearch('');
                }}>
                  <Text style={styles.suggestionItem}>
                    {item.node} (Building: {item.building}, Floor {item.floor})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        {/* Display chosen destinations */}
        {(startDest || endDest) && (
          <View style={styles.destinationInfo}>
            {startDest && (
              <Text style={styles.destinationText}>Start: {startDest.node} (Building: {startDest.building}, Floor {startDest.floor})</Text>
            )}
            {endDest && (
              <Text style={styles.destinationText}>End: {endDest.node} (Building: {endDest.building}, Floor {endDest.floor})</Text>
            )}
          </View>
        )}
        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        {/* Elevator Only Checkbox (Switch) */}
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Elevator Only Routing:</Text>
          <Switch value={elevatorOnly} onValueChange={setElevatorOnly} />
        </View>
        {/* Building Picker & Floor Picker are used for map tap selection when no search destination is chosen */}
        {(!startDest || !endDest) && (
          <>
            <Picker
              selectedValue={selectedBuilding}
              style={styles.picker}
              onValueChange={(itemValue) => {
                setSelectedBuilding(itemValue);
                setSelectedFloor(1);
                setStartDest(null);
                setEndDest(null);
                setPath([]);
                setStartSearch('');
                setEndSearch('');
              }}
            >
              {Object.keys(buildingData).map((b) => (
                <Picker.Item key={b} label={b} value={b} />
              ))}
            </Picker>
            <Picker
              selectedValue={selectedFloor}
              style={styles.picker}
              onValueChange={(itemValue) => {
                setSelectedFloor(itemValue);
                setStartDest(null);
                setEndDest(null);
                setPath([]);
                setStartSearch('');
                setEndSearch('');
              }}
            >
              {Object.keys(buildingData[selectedBuilding].floors).map((floor) => (
                <Picker.Item key={floor} label={`Floor ${floor}`} value={parseInt(floor, 10)} />
              ))}
            </Picker>
          </>
        )}
        {/* Default Map View if no destinations are selected */}
        {(!startDest || !endDest) && (
          <View
            style={isFullScreen ? styles.fullScreenImageContainer : styles.imageContainer}
            onLayout={handleContainerLayout}
          >
            <TouchableWithoutFeedback onPress={handlePress}>
              <View style={styles.touchableArea}>
                <Image
                  source={buildingData[selectedBuilding].floors[selectedFloor].image}
                  style={styles.floorImage}
                  resizeMode="contain"
                />
                <Svg
                  style={StyleSheet.absoluteFill}
                  viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        )}
        {/* Same-building, same-floor view */}
        {startDest && endDest && startDest.building === endDest.building && startDest.floor === endDest.floor && (
          <View
            style={isFullScreen ? styles.fullScreenImageContainer : styles.imageContainer}
            onLayout={handleContainerLayout}
          >
            <TouchableWithoutFeedback onPress={handlePress}>
              <View style={styles.touchableArea}>
                <Image
                  source={buildingData[startDest.building].floors[startDest.floor].image}
                  style={styles.floorImage}
                  resizeMode="contain"
                />
                <Svg
                  style={StyleSheet.absoluteFill}
                  viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                >
                  {startFloorPath.length > 1 && (
                    <Polyline
                      points={polylinePoints}
                      fill="none"
                      stroke="blue"
                      strokeWidth="3"
                    />
                  )}
                  {startDest && buildingData[startDest.building].floors[startDest.floor].graph[startDest.node] && (
                    <Circle
                      cx={scaleCoordinates(
                        { x: buildingData[startDest.building].floors[startDest.floor].graph[startDest.node].x, y: buildingData[startDest.building].floors[startDest.floor].graph[startDest.node].y },
                        buildingData[startDest.building].floors[startDest.floor].originalDimensions,
                        containerSize
                      ).x}
                      cy={scaleCoordinates(
                        { x: buildingData[startDest.building].floors[startDest.floor].graph[startDest.node].x, y: buildingData[startDest.building].floors[startDest.floor].graph[startDest.node].y },
                        buildingData[startDest.building].floors[startDest.floor].originalDimensions,
                        containerSize
                      ).y}
                      r="5"
                      fill="blue"
                    />
                  )}
                  {endDest && buildingData[endDest.building].floors[endDest.floor].graph[endDest.node] && (
                    <Circle
                      cx={scaleCoordinates(
                        { x: buildingData[endDest.building].floors[endDest.floor].graph[endDest.node].x, y: buildingData[endDest.building].floors[endDest.floor].graph[endDest.node].y },
                        buildingData[endDest.building].floors[endDest.floor].originalDimensions,
                        containerSize
                      ).x}
                      cy={scaleCoordinates(
                        { x: buildingData[endDest.building].floors[endDest.floor].graph[endDest.node].x, y: buildingData[endDest.building].floors[endDest.floor].graph[endDest.node].y },
                        buildingData[endDest.building].floors[endDest.floor].originalDimensions,
                        containerSize
                      ).y}
                      r="5"
                      fill="green"
                    />
                  )}
                </Svg>
              </View>
            </TouchableWithoutFeedback>
          </View>
        )}
        {/* Same-building, cross–floor view (implemented for Hall building) */}
        {startDest && endDest && startDest.building === endDest.building && startDest.floor !== endDest.floor && startDest.building === 'Hall' && (
          <View style={styles.crossFloorContainer}>
            {/* Map for start floor */}
            <View
              style={isFullScreen ? styles.fullScreenImageContainer : styles.imageContainer}
              onLayout={handleContainerLayout}
            >
              <Text style={styles.mapLabel}>Floor {startDest.floor}</Text>
              <TouchableWithoutFeedback onPress={handlePress}>
                <View style={styles.touchableArea}>
                  <Image
                    source={buildingData['Hall'].floors[startDest.floor].image}
                    style={styles.floorImage}
                    resizeMode="contain"
                  />
                  <Svg
                    style={StyleSheet.absoluteFill}
                    viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                  >
                    {(() => {
                      const graph = buildingData['Hall'].floors[startDest.floor].graph;
                      const path1 = startFloorPath;
                      const scaledPath1 = getPathCoordinates(
                        graph,
                        path1,
                        buildingData['Hall'].floors[startDest.floor].originalDimensions,
                        containerSize
                      );
                      const polyPoints1 = scaledPath1.map(p => `${p.x},${p.y}`).join(' ');
                      return (
                        <>
                          {path1.length > 1 && (
                            <Polyline
                              points={polyPoints1}
                              fill="none"
                              stroke="blue"
                              strokeWidth="3"
                            />
                          )}
                          <Circle
                            cx={scaleCoordinates(
                              { x: graph[startDest.node].x, y: graph[startDest.node].y },
                              buildingData['Hall'].floors[startDest.floor].originalDimensions,
                              containerSize
                            ).x}
                            cy={scaleCoordinates(
                              { x: graph[startDest.node].x, y: graph[startDest.node].y },
                              buildingData['Hall'].floors[startDest.floor].originalDimensions,
                              containerSize
                            ).y}
                            r="5"
                            fill="blue"
                          />
                        </>
                      );
                    })()}
                  </Svg>
                </View>
              </TouchableWithoutFeedback>
            </View>
            {/* Map for destination floor */}
            <View
              style={isFullScreen ? styles.fullScreenImageContainer : styles.imageContainer}
              onLayout={handleContainerLayout}
            >
              <Text style={styles.mapLabel}>Floor {endDest.floor}</Text>
              <TouchableWithoutFeedback onPress={handlePress}>
                <View style={styles.touchableArea}>
                  <Image
                    source={buildingData['Hall'].floors[endDest.floor].image}
                    style={styles.floorImage}
                    resizeMode="contain"
                  />
                  <Svg
                    style={StyleSheet.absoluteFill}
                    viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                  >
                    {(() => {
                      const graph = buildingData['Hall'].floors[endDest.floor].graph;
                      const path2 = endFloorPath;
                      const scaledPath2 = getPathCoordinates(
                        graph,
                        path2,
                        buildingData['Hall'].floors[endDest.floor].originalDimensions,
                        containerSize
                      );
                      const polyPoints2 = scaledPath2.map(p => `${p.x},${p.y}`).join(' ');
                      return (
                        <>
                          {path2.length > 1 && (
                            <Polyline
                              points={polyPoints2}
                              fill="none"
                              stroke="blue"
                              strokeWidth="3"
                            />
                          )}
                          <Circle
                            cx={scaleCoordinates(
                              { x: graph[endDest.node].x, y: graph[endDest.node].y },
                              buildingData['Hall'].floors[endDest.floor].originalDimensions,
                              containerSize
                            ).x}
                            cy={scaleCoordinates(
                              { x: graph[endDest.node].x, y: graph[endDest.node].y },
                              buildingData['Hall'].floors[endDest.floor].originalDimensions,
                              containerSize
                            ).y}
                            r="5"
                            fill="green"
                          />
                        </>
                      );
                    })()}
                  </Svg>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        )}
        {/* Cross-building view: For now, only Hall -> John Molson routing is implemented */}
        {startDest && endDest && startDest.building !== endDest.building && (
          <View style={styles.crossFloorContainer}>
            {startDest.building === 'Hall' && endDest.building === 'John Molson' ? (
              <>
                {/* Map for Hall building (start) */}
                <View
                  style={isFullScreen ? styles.fullScreenImageContainer : styles.imageContainer}
                  onLayout={handleContainerLayout}
                >
                  <Text style={styles.mapLabel}>{startDest.building} Floor {startDest.floor}</Text>
                  <TouchableWithoutFeedback onPress={handlePress}>
                    <View style={styles.touchableArea}>
                      <Image
                        source={buildingData['Hall'].floors[startDest.floor].image}
                        style={styles.floorImage}
                        resizeMode="contain"
                      />
                      <Svg
                        style={StyleSheet.absoluteFill}
                        viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                      >
                        {(() => {
                          const graph = buildingData['Hall'].floors[startDest.floor].graph;
                          const path1 = startFloorPath;
                          const scaledPath1 = getPathCoordinates(
                            graph,
                            path1,
                            buildingData['Hall'].floors[startDest.floor].originalDimensions,
                            containerSize
                          );
                          const polyPoints1 = scaledPath1.map(p => `${p.x},${p.y}`).join(' ');
                          return (
                            <>
                              {path1.length > 1 && (
                                <Polyline
                                  points={polyPoints1}
                                  fill="none"
                                  stroke="blue"
                                  strokeWidth="3"
                                />
                              )}
                              <Circle
                                cx={scaleCoordinates(
                                  { x: graph[startDest.node].x, y: graph[startDest.node].y },
                                  buildingData['Hall'].floors[startDest.floor].originalDimensions,
                                  containerSize
                                ).x}
                                cy={scaleCoordinates(
                                  { x: graph[startDest.node].x, y: graph[startDest.node].y },
                                  buildingData['Hall'].floors[startDest.floor].originalDimensions,
                                  containerSize
                                ).y}
                                r="5"
                                fill="blue"
                              />
                            </>
                          );
                        })()}
                      </Svg>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
                {/* Map for John Molson building (destination) */}
                <View
                  style={isFullScreen ? styles.fullScreenImageContainer : styles.imageContainer}
                  onLayout={handleContainerLayout}
                >
                  <Text style={styles.mapLabel}>{endDest.building} Floor {endDest.floor}</Text>
                  <TouchableWithoutFeedback onPress={handlePress}>
                    <View style={styles.touchableArea}>
                      <Image
                        source={buildingData['John Molson'].floors[endDest.floor].image}
                        style={styles.floorImage}
                        resizeMode="contain"
                      />
                      <Svg
                        style={StyleSheet.absoluteFill}
                        viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                      >
                        {(() => {
                          const graph = buildingData['John Molson'].floors[endDest.floor].graph;
                          const path2 = endFloorPath;
                          const scaledPath2 = getPathCoordinates(
                            graph,
                            path2,
                            buildingData['John Molson'].floors[endDest.floor].originalDimensions,
                            containerSize
                          );
                          const polyPoints2 = scaledPath2.map(p => `${p.x},${p.y}`).join(' ');
                          return (
                            <>
                              {path2.length > 1 && (
                                <Polyline
                                  points={polyPoints2}
                                  fill="none"
                                  stroke="blue"
                                  strokeWidth="3"
                                />
                              )}
                              <Circle
                                cx={scaleCoordinates(
                                  { x: graph[endDest.node].x, y: graph[endDest.node].y },
                                  buildingData['John Molson'].floors[endDest.floor].originalDimensions,
                                  containerSize
                                ).x}
                                cy={scaleCoordinates(
                                  { x: graph[endDest.node].x, y: graph[endDest.node].y },
                                  buildingData['John Molson'].floors[endDest.floor].originalDimensions,
                                  containerSize
                                ).y}
                                r="5"
                                fill="green"
                              />
                            </>
                          );
                        })()}
                      </Svg>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </>
            ) : (
              <Text>Routing between {startDest.building} and {endDest.building} is not implemented.</Text>
            )}
          </View>
        )}
        {/* For same–floor view, show path info */}
        {startDest && endDest && startDest.building === endDest.building && startDest.floor === endDest.floor && path.length > 1 && (
          <View style={styles.pathInfo}>
            <Text style={{ fontWeight: 'bold' }}>Directions:</Text>
            {generateDirections(path).map((step, index) => (
              <Text key={index}>{step}</Text>
            ))}
            <Text style={{ marginTop: 5 }}>
              Distance: {(computePathDistance(scaledPathCoords) * PIXEL_TO_METER).toFixed(2)} m
            </Text>
          </View>
        )}
        {/* For cross–floor view within the same building (Hall) */}
        {startDest && endDest && startDest.building === endDest.building && startDest.floor !== endDest.floor && startDest.building === 'Hall' && (
          <View style={styles.pathInfo}>
          <Text style={{ fontWeight: 'bold' }}>Start Floor Path (Floor {startDest.floor}):</Text>
          {generateDirections(
            findPathBFS(buildingData['Hall'].floors[startDest.floor].graph, startDest.node, "Hall_1st_Elevator")
          ).map((step, index) => (
            <Text key={index}>{step}</Text>
          ))}
          <Text style={{ fontWeight: 'bold', marginTop: 5 }}>
            End Floor Path (Floor {endDest.floor}):
          </Text>
          {generateDirections(
            findPathBFS(buildingData['Hall'].floors[endDest.floor].graph, "Elevator9th", endDest.node)
          ).map((step, index) => (
            <Text key={index}>{step}</Text>
          ))}
        </View>
        
        )}
        {/* For cross–building view (Hall -> John Molson) show routing info */}
        {startDest && endDest && startDest.building !== endDest.building && startDest.building === 'Hall' && endDest.building === 'John Molson' && (
          <View style={styles.pathInfo}>
          <Text style={{ fontWeight: 'bold' }}>Hall Building Path (Floor {startDest.floor}):</Text>
          {generateDirections(
            findPathBFS(buildingData['Hall'].floors[startDest.floor].graph, startDest.node, "Hall_1st_Basement_Escalator")
          ).map((step, index) => (
            <Text key={index}>{step}</Text>
          ))}
          <Text>Take the Tunnel until JMSB</Text>
          <Text style={{ fontWeight: 'bold', marginTop: 5 }}>
            John Molson Building Path (Floor {endDest.floor}):
          </Text>
          {generateDirections(
            findPathBFS(buildingData['John Molson'].floors[endDest.floor].graph, "Tunnel", endDest.node)
          ).map((step, index) => (
            <Text key={index}>{step}</Text>
          ))}
        </View>
        
        )}
      </View>
    </ScrollView>
  );
}

//--------------------------------------
// STYLES
//--------------------------------------
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollViewContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  picker: {
    height: 50,
    width: 200,
  },
  searchContainer: {
    width: '90%',
    marginVertical: 5,
  },
  searchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
    marginTop: 5,
    borderRadius: 4,
  },
  suggestionList: {
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 2,
  },
  suggestionItem: {
    padding: 5,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  destinationInfo: {
    width: '90%',
    marginVertical: 10,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginVertical: 10,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  fullScreenImageContainer: {
    width: '90%',
    aspectRatio: 1,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    position: 'relative',
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
  crossFloorContainer: {
    width: '90%',
    marginTop: 20,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  mapLabel: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 2,
    fontSize: 12,
  },
  switchContainer: {
    width: '90%',
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    marginRight: 10,
  },
});
