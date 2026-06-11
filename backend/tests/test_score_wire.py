"""Score wire: mapping, fixture matching, goal alignment, idempotence."""

from __future__ import annotations

from rootin4_agent.tools import score_wire
from rootin4_agent.tournament.results import validate_result
from rootin4_agent.tournament.state import load_default_state


def _espn_event(eid, abbr_h, name_h, score_h, abbr_a, name_a, score_a,
                completed=True, status="STATUS_FULL_TIME"):
    return {
        "id": eid,
        "date": "2026-06-11T19:00Z",
        "competitions": [
            {
                "status": {"type": {"name": status, "completed": completed}},
                "competitors": [
                    {
                        "homeAway": "home",
                        "score": str(score_h),
                        "team": {"abbreviation": abbr_h, "displayName": name_h},
                    },
                    {
                        "homeAway": "away",
                        "score": str(score_a),
                        "team": {"abbreviation": abbr_a, "displayName": name_a},
                    },
                ],
            }
        ],
    }


def test_completed_group_match_maps_to_fixture(monkeypatch):
    monkeypatch.setattr(
        score_wire,
        "_fetch_events",
        lambda dates: [_espn_event("1", "MEX", "Mexico", 2, "RSA", "South Africa", 1)],
    )
    events = score_wire.fetch_wire_events({})
    assert len(events) == 1
    ev = events[0]
    assert (ev.team_a, ev.team_b, ev.match_id, ev.completed) == (
        "MEX",
        "RSA",
        1,
        True,
    )


def test_in_progress_and_recorded_are_not_recordable(monkeypatch):
    monkeypatch.setattr(
        score_wire,
        "_fetch_events",
        lambda dates: [
            _espn_event("1", "MEX", "Mexico", 1, "RSA", "South Africa", 0,
                        completed=False, status="STATUS_SECOND_HALF"),
            _espn_event("2", "KOR", "South Korea", 2, "CZE", "Czechia", 0),
        ],
    )
    state = load_default_state()
    already = {2: validate_result(state, 2, 2, 0)}
    events = score_wire.fetch_wire_events(already)
    in_progress = next(e for e in events if e.event_id == "1")
    recorded = next(e for e in events if e.event_id == "2")
    assert not in_progress.completed and in_progress.match_id == 1
    assert recorded.match_id is None  # already recorded → no rematch
    assert "no unrecorded fixture" in recorded.note


def test_alias_names_map_without_abbreviation(monkeypatch):
    monkeypatch.setattr(
        score_wire,
        "_fetch_events",
        lambda dates: [
            _espn_event("9", "", "South Korea", 1, "", "Czech Republic", 1)
        ],
    )
    ev = score_wire.fetch_wire_events({})[0]
    assert (ev.team_a, ev.team_b, ev.match_id) == ("KOR", "CZE", 2)


def test_swapped_home_side_still_matches_fixture(monkeypatch):
    # Wire lists RSA as home; our fixture says team_a=MEX. Pair-matching
    # must still find fixture 1.
    monkeypatch.setattr(
        score_wire,
        "_fetch_events",
        lambda dates: [_espn_event("7", "RSA", "South Africa", 0, "MEX", "Mexico", 3)],
    )
    ev = score_wire.fetch_wire_events({})[0]
    assert ev.match_id == 1
    assert (ev.team_a, ev.goals_a, ev.team_b, ev.goals_b) == ("RSA", 0, "MEX", 3)


def test_record_wire_result_aligns_goals_to_schedule(monkeypatch, tmp_path):
    import rootin4_agent.storage as storage
    from rootin4_agent.tools import monte_carlo as mc
    from rootin4_agent.tools import results_service

    monkeypatch.setattr(storage, "_LOCAL_STATE_DIR", tmp_path)
    monkeypatch.setattr(storage, "_store", None)
    mc.invalidate_aggregates()
    monkeypatch.setattr(mc, "DEFAULT_N_SAMPLES", 300)
    monkeypatch.setattr(
        score_wire,
        "_fetch_events",
        lambda dates: [_espn_event("7", "RSA", "South Africa", 0, "MEX", "Mexico", 3)],
    )
    out = results_service.record_wire_result(1)
    assert "error" not in out
    rec = out["recorded"]
    # Schedule order is MEX first — wire home/away must have been flipped.
    assert (rec["team_a"], rec["goals_a"], rec["team_b"], rec["goals_b"]) == (
        "MEX",
        3,
        "RSA",
        0,
    )
    # Idempotence: second attempt refuses.
    again = results_service.record_wire_result(1)
    assert "already recorded" in again["error"]
    mc.invalidate_aggregates()
