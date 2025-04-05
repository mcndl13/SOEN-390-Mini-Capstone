type Task = {
  id: string;
  name: string;
  type: 'fixed' | 'flexible';
  duration: number;
  startTime?: string;
  locationOptions: string[]; //location ids
};

type LocationNode = {
  //not sure if this is necessary
  id: string;
  name: string;
  type: 'indoor' | 'outdoor';
  neighbors: { nodeId: string; cost: number; isOutdoor: boolean }[];
};

type PlanStep = {
  taskId: string;
  locationId: string;
  startTime: string;
  endTime: string;
  path: string[]; // list of node IDs from previous location
};

function computeCost( //every path has a cost. It is a number represeting how costly that path is. We want to use the least costly path.
  from: string,
  to: string,
  weather: string,
): { path: string[]; cost: number } {
  const penalty = weather === 'bad' ? 2.0 : 1.0;
  const { path, baseCost, isOutdoorPath } = findShortestPath(from, to); //find shortest path needs to be implemented
  const finalCost = baseCost * (isOutdoorPath ? penalty : 1);
  return { path, cost: finalCost };
}

function buildPlan(
  tasks: Task[],
  currentLocation: string,
  currentTime: string,
  weather: string,
): PlanStep[] {
  const fixedTasks = tasks
    .filter((t) => t.type === 'fixed') //take only fixed tasks
    .sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!)); //sort them by start time
  const flexibleTasks = tasks.filter((t) => t.type === 'flexible');

  const plan: PlanStep[] = [];

  for (let fixedIndex = 0; fixedIndex <= fixedTasks.length; fixedIndex++) {
    //filtered tasks go into plan first since they cannot be moved.
    const nextFixedTask = fixedTasks[fixedIndex];
    const availableTime = nextFixedTask
      ? timeDiff(currentTime, nextFixedTask.startTime!) //how much time do we have until the next fixed task starts
      : 9999; //if there is no next fixed task, we have infinite time

    // Insert flexible tasks into available time
    const insertable = selectFlexibleTasks(
      flexibleTasks,
      availableTime,
      currentLocation,
      weather,
    );
    for (let flex of insertable) {
      const bestLocation = findBestLocation(
        //pick the location that has lowest walk cost keeping into account weather etc
        flex.locationOptions,
        currentLocation,
        weather,
      );
      const { path, cost } = computeCost(
        currentLocation,
        bestLocation,
        weather,
      ); //length of the task
      const start = currentTime;
      const end = addMinutes(start, flex.duration + cost);
      plan.push({
        //add flexible task to plan
        taskId: flex.id,
        locationId: bestLocation,
        startTime: start,
        endTime: end,
        path,
      });
      currentTime = end;
      currentLocation = bestLocation;
      flexibleTasks.splice(flexibleTasks.indexOf(flex), 1);
    }

    if (nextFixedTask) {
      const bestLocation = findBestLocation(
        nextFixedTask.locationOptions,
        currentLocation,
        weather,
      ); //probably not a necessary function to find the best location since the task is fixed
      const { path, cost } = computeCost(
        currentLocation,
        bestLocation,
        weather,
      );
      const travelStartTime = subtractMinutes(nextFixedTask.startTime!, cost);
      plan.push({
        taskId: nextFixedTask.id,
        locationId: bestLocation,
        startTime: nextFixedTask.startTime!,
        endTime: addMinutes(nextFixedTask.startTime!, nextFixedTask.duration),
        path,
      });
      currentTime = addMinutes(
        nextFixedTask.startTime!,
        nextFixedTask.duration,
      );
      currentLocation = bestLocation;
    }
  }

  return plan;
}
