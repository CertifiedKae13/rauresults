import type { LiveEntrant } from "./live-types";

export function orderLiveEntrants(entrants: LiveEntrant[]): LiveEntrant[] {
  return [...entrants]
    .sort((left, right) => {
      const leftFinished = left.finishRawTime !== null;
      const rightFinished = right.finishRawTime !== null;
      if (leftFinished && rightFinished && left.finishRawTime !== right.finishRawTime) {
        return (left.finishRawTime as number) - (right.finishRawTime as number);
      }
      if (leftFinished !== rightFinished) return leftFinished ? -1 : 1;
      if (Math.abs(right.distanceMeters - left.distanceMeters) > 0.001) {
        return right.distanceMeters - left.distanceMeters;
      }
      if (Math.abs(right.progress - left.progress) > 0.00001) return right.progress - left.progress;
      return left.name.localeCompare(right.name);
    })
    .map((entrant, index) => ({
      ...entrant,
      rank: index + 1,
      finishPlace: entrant.finishRawTime === null ? null : index + 1,
    }));
}
