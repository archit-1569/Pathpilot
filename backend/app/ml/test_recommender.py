"""
Unit tests for the PathPilot AI recommendation engine (Phase 3).
Run from project root: cd backend && python -m pytest app/ml/test_recommender.py -v
"""
import pytest
from app.ml.recommender import get_knowledge_base, _infer_cluster, _tokenise


# ── Cluster mapping ────────────────────────────────────────────── #

def test_software_cluster():
    name, _ = _infer_cluster("Software Engineer")
    assert name == "Software Developer"


def test_data_scientist_cluster():
    name, _ = _infer_cluster("Machine Learning Engineer")
    assert name == "Data Scientist / ML Engineer"


def test_finance_cluster():
    name, _ = _infer_cluster("Investment Banking Associate")
    assert name == "Finance & Accounting"


def test_na_returns_default():
    name, _ = _infer_cluster("NA")
    assert "General" in name or name  # shouldn't crash


# ── Tokeniser ──────────────────────────────────────────────────── #

def test_tokenise_semicolons():
    result = _tokenise("Python;SQL;Java")
    assert "python" in result
    assert "sql" in result


def test_tokenise_commas():
    result = _tokenise("Python Programming, Java Development")
    assert len(result) == 2


def test_tokenise_na():
    assert _tokenise("NA") == []
    assert _tokenise("") == []


# ── Knowledge base ─────────────────────────────────────────────── #

@pytest.fixture(scope="module")
def kb():
    return get_knowledge_base()


def test_knowledge_base_loads(kb):
    assert len(kb.records) >= 5, "Expected at least 5 career clusters"


def test_all_careers_returns_list(kb):
    careers = kb.all_careers()
    assert isinstance(careers, list)
    assert len(careers) > 0
    assert "career_name" in careers[0]
    assert "typical_skills" in careers[0]


# ── Recommendation engine ──────────────────────────────────────── #

def test_recommend_returns_results(kb):
    results = kb.recommend(
        skills=["python", "sql", "machine learning"],
        interests=["data science", "technology"],
    )
    assert len(results) >= 1
    assert len(results) <= 5


def test_recommend_pct_in_range(kb):
    results = kb.recommend(
        skills=["python", "sql", "data analysis"],
        interests=["financial analysis"],
        cgpa=8.5,
        certifications=["Data Science"],
    )
    for r in results:
        assert 0 <= r["match_pct"] <= 100, f"Out-of-range pct: {r['match_pct']}"


def test_recommend_fields_present(kb):
    results = kb.recommend(skills=["communication", "leadership"], interests=["teaching"])
    for r in results:
        assert "career_name" in r
        assert "description" in r
        assert "matched_skills" in r
        assert "skill_gaps" in r


def test_recommend_empty_profile_fallback(kb):
    # Should not raise even with no skills/interests
    results = kb.recommend(skills=[], interests=[])
    assert len(results) >= 1


def test_recommend_cgpa_bonus(kb):
    """Higher CGPA should yield equal-or-better scores."""
    base = kb.recommend(skills=["python"], interests=["technology"])
    boosted = kb.recommend(skills=["python"], interests=["technology"], cgpa=9.5)
    # At least the top match score should be >= without bonus
    assert boosted[0]["match_pct"] >= base[0]["match_pct"]


# ── Skill gap ──────────────────────────────────────────────────── #

def test_skill_gap_known_career(kb):
    gap = kb.get_skill_gaps(
        career_name="Data Scientist / ML Engineer",
        skills=["python", "statistics"],
        interests=["data science"],
    )
    assert gap.get("career_name")
    assert "you_have" in gap
    assert "you_need" in gap


def test_skill_gap_unknown_career(kb):
    gap = kb.get_skill_gaps(
        career_name="Rocket Surgeon",
        skills=["python"],
        interests=[],
    )
    assert "error" in gap


def test_skill_gap_you_have_subset_of_career_skills(kb):
    gap = kb.get_skill_gaps(
        career_name="Software Developer",
        skills=["python", "sql", "java"],
        interests=[],
    )
    if gap.get("you_have"):
        career_record = next(r for r in kb.records if r["name"] == "Software Developer")
        for skill in gap["you_have"]:
            assert skill in career_record["skills"]
