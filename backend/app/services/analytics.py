"""
Team Performance Analytics — powers the Branch Manager cockpit.

The Branch Manager monitors the whole relationship-manager (RM) team: what each
RM has done, how they are tracking against target, and a consolidated roll-up
with AI-generated coaching and a month-end forecast.

Design for the demo:
  * The demo RM ("Rhea Nair") is computed LIVE from the leads currently in the
    database, so anything done in the RM Hub / Customer Simulator flows straight
    up into the Manager cockpit in real time.
  * The rest of the team is a stable roster with realistic month-to-date books
    so the consolidated KPIs, leaderboard, cohort lift and forecast are rich.

Every number the Manager sees is derived here (analytics), and the coaching /
executive summary is generated from those numbers (explainable "AI").
"""
from __future__ import annotations

import calendar
from datetime import datetime
from typing import Dict, List, Any

from sqlalchemy.orm import Session

from ..models import Lead

LOAN_TYPES = ["Auto Loan", "Home Loan", "Personal Loan", "Mortgage Loan"]

# Eligible-limit → disbursal contribution uses the lead's own eligible amount.
# Approximate eligible amount for the live RM's converted leads that predate the
# eligible_loan_amount column being populated is handled gracefully (defaults 0).

# ---------------------------------------------------------------------------
# Stable roster for the rest of the team (month-to-date books)
# ---------------------------------------------------------------------------
STATIC_ROSTER: List[Dict[str, Any]] = [
    {
        "id": 2, "name": "Arjun Kapoor", "email": "arjun.kapoor@idbibank.in",
        "region": "Delhi NCR", "tenure_years": 5, "initials": "AK",
        "new": 8, "contacted": 21, "converted": 11, "rejected": 8,
        "disbursed_amount": 13_200_000, "target_conversions": 16,
        "target_disbursal": 15_000_000, "avg_propensity": 71.0,
        "treated": {"total": 22, "converted": 8}, "control": {"total": 18, "converted": 3},
        "product_mix": {"Auto Loan": 14, "Home Loan": 12, "Personal Loan": 16, "Mortgage Loan": 6},
        "weekly_trend": [2, 2, 1, 2, 2, 2],
    },
    {
        "id": 3, "name": "Meera Iyer", "email": "meera.iyer@idbibank.in",
        "region": "Bengaluru", "tenure_years": 7, "initials": "MI",
        "new": 10, "contacted": 23, "converted": 13, "rejected": 9,
        "disbursed_amount": 22_500_000, "target_conversions": 15,
        "target_disbursal": 20_000_000, "avg_propensity": 78.0,
        "treated": {"total": 26, "converted": 10}, "control": {"total": 19, "converted": 3},
        "product_mix": {"Auto Loan": 9, "Home Loan": 18, "Personal Loan": 10, "Mortgage Loan": 18},
        "weekly_trend": [2, 2, 2, 2, 3, 3],
    },
    {
        "id": 4, "name": "Karan Malhotra", "email": "karan.malhotra@idbibank.in",
        "region": "Pune", "tenure_years": 2, "initials": "KM",
        "new": 18, "contacted": 17, "converted": 5, "rejected": 12,
        "disbursed_amount": 5_400_000, "target_conversions": 14,
        "target_disbursal": 12_000_000, "avg_propensity": 58.0,
        "treated": {"total": 10, "converted": 3}, "control": {"total": 24, "converted": 2},
        "product_mix": {"Auto Loan": 18, "Home Loan": 7, "Personal Loan": 22, "Mortgage Loan": 5},
        "weekly_trend": [2, 2, 1, 0, 0, 0],
    },
    {
        "id": 5, "name": "Sanya Reddy", "email": "sanya.reddy@idbibank.in",
        "region": "Hyderabad", "tenure_years": 3, "initials": "SR",
        "new": 9, "contacted": 22, "converted": 10, "rejected": 8,
        "disbursed_amount": 12_800_000, "target_conversions": 14,
        "target_disbursal": 14_000_000, "avg_propensity": 69.0,
        "treated": {"total": 23, "converted": 8}, "control": {"total": 17, "converted": 2},
        "product_mix": {"Auto Loan": 12, "Home Loan": 11, "Personal Loan": 14, "Mortgage Loan": 12},
        "weekly_trend": [1, 1, 2, 2, 2, 2],
    },
]

LIVE_RM_META = {
    "id": 1, "name": "Rhea Nair", "email": "rm.demo@idbibank.in",
    "region": "Mumbai South", "tenure_years": 4, "initials": "RN",
    "target_conversions": 12, "target_disbursal": 12_000_000,
    "weekly_trend": [1, 1, 2, 1, 1, 2],
}


def _round(x: float, n: int = 1) -> float:
    return round(x, n)


def _rate(part: int, whole: int) -> float:
    return _round((part / whole) * 100) if whole else 0.0


def _trend_direction(trend: List[float]) -> str:
    if len(trend) < 4:
        return "flat"
    first = sum(trend[: len(trend) // 2]) / (len(trend) // 2)
    last = sum(trend[len(trend) // 2 :]) / (len(trend) - len(trend) // 2)
    if last > first + 0.3:
        return "up"
    if last < first - 0.3:
        return "down"
    return "flat"


def _finalize_rm(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Compute all derived KPIs, status and AI coaching for a single RM."""
    treated = raw["treated"]
    control = raw["control"]
    worked = treated["total"] + control["total"]
    converted = raw["converted"]
    assigned = worked + raw["new"]

    treated_rate = _rate(treated["converted"], treated["total"])
    control_rate = _rate(control["converted"], control["total"])

    conv_attainment = _rate(converted, raw["target_conversions"])
    disbursal_attainment = _rate(raw["disbursed_amount"], raw["target_disbursal"])
    attainment = _round((conv_attainment + disbursal_attainment) / 2)

    if attainment >= 95:
        status = "ahead"
    elif attainment >= 70:
        status = "on_track"
    else:
        status = "behind"

    direction = _trend_direction(raw["weekly_trend"])
    conversion_rate = _rate(converted, worked)

    rm = {
        "id": raw["id"], "name": raw["name"], "email": raw["email"],
        "region": raw["region"], "tenure_years": raw["tenure_years"],
        "initials": raw["initials"], "is_live": raw.get("is_live", False),
        "assigned": assigned, "new": raw["new"], "contacted": raw["contacted"],
        "converted": converted, "rejected": raw["rejected"],
        "disbursed_amount": raw["disbursed_amount"],
        "conversion_rate": conversion_rate,
        "target_conversions": raw["target_conversions"],
        "target_disbursal": raw["target_disbursal"],
        "conv_attainment": conv_attainment,
        "disbursal_attainment": disbursal_attainment,
        "attainment": attainment,
        "avg_propensity": _round(raw["avg_propensity"]),
        "treated": {"total": treated["total"], "converted": treated["converted"], "rate": treated_rate},
        "control": {"total": control["total"], "converted": control["converted"], "rate": control_rate},
        "product_mix": raw["product_mix"],
        "weekly_trend": raw["weekly_trend"],
        "status": status, "trend_direction": direction,
    }
    rm["coaching"] = _coaching_for(rm)
    return rm


def _coaching_for(rm: Dict[str, Any]) -> str:
    name = rm["name"].split(" ")[0]
    lift = _round(rm["treated"]["rate"] - rm["control"]["rate"])
    conv_gap = max(rm["target_conversions"] - rm["converted"], 0)

    if rm["status"] == "ahead":
        return (
            f"{name} is exceeding target ({rm['attainment']:.0f}% attainment) with a "
            f"+{lift:.0f} pt AI-cohort lift — a model book; pair with peers to share playbook."
        )
    if rm["status"] == "behind":
        if rm["control"]["total"] > rm["treated"]["total"]:
            return (
                f"{name} is behind ({rm['attainment']:.0f}%) and leaning on generic outreach "
                f"({rm['control']['total']} control vs {rm['treated']['total']} AI leads) — migrate the "
                f"control book to AI-personalized templates to close the {lift:.0f} pt conversion gap."
            )
        return (
            f"{name} is behind ({rm['attainment']:.0f}%) with {rm['new']} untouched leads — "
            f"{conv_gap} more conversions needed; prioritize the highest-propensity prospects this week."
        )
    if rm["trend_direction"] == "down":
        return (
            f"{name} is on target but weekly conversions are slipping — schedule a pipeline "
            f"review before momentum erodes; {rm['new']} fresh leads are waiting."
        )
    return (
        f"{name} is on pace ({rm['attainment']:.0f}%) converting at {rm['conversion_rate']:.0f}% — "
        f"nudge the {rm['new']} new leads to pull ahead of target."
    )


def _live_rm_from_leads(db: Session) -> Dict[str, Any]:
    """Build the demo RM's book LIVE from the leads currently in the database."""
    leads = db.query(Lead).all()

    treated = [l for l in leads if l.cohort == "Treated"]
    control = [l for l in leads if l.cohort == "Control"]
    t_conv = len([l for l in treated if l.status == "Converted"])
    c_conv = len([l for l in control if l.status == "Converted"])

    converted_leads = [l for l in leads if l.status == "Converted"]
    disbursed = sum((l.eligible_loan_amount or 0) for l in converted_leads)

    product_mix = {lt: len([l for l in leads if l.loan_type == lt]) for lt in LOAN_TYPES}
    props = [l.propensity_score for l in leads if l.propensity_score is not None]
    avg_prop = _round((sum(props) / len(props)) * 100) if props else 0.0

    raw = {
        **LIVE_RM_META,
        "is_live": True,
        "new": len([l for l in leads if l.status == "New"]),
        "contacted": len([l for l in leads if l.status == "Contacted"]),
        "converted": len(converted_leads),
        "rejected": len([l for l in leads if l.status == "Rejected"]),
        "disbursed_amount": disbursed,
        "avg_propensity": avg_prop,
        "treated": {"total": len(treated), "converted": t_conv},
        "control": {"total": len(control), "converted": c_conv},
        "product_mix": product_mix,
    }
    return _finalize_rm(raw)


def _build_forecast(rms: List[Dict[str, Any]]) -> Dict[str, Any]:
    now = datetime.utcnow()
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_elapsed = max(now.day, 1)
    factor = days_in_month / days_elapsed

    total_converted = sum(r["converted"] for r in rms)
    total_disbursed = sum(r["disbursed_amount"] for r in rms)
    target_conversions = sum(r["target_conversions"] for r in rms)
    target_disbursal = sum(r["target_disbursal"] for r in rms)

    projected_conversions = round(total_converted * factor)
    projected_disbursal = round(total_disbursed * factor)

    ratio = (projected_disbursal / target_disbursal) if target_disbursal else 0
    if ratio >= 1.0:
        pace = "ahead"
    elif ratio >= 0.85:
        pace = "on_track"
    else:
        pace = "behind"

    return {
        "projected_conversions": projected_conversions,
        "target_conversions": target_conversions,
        "projected_disbursal": projected_disbursal,
        "target_disbursal": target_disbursal,
        "pace": pace,
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
    }


def _executive_summary(consolidated: Dict[str, Any], forecast: Dict[str, Any], rms: List[Dict[str, Any]]) -> str:
    best = max(rms, key=lambda r: r["attainment"])
    weak = min(rms, key=lambda r: r["attainment"])
    lift = consolidated["lift"]
    disbursed_cr = consolidated["total_disbursed"] / 1e7  # crore
    target_cr = consolidated["total_target_disbursal"] / 1e7

    pace_word = {
        "ahead": "tracking ahead of plan",
        "on_track": "on pace with plan",
        "behind": "trailing plan",
    }[forecast["pace"]]

    return (
        f"The team has disbursed ₹{disbursed_cr:.2f} Cr — {consolidated['disbursal_attainment']:.0f}% of the "
        f"₹{target_cr:.2f} Cr target — across {consolidated['active_rms']} RMs, and is {pace_word} for month-end "
        f"(projected {forecast['projected_conversions']} conversions vs a target of {forecast['target_conversions']}). "
        f"AI-personalized outreach is converting at {consolidated['treated']['rate']:.0f}% versus "
        f"{consolidated['control']['rate']:.0f}% for the generic control cohort — a decisive +{lift:.0f} pt lift that "
        f"holds across the whole team. {best['name']} leads at {best['attainment']:.0f}% attainment, while "
        f"{weak['name']} needs attention at {weak['attainment']:.0f}% — recommend rebalancing the lagging book onto "
        f"the AI cohort and reviewing the untouched-lead backlog this week."
    )


def compute_team_performance(db: Session) -> Dict[str, Any]:
    rms = [_live_rm_from_leads(db)] + [_finalize_rm({**r}) for r in STATIC_ROSTER]

    total_assigned = sum(r["assigned"] for r in rms)
    total_new = sum(r["new"] for r in rms)
    total_contacted = sum(r["contacted"] for r in rms)
    total_converted = sum(r["converted"] for r in rms)
    total_rejected = sum(r["rejected"] for r in rms)
    total_disbursed = sum(r["disbursed_amount"] for r in rms)
    total_target_disbursal = sum(r["target_disbursal"] for r in rms)
    total_target_conversions = sum(r["target_conversions"] for r in rms)

    t_total = sum(r["treated"]["total"] for r in rms)
    t_conv = sum(r["treated"]["converted"] for r in rms)
    c_total = sum(r["control"]["total"] for r in rms)
    c_conv = sum(r["control"]["converted"] for r in rms)
    treated_rate = _rate(t_conv, t_total)
    control_rate = _rate(c_conv, c_total)

    worked = t_total + c_total
    best = max(rms, key=lambda r: r["attainment"])
    weak = min(rms, key=lambda r: r["attainment"])

    consolidated = {
        "total_assigned": total_assigned,
        "total_new": total_new,
        "total_contacted": total_contacted,
        "total_converted": total_converted,
        "total_rejected": total_rejected,
        "total_disbursed": total_disbursed,
        "total_target_disbursal": total_target_disbursal,
        "total_target_conversions": total_target_conversions,
        "conversion_rate": _rate(total_converted, worked),
        "disbursal_attainment": _rate(total_disbursed, total_target_disbursal),
        "conv_attainment": _rate(total_converted, total_target_conversions),
        "active_rms": len(rms),
        "treated": {"total": t_total, "converted": t_conv, "rate": treated_rate},
        "control": {"total": c_total, "converted": c_conv, "rate": control_rate},
        "lift": _round(treated_rate - control_rate),
        "best_performer": best["name"],
        "needs_attention": weak["name"],
    }

    forecast = _build_forecast(rms)

    # rank by attainment (desc) for the leaderboard
    rms_sorted = sorted(rms, key=lambda r: r["attainment"], reverse=True)

    return {
        "rms": rms_sorted,
        "consolidated": consolidated,
        "forecast": forecast,
        "ai_summary": _executive_summary(consolidated, forecast, rms),
        "generated_at": datetime.utcnow().isoformat(),
    }
