"""Unit tests for the CareerMentor engine (Phase 7)."""
from __future__ import annotations

import pytest
from app.ml.mentor import CareerMentor, UserContext, _detect_intent


# ─────────────────────────────────────────────────────────────────── #
# Intent detection tests                                               #
# ─────────────────────────────────────────────────────────────────── #
@pytest.mark.parametrize("message,expected", [
    ("hi there", "greeting"),
    ("Hello!", "greeting"),
    ("Hey, good morning", "greeting"),
    ("what career suits me?", "career_advice"),
    ("recommend me a career", "career_advice"),
    ("what career should I pursue?", "career_advice"),
    ("what skills am I missing?", "skill_gap"),
    ("show my skill gap", "skill_gap"),
    ("which skills do I need?", "skill_gap"),
    ("show my roadmap", "roadmap"),
    ("how to become a data scientist", "roadmap"),
    ("learning path for software developer", "roadmap"),
    ("tell me about UPSC", "exam_guidance"),
    ("banking exam tips", "exam_guidance"),
    ("SSC CGL preparation", "exam_guidance"),
    ("how to improve my profile", "profile_tips"),
    ("improve my cgpa score", "profile_tips"),
    ("my profile health score", "profile_tips"),
    ("what to add to my profile", "profile_tips"),
    ("tell me about Data Scientist / ML Engineer", "career_detail"),
    ("what is Software Developer?", "career_detail"),
    ("random gibberish xyz", "fallback"),
])
def test_detect_intent(message, expected):
    assert _detect_intent(message) == expected


# ─────────────────────────────────────────────────────────────────── #
# Mentor response tests                                                #
# ─────────────────────────────────────────────────────────────────── #
@pytest.fixture(scope="module")
def mentor():
    return CareerMentor()


@pytest.fixture
def full_ctx():
    return UserContext(
        name="Archit Nagar",
        skills=["python", "sql", "machine learning", "pandas", "numpy"],
        interests=["data science", "artificial intelligence"],
        cgpa=8.5,
        certifications=["Google Data Analytics", "AWS Cloud Practitioner"],
        career_goals="Become a data scientist at a top tech firm",
        top_careers=[
            {"career_name": "Data Scientist / ML Engineer", "match_pct": 87.0, "description": ""},
            {"career_name": "Software Developer", "match_pct": 72.0, "description": ""},
        ],
    )


@pytest.fixture
def empty_ctx():
    return UserContext()


class TestGreeting:
    def test_greeting_with_full_context(self, mentor, full_ctx):
        resp = mentor.respond("Hello!", full_ctx)
        assert "Data Scientist / ML Engineer" in resp
        assert "87%" in resp
        assert "I'm here to help" in resp

    def test_greeting_with_empty_context(self, mentor, empty_ctx):
        resp = mentor.respond("hi", empty_ctx)
        assert "doesn't have any skills listed" in resp
        assert "I'm here to help" in resp.lower() or "profile" in resp.lower()


class TestCareerAdvice:
    def test_returns_top_matches(self, mentor, full_ctx):
        resp = mentor.respond("What career suits me?", full_ctx)
        assert "Data Scientist" in resp
        assert "87%" in resp or "87" in resp

    def test_no_recommendations_prompt(self, mentor, empty_ctx):
        resp = mentor.respond("recommend me a career", empty_ctx)
        assert "Dashboard" in resp


class TestSkillGap:
    def test_gap_for_named_career(self, mentor, full_ctx):
        resp = mentor.respond("What skills do I need for Software Developer?", full_ctx)
        assert "Software Developer" in resp
        assert "%" in resp

    def test_gap_falls_back_to_top_career(self, mentor, full_ctx):
        resp = mentor.respond("What skills do I need?", full_ctx)
        assert "Data Scientist" in resp

    def test_gap_with_no_context(self, mentor, empty_ctx):
        resp = mentor.respond("skill gap", empty_ctx)
        assert "career" in resp.lower()


class TestRoadmap:
    def test_roadmap_for_named_career(self, mentor, full_ctx):
        resp = mentor.respond("Show roadmap for Software Developer", full_ctx)
        assert "Software Developer" in resp
        assert "Stage" in resp or "roadmap" in resp.lower()

    def test_roadmap_falls_back_to_top_career(self, mentor, full_ctx):
        resp = mentor.respond("show my roadmap", full_ctx)
        assert "Data Scientist" in resp


class TestExamGuidance:
    def test_upsc_detected(self, mentor, full_ctx):
        resp = mentor.respond("tell me about UPSC exam", full_ctx)
        assert "UPSC" in resp or "Civil Services" in resp

    def test_banking_detected(self, mentor, full_ctx):
        resp = mentor.respond("how to prepare for banking exam", full_ctx)
        assert "bank" in resp.lower() or "IBPS" in resp

    def test_generic_exam_overview(self, mentor, full_ctx):
        resp = mentor.respond("what exam should I take?", full_ctx)
        # "exam" matches the exam_guidance pattern — should return overview
        assert "UPSC" in resp or "SSC" in resp or "GATE" in resp or "Banking" in resp


class TestProfileTips:
    def test_full_profile_scores_well(self, mentor, full_ctx):
        resp = mentor.respond("how to improve my profile?", full_ctx)
        assert "Profile Health" in resp
        assert "✅" in resp

    def test_empty_profile_flags_issues(self, mentor, empty_ctx):
        resp = mentor.respond("improve my profile", empty_ctx)
        assert "🔴" in resp
        assert "skills" in resp.lower()


class TestCareerDetail:
    def test_known_career_returns_detail(self, mentor, full_ctx):
        resp = mentor.respond("Tell me about Data Scientist / ML Engineer", full_ctx)
        assert "Data Scientist" in resp
        # New format uses conversational paragraphs
        assert "Financially" in resp or "curious about" in resp.lower() or "The Pay:" in resp

    def test_unknown_career_prompts_list(self, mentor, full_ctx):
        resp = mentor.respond("Tell me about Underwater Basket Weaving", full_ctx)
        assert "couldn't find" in resp.lower() or "which career" in resp.lower()


class TestFallback:
    def test_gibberish_returns_suggestions(self, mentor, full_ctx):
        resp = mentor.respond("asdfghjkl xyz 123", full_ctx)
        assert "SUGGESTED_PROMPTS" not in resp  # internal attr not leaked
        assert "ask" in resp.lower() or "try" in resp.lower() or "help" in resp.lower()
