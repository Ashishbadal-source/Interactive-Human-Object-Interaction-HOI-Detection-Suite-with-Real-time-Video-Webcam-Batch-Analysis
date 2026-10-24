"""
Spatial-temporal action tracking and interval aggregation service.
Clusters frame-by-frame Human-Object Interaction (HOI) detections across time
to generate continuous action intervals and motion continuity trajectories.
"""
from typing import List
from ..schemas.video import FrameAnalysisResult, ActionInterval


def _compute_iou(boxA: List[float], boxB: List[float]) -> float:
    """Compute Intersection over Union between two [x1, y1, x2, y2] bounding boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interWidth = max(0.0, xB - xA)
    interHeight = max(0.0, yB - yA)
    interArea = interWidth * interHeight

    boxAArea = max(1.0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = max(1.0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

    iou = interArea / float(boxAArea + boxBArea - interArea)
    return float(iou)


class VideoActionTracker:
    """Tracks subject-object interaction pairs across sequential sampled video frames."""

    @staticmethod
    def track_action_intervals(
        frames: List[FrameAnalysisResult],
        max_time_gap: float = 4.0,
        min_sub_iou: float = 0.20,
        min_obj_iou: float = 0.15,
    ) -> List[ActionInterval]:
        """
        Aggregate frame predictions into continuous ActionIntervals.
        """
        if not frames:
            return []

        # Sort frames chronologically
        sorted_frames = sorted(frames, key=lambda f: f.timestamp_seconds)

        active_tracks = []
        completed_tracks = []

        track_counter = 0

        for frame in sorted_frames:
            t_curr = frame.timestamp_seconds

            # Expire active tracks that have passed max_time_gap
            remaining_active = []
            for track in active_tracks:
                if t_curr - track["last_timestamp"] > max_time_gap:
                    completed_tracks.append(track)
                else:
                    remaining_active.append(track)
            active_tracks = remaining_active

            # For each prediction in current frame, match to an active track
            for pred in frame.predictions:
                matched_track = None
                best_match_score = -1.0

                for track in active_tracks:
                    # Check semantic consistency
                    if track["action"] != pred.primary_action or track["object_label"] != pred.object_label:
                        continue

                    # Spatial IoU consistency
                    sub_iou = _compute_iou(track["last_sub_box"], pred.subject_box)
                    obj_iou = _compute_iou(track["last_obj_box"], pred.object_box)

                    if sub_iou >= min_sub_iou or obj_iou >= min_obj_iou:
                        match_score = (sub_iou + obj_iou) / 2.0
                        if match_score > best_match_score:
                            best_match_score = match_score
                            matched_track = track

                if matched_track:
                    # Extend existing track
                    matched_track["end_timestamp"] = t_curr
                    matched_track["last_timestamp"] = t_curr
                    matched_track["last_sub_box"] = pred.subject_box
                    matched_track["last_obj_box"] = pred.object_box
                    matched_track["action_scores"].append(pred.primary_action_score)
                    matched_track["object_scores"].append(pred.object_score)
                    matched_track["sample_timestamps"].append(round(t_curr, 2))
                    matched_track["frame_count"] += 1
                else:
                    # Initialize new track
                    track_counter += 1
                    new_track = {
                        "interval_id": f"interval_{track_counter}",
                        "action": pred.primary_action,
                        "object_label": pred.object_label,
                        "start_timestamp": round(t_curr, 2),
                        "end_timestamp": round(t_curr, 2),
                        "last_timestamp": t_curr,
                        "last_sub_box": pred.subject_box,
                        "last_obj_box": pred.object_box,
                        "action_scores": [pred.primary_action_score],
                        "object_scores": [pred.object_score],
                        "sample_timestamps": [round(t_curr, 2)],
                        "frame_count": 1,
                    }
                    active_tracks.append(new_track)

        # Append remaining active tracks
        completed_tracks.extend(active_tracks)

        # Convert to Pydantic ActionInterval objects
        results: List[ActionInterval] = []
        for tr in completed_tracks:
            action_scores = tr["action_scores"]
            object_scores = tr["object_scores"]
            start_t = tr["start_timestamp"]
            end_t = tr["end_timestamp"]
            duration = max(0.5, round(end_t - start_t, 2))

            interval = ActionInterval(
                interval_id=tr["interval_id"],
                action=tr["action"],
                object_label=tr["object_label"],
                start_timestamp=start_t,
                end_timestamp=end_t,
                duration_seconds=duration,
                frame_count=tr["frame_count"],
                avg_action_score=round(sum(action_scores) / len(action_scores), 4),
                avg_object_score=round(sum(object_scores) / len(object_scores), 4),
                peak_action_score=round(max(action_scores), 4),
                sample_timestamps=tr["sample_timestamps"],
            )
            results.append(interval)

        # Sort by start_timestamp then peak_action_score descending
        results.sort(key=lambda x: (x.start_timestamp, -x.peak_action_score))
        return results


video_action_tracker = VideoActionTracker()
